from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from datetime import datetime, timedelta
import logging
import decimal
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.breeds import Breeds
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter, get_current_finca_id
from app.models.system_content import SystemContent

legacy_ns = Namespace(
    "analytics",
    description="📊 Analytics y Dashboard - Sistema de Gestión Integral",
    path="/analytics",
)
logger = logging.getLogger(__name__)


def _tf(query, model_class):
    """Helper local para aplicar filtro de tenant de forma concisa."""
    return apply_tenant_filter(query, model_class)


def _round(val, precision=0):
    """Helper for environments with limited round() overloads."""
    if val is None:
        return 0.0
    try:
        if precision == 0:
            return round(float(val))
        factor = 10**precision
        return round(float(val) * factor) / float(factor)
    except (ValueError, TypeError):
        return 0.0


def calculate_percentage_change(current_value, previous_value, cap=999.0):
    """Calcula variaciones porcentuales controlando desbordes por bases muy pequeñas."""
    current = current_value or 0
    previous = previous_value or 0
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    try:
        current_f = float(current)
        prev_f = float(previous)
        change = (current_f - prev_f) / prev_f * 100
    except Exception:
        return 0.0
    if cap is not None:
        max_change = float(cap)
        if change > max_change:
            change = max_change
        elif change < -max_change:
            change = -max_change
    return _round(change, 1)


def safe_percentage(part, whole, precision=1):
    """Calcula porcentajes evitando divisiones por cero."""
    if not whole:
        return 0.0
    try:
        return _round(float(part) / float(whole) * 100, precision)
    except Exception:
        return 0.0


def percentage_point_delta(current_value, previous_value):
    """Diferencia en puntos porcentuales o valores directos entre periodos."""
    current = float(current_value or 0)
    previous = float(previous_value or 0)
    return _round(current - previous, 1)


