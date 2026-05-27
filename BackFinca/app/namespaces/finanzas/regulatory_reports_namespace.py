"""
Regulatory Reports Namespace (ICA/SENA)
=========================================

Endpoints para generar reportes regulatorios requeridos por
ICA (Instituto Colombiano Agropecuario) y SENA para fincas tradicionales.

Tipos de reportes:
- Inventario de ganado
- Movimientos (nacimientos, muertes, ventas)
- Sanidad (vacunaciones, controles)

Uso:
    GET  /api/v1/regulatory-reports/inventory?format=csv&date_from=2024-01-01
    GET  /api/v1/regulatory-reports/movements?format=pdf&type=births
    GET  /api/v1/regulatory-reports/health?format=csv&type=vaccinations
"""

import flask
from flask import Response
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from datetime import datetime
from io import StringIO
import csv
import logging

from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id, get_current_finca_type
from app.models import (
    Animal, Animals, Finca, User, UserFinca,
    Treatments,
    Control, AnimalFields
)
from app import db
from app.services import pdf_report_service

logger = logging.getLogger(__name__)

# Namespace
regulatory_ns = Namespace('regulatory-reports', description='Reportes regulatorios ICA/SENA')

# =============================================================================
# Modelos para documentación Swagger
# =============================================================================

inventory_report_model = regulatory_ns.model('InventoryReportRequest', {
    'date_from': fields.String(description='Fecha inicio (YYYY-MM-DD)', example='2024-01-01'),
    'date_to': fields.String(description='Fecha fin (YYYY-MM-DD)', example='2024-12-31'),
    'format': fields.String(description='Formato: csv, pdf, json', example='csv'),
    'species': fields.String(description='Filtrar por especie', example='Bovino'),
})

movements_report_model = regulatory_ns.model('MovementsReportRequest', {
    'date_from': fields.String(description='Fecha inicio', example='2024-01-01'),
    'date_to': fields.String(description='Fecha fin', example='2024-12-31'),
    'format': fields.String(description='Formato: csv, pdf, json', example='csv'),
    'type': fields.String(description='Tipo: births, deaths, sales, transfers, all', example='all'),
})

health_report_model = regulatory_ns.model('HealthReportModel', {
    'date_from': fields.String(description='Fecha inicio', example='2024-01-01'),
    'date_to': fields.String(description='Fecha fin', example='2024-12-31'),
    'format': fields.String(description='Formato: csv, pdf, json', example='csv'),
    'type': fields.String(description='Tipo: vaccinations, treatments, controls, all', example='all'),
})


# =============================================================================
# Utilidades para exportación
# =============================================================================

def parse_date(value):
    """Parsea fechas de filtros API en formato ISO corto."""
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d')
    except (TypeError, ValueError):
        return None


def send_csv_response(rows, headers, filename):
    """Devuelve un CSV descargable con columnas estables aunque no haya filas."""
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
    writer.writeheader()
    for row in rows or []:
        writer.writerow({header: row.get(header, '') for header in headers})

    return Response(
        output.getvalue(),
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': f'attachment; filename={filename}.csv'}
    )


