from sqlalchemy import func, and_
from datetime import datetime, timedelta, date, UTC
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control, HealthStatus
from app.models.user import User
from app.models.user_finca import UserFinca
from app.models.fields import Fields
from app.models.medications import Medications
from app.models.vaccines import Vaccines
from app.models.diseases import Diseases
from app.models.species import Species
from app.models.breeds import Breeds
from app.models.animalFields import AnimalFields
from app.models.animalDiseases import AnimalDiseases
from app.models.geneticImprovements import GeneticImprovements
from app.models.foodTypes import FoodTypes
import logging

logger = logging.getLogger(__name__)

from app.models.livestock_summary import LivestockSummary
from app.models.extended_summaries import FinancialSummary, MilkSummary
from app.utils.tenant_context import get_current_finca_id, get_current_user_role

class DashboardService:
    @staticmethod
    def _round(val, precision=0):
        if val is None: return 0.0
        try:
            if precision == 0: return round(float(val))
            factor = 10 ** precision
            return round(float(val) * factor) / float(factor)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def calculate_percentage_change(current_value, previous_value, cap=999.0):
        current = current_value or 0
        previous = previous_value or 0
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        try:
            change = ((float(current) - float(previous)) / float(previous)) * 100
            if cap is not None:
                change = max(min(change, float(cap)), -float(cap))
            return DashboardService._round(change, 1)
        except Exception:
            return 0.0

    @staticmethod
    def get_basic_stats(finca_id=None):
        if finca_id is None:
            finca_id = get_current_finca_id()

        summary = LivestockSummary.get_for_finca(finca_id)
        week_ago = datetime.now(UTC) - timedelta(days=7)
        # LivestockSummary ya descuenta los borrados; estas tres consultas van
        # directas a las tablas y deben hacer lo mismo para no contradecirlo.
        avg_weight = db.session.query(func.avg(Animals.weight)).filter_by(
            finca_id=finca_id, status=AnimalStatus.Vivo, is_deleted=False
        ).scalar() or 0
        health_rows = db.session.query(Control.health_status, func.count(Control.id)).filter_by(
            finca_id=finca_id, is_deleted=False
        ).group_by(Control.health_status).all()

        return {
            'total_animals': summary.total_animals,
            'active_animals': summary.active_animals,
            'average_weight': round(float(avg_weight), 2),
            'total_treatments': db.session.query(func.count(Treatments.id)).filter_by(
                finca_id=finca_id, is_deleted=False
            ).scalar() or 0,
            'health_summary': {(h.value if hasattr(h, 'value') else str(h)): c for h, c in health_rows},
            'last_summary_update': summary.last_recalculation.isoformat() if summary.last_recalculation else None
        }

    @staticmethod
    def get_alerts_summary(finca_id):
        """Obtiene un resumen categorizado de alertas: Animales vs Finca"""
        from app.models.alerts import AnimalAlert, AlertPriority

        animal_alerts = AnimalAlert.query.filter(
            AnimalAlert.finca_id == finca_id,
            AnimalAlert.is_read == False,
            AnimalAlert.animal_id != None
        ).order_by(AnimalAlert.triggered_at.desc()).limit(10).all()

        finca_alerts = AnimalAlert.query.filter(
            AnimalAlert.finca_id == finca_id,
            AnimalAlert.is_read == False,
            AnimalAlert.animal_id == None
        ).order_by(AnimalAlert.triggered_at.desc()).limit(10).all()

        return {
            "animal_alerts": [a.to_namespace_dict() for a in animal_alerts],
            "finca_alerts": [a.to_namespace_dict() for a in finca_alerts],
            "counts": {
                "critical": AnimalAlert.query.filter_by(finca_id=finca_id, is_read=False, priority=AlertPriority.CRITICAL).count(),
                "high": AnimalAlert.query.filter_by(finca_id=finca_id, is_read=False, priority=AlertPriority.HIGH).count()
            }
        }

    @staticmethod
    def get_profitability_insights(finca_id):
        """Calcula KPIs de rentabilidad cruzando Finanzas y Producción"""
        from app.models.financial import Transaction, TransactionType, TransactionCategory
        from app.models.milk_production import MilkProduction
        from sqlalchemy import func

        # 1. Total ingresos por leche (Estimado si no hay transacciones ligadas)
        milk_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.finca_id == finca_id,
            Transaction.transaction_type == TransactionType.Income,
            Transaction.category == TransactionCategory.Milk
        ).scalar() or 0

        # 2. Total litros producidos
        total_liters = db.session.query(func.sum(MilkProduction.liters)).filter(
            MilkProduction.finca_id == finca_id
        ).scalar() or 1

        # 3. Costos de insumos (Medicinas + Comida)
        input_costs = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.finca_id == finca_id,
            Transaction.transaction_type == TransactionType.Expense,
            Transaction.category.in_([TransactionCategory.Medication, TransactionCategory.Food])
        ).scalar() or 0

        # Asegurar tipos flotantes para evitar TypeError con Decimal (SQLAlchemy Numeric)
        f_milk_income = float(milk_income or 0)
        f_total_liters = float(total_liters or 1)
        f_input_costs = float(input_costs or 0)

        return {
            "income_per_liter": round(f_milk_income / f_total_liters, 2),
            "cost_per_liter": round(f_input_costs / f_total_liters, 2),
            "margin_per_liter": round((f_milk_income - f_input_costs) / f_total_liters, 2),
            "efficiency_ratio": round(f_milk_income / (f_input_costs or 1), 2)
        }

    @staticmethod
    def get_daily_operational_agenda(finca_id):
        """Genera el reporte de tareas críticas para el día de hoy"""
        from app.services.operational_service import OperationalService
        from app.models.tasks import Tasks, TaskStatus

        today = date.today()

        # 1. Alertas de Infraestructura
        infra_alerts = OperationalService.get_maintenance_alerts(finca_id)

        # 2. Rotaciones de Pasto Críticas (Potreros en Rojo con animales)
        from app.models.animalFields import AnimalFields

        critical_rotations = []
        fields = Fields.query.filter_by(finca_id=finca_id).all()
        for f in fields:
            status = OperationalService.calculate_field_status(f.id)
            if status:
                # Lógica local para determinar si el potrero está en estado crítico (red)
                # entry_height >= 20 es óptimo, exit_height <= 5 es recuperación (yellow)
                # Si no se cumple lo anterior, se considera sobrepastoreo o crítico (red)
                entry_height = status.get('entry_height')
                exit_height = status.get('exit_height')
                
                is_red = False
                if entry_height and entry_height >= 20:
                    pass # Óptimo (green)
                elif exit_height and exit_height <= 5:
                    pass # Recuperación (yellow)
                else:
                    is_red = True # Crítico (red)
                
                if is_red:
                    from app.models.animals import Animals, AnimalStatus
                    animal_count = AnimalFields.query.join(Animals).filter(
                        AnimalFields.field_id == f.id,
                        AnimalFields.removal_date == None,
                        AnimalFields.is_deleted == False,
                        Animals.is_deleted == False,
                        Animals.status == AnimalStatus.Vivo
                    ).count()
                    if animal_count > 0:
                        critical_rotations.append({
                            "field_name": f.name,
                            "animal_count": animal_count,
                            "reason": "Sobrepastoreo detectado"
                        })

        # 3. Tareas Pendientes del sistema de Agenda
        pending_tasks = Tasks.query.filter(
            Tasks.finca_id == finca_id,
            Tasks.status != TaskStatus.COMPLETED,
            Tasks.due_date <= (datetime.now() + timedelta(days=1))
        ).limit(5).all()

        return {
            "date": today.isoformat(),
            "infrastructure": infra_alerts,
            "rotations": critical_rotations,
            "tasks": [t.to_namespace_dict() for t in pending_tasks],
            "total_critical_actions": len(infra_alerts) + len(critical_rotations) + len(pending_tasks)
        }

    @staticmethod
    def get_complete_stats(finca_id=None):
        try:
            if finca_id is None:
                finca_id = get_current_finca_id()

            summary = LivestockSummary.get_for_finca(finca_id)

            # Forzar recalculo si es muy viejo o si estamos en debug/hard-sync
            # summary.recalculate() # Podría ser pesado si hay miles de animales, pero con 500 está bien.

            current_date = datetime.now(UTC)
            thirty_days_ago = current_date - timedelta(days=30)
            thirty_days_ago_date = thirty_days_ago.date()
            six_months_ago_date = (current_date - timedelta(days=180)).date()

            def to_stat(valor, current_total=None, prev_total=None):
                # Asegurar que valor sea numérico para serialización segura
                val_clean = valor if valor is not None else 0
                return {
                    'valor': val_clean,
                    'cambio_porcentual': DashboardService.calculate_percentage_change(current_total, prev_total) if current_total is not None else 0,
                    'tendencia': {
                        'periodo_actual': current_total if current_total is not None else val_clean,
                        'periodo_anterior': prev_total if prev_total is not None else val_clean
                    }
                }

            # Conteos de Catálogos (raramente cambian)
            num_vaccines = int(db.session.query(func.count(Vaccines.id)).scalar() or 0)
            num_meds = int(db.session.query(func.count(Medications.id)).scalar() or 0)
            num_diseases = int(db.session.query(func.count(Diseases.id)).scalar() or 0)
            num_species = int(db.session.query(func.count(Species.id)).scalar() or 0)
            num_breeds = int(db.session.query(func.count(Breeds.id)).scalar() or 0)
            num_food = int(db.session.query(func.count(FoodTypes.id)).scalar() or 0)

            # Conteos Reales para el dashboard
            if finca_id:
                num_fields = Fields.query.filter_by(finca_id=finca_id).count()
                # Usuarios de la finca usando tabla UserFinca (multi-tenant correcto)
                num_users = UserFinca.query.filter_by(finca_id=finca_id, is_active=True).count()
            else:
                num_fields = Fields.query.count()
                num_users = User.query.count()

            # Tratamientos activos (ej: no terminados o de los últimos 30 días)
            if finca_id:
                num_active_treatments = db.session.query(func.count(Treatments.id)).filter_by(finca_id=finca_id).scalar() or 0
                num_total_treatments = db.session.query(func.count(Treatments.id)).filter_by(finca_id=finca_id).scalar() or 0
                num_vaccinations = db.session.query(func.count(Vaccinations.id)).filter_by(finca_id=finca_id).scalar() or 0
                num_controls = db.session.query(func.count(Control.id)).filter_by(finca_id=finca_id).scalar() or 0
            else:
                num_active_treatments = db.session.query(func.count(Treatments.id)).scalar() or 0
                num_total_treatments = db.session.query(func.count(Treatments.id)).scalar() or 0
                num_vaccinations = db.session.query(func.count(Vaccinations.id)).scalar() or 0
                num_controls = db.session.query(func.count(Control.id)).scalar() or 0

            # Usuarios activos de la finca (con membresía activa en UserFinca + status activo en User)
            if finca_id:
                num_active_users = (
                    db.session.query(func.count(UserFinca.id))
                    .join(User, UserFinca.user_id == User.id)
                    .filter(
                        UserFinca.finca_id == finca_id,
                        UserFinca.is_active == True,
                        User.status == True
                    ).scalar() or 0
                )
            else:
                num_active_users = User.query.filter_by(status=True).count()

            # KPIs de Salud (LEFT JOIN es más rápido que NOT IN subquery)
            if finca_id:
                animals_no_control = int(db.session.query(func.count(Animals.id)).select_from(Animals).outerjoin(
                    Control,
                    and_(
                        Control.animal_id == Animals.id,
                        Control.finca_id == finca_id,
                        Control.checkup_date >= thirty_days_ago_date
                    )
                ).filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo,
                    Control.id == None
                ).scalar() or 0)

                animals_no_vacc = int(db.session.query(func.count(Animals.id)).select_from(Animals).outerjoin(
                    Vaccinations,
                    and_(
                        Vaccinations.animal_id == Animals.id,
                        Vaccinations.finca_id == finca_id,
                        Vaccinations.vaccination_date >= six_months_ago_date
                    )
                ).filter(
                    Animals.finca_id == finca_id,
                    Animals.status == AnimalStatus.Vivo,
                    Vaccinations.id == None
                ).scalar() or 0)
            else:
                animals_no_control = int(db.session.query(func.count(Animals.id)).select_from(Animals).outerjoin(
                    Control,
                    and_(
                        Control.animal_id == Animals.id,
                        Control.checkup_date >= thirty_days_ago_date
                    )
                ).filter(
                    Animals.status == AnimalStatus.Vivo,
                    Control.id == None
                ).scalar() or 0)

                animals_no_vacc = int(db.session.query(func.count(Animals.id)).select_from(Animals).outerjoin(
                    Vaccinations,
                    and_(
                        Vaccinations.animal_id == Animals.id,
                        Vaccinations.vaccination_date >= six_months_ago_date
                    )
                ).filter(
                    Animals.status == AnimalStatus.Vivo,
                    Vaccinations.id == None
                ).scalar() or 0)

            # Relaciones y Otros
            if finca_id:
                num_animal_fields = AnimalFields.query.filter_by(finca_id=finca_id).count()
                num_animal_diseases = AnimalDiseases.query.filter_by(finca_id=finca_id).count()
                num_genetic = GeneticImprovements.query.filter_by(finca_id=finca_id).count()

                from app.models.treatment_medications import TreatmentMedications
                from app.models.treatment_vaccines import TreatmentVaccines
                num_treat_meds = TreatmentMedications.query.join(Treatments).filter(Treatments.finca_id == finca_id).count()
                num_treat_vaccs = TreatmentVaccines.query.join(Treatments).filter(Treatments.finca_id == finca_id).count()
            else:
                num_animal_fields = AnimalFields.query.count()
                num_animal_diseases = AnimalDiseases.query.count()
                num_genetic = GeneticImprovements.query.count()

                from app.models.treatment_medications import TreatmentMedications
                from app.models.treatment_vaccines import TreatmentVaccines
                num_treat_meds = TreatmentMedications.query.count()
                num_treat_vaccs = TreatmentVaccines.query.count()

            # Tareas y Alertas
            from app.models.tasks import Tasks, TaskStatus
            from app.models.alerts import AnimalAlert

            if finca_id:
                num_pending_tasks = Tasks.query.filter_by(finca_id=finca_id).filter(Tasks.status != TaskStatus.COMPLETED).count()
                num_alerts = AnimalAlert.query.filter_by(finca_id=finca_id, is_read=False).count()
            else:
                num_pending_tasks = Tasks.query.filter(Tasks.status != TaskStatus.COMPLETED).count()
                num_alerts = AnimalAlert.query.filter_by(is_read=False).count()

            # Resúmenes Financieros y Lecheros con manejo de nulos
            f_summary = FinancialSummary.get_for_finca(finca_id)
            m_summary = MilkSummary.get_for_finca(finca_id)

            # Insights y Agenda con manejo de errores interno
            try:
                profitability = DashboardService.get_profitability_insights(finca_id)
            except Exception as e:
                logger.error(f"Error in profitability insights: {e}")
                profitability = []

            try:
                agenda = DashboardService.get_daily_operational_agenda(finca_id)
            except Exception as e:
                logger.error(f"Error in daily agenda: {e}")
                agenda = {"tareas_hoy": [], "alertas_criticas": []}

            # Conversión segura a float para tipos Numeric
            balance = float(f_summary.balance) if f_summary.balance is not None else 0.0
            income = float(f_summary.total_income) if f_summary.total_income is not None else 0.0
            expense = float(f_summary.total_expense) if f_summary.total_expense is not None else 0.0

            if not summary.active_animals or summary.active_animals == 0:
                health_index = 0.0
                vacc_coverage = 0.0
                control_compliance = 0.0
                herd_growth_value = 0.0
            else:
                total_active = summary.active_animals
                health_index = round(((total_active - summary.sick_animals) / total_active) * 100, 1)
                vacc_coverage = round(((total_active - animals_no_vacc) / total_active) * 100, 1)
                control_compliance = round(((total_active - animals_no_control) / total_active) * 100, 1)

                thirty_days_ago = current_date - timedelta(days=30)
                recent_additions = db.session.query(func.count(Animals.id)).filter(
                    Animals.finca_id == finca_id,
                    Animals.created_at >= thirty_days_ago
                ).scalar() or 0
                herd_growth_value = round((recent_additions / total_active) * 100, 1)

            # Tendencia de Salud (últimas 4 semanas)
            health_trend = []
            for i in range(4):
                week_start = current_date - timedelta(days=(4-i)*7)
                week_end = current_date - timedelta(days=(3-i)*7)
                
                base_query_sick = db.session.query(func.count(Control.id)).filter(
                    Control.health_status == HealthStatus.Malo,
                    Control.checkup_date.between(week_start.date(), week_end.date())
                )
                base_query_total = db.session.query(func.count(Control.id)).filter(
                    Control.checkup_date.between(week_start.date(), week_end.date())
                )
                
                if finca_id:
                    base_query_sick = base_query_sick.filter(Control.finca_id == finca_id)
                    base_query_total = base_query_total.filter(Control.finca_id == finca_id)
                    
                count_sick = base_query_sick.scalar() or 0
                count_total = base_query_total.scalar() or 0
                
                # Invertir para que sea "salud"
                if count_total > 0:
                    val = max(0, 100 - ((count_sick / count_total) * 100))
                else:
                    # Si no hay controles y no hay animales, la salud es 0 (no hay datos)
                    val = 100 if (summary.active_animals and summary.active_animals > 0) else 0
                    
                health_trend.append({"name": f"Sem {i+1}", "value": round(val, 1)})

            # Role-based filtering: roles with full access vs restricted
            current_role = get_current_user_role()
            admin_roles = {'Administrador', 'Propietario', 'Capataz'}
            is_admin_level = current_role in admin_roles

            return {
                'animales_registrados': to_stat(summary.total_animals),
                'animales_activos': to_stat(summary.active_animals),
                'animales_enfermos': to_stat(summary.sick_animals),
                'usuarios_registrados': to_stat(num_users) if is_admin_level else to_stat(None),
                'usuarios_activos': to_stat(num_active_users) if is_admin_level else to_stat(None),
                'tratamientos_activos': to_stat(num_active_treatments),
                'tratamientos_totales': to_stat(num_total_treatments),
                'vacunas_aplicadas': to_stat(num_vaccinations),
                'controles_realizados': to_stat(num_controls),
                'campos_registrados': to_stat(num_fields),
                'tareas_pendientes': to_stat(num_pending_tasks) if is_admin_level else to_stat(None),
                'alertas_sistema': to_stat(num_alerts),
                'balance_total': to_stat(balance) if is_admin_level else to_stat(None),
                'ingresos_totales': to_stat(income) if is_admin_level else to_stat(None),
                'gastos_totales': to_stat(expense) if is_admin_level else to_stat(None),
                'produccion_leche': to_stat(m_summary.total_liters) if is_admin_level else to_stat(None),
                'produccion_leche_total': to_stat(m_summary.total_liters) if is_admin_level else to_stat(None),
                'promedio_leche': to_stat(m_summary.avg_liters_per_animal) if is_admin_level else to_stat(None),
                'catalogo_vacunas': to_stat(num_vaccines),
                'catalogo_medicamentos': to_stat(num_meds),
                'catalogo_enfermedades': to_stat(num_diseases),
                'catalogo_especies': to_stat(num_species),
                'catalogo_razas': to_stat(num_breeds),
                'catalogo_tipos_alimento': to_stat(num_food),
                'animales_por_campo': to_stat(num_animal_fields),
                'animales_por_enfermedad': to_stat(num_animal_diseases),
                'mejoras_geneticas': to_stat(num_genetic),
                'tratamientos_medicamentos': to_stat(num_treat_meds),
                'tratamientos_vacunas': to_stat(num_treat_vaccs),
                'insights_rentabilidad': profitability if is_admin_level else [],
                'agenda_diaria': agenda if is_admin_level else {"tareas_hoy": [], "alertas_criticas": []},
                'kpi_resumen': {
                    'ventana_dias': 30,
                    'cards': [
                        {'id': 'health_index', 'titulo': 'Índice de Salud', 'valor': health_index, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'vaccination_coverage', 'titulo': 'Cobertura Vacunación', 'valor': vacc_coverage, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'control_compliance', 'titulo': 'Cumplimiento Controles', 'valor': control_compliance, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'herd_growth_rate', 'titulo': 'Crecimiento Hato', 'valor': herd_growth_value, 'unidad': '%', 'cambio': 0.0}
                    ]
                },
                'health_trend': health_trend,
                'operational_load': [
                    {"name": "Vacunas", "val": num_vaccinations},
                    {"name": "Controles", "val": num_controls},
                    {"name": "Trat.", "val": num_active_treatments},
                    {"name": "Mueve", "val": num_animal_fields}
                ]
            }
        except Exception as e:
            logger.error(f"CRITICAL ERROR in get_complete_stats: {e}", exc_info=True)
            # Retornar estructura mínima válida para no romper el frontend
            return {
                'animales_registrados': {'valor': 0, 'cambio_porcentual': 0, 'tendencia': {'periodo_actual': 0, 'periodo_anterior': 0}},
                'balance_total': {'valor': 0, 'cambio_porcentual': 0, 'tendencia': {'periodo_actual': 0, 'periodo_anterior': 0}},
                'produccion_leche_total': {'valor': 0, 'cambio_porcentual': 0, 'tendencia': {'periodo_actual': 0, 'periodo_anterior': 0}},
                'agenda_diaria': {"tareas_hoy": [], "alertas_criticas": []},
                'insights_rentabilidad': [],
                'error': str(e)
            }