def build_kpi_cards(context):
    """Genera las tarjetas KPI utilizadas por el dashboard del frontend."""
    window_days = context.get("window_days", 30)
    active_animals = context.get("active_animals") or 0
    total_animals = context.get("total_animals") or 0
    cards = []

    def create_card(
        card_id, title, value, previous, unit, description, icon, extra=None
    ):
        cards.append(
            {
                "id": card_id,
                "titulo": title,
                "valor": _round(value, 2) if isinstance(value, float) else value,
                "unidad": unit,
                "cambio": percentage_point_delta(value, previous),
                "tendencia": {
                    "periodo_actual": _round(value, 2),
                    "periodo_anterior": _round(previous, 2),
                    "ventana_dias": window_days,
                },
                "descripcion": description,
                "icono": icon,
                "detalle": extra or {},
            }
        )

    health_stats = context.get("health_status_stats") or {}
    healthy_animals = sum(
        health_stats.get(key, 0) for key in ("excelente", "bueno", "sano")
    )
    previous_healthy = max(
        active_animals - (context.get("animals_critical_health_prev") or 0), 0
    )
    health_value = safe_percentage(healthy_animals, active_animals)
    health_previous = safe_percentage(previous_healthy, active_animals)
    create_card(
        "health_index",
        "Índice de salud del hato",
        health_value,
        health_previous,
        "%",
        "Porcentaje de animales evaluados como Sano/Bueno/Excelente en los últimos controles.",
        "heart-pulse",
        {
            "animales_saludables": healthy_animals,
            "animales_criticos": context.get("animals_critical_health", 0),
            "total_activos": active_animals,
        },
    )
    animals_without_vaccination = context.get("animals_without_vaccination") or 0
    animals_without_vaccination_prev = (
        context.get("animals_without_vaccination_prev") or 0
    )
    vaccination_value = max(
        0.0, 100.0 - safe_percentage(animals_without_vaccination, active_animals)
    )
    vaccination_previous = max(
        0.0, 100.0 - safe_percentage(animals_without_vaccination_prev, active_animals)
    )
    create_card(
        "vaccination_coverage",
        "Cobertura de vacunación",
        vaccination_value,
        vaccination_previous,
        "%",
        "Animales con esquemas de vacunación actualizados (≤ 6 meses).",
        "shield-check",
        {
            "pendientes": animals_without_vaccination,
            "pendientes_prev": animals_without_vaccination_prev,
        },
    )
    animals_without_control = context.get("animals_without_control") or 0
    animals_without_control_prev = context.get("animals_without_control_prev") or 0
    control_value = max(
        0.0, 100.0 - safe_percentage(animals_without_control, active_animals)
    )
    control_previous = max(
        0.0, 100.0 - safe_percentage(animals_without_control_prev, active_animals)
    )
    create_card(
        "control_compliance",
        "Cumplimiento de controles",
        control_value,
        control_previous,
        "%",
        "Porcentaje de animales con chequeo veterinario en los últimos 30 días.",
        "stethoscope",
        {
            "sin_control": animals_without_control,
            "sin_control_prev": animals_without_control_prev,
        },
    )
    recent_deaths = context.get("recent_deaths") or 0
    recent_deaths_previous = context.get("recent_deaths_previous") or 0
    mortality_value = safe_percentage(recent_deaths, total_animals)
    mortality_previous = safe_percentage(recent_deaths_previous, total_animals)
    create_card(
        "mortality_rate_30d",
        "Tasa de mortalidad 30d",
        mortality_value,
        mortality_previous,
        "%",
        "Bajas registradas en los últimos 30 días sobre el total del hato.",
        "skull",
        {"muertes_30d": recent_deaths, "muertes_previas": recent_deaths_previous},
    )
    recent_sales = context.get("recent_sales") or 0
    recent_sales_previous = context.get("recent_sales_previous") or 0
    sales_value = safe_percentage(recent_sales, total_animals)
    sales_previous = safe_percentage(recent_sales_previous, total_animals)
    create_card(
        "sales_rate_30d",
        "Tasa de ventas 30d",
        sales_value,
        sales_previous,
        "%",
        "Animales marcados como vendidos durante los últimos 30 días.",
        "shopping-cart",
        {"ventas_30d": recent_sales, "ventas_previas": recent_sales_previous},
    )
    avg_treatments = context.get("avg_treatments_per_animal") or 0
    avg_treatments_prev = context.get("avg_treatments_per_animal_prev") or 0
    create_card(
        "treatments_intensity",
        "Intensidad de tratamientos",
        avg_treatments,
        avg_treatments_prev,
        "tratamientos/animal",
        "Promedio de tratamientos iniciados por animal en los últimos 30 días.",
        "pill",
        {
            "tratamientos_activos": context.get("active_treatments", 0),
            "tratamientos_previos": context.get("active_treatments_previous", 0),
        },
    )
    avg_controls = context.get("avg_controls_per_animal") or 0
    avg_controls_prev = context.get("avg_controls_per_animal_prev") or 0
    create_card(
        "controls_frequency",
        "Frecuencia de controles",
        avg_controls,
        avg_controls_prev,
        "controles/animal",
        "Controles clínicos realizados por animal en los últimos 30 días.",
        "clipboard-check",
        {
            "controles_30d": context.get("recent_controls_count", 0),
            "controles_previos": context.get("recent_controls_previous", 0),
        },
    )
    recent_animals = context.get("recent_animals") or 0
    new_animals_previous_period = context.get("new_animals_previous_period") or 0
    herd_growth_value = safe_percentage(recent_animals, total_animals)
    herd_growth_previous = safe_percentage(new_animals_previous_period, total_animals)
    create_card(
        "herd_growth_rate",
        "Crecimiento del hato 30d",
        herd_growth_value,
        herd_growth_previous,
        "%",
        "Ingreso de nuevos animales respecto al tamaño total del hato.",
        "trending-up",
        {"altas_30d": recent_animals, "altas_previas": new_animals_previous_period},
    )
    total_alerts = context.get("total_alerts") or 0
    total_alerts_previous = context.get("total_alerts_previous") or 0
    alert_pressure_value = safe_percentage(total_alerts, active_animals)
    alert_pressure_previous = safe_percentage(total_alerts_previous, active_animals)
    create_card(
        "alert_pressure",
        "Presión de alertas",
        alert_pressure_value,
        alert_pressure_previous,
        "%",
        "Alertas activas comparadas con el número de animales en seguimiento.",
        "alert-triangle",
        {"alertas_actuales": total_alerts, "alertas_previas": total_alerts_previous},
    )
    pending_tasks = context.get("pending_tasks") or 0
    pending_tasks_previous = context.get("pending_tasks_previous") or 0
    task_load_value = (
        safe_percentage(pending_tasks, active_animals)
        if active_animals
        else pending_tasks
    )
    task_load_previous = (
        safe_percentage(pending_tasks_previous, active_animals)
        if active_animals
        else pending_tasks_previous
    )
    create_card(
        "task_load_index",
        "Índice de carga operativa",
        task_load_value,
        task_load_previous,
        "%" if active_animals else "tareas",
        "Relación de tareas pendientes frente a la capacidad del hato activo.",
        "list-checks",
        {"tareas_pendientes": pending_tasks, "tareas_previas": pending_tasks_previous},
    )
    return cards