@regulatory_ns.route('/inventory')
class InventoryReportResource(Resource):
    """Reporte de inventario de ganado (formato ICA)."""

    @jwt_required()
    @regulatory_ns.doc('inventory_report', security='jwt')
    @regulatory_ns.expect(inventory_report_model)
    @regulatory_ns.response(200, 'Reporte de inventario')
    @regulatory_ns.response(401, 'No autenticado')
    @regulatory_ns.response(403, 'Solo fincas tradicionales')
    def get(self):
        """
        Generar reporte de inventario de ganado.

        Incluye todos los animales activos en la finca con:
        - Número de arete
        - Especie y raza
        - Sexo
        - Fecha de nacimiento
        - Edad en meses
        - Ubicación (potrero)
        - Estado

        Formato compatible con reportes ICA.
        """
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error('No hay finca seleccionada', status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ['Tradicional', 'Educativa']:
                return APIResponse.forbidden('Los reportes regulatorios solo aplican a fincas tradicionales o educativas')

            # Parámetros
            date_from = flask.request.args.get('date_from')
            date_to = flask.request.args.get('date_to')
            format_type = flask.request.args.get('format', 'json').lower()
            species_filter = flask.request.args.get('species')

            from app.models.breeds import Breeds
            from app.models.species import Species

            # Query base con joins para raza y especie
            query = db.session.query(
                Animal.id,
                Animal.record,
                Animal.sex,
                Animal.birth_date,
                Animal.weight,
                Animal.status,
                Animal.entry_date,
                Animal.purchase_date,
                Animal.sale_date,
                Animal.exit_date,
                Animal.exit_reason,
                Breeds.name.label('breed_name'),
                Species.name.label('species_name')
            ).outerjoin(
                Breeds, Animal.breeds_id == Breeds.id
            ).outerjoin(
                Species, Breeds.species_id == Species.id
            ).filter(
                Animal.finca_id == finca_id,
                Animal.status.in_(['Vivo', 'Vendido'])
            )

            # Aplicar filtros de fecha si se proporcionan
            if date_from:
                date_from_parsed = parse_date(date_from)
                if date_from_parsed:
                    query = query.filter(Animal.entry_date >= date_from_parsed)

            if date_to:
                date_to_parsed = parse_date(date_to)
                if date_to_parsed:
                    query = query.filter(Animal.entry_date <= date_to_parsed)

            animals = query.all()

            # Preparar datos para exportación
            inventory_data = []
            for animal in animals:
                # Calcular edad
                age_months = None
                if animal.birth_date:
                    age_days = (datetime.now().date() - animal.birth_date).days
                    age_months = int(age_days / 30.44)  # Promedio de días por mes

                # Obtener ubicación actual
                location = 'Sin asignar'
                current_field = AnimalFields.query.filter_by(
                    animal_id=animal.id,
                    removal_date=None  # Aún asignado
                ).first()
                if current_field and current_field.field:
                    location = current_field.field.name

                inventory_data.append({
                    'id_animal': animal.id,
                    'numero_arete': animal.record or 'SIN_ARETE',
                    'especie': animal.species_name or 'Bovino',
                    'raza': animal.breed_name or 'Por definir',
                    'sexo': str(animal.sex.value) if hasattr(animal.sex, 'value') else str(animal.sex),
                    'fecha_nacimiento': animal.birth_date.isoformat() if animal.birth_date else '',
                    'edad_meses': age_months or '',
                    'peso_kg': f"{animal.weight:.1f}" if animal.weight is not None else '',
                    'ubicacion': location,
                    'estado': str(animal.status.value) if hasattr(animal.status, 'value') else str(animal.status),
                    'fecha_ingreso': animal.entry_date.isoformat() if animal.entry_date else '',
                    'fecha_compra': animal.purchase_date.isoformat() if animal.purchase_date else '',
                    'observaciones': ''
                })

            # Formato de respuesta
            if format_type == 'csv':
                headers = [
                    'id_animal', 'numero_arete', 'especie', 'raza', 'sexo',
                    'fecha_nacimiento', 'edad_meses', 'peso_kg', 'ubicacion',
                    'estado', 'fecha_ingreso', 'fecha_compra', 'observaciones'
                ]
                return send_csv_response(
                    inventory_data,
                    headers,
                    f'inventario_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'
                )

            if format_type == 'pdf':
                finca = Finca.query.get(finca_id)

                # Obtener propietario (Propietario o Administrador)
                owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Propietario').first()
                if not owner_membership:
                    owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Administrador').first()

                finca_info = {
                    'name': finca.name,
                    'ubication': f"{finca.municipality}, {finca.department}" if finca.municipality else 'N/A',
                    'owner': owner_membership.user.fullname if owner_membership else 'N/A'
                }
                pdf_content = pdf_report_service.generate_inventory_pdf(
                    finca.name, finca_info, inventory_data, finca_type=str(finca.type.value)
                )
                return Response(
                    pdf_content,
                    mimetype='application/pdf',
                    headers={
                        'Content-Disposition': f'attachment; filename=inventario_{finca_id}.pdf'
                    }
                )

            # JSON por defecto
            return APIResponse.success(
                message=f'Reporte de inventario generado: {len(inventory_data)} animales',
                data={
                    'report_type': 'inventory',
                    'finca_id': finca_id,
                    'total_animals': len(inventory_data),
                    'date_generated': datetime.now().isoformat(),
                    'animals': inventory_data,
                    'summary': {
                        'machos': len([a for a in animals if (str(a.sex.value) if hasattr(a.sex, 'value') else str(a.sex)) == 'Macho']),
                        'hembras': len([a for a in animals if (str(a.sex.value) if hasattr(a.sex, 'value') else str(a.sex)) == 'Hembra']),
                        'total_vivos': len(animals)
                    }
                }
            )

        except Exception as e:
            logger.error(f'Error generando reporte de inventario: {e}', exc_info=True)
            return APIResponse.error(
                'Error al generar reporte',
                details={'error': str(e)},
                status_code=500
            )


@regulatory_ns.route('/movements')
class MovementsReportResource(Resource):
    """Reporte de movimientos de ganado (nacimientos, muertes, ventas)."""

    @jwt_required()
    @regulatory_ns.doc('movements_report', security='jwt')
    @regulatory_ns.expect(movements_report_model)
    @regulatory_ns.response(200, 'Reporte de movimientos')
    def get(self):
        """
        Generar reporte de movimientos de ganado.

        Tipos de movimiento:
        - births: Nacimientos (fecha de nacimiento en el rango)
        - deaths: Muertes (animales con estado 'Muerto' o exit_reason 'Muerte')
        - sales: Ventas (animales con sale_date en el rango)
        - transfers: Traslados entre potreros
        - all: Todos los movimientos

        Este reporte es requerido por ICA para trazabilidad.
        """
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error('No hay finca seleccionada', status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ['Tradicional', 'Educativa']:
                return APIResponse.forbidden('Los reportes regulatorios solo aplican a fincas tradicionales o educativas')

            # Parámetros
            date_from = flask.request.args.get('date_from')
            date_to = flask.request.args.get('date_to')
            format_type = flask.request.args.get('format', 'json').lower()
            movement_type = flask.request.args.get('type', 'all').lower()

            movements_data = []

            # NACIMIENTOS
            if movement_type in ['births', 'all']:
                births_query = Animal.query.filter(
                    Animal.finca_id == finca_id,
                    Animal.birth_date.isnot(None)
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        births_query = births_query.filter(Animal.birth_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        births_query = births_query.filter(Animal.birth_date <= date_to_parsed.date())

                births = births_query.all()

                for animal in births:
                    movements_data.append({
                        'fecha': animal.birth_date.isoformat() if animal.birth_date else '',
                        'tipo_movimiento': 'NACIMIENTO',
                        'numero_arete': animal.record or 'SIN_ARETE',
                        'sexo': str(animal.sex.value) if hasattr(animal.sex, 'value') else str(animal.sex),
                        'especie': 'Bovino',
                        'detalle': 'Nacimiento en finca',
                        'destino_origen': 'Nacimiento en finca',
                        'documento_soporte': ''
                    })

            # MUERTES
            if movement_type in ['deaths', 'all']:
                deaths_query = Animal.query.filter(
                    Animal.finca_id == finca_id,
                    or_(
                        Animal.status == 'Muerto',
                        Animal.exit_reason == 'Muerte',
                        Animal.exit_reason == 'Deceso'
                    )
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        deaths_query = deaths_query.filter(Animal.exit_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        deaths_query = deaths_query.filter(Animal.exit_date <= date_to_parsed.date())

                deaths = deaths_query.all()

                for animal in deaths:
                    movements_data.append({
                        'fecha': animal.exit_date.isoformat() if animal.exit_date else '',
                        'tipo_movimiento': 'MUERTE',
                        'numero_arete': animal.record or 'SIN_ARETE',
                        'sexo': str(animal.sex.value) if hasattr(animal.sex, 'value') else str(animal.sex),
                        'especie': 'Bovino',
                        'detalle': f'Causa: {animal.exit_reason or "No especificada"}',
                        'destino_origen': 'Finca',
                        'documento_soporte': ''
                    })

            # VENTAS
            if movement_type in ['sales', 'all']:
                sales_query = Animal.query.filter(
                    Animal.finca_id == finca_id,
                    Animal.sale_date.isnot(None)
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        sales_query = sales_query.filter(Animal.sale_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        sales_query = sales_query.filter(Animal.sale_date <= date_to_parsed.date())

                sales = sales_query.all()

                for animal in sales:
                    movements_data.append({
                        'fecha': animal.sale_date.isoformat() if animal.sale_date else '',
                        'tipo_movimiento': 'VENTA',
                        'numero_arete': animal.record or 'SIN_ARETE',
                        'sexo': str(animal.sex.value) if hasattr(animal.sex, 'value') else str(animal.sex),
                        'especie': 'Bovino',
                        'detalle': 'Venta de animal',
                        'destino_origen': 'Finca',
                        'documento_soporte': ''
                    })

            # Ordenar por fecha
            movements_data.sort(key=lambda x: x['fecha'] if x['fecha'] else '', reverse=True)

            # Formato de respuesta
            if format_type == 'csv':
                headers = [
                    'fecha', 'tipo_movimiento', 'numero_arete', 'sexo',
                    'especie', 'detalle', 'destino_origen', 'documento_soporte'
                ]
                return send_csv_response(
                    movements_data,
                    headers,
                    f'movimientos_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'
                )

            if format_type == 'pdf':
                finca = Finca.query.get(finca_id)

                # Obtener propietario
                owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Propietario').first()
                if not owner_membership:
                    owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Administrador').first()

                finca_info = {
                    'name': finca.name,
                    'ubication': f"{finca.municipality}, {finca.department}" if finca.municipality else 'N/A',
                    'owner': owner_membership.user.fullname if owner_membership else 'N/A'
                }
                pdf_content = pdf_report_service.generate_movements_pdf(
                    finca.name, finca_info, movements_data, finca_type=str(finca.type.value)
                )
                return Response(
                    pdf_content,
                    mimetype='application/pdf',
                    headers={
                        'Content-Disposition': f'attachment; filename=movimientos_{finca_id}.pdf'
                    }
                )

            # Conteos
            summary = {
                'nacimientos': len([m for m in movements_data if m['tipo_movimiento'] == 'NACIMIENTO']),
                'muertes': len([m for m in movements_data if m['tipo_movimiento'] == 'MUERTE']),
                'ventas': len([m for m in movements_data if m['tipo_movimiento'] == 'VENTA']),
            }

            return APIResponse.success(
                message=f'Reporte de movimientos generado: {len(movements_data)} registros',
                data={
                    'report_type': 'movements',
                    'finca_id': finca_id,
                    'total_records': len(movements_data),
                    'date_generated': datetime.now().isoformat(),
                    'movements': movements_data,
                    'summary': summary
                }
            )

        except Exception as e:
            logger.error(f'Error generando reporte de movimientos: {e}', exc_info=True)
            return APIResponse.error(
                'Error al generar reporte',
                details={'error': str(e)},
                status_code=500
            )


@regulatory_ns.route('/health')
class HealthReportResource(Resource):
    """Reporte de sanidad (vacunaciones, tratamientos, controles)."""

    @jwt_required()
    @regulatory_ns.doc('health_report', security='jwt')
    @regulatory_ns.expect(health_report_model)
    @regulatory_ns.response(200, 'Reporte sanitario')
    def get(self):
        """
        Generar reporte de sanidad.

        Incluye:
        - Vacunaciones (especialmente Brucelosis y Tuberculosis para ICA)
        - Tratamientos veterinarios
        - Controles sanitarios

        Este reporte es requerido para certificación sanitaria.
        """
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error('No hay finca seleccionada', status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ['Tradicional', 'Educativa']:
                return APIResponse.forbidden('Los reportes regulatorios solo aplican a fincas tradicionales o educativas')

            # Parámetros
            date_from = flask.request.args.get('date_from')
            date_to = flask.request.args.get('date_to')
            format_type = flask.request.args.get('format', 'json').lower()
            health_type = flask.request.args.get('type', 'all').lower()

            health_data = []

            # VACUNACIONES
            if health_type in ['vaccinations', 'all']:
                from app.models.vaccines import Vaccines
                from app.models.route_administration import RouteAdministration
                from app.models.vaccinations import Vaccinations as VacTable

                vacc_query = db.session.query(
                    VacTable.id,
                    VacTable.vaccination_date,
                    VacTable.animal_id,
                    VacTable.dosis.label('actual_dosis'),
                    VacTable.batch_number,
                    VacTable.notes,
                    Vaccines.name.label('vaccine_name'),
                    Vaccines.dosis.label('vaccine_dosis'),
                    Vaccines.national_plan,
                    RouteAdministration.name.label('route_name'),
                    Animals.record.label('animal_record'),
                    User.fullname.label('performer_name')
                ).join(
                    Vaccines, VacTable.vaccine_id == Vaccines.id
                ).join(
                    Animals, VacTable.animal_id == Animals.id
                ).outerjoin(
                    RouteAdministration, Vaccines.route_administration_id == RouteAdministration.id
                ).outerjoin(
                    User, VacTable.performed_by == User.id
                ).filter(
                    VacTable.finca_id == finca_id
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        vacc_query = vacc_query.filter(VacTable.vaccination_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        vacc_query = vacc_query.filter(VacTable.vaccination_date <= date_to_parsed.date())

                vaccinations = vacc_query.all()

                for vacc in vaccinations:
                    health_data.append({
                        'fecha': vacc.vaccination_date.isoformat() if vacc.vaccination_date else '',
                        'tipo_registro': 'VACUNACION',
                        'numero_arete': vacc.animal_record or 'SIN_ARETE',
                        'producto': vacc.vaccine_name,
                        'dosis': vacc.actual_dosis or vacc.vaccine_dosis or '2ml',
                        'via_administracion': vacc.route_name or 'Subcutánea',
                        'registro_ica': f'ICA-VAC-{vacc.id}',
                        'lote': vacc.batch_number or 'N/A',
                        'veterinario': vacc.performer_name or 'MVZ General',
                        'observaciones': (f"Plan Sanitario Nacional: {vacc.national_plan}. " if vacc.national_plan else "") + (vacc.notes or '')
                    })

            # TRATAMIENTOS
            if health_type in ['treatments', 'all']:
                treat_query = Treatments.query.filter(
                    Treatments.finca_id == finca_id
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        treat_query = treat_query.filter(Treatments.treatment_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        treat_query = treat_query.filter(Treatments.treatment_date <= date_to_parsed.date())

                treatments = treat_query.all()

                for treat in treatments:
                    animal_record = 'SIN_ARETE'
                    if treat.animals and treat.animals.record:
                        animal_record = treat.animals.record

                    observaciones_parts = []
                    if treat.observations:
                        observaciones_parts.append(treat.observations)
                    if treat.withdrawal_days and treat.withdrawal_days > 0:
                        observaciones_parts.append(f"Tiempo de retiro: {treat.withdrawal_days} días")
                    if treat.cost:
                        observaciones_parts.append(f"Costo: ${treat.cost:,.2f} COP")
                    observaciones = " - ".join(observaciones_parts)

                    veterinario = 'MVZ General'
                    if treat.performer:
                        veterinario = treat.performer.fullname

                    health_data.append({
                        'fecha': treat.treatment_date.isoformat() if treat.treatment_date else '',
                        'tipo_registro': 'TRATAMIENTO',
                        'numero_arete': animal_record,
                        'producto': treat.description or '',
                        'dosis': treat.dosis or '',
                        'via_administracion': 'N/A',
                        'registro_ica': 'N/A',
                        'lote': 'N/A',
                        'veterinario': veterinario,
                        'observaciones': observaciones
                    })

            # CONTROLES SANITARIOS
            if health_type in ['controls', 'all']:
                control_query = Control.query.filter(
                    Control.finca_id == finca_id
                )

                if date_from:
                    date_from_parsed = parse_date(date_from)
                    if date_from_parsed:
                        control_query = control_query.filter(Control.checkup_date >= date_from_parsed.date())

                if date_to:
                    date_to_parsed = parse_date(date_to)
                    if date_to_parsed:
                        control_query = control_query.filter(Control.checkup_date <= date_to_parsed.date())

                controls = control_query.all()

                for ctrl in controls:
                    animal_record = 'SIN_ARETE'
                    if ctrl.animals and ctrl.animals.record:
                        animal_record = ctrl.animals.record

                    health_data.append({
                        'fecha': ctrl.checkup_date.isoformat() if ctrl.checkup_date else '',
                        'tipo_registro': 'CONTROL_SANITARIO',
                        'numero_arete': animal_record,
                        'producto': f'Control Físico - Estado: {ctrl.health_status.value}',
                        'dosis': 'N/A',
                        'via_administracion': 'N/A',
                        'registro_ica': 'N/A',
                        'lote': 'N/A',
                        'veterinario': 'MVZ General',
                        'observaciones': ctrl.description or 'Chequeo de rutina'
                    })

            # Ordenar por fecha
            health_data.sort(key=lambda x: x['fecha'] if x['fecha'] else '', reverse=True)

            # Formato de respuesta
            if format_type == 'csv':
                headers = [
                    'fecha', 'tipo_registro', 'numero_arete', 'producto',
                    'dosis', 'via_administracion', 'registro_ica', 'lote',
                    'veterinario', 'observaciones'
                ]
                return send_csv_response(
                    health_data,
                    headers,
                    f'sanidad_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'
                )

            if format_type == 'pdf':
                finca = Finca.query.get(finca_id)

                # Obtener propietario
                owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Propietario').first()
                if not owner_membership:
                    owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Administrador').first()

                finca_info = {
                    'name': finca.name,
                    'ubication': f"{finca.municipality}, {finca.department}" if finca.municipality else 'N/A',
                    'owner': owner_membership.user.fullname if owner_membership else 'N/A'
                }
                pdf_content = pdf_report_service.generate_health_pdf(
                    finca.name, finca_info, health_data, finca_type=str(finca.type.value)
                )
                return Response(
                    pdf_content,
                    mimetype='application/pdf',
                    headers={
                        'Content-Disposition': f'attachment; filename=sanidad_{finca_id}.pdf'
                    }
                )

            # Conteos
            summary = {
                'vacunaciones': len([h for h in health_data if h['tipo_registro'] == 'VACUNACION']),
                'tratamientos': len([h for h in health_data if h['tipo_registro'] == 'TRATAMIENTO']),
                'controles': len([h for h in health_data if h['tipo_registro'] == 'CONTROL_SANITARIO']),
            }

            return APIResponse.success(
                message=f'Reporte de sanidad generado: {len(health_data)} registros',
                data={
                    'report_type': 'health',
                    'finca_id': finca_id,
                    'total_records': len(health_data),
                    'date_generated': datetime.now().isoformat(),
                    'health_records': health_data,
                    'summary': summary
                }
            )

        except Exception as e:
            logger.error(f'Error generando reporte de sanidad: {e}', exc_info=True)
            return APIResponse.error(
                'Error al generar reporte',
                details={'error': str(e)},
                status_code=500
            )


@regulatory_ns.route('/formats')
class ReportFormatsResource(Resource):
    """Obtener formatos disponibles y ejemplos."""

    @jwt_required()
    @regulatory_ns.doc('report_formats', security='jwt')
    def get(self):
        """
        Obtener información sobre los formatos de reportes disponibles
        y ejemplos de uso.
        """
        return APIResponse.success(
            message='Formatos de reportes regulatorios',
            data={
                'reports': {
                    'inventory': {
                        'description': 'Inventario de ganado activo',
                        'formats': ['json', 'csv'],
                        'required_by': 'ICA',
                        'frequency': 'Mensual o trimestral',
                        'fields': [
                            'numero_arete', 'especie', 'raza', 'sexo',
                            'fecha_nacimiento', 'edad_meses', 'peso_kg', 'ubicacion'
                        ]
                    },
                    'movements': {
                        'description': 'Movimientos (nacimientos, muertes, ventas)',
                        'formats': ['json', 'csv'],
                        'required_by': 'ICA',
                        'frequency': 'Mensual',
                        'types': ['births', 'deaths', 'sales', 'all'],
                        'fields': [
                            'fecha', 'tipo_movimiento', 'numero_arete',
                            'sexo', 'detalle', 'destino_origen'
                        ]
                    },
                    'health': {
                        'description': 'Registros sanitarios (vacunaciones, tratamientos)',
                        'formats': ['json', 'csv'],
                        'required_by': 'ICA',
                        'frequency': 'Según plan sanitario',
                        'types': ['vaccinations', 'treatments', 'controls', 'all'],
                        'fields': [
                            'fecha', 'tipo_registro', 'numero_arete',
                            'producto', 'dosis', 'lote', 'veterinario'
                        ]
                    }
                },
                'examples': {
                    'inventory_csv': '/api/v1/regulatory-reports/inventory?format=csv&date_from=2024-01-01',
                    'movements_births': '/api/v1/regulatory-reports/movements?type=births&format=csv',
                    'health_vaccinations': '/api/v1/regulatory-reports/health?type=vaccinations&format=csv'
                }
            }
        )
