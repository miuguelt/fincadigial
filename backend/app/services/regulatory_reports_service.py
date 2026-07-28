from datetime import datetime
import logging
from sqlalchemy import or_

from app import db
from app.models import (
    Animal, Animals, Finca, User, UserFinca,
    Treatments, Control, AnimalFields
)
from app.models.breeds import Breeds
from app.models.species import Species
from app.models.vaccines import Vaccines
from app.models.route_administration import RouteAdministration
from app.models.vaccinations import Vaccinations as VacTable
from app.services import pdf_report_service

logger = logging.getLogger(__name__)

class RegulatoryReportsService:
    """Servicio encargado de abstraer la lógica pesada de los reportes regulatorios."""

    @staticmethod
    def _parse_date(value):
        if not value:
            return None
        try:
            return datetime.strptime(value, '%Y-%m-%d')
        except (TypeError, ValueError):
            return None

    @classmethod
    def get_inventory_report(cls, finca_id, date_from_str, date_to_str, format_type, species_filter):
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

        date_from = cls._parse_date(date_from_str)
        date_to = cls._parse_date(date_to_str)

        if date_from:
            query = query.filter(Animal.entry_date >= date_from)
        if date_to:
            query = query.filter(Animal.entry_date <= date_to)

        animals = query.all()
        inventory_data = []

        for animal in animals:
            age_months = None
            if animal.birth_date:
                age_days = (datetime.now().date() - animal.birth_date).days
                age_months = int(age_days / 30.44)

            location = 'Sin asignar'
            current_field = AnimalFields.query.filter_by(
                animal_id=animal.id,
                removal_date=None
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

        if format_type == 'csv':
            headers = [
                'id_animal', 'numero_arete', 'especie', 'raza', 'sexo',
                'fecha_nacimiento', 'edad_meses', 'peso_kg', 'ubicacion',
                'estado', 'fecha_ingreso', 'fecha_compra', 'observaciones'
            ]
            filename = f'inventario_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'
            return {'type': 'csv', 'headers': headers, 'data': inventory_data, 'filename': filename}

        if format_type == 'pdf':
            finca = Finca.query.get(finca_id)
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
            filename = f'inventario_{finca_id}.pdf'
            return {'type': 'pdf', 'content': pdf_content, 'filename': filename}

        summary = {
            'machos': len([a for a in animals if (str(a.sex.value) if hasattr(a.sex, 'value') else str(a.sex)) == 'Macho']),
            'hembras': len([a for a in animals if (str(a.sex.value) if hasattr(a.sex, 'value') else str(a.sex)) == 'Hembra']),
            'total_vivos': len(animals)
        }

        return {
            'type': 'json',
            'payload': {
                'report_type': 'inventory',
                'finca_id': finca_id,
                'total_animals': len(inventory_data),
                'date_generated': datetime.now().isoformat(),
                'animals': inventory_data,
                'summary': summary
            }
        }

    @classmethod
    def get_movements_report(cls, finca_id, date_from_str, date_to_str, format_type, movement_type):
        date_from = cls._parse_date(date_from_str)
        date_to = cls._parse_date(date_to_str)
        movements_data = []

        # NACIMIENTOS
        if movement_type in ['births', 'all']:
            births_query = Animal.query.filter(Animal.finca_id == finca_id, Animal.birth_date.isnot(None))
            if date_from:
                births_query = births_query.filter(Animal.birth_date >= date_from.date())
            if date_to:
                births_query = births_query.filter(Animal.birth_date <= date_to.date())
            for animal in births_query.all():
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
                or_(Animal.status == 'Muerto', Animal.exit_reason == 'Muerte', Animal.exit_reason == 'Deceso')
            )
            if date_from:
                deaths_query = deaths_query.filter(Animal.exit_date >= date_from.date())
            if date_to:
                deaths_query = deaths_query.filter(Animal.exit_date <= date_to.date())
            for animal in deaths_query.all():
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
            sales_query = Animal.query.filter(Animal.finca_id == finca_id, Animal.sale_date.isnot(None))
            if date_from:
                sales_query = sales_query.filter(Animal.sale_date >= date_from.date())
            if date_to:
                sales_query = sales_query.filter(Animal.sale_date <= date_to.date())
            for animal in sales_query.all():
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

        movements_data.sort(key=lambda x: x['fecha'] if x['fecha'] else '', reverse=True)

        if format_type == 'csv':
            headers = ['fecha', 'tipo_movimiento', 'numero_arete', 'sexo', 'especie', 'detalle', 'destino_origen', 'documento_soporte']
            return {'type': 'csv', 'headers': headers, 'data': movements_data, 'filename': f'movimientos_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'}

        if format_type == 'pdf':
            finca = Finca.query.get(finca_id)
            owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Propietario').first() or UserFinca.query.filter_by(finca_id=finca_id, role='Administrador').first()
            finca_info = {
                'name': finca.name,
                'ubication': f"{finca.municipality}, {finca.department}" if finca.municipality else 'N/A',
                'owner': owner_membership.user.fullname if owner_membership else 'N/A'
            }
            pdf_content = pdf_report_service.generate_movements_pdf(finca.name, finca_info, movements_data, finca_type=str(finca.type.value))
            return {'type': 'pdf', 'content': pdf_content, 'filename': f'movimientos_{finca_id}.pdf'}

        summary = {
            'nacimientos': len([m for m in movements_data if m['tipo_movimiento'] == 'NACIMIENTO']),
            'muertes': len([m for m in movements_data if m['tipo_movimiento'] == 'MUERTE']),
            'ventas': len([m for m in movements_data if m['tipo_movimiento'] == 'VENTA']),
        }

        return {
            'type': 'json',
            'payload': {
                'report_type': 'movements',
                'finca_id': finca_id,
                'total_records': len(movements_data),
                'date_generated': datetime.now().isoformat(),
                'movements': movements_data,
                'summary': summary
            }
        }

    @classmethod
    def get_health_report(cls, finca_id, date_from_str, date_to_str, format_type, health_type):
        date_from = cls._parse_date(date_from_str)
        date_to = cls._parse_date(date_to_str)
        health_data = []

        # VACUNACIONES
        if health_type in ['vaccinations', 'all']:
            vacc_query = db.session.query(
                VacTable.id, VacTable.vaccination_date, VacTable.animal_id, VacTable.dosis.label('actual_dosis'),
                VacTable.batch_number, VacTable.notes, Vaccines.name.label('vaccine_name'), Vaccines.dosis.label('vaccine_dosis'),
                Vaccines.national_plan, RouteAdministration.name.label('route_name'), Animals.record.label('animal_record'),
                User.fullname.label('performer_name')
            ).join(Vaccines, VacTable.vaccine_id == Vaccines.id).join(Animals, VacTable.animal_id == Animals.id).outerjoin(RouteAdministration, Vaccines.route_administration_id == RouteAdministration.id).outerjoin(User, VacTable.performed_by == User.id).filter(VacTable.finca_id == finca_id)

            if date_from: vacc_query = vacc_query.filter(VacTable.vaccination_date >= date_from.date())
            if date_to: vacc_query = vacc_query.filter(VacTable.vaccination_date <= date_to.date())

            for vacc in vacc_query.all():
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
            treat_query = Treatments.query.filter(Treatments.finca_id == finca_id)
            if date_from: treat_query = treat_query.filter(Treatments.treatment_date >= date_from.date())
            if date_to: treat_query = treat_query.filter(Treatments.treatment_date <= date_to.date())

            for treat in treat_query.all():
                animal_record = treat.animals.record if treat.animals and treat.animals.record else 'SIN_ARETE'
                obs_parts = []
                if treat.observations: obs_parts.append(treat.observations)
                if treat.withdrawal_days and treat.withdrawal_days > 0: obs_parts.append(f"Tiempo de retiro: {treat.withdrawal_days} días")
                if treat.cost: obs_parts.append(f"Costo: ${treat.cost:,.2f} COP")
                veterinario = treat.performer.fullname if treat.performer else 'MVZ General'

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
                    'observaciones': " - ".join(obs_parts)
                })

        # CONTROLES SANITARIOS
        if health_type in ['controls', 'all']:
            control_query = Control.query.filter(Control.finca_id == finca_id)
            if date_from: control_query = control_query.filter(Control.checkup_date >= date_from.date())
            if date_to: control_query = control_query.filter(Control.checkup_date <= date_to.date())

            for ctrl in control_query.all():
                animal_record = ctrl.animals.record if ctrl.animals and ctrl.animals.record else 'SIN_ARETE'
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

        health_data.sort(key=lambda x: x['fecha'] if x['fecha'] else '', reverse=True)

        if format_type == 'csv':
            headers = ['fecha', 'tipo_registro', 'numero_arete', 'producto', 'dosis', 'via_administracion', 'registro_ica', 'lote', 'veterinario', 'observaciones']
            return {'type': 'csv', 'headers': headers, 'data': health_data, 'filename': f'sanidad_ganado_{finca_id}_{datetime.now().strftime("%Y%m%d")}'}

        if format_type == 'pdf':
            finca = Finca.query.get(finca_id)
            owner_membership = UserFinca.query.filter_by(finca_id=finca_id, role='Propietario').first() or UserFinca.query.filter_by(finca_id=finca_id, role='Administrador').first()
            finca_info = {
                'name': finca.name,
                'ubication': f"{finca.municipality}, {finca.department}" if finca.municipality else 'N/A',
                'owner': owner_membership.user.fullname if owner_membership else 'N/A'
            }
            pdf_content = pdf_report_service.generate_health_pdf(finca.name, finca_info, health_data, finca_type=str(finca.type.value))
            return {'type': 'pdf', 'content': pdf_content, 'filename': f'sanidad_{finca_id}.pdf'}

        summary = {
            'vacunaciones': len([h for h in health_data if h['tipo_registro'] == 'VACUNACION']),
            'tratamientos': len([h for h in health_data if h['tipo_registro'] == 'TRATAMIENTO']),
            'controles': len([h for h in health_data if h['tipo_registro'] == 'CONTROL_SANITARIO']),
        }

        return {
            'type': 'json',
            'payload': {
                'report_type': 'health',
                'finca_id': finca_id,
                'total_records': len(health_data),
                'date_generated': datetime.now().isoformat(),
                'health_records': health_data,
                'summary': summary
            }
        }