dashboard_model = legacy_ns.model(
    "Dashboard",
    {
        "total_animals": fields.Integer(description="Total de animales"),
        "active_animals": fields.Integer(description="Animales activos"),
        "animals_by_status": fields.Raw(description="Animales por estado"),
        "animals_by_sex": fields.Raw(description="Animales por sexo"),
        "average_weight": fields.Float(description="Peso promedio"),
        "total_treatments": fields.Integer(description="Total de tratamientos"),
        "recent_treatments_week": fields.Integer(
            description="Tratamientos últimos 7 días"
        ),
        "total_vaccinations": fields.Integer(description="Total de vacunaciones"),
        "recent_vaccinations_week": fields.Integer(
            description="Vacunaciones últimos 7 días"
        ),
        "total_controls": fields.Integer(description="Total de controles"),
        "health_summary": fields.Raw(description="Resumen de salud"),
        "total_users": fields.Integer(description="Total de usuarios"),
        "active_users": fields.Integer(description="Usuarios activos"),
        "last_summary_update": fields.DateTime(
            description="Última actualización del resumen"
        ),
    },
)
alerts_model = legacy_ns.model(
    "Alerts",
    {
        "alerts": fields.List(fields.Raw, description="Lista de alertas"),
        "statistics": fields.Raw(description="Estadísticas de alertas"),
        "generated_at": fields.DateTime(description="Fecha de generación"),
        "filters_applied": fields.Raw(description="Filtros aplicados"),
    },
)
custom_report_model = legacy_ns.model(
    "CustomReport",
    {
        "report": fields.Raw(description="Datos del informe"),
        "metadata": fields.Raw(description="Metadatos del informe"),
    },
)
medical_history_model = legacy_ns.model(
    "MedicalHistory",
    {
        "animal_info": fields.Raw(description="Información del animal"),
        "summary": fields.Raw(description="Resumen médico"),
        "timeline": fields.List(fields.Raw, description="Línea de tiempo médica"),
        "treatments": fields.List(fields.Raw, description="Tratamientos"),
        "vaccinations": fields.List(fields.Raw, description="Vacunaciones"),
        "controls": fields.List(fields.Raw, description="Controles"),
        "alerts": fields.List(fields.Raw, description="Alertas"),
    },
)
production_stats_model = legacy_ns.model(
    "ProductionStats",
    {
        "weight_trends": fields.List(fields.Raw, description="Tendencias de peso"),
        "growth_rates": fields.List(fields.Raw, description="Tasas de crecimiento"),
        "productivity_metrics": fields.Raw(description="Métricas de productividad"),
        "best_performers": fields.List(fields.Raw, description="Mejores performers"),
        "group_statistics": fields.Raw(description="Estadísticas por grupo"),
        "summary": fields.Raw(description="Resumen"),
    },
)
animal_stats_model = legacy_ns.model(
    "AnimalStats",
    {
        "by_status": fields.Raw(description="Por estado"),
        "by_sex": fields.Raw(description="Por sexo"),
        "by_breed": fields.List(fields.Raw, description="Por raza"),
        "by_age_group": fields.Raw(description="Por grupo de edad"),
        "weight_distribution": fields.Raw(description="Distribución de pesos"),
        "total_animals": fields.Integer(description="Total de animales"),
        "average_weight": fields.Float(description="Peso promedio"),
    },
)
health_stats_model = legacy_ns.model(
    "HealthStats",
    {
        "treatments_by_month": fields.List(
            fields.Raw, description="Tratamientos por mes"
        ),
        "vaccinations_by_month": fields.List(
            fields.Raw, description="Vacunaciones por mes"
        ),
        "health_status_distribution": fields.Raw(
            description="Distribución de estados de salud"
        ),
        "common_diseases": fields.List(fields.Raw, description="Enfermedades comunes"),
        "medication_usage": fields.List(fields.Raw, description="Uso de medicamentos"),
        "summary": fields.Raw(description="Resumen"),
    },
)
ai_insight_model = legacy_ns.model(
    "AIInsight",
    {
        "insight": fields.String(description="Contenido del análisis desde BD"),
        "generated_at": fields.DateTime(description="Fecha de generación"),
    },
)

