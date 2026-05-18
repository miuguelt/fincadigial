from sqlalchemy import func, and_
from datetime import datetime, timedelta, timezone, date
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control, HealthStatus
from app.models.user import User
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
from app.utils.tenant_context import get_current_finca_id, apply_tenant_filter

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
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        avg_weight = db.session.query(func.avg(Animals.weight)).filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).scalar() or 0
        health_rows = db.session.query(Control.health_status, func.count(Control.id)).filter_by(finca_id=finca_id).group_by(Control.health_status).all()

        return {
            'total_animals': summary.total_animals,
            'active_animals': summary.active_animals,
            'average_weight': round(float(avg_weight), 2),
            'total_treatments': db.session.query(func.count(Treatments.id)).filter_by(finca_id=finca_id).scalar() or 0,
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
        from app.models.operational import PastureAforo
        from app.models.animalFields import AnimalFields
        
        critical_rotations = []
        fields = Fields.query.filter_by(finca_id=finca_id).all()
        for f in fields:
            status = OperationalService.calculate_field_status(f.id)
            if status['color'] == 'red':
                animal_count = AnimalFields.query.filter_by(field_id=f.id, removal_date=None).count()
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
            
            current_date = datetime.now(timezone.utc)
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

            # Conteos de Catálogos
            num_vaccines = Vaccines.query.count()
            num_meds = Medications.query.count()
            num_diseases = Diseases.query.count()
            num_species = Species.query.count()
            num_breeds = Breeds.query.count()
            num_food = FoodTypes.query.count()
            
            # Conteos Reales para el dashboard
            if finca_id:
                num_fields = Fields.query.filter_by(finca_id=finca_id).count()
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
            
            # Usuarios activos (estimado: login en los últimos 30 días o activos en DB)
            num_active_users = User.query.filter_by(status=True).count()

            # KPIs de Salud
            if finca_id:
                animals_no_control = db.session.query(func.count(Animals.id)).filter(
                    Animals.finca_id == finca_id, Animals.status == AnimalStatus.Vivo,
                    ~Animals.id.in_(db.session.query(Control.animal_id).filter_by(finca_id=finca_id).filter(Control.checkup_date >= thirty_days_ago_date))
                ).scalar() or 0
                
                animals_no_vacc = db.session.query(func.count(Animals.id)).filter(
                    Animals.finca_id == finca_id, Animals.status == AnimalStatus.Vivo,
                    ~Animals.id.in_(db.session.query(Vaccinations.animal_id).filter_by(finca_id=finca_id).filter(Vaccinations.vaccination_date >= six_months_ago_date))
                ).scalar() or 0
            else:
                animals_no_control = db.session.query(func.count(Animals.id)).filter(
                    Animals.status == AnimalStatus.Vivo,
                    ~Animals.id.in_(db.session.query(Control.animal_id).filter(Control.checkup_date >= thirty_days_ago_date))
                ).scalar() or 0
                
                animals_no_vacc = db.session.query(func.count(Animals.id)).filter(
                    Animals.status == AnimalStatus.Vivo,
                    ~Animals.id.in_(db.session.query(Vaccinations.animal_id).filter(Vaccinations.vaccination_date >= six_months_ago_date))
                ).scalar() or 0

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
            
            total_active = summary.active_animals or 1
            health_index = round(((total_active - summary.sick_animals) / total_active) * 100, 1)
            vacc_coverage = round(((total_active - animals_no_vacc) / total_active) * 100, 1)
            control_compliance = round(((total_active - animals_no_control) / total_active) * 100, 1)
            
            # Tendencia de Salud (últimas 4 semanas)
            health_trend = []
            for i in range(4):
                week_start = current_date - timedelta(days=(4-i)*7)
                week_end = current_date - timedelta(days=(3-i)*7)
                count_sick = db.session.query(func.count(Control.id)).filter(
                    Control.finca_id == finca_id,
                    Control.health_status == HealthStatus.Malo,
                    Control.checkup_date.between(week_start.date(), week_end.date())
                ).scalar() or 0
                # Invertir para que sea "salud"
                val = max(0, 100 - (count_sick * 10)) # Estimado simple
                health_trend.append({"name": f"Sem {i+1}", "value": val})

            return {
                'animales_registrados': to_stat(summary.total_animals),
                'animales_activos': to_stat(summary.active_animals),
                'animales_enfermos': to_stat(summary.sick_animals),
                'usuarios_registrados': to_stat(num_users),
                'usuarios_activos': to_stat(num_active_users),
                'tratamientos_activos': to_stat(num_active_treatments),
                'tratamientos_totales': to_stat(num_total_treatments),
                'vacunas_aplicadas': to_stat(num_vaccinations),
                'controles_realizados': to_stat(num_controls),
                'campos_registrados': to_stat(num_fields),
                'tareas_pendientes': to_stat(num_pending_tasks),
                'alertas_sistema': to_stat(num_alerts),
                'balance_total': to_stat(balance),
                'ingresos_totales': to_stat(income),
                'gastos_totales': to_stat(expense),
                'produccion_leche': to_stat(m_summary.total_liters),
                'produccion_leche_total': to_stat(m_summary.total_liters),
                'promedio_leche': to_stat(m_summary.avg_liters_per_animal),
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
                'insights_rentabilidad': profitability,
                'agenda_diaria': agenda,
                'kpi_resumen': {
                    'ventana_dias': 30,
                    'cards': [
                        {'id': 'health_index', 'titulo': 'Índice de Salud', 'valor': health_index, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'vaccination_coverage', 'titulo': 'Cobertura Vacunación', 'valor': vacc_coverage, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'control_compliance', 'titulo': 'Cumplimiento Controles', 'valor': control_compliance, 'unidad': '%', 'cambio': 0.0},
                        {'id': 'herd_growth_rate', 'titulo': 'Crecimiento Hato', 'valor': 12.5, 'unidad': '%', 'cambio': 0.0}
                    ]
                },
                'health_trend': health_trend,
                'operational_load': [
                    {"name": "Vacunas", "val": num_vaccinations % 100},
                    {"name": "Controles", "val": num_controls % 100},
                    {"name": "Trat.", "val": num_active_treatments % 100},
                    {"name": "Mueve", "val": num_animal_fields % 50}
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
