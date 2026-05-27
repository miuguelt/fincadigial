# reports.py - Generación de informes analíticos personalizados interactivos
from flask import request
from flask_restx import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.vaccinations import Vaccinations
from app.models.treatments import Treatments
from app.models.control import Control
from app.models.fields import Fields
from app.models.breeds import Breeds
from app.models.financial import Transaction
from app.models.milk_production import MilkProduction
from app.models.campesino import CropActivity
from app import db
from sqlalchemy import func
from . import analytics_ns

@analytics_ns.route('/reports/custom')
class CustomReports(Resource):
    @jwt_required()
    def post(self):
        """Generar informe analítico personalizado de la finca actual"""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error('No hay finca seleccionada', status_code=400)

            data = request.get_json() or {}

            # Obtener parámetros del frontend (flexibilidad y compatibilidad hacia atrás)
            period = data.get('period', '1y')
            metrics = data.get('metrics', ['animals'])
            group_by = data.get('groupBy', [])
            filters = data.get('filters', {})

            # También soportar parámetros antiguos por si acaso
            report_type_old = data.get('report_type')
            if report_type_old and not metrics:
                metrics = [report_type_old]

            # Calcular fechas del período
            now = datetime.now()
            start_date = now - timedelta(days=365) # 1y por defecto
            if period == '1m':
                start_date = now - timedelta(days=30)
            elif period == '3m':
                start_date = now - timedelta(days=90)
            elif period == '6m':
                start_date = now - timedelta(days=180)
            elif period == '2y':
                start_date = now - timedelta(days=730)
            elif period == 'all':
                start_date = datetime(2000, 1, 1)

            report_data = {
                'period': period,
                'generated_at': now.isoformat(),
                'metrics_included': metrics,
                'summary': {},
                'details': {}
            }

            # 1. Métrica: ANIMALES (Inventario, Razas, Edades)
            if 'animals' in metrics:
                total_animals = Animals.query.filter(Animals.finca_id == finca_id, Animals.is_deleted == False).count()
                vivos = Animals.query.filter(Animals.finca_id == finca_id, Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False).count()
                vendidos = Animals.query.filter(Animals.finca_id == finca_id, Animals.status == AnimalStatus.Vendido, Animals.is_deleted == False).count()
                muertos = Animals.query.filter(Animals.finca_id == finca_id, Animals.status == AnimalStatus.Muerto, Animals.is_deleted == False).count()

                machos = Animals.query.filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo,
                    Animals.sex == Sex.Macho,
                    Animals.is_deleted == False
                ).count()
                hembras = Animals.query.filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo,
                    Animals.sex == Sex.Hembra,
                    Animals.is_deleted == False
                ).count()

                report_data['summary']['animales_totales'] = total_animals
                report_data['summary']['animales_activos_vivos'] = vivos
                report_data['summary']['machos_activos'] = machos
                report_data['summary']['hembras_activas'] = hembras

                report_data['details']['inventario_animales'] = {
                    'total': total_animals,
                    'estados': {
                        'vivos': vivos,
                        'vendidos': vendidos,
                        'muertos': muertos
                    },
                    'sexo': {
                        'machos_vivos': machos,
                        'hembras_vivas': hembras
                    }
                }

                # Distribución por razas (si está en groupBy o siempre como detalle)
                breeds_stats = db.session.query(
                    Breeds.name, func.count(Animals.id)
                ).outerjoin(
                    Animals, Animals.breeds_id == Breeds.id
                ).filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo,
                    Animals.is_deleted == False,
                    Breeds.is_deleted == False
                ).group_by(Breeds.name).all()

                report_data['details']['distribucion_razas'] = {
                    breed_name: count for breed_name, count in breeds_stats
                }

            # 2. Métrica: SALUD (Tratamientos y Vacunaciones)
            if 'health' in metrics:
                total_vaccinations = Vaccinations.query.filter(
                    Vaccinations.finca_id == finca_id,
                    Vaccinations.vaccination_date >= start_date.date()
                ).count()

                total_treatments = Treatments.query.filter(
                    Treatments.finca_id == finca_id,
                    Treatments.treatment_date >= start_date.date()
                ).count()

                report_data['summary']['total_vacunaciones_periodo'] = total_vaccinations
                report_data['summary']['total_tratamientos_periodo'] = total_treatments

                # Obtener últimos tratamientos
                recent_treats = Treatments.query.filter(
                    Treatments.finca_id == finca_id
                ).order_by(Treatments.treatment_date.desc()).limit(10).all()

                report_data['details']['historial_salud'] = {
                    'total_vacunaciones': total_vaccinations,
                    'total_tratamientos': total_treatments,
                    'ultimos_tratamientos': [
                        {
                            'fecha': t.treatment_date.isoformat() if t.treatment_date else '',
                            'descripcion': t.description or 'Sin descripción',
                            'dosis': t.dosis or 'N/A',
                            'observaciones': t.observations or ''
                        } for t in recent_treats
                    ]
                }

            # 3. Métrica: PRODUCCIÓN (Pesajes y Controles Biométricos)
            if 'production' in metrics:
                total_controls = Control.query.filter(
                    Control.finca_id == finca_id,
                    Control.checkup_date >= start_date.date()
                ).count()

                # Peso promedio de los animales
                avg_weight_query = db.session.query(func.avg(Animals.weight)).filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo
                ).scalar()
                avg_weight = round(float(avg_weight_query), 2) if avg_weight_query else 0.0

                report_data['summary']['total_controles_periodo'] = total_controls
                report_data['summary']['peso_promedio_kg'] = avg_weight

                # Historial de pesajes recientes
                recent_controls = Control.query.filter(
                    Control.finca_id == finca_id
                ).order_by(Control.checkup_date.desc()).limit(10).all()

                report_data['details']['produccion_y_biometria'] = {
                    'total_controles': total_controls,
                    'peso_promedio_general_kg': avg_weight,
                    'ultimos_controles': [
                        {
                            'fecha': c.checkup_date.isoformat() if c.checkup_date else '',
                            'peso_kg': c.weight or 0.0,
                            'altura_cm': c.height or 0.0,
                            'estado_salud': str(c.health_status.value) if hasattr(c.health_status, 'value') else str(c.health_status)
                        } for c in recent_controls
                    ]
                }

            # 4. Métrica: CAMPOS (Potreros y Capacidad)
            if 'fields' in metrics:
                total_fields = Fields.query.filter(Fields.finca_id == finca_id).count()

                # Calcular área total
                fields_list = Fields.query.filter(Fields.finca_id == finca_id).all()
                total_area = 0.0
                for f in fields_list:
                    try:
                        total_area += float(f.area) if f.area else 0.0
                    except (ValueError, TypeError):
                        pass

                report_data['summary']['total_potreros'] = total_fields
                report_data['summary']['area_total_hectareas'] = round(total_area, 2)

                report_data['details']['gestion_potreros'] = {
                    'total_potreros': total_fields,
                    'area_total_ha': round(total_area, 2),
                    'potreros': [
                        {
                            'nombre': f.name,
                            'capacidad_cabezas': f.capacity or '0',
                            'estado': str(f.state.value) if hasattr(f.state, 'value') else str(f.state),
                            'area_ha': f.area or '0',
                            'ubicacion': f.ubication or 'Sin especificar'
                        } for f in fields_list
                    ]
                }

            # 5. Métrica: FINANZAS (Transacciones, Ingresos, Egresos)
            if 'finance' in metrics:
                transactions = Transaction.query.filter(
                    Transaction.finca_id == finca_id,
                    Transaction.date >= start_date.date()
                ).all()
                
                ingresos = sum(t.amount for t in transactions if t.type == 'INGRESO')
                egresos = sum(t.amount for t in transactions if t.type == 'EGRESO')
                balance = ingresos - egresos
                
                report_data['summary']['ingresos_totales'] = float(ingresos)
                report_data['summary']['egresos_totales'] = float(egresos)
                report_data['summary']['balance_financiero'] = float(balance)
                
                recent_transactions = sorted(transactions, key=lambda x: x.date, reverse=True)[:15]
                
                report_data['details']['finanzas_y_economia'] = {
                    'total_transacciones': len(transactions),
                    'ingresos': float(ingresos),
                    'egresos': float(egresos),
                    'balance': float(balance),
                    'ultimos_movimientos': [
                        {
                            'fecha': t.date.isoformat() if t.date else '',
                            'tipo': t.type,
                            'categoria': t.category,
                            'monto': float(t.amount),
                            'descripcion': t.description or ''
                        } for t in recent_transactions
                    ]
                }
                
            # 6. Métrica: LECHERIA (Producción de leche)
            if 'milk' in metrics:
                milk_records = MilkProduction.query.filter(
                    MilkProduction.finca_id == finca_id,
                    MilkProduction.date >= start_date.date(),
                    MilkProduction.is_deleted == False
                ).all()
                
                total_litros = sum(m.liters for m in milk_records)
                
                report_data['summary']['total_leche_litros'] = float(total_litros)
                report_data['summary']['total_ordenos'] = len(milk_records)
                
                recent_milk = sorted(milk_records, key=lambda x: x.date, reverse=True)[:15]
                
                report_data['details']['produccion_lechera'] = {
                    'total_litros': float(total_litros),
                    'total_registros': len(milk_records),
                    'ultimos_ordenos': [
                        {
                            'fecha': m.date.isoformat() if m.date else '',
                            'jornada': m.milking_time,
                            'litros': float(m.liters),
                            'observaciones': m.observations or ''
                        } for m in recent_milk
                    ]
                }
                
            # 7. Métrica: AGRICULTURA (Cultivos)
            if 'agriculture' in metrics:
                crops = CropActivity.query.filter(
                    CropActivity.finca_id == finca_id,
                    CropActivity.date >= start_date.date(),
                    CropActivity.is_deleted == False
                ).all()
                
                report_data['summary']['actividades_agricolas_periodo'] = len(crops)
                
                recent_crops = sorted(crops, key=lambda x: x.date, reverse=True)[:15]
                
                report_data['details']['actividades_agricolas'] = {
                    'total_actividades': len(crops),
                    'ultimas_actividades': [
                        {
                            'fecha': c.date.isoformat() if c.date else '',
                            'tipo': c.activity_type,
                            'cultivo': c.crop_type,
                            'costo': float(c.cost) if c.cost else 0.0,
                            'observaciones': c.observations or ''
                        } for c in recent_crops
                    ]
                }

            identity = get_jwt_identity()
            user_name = identity.get('fullname', 'Usuario') if isinstance(identity, dict) else str(identity)
            return APIResponse.success({
                'report': report_data,
                'metadata': {
                    'generated_at': now.isoformat(),
                    'user': user_name,
                    'finca_id': finca_id
                }
            })

        except Exception as e:
            import traceback
            # Loguear error para diagnóstico rápido en desarrollo
            print("Error en CustomReports:", str(e))
            traceback.print_exc()
            return APIResponse.error(f"Error generando reporte personalizado: {str(e)}")