# NOTA: /reports/custom está implementado en reports.py (namespace analítico moderno)
# Mantener este comentario para evitar duplicación de rutas que causa conflicto.


@legacy_ns.route("/animals/statistics")
class AnimalStatistics(Resource):
    @legacy_ns.doc(
        "get_animal_statistics",
        description="\n        **Estadísticas detalladas de animales**\n        \n        Proporciona análisis completo del inventario ganadero:\n        - Distribución por estado (vivo, vendido, muerto)\n        - Distribución por sexo y raza\n        - Grupos de edad y distribución de pesos\n        - Tendencias de crecimiento\n        \n        **Ideal para:**\n        - Gráficos de torta y barras\n        - Análisis de composición del hato\n        - Planificación de reproducción\n        ",
        security=["Bearer", "Cookie"],
        responses={
            200: ("Estadísticas de animales", animal_stats_model),
            401: "Token JWT requerido o inválido",
            500: "Error interno del servidor",
        },
    )
    @jwt_required()
    def get(self):
        """Obtener estadísticas detalladas de animales"""
        try:
            status_stats = (
                _tf(
                    db.session.query(
                        Animals.status, func.count(Animals.id).label("count")
                    ),
                    Animals,
                )
                .filter(Animals.is_deleted == False)
                .group_by(Animals.status)
                .all()
            )
            sex_stats = (
                _tf(
                    db.session.query(
                        Animals.sex, func.count(Animals.id).label("count")
                    ),
                    Animals,
                )
                .filter(Animals.is_deleted == False)
                .group_by(Animals.sex)
                .all()
            )
            breed_stats = (
                _tf(
                    db.session.query(
                        Breeds.name, func.count(Animals.id).label("count")
                    ),
                    Breeds,
                )
                .join(Animals)
                .filter(Animals.is_deleted == False, Breeds.is_deleted == False)
                .group_by(Breeds.name)
                .order_by(desc(func.count(Animals.id)))
                .limit(10)
                .all()
            )
            current_date = datetime.now().date()
            age_groups = {
                "Terneros (0-1 año)": 0,
                "Jóvenes (1-2 años)": 0,
                "Adultos (2-5 años)": 0,
                "Maduros (5+ años)": 0,
            }
            animals_with_age = (
                _tf(db.session.query(Animals.birth_date), Animals)
                .filter(
                    Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False
                )
                .all()
            )
            for animal in animals_with_age:
                if animal.birth_date:
                    age_years = (current_date - animal.birth_date).days / 365.25
                    if age_years < 1:
                        age_groups["Terneros (0-1 año)"] += 1
                    elif age_years < 2:
                        age_groups["Jóvenes (1-2 años)"] += 1
                    elif age_years < 5:
                        age_groups["Adultos (2-5 años)"] += 1
                    else:
                        age_groups["Maduros (5+ años)"] += 1
            weight_ranges = {
                "0-200 kg": 0,
                "201-400 kg": 0,
                "401-600 kg": 0,
                "601+ kg": 0,
            }
            animals_weights = (
                _tf(db.session.query(Animals.weight), Animals)
                .filter(
                    Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False
                )
                .all()
            )
            for animal in animals_weights:
                weight = animal.weight
                if weight <= 200:
                    weight_ranges["0-200 kg"] += 1
                elif weight <= 400:
                    weight_ranges["201-400 kg"] += 1
                elif weight <= 600:
                    weight_ranges["401-600 kg"] += 1
                else:
                    weight_ranges["601+ kg"] += 1
            avg_weight = (
                _tf(db.session.query(func.avg(Animals.weight)), Animals)
                .filter(
                    Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False
                )
                .scalar()
                or 0
            )
            if isinstance(avg_weight, decimal.Decimal):
                avg_weight = float(avg_weight)

            by_sex_dict = {}
            for sex, count in sex_stats:
                if sex is not None:
                    key = sex.value if hasattr(sex, "value") else str(sex)
                    by_sex_dict[key] = count

            age_distribution_list = [
                {"age_range": k, "count": v} for k, v in age_groups.items()
            ]

            statistics_data = {
                "by_status": {
                    status.value if hasattr(status, "value") else str(status): count
                    for status, count in status_stats
                    if status is not None
                },
                "by_sex": by_sex_dict,
                "by_gender": by_sex_dict,
                "by_breed": [
                    {"breed": breed, "count": count} for breed, count in breed_stats
                ],
                "by_age_group": age_groups,
                "age_distribution": age_distribution_list,
                "weight_distribution": weight_ranges,
                "total_animals": sum((count for _, count in status_stats)),
                "average_weight": avg_weight,
            }
            return APIResponse.success(
                data=statistics_data,
                message="Estadísticas de animales obtenidas exitosamente",
            )
        except Exception as e:
            logger.error("Error obteniendo estadísticas de animales")
            return APIResponse.error(
                message="Error interno del servidor",
                status_code=500,
                details={"error": str(e)},
            )


