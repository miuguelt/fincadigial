"""
Reglas de alertas de producción (leche, métricas productivas).
"""

from datetime import date, timedelta
import logging
from app import db
from app.models.animals import Sex
from app.models.milk_production import MilkProduction
from app.models.control import Control
from app.models.animal_production_metrics import AnimalProductionMetrics, MetricType
from app.models.body_condition_scores import BodyConditionScore
from app.services.alert_engine import AlertEngine
from app.models.alerts import AlertType, AlertPriority
from sqlalchemy import func

logger = logging.getLogger(__name__)


def evaluate_production_rules(animal, finca_id, trig, today, age_months) -> int:
    """Evalúa reglas productivas: leche, mastitis, métricas."""
    if animal.sex != Sex.Hembra or age_months < 24:
        return 0

    # ── 1. CAÍDA DE PRODUCCIÓN LÁCTEA ─────────────────────────────────
    _check_milk_drop(animal, today, trig)

    # ── 2. REGISTRO DIARIO FALTANTE ───────────────────────────────────
    _check_missing_milk_record(animal, today, trig)

    # ── 3. LACTANCIA + PÉRDIDA DE PESO ────────────────────────────────
    all_controls = (
        animal.controls.filter(Control.weight.isnot(None))
        .order_by(Control.checkup_date)
        .all()
    )
    lactating = MilkProduction.query.filter_by(animal_id=animal.id).first()
    if lactating and len(all_controls) >= 2:
        w_cur = all_controls[-1].weight
        w_prev = all_controls[-2].weight
        if w_cur and w_prev and w_prev > 0:
            loss_pct = (w_prev - w_cur) / w_prev * 100
            if 5 <= loss_pct < 10:
                trig(
                    AlertType.PRODUCTION,
                    f" Lactancia + pérdida de peso: -{loss_pct:.1f}% ({w_prev}→{w_cur} kg). Esperable en pico de lactancia, pero monitorear BCS.",
                    AlertPriority.MEDIUM,
                )

    # ── 4. MÉTRICAS DE PRODUCCIÓN ─────────────────────────────────────
    feed_metrics = AnimalProductionMetrics.query.filter(
        AnimalProductionMetrics.animal_id == animal.id,
        AnimalProductionMetrics.metric_type == MetricType.FeedConversion,
    ).first()
    growth_metrics = AnimalProductionMetrics.query.filter(
        AnimalProductionMetrics.animal_id == animal.id,
        AnimalProductionMetrics.metric_type == MetricType.GrowthRate,
    ).first()
    if growth_metrics and growth_metrics.value < 0.3 and age_months < 24:
        trig(
            AlertType.GROWTH,
            f" Tasa de crecimiento baja: {growth_metrics.value} kg/día según métricas. Revisar alimentación.",
            AlertPriority.MEDIUM,
        )

    # ── 5. BCS PROMEDIO DEL GANADO BAJO (silenciosa, solo monitoreo) ────
    if finca_id:
        herd_bcs_avg = BodyConditionScore.get_herd_average(finca_id, days=30)
        if herd_bcs_avg and herd_bcs_avg < 4.0:
            pass


def _check_milk_drop(animal, today, trig):
    recent_milk = (
        MilkProduction.query.filter_by(animal_id=animal.id)
        .order_by(MilkProduction.date.desc(), MilkProduction.milking_session.desc())
        .limit(2)
        .all()
    )
    if len(recent_milk) >= 2:
        m_actual, m_prev = recent_milk[0].liters, recent_milk[1].liters
        if m_actual and m_prev and m_prev > 0:
            drop_pct = (m_prev - m_actual) / m_prev * 100
            milk_crit = AlertEngine._get_param("milk_drop_critical_pct")
            milk_high = AlertEngine._get_param("milk_drop_high_pct")
            if milk_crit is not None and drop_pct >= milk_crit:
                trig(
                    AlertType.PRODUCTION,
                    f" Caída CRÍTICA de leche: -{drop_pct:.1f}% ({m_prev}→{m_actual} L). Posible mastitis o enfermedad aguda.",
                    AlertPriority.CRITICAL,
                )
            elif milk_high is not None and drop_pct >= milk_high:
                trig(
                    AlertType.PRODUCTION,
                    f" Caída de producción: -{drop_pct:.1f}% ({m_prev}→{m_actual} L). Revisar nutrición o estrés.",
                    AlertPriority.HIGH,
                )

    seven_days_ago = today - timedelta(days=7)
    avg_milk = (
        db.session.query(func.avg(MilkProduction.liters))
        .filter(
            MilkProduction.animal_id == animal.id,
            MilkProduction.date >= seven_days_ago,
            MilkProduction.date < today,
        )
        .scalar()
    )
    if avg_milk and len(recent_milk) > 0:
        m_today = recent_milk[0].liters
        if m_today < (avg_milk * 0.8):
            trig(
                AlertType.PRODUCTION,
                f" Producción bajo promedio: {m_today} L (Promedio 7d: {avg_milk:.1f} L). Revisar condición corporal.",
                AlertPriority.HIGH,
            )


def _check_missing_milk_record(animal, today, trig):
    has_production = MilkProduction.query.filter_by(animal_id=animal.id).first()
    if has_production:
        last_record = (
            MilkProduction.query.filter_by(animal_id=animal.id)
            .order_by(MilkProduction.date.desc())
            .first()
        )
        if last_record:
            days_since_milk = (today - last_record.date).days
            if days_since_milk >= 2:
                trig(
                    AlertType.PRODUCTION,
                    f" Sin registro de ordeño: {days_since_milk} días sin datos de producción. ¿Vaca seca o falta de registro?",
                    AlertPriority.MEDIUM,
                )