def calculate_live_kpis(finca_id: int | None = None) -> dict:
    """Calcula KPIs en tiempo real para el dashboard live."""
    try:
        animals_query = _tf(Animals.query, Animals)
        total_animals = animals_query.count()
        active_animals = animals_query.filter(
            Animals.status == AnimalStatus.Vivo
        ).count()
        from app.models.animalDiseases import AnimalDiseases

        sick_animals = _tf(
            db.session.query(func.count(func.distinct(AnimalDiseases.animal_id))),
            AnimalDiseases,
        ).filter(AnimalDiseases.status == "En Tratamiento")
        sick_count = sick_animals.scalar() or 0
        thirty_days_ago = datetime.now() - timedelta(days=30)
        vaccinations_query = _tf(Vaccinations.query, Vaccinations).filter(
            Vaccinations.date >= thirty_days_ago
        )
        vaccinations_30d = vaccinations_query.count()
        treatments_query = _tf(Treatments.query, Treatments).filter(
            Treatments.status.in_(["En progreso", "Pendiente"])
        )
        active_treatments = treatments_query.count()
        seven_days_ago = datetime.now() - timedelta(days=7)
        controls_query = _tf(Control.query, Control).filter(
            Control.checkup_date >= seven_days_ago
        )
        controls_7d = controls_query.count()
        return {
            "timestamp": datetime.now().isoformat(),
            "kpis": {
                "total_animals": total_animals,
                "active_animals": active_animals,
                "sick_animals": sick_count,
                "health_rate": round(
                    (active_animals - sick_count) / active_animals * 100, 1
                )
                if active_animals > 0
                else 100,
                "vaccinations_30d": vaccinations_30d,
                "active_treatments": active_treatments,
                "controls_7d": controls_7d,
            },
        }
    except Exception as e:
        logger.error(f"Error calculando KPIs live: {e}")
        return {"timestamp": datetime.now().isoformat(), "kpis": {}, "error": str(e)}


@legacy_ns.route("/predictive/run")
class RunPredictiveAnalysis(Resource):
    @legacy_ns.doc(
        "run_predictive_analysis",
        description="Ejecuta el motor de IA para detectar anomalías y generar alertas predictivas.",
        security=["Bearer", "Cookie"],
    )
    @jwt_required()
    def post(self):
        """Ejecutar análisis predictivo de IA (Asíncrono)"""
        try:
            from app.tasks.predictive_tasks import run_finca_predictive_analysis

            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error(
                    "No se pudo determinar la finca", status_code=400
                )
            task = run_finca_predictive_analysis.delay(finca_id)
            return APIResponse.success(
                {
                    "task_id": task.id,
                    "status": "pending",
                    "message": "El análisis predictivo se ha iniciado en segundo plano. Los resultados aparecerán en las alertas pronto.",
                },
                "Análisis iniciado",
                status_code=202,
            )
        except Exception as e:
            logger.error("Error al disparar análisis predictivo: %s", e)
            return APIResponse.error("Error al iniciar el análisis predictivo")


@legacy_ns.route("/predictive/insights")
class PredictiveInsights(Resource):
    @legacy_ns.doc(
        "get_predictive_insights",
        description="Obtiene un resumen ejecutivo generado por IA sobre la salud y productividad del hato.",
        security=["Bearer", "Cookie"],
    )
    @jwt_required()
    def get(self):
        """Obtener insights ejecutivos de IA"""
        try:
            from app.services.predictive_engine_service import PredictiveEngineService

            finca_id = get_current_finca_id()
            insight = PredictiveEngineService.get_finca_insights_summary(finca_id)
            return APIResponse.success(
                {"insight": insight}, "Insights obtenidos exitosamente"
            )
        except Exception as e:
            logger.error("Error obteniendo insights: %s", e)
            return APIResponse.error("Error al obtener insights de IA")


@legacy_ns.route("/fields/health-map")
class FieldHealthMap(Resource):
    """Mapa de salud de potreros con datos de ocupación de la BD."""

    @legacy_ns.doc(
        "get_field_health_map",
        description="\n        **Mapa de salud y ocupación de potreros**\n\n        Retorna información de todos los potreros con:\n        - Estado de salud (healthy, warning, critical, resting)\n        - Ocupación actual (número de animales)\n        - Capacidad del potrero\n        - Coordenadas para visualización\n\n        **Útil para:**\n        - Dashboard de monitoreo de potreros\n        - Visualización de ocupación\n        - Alertas de sobrepoblación\n        ",
        security=["Bearer", "Cookie"],
        responses={
            200: "Mapa de salud de potreros",
            401: "Token JWT requerido o inválido",
            500: "Error interno del servidor",
        },
    )
    @jwt_required()
    def get(self):
        """Obtener mapa de salud de potreros"""
        try:
            from app.models.fields import Fields
            from app.models.animalFields import AnimalFields
            from sqlalchemy import func

            finca_id = get_current_finca_id()
            fields = Fields.query.filter_by(finca_id=finca_id).all()
            field_ids = [f.id for f in fields]
            animal_counts = {}
            if field_ids:
                from app.models.animals import Animals, AnimalStatus

                counts = (
                    db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
                    .join(Animals, AnimalFields.animal_id == Animals.id)
                    .filter(
                        AnimalFields.field_id.in_(field_ids),
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted == False,
                        Animals.is_deleted == False,
                        Animals.status == AnimalStatus.Vivo,
                    )
                    .group_by(AnimalFields.field_id)
                    .all()
                )
                animal_counts = {fid: int(cnt) for fid, cnt in counts}
            default_status_map = {
                "Activo": "healthy",
                "Disponible": "healthy",
                "Ocupado": "warning",
                "Mantenimiento": "resting",
                "Restringido": "critical",
                "Dañado": "critical",
            }
            status_entry = SystemContent.get_by_key("config.field_status_map")
            status_mapping = (
                status_entry.extra
                if (status_entry and status_entry.extra)
                else default_status_map
            )
            result = []
            for idx, field in enumerate(fields):
                occupation = animal_counts.get(field.id, 0)
                capacity = (
                    int(field.capacity)
                    if field.capacity and field.capacity.isdigit()
                    else 50
                )
                base_status = status_mapping.get(str(field.state.value), "healthy")
                if occupation > capacity * 0.8:
                    status = "critical"
                elif occupation > capacity * 0.6:
                    status = "warning"
                else:
                    status = base_status
                coords = {
                    "x": field.latitude if field.latitude else idx % 4 * 150,
                    "y": field.longitude if field.longitude else idx // 4 * 150,
                }
                result.append(
                    {
                        "id": field.id,
                        "name": field.name,
                        "status": status,
                        "occupation": occupation,
                        "capacity": capacity,
                        "coords": coords,
                        "state": str(field.state.value),
                        "area": field.area,
                    }
                )
            return APIResponse.success(
                result, "Mapa de salud de potreros obtenido exitosamente"
            )
        except Exception as e:
            logger.error(f"Error obteniendo mapa de salud de potreros: {str(e)}")
            return APIResponse.error(
                message="Error interno del servidor",
                status_code=500,
                details={"error": str(e)},
            )
