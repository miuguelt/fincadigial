import logging
from datetime import datetime, timedelta, UTC
from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import noload

from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.control import Control
from app.models.alerts import (
    AnimalAlert,
    AlertType,
    AlertPriority,
    build_alert_dedupe_key,
)
from app.models.system_content import SystemContent


def _get_predictive_param(key: str) -> float | None:
    entry = SystemContent.get_by_key(f"param.predictive.{key}")
    if entry:
        try:
            return float(entry.content)
        except (ValueError, TypeError):
            pass
    return None

logger = logging.getLogger(__name__)


class PredictiveEngineService:
    """
    Motor de análisis predictivo basado en reglas almacenadas en BD.
    No utiliza IA externa en producción.
    """

    @staticmethod
    def run_finca_analysis(finca_id):
        """
        Escanea todos los animales de una finca y genera alertas predictivas
        usando reglas predefinidas en la tabla `system_contents`.
        """
        animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
        if not animals:
            return {"status": "success", "alerts_created": 0, "message": "No hay animales activos para analizar."}

        animal_ids = [animal.id for animal in animals]
        alerts_created = 0
        alerts_updated = 0

        content_keys = {
            'param.predictive.weight_loss_pct',
            'param.predictive.control_overdue_days',
            'param.predictive.adg_low',
            'recommendation.weight_loss_critical',
            'recommendation.control_overdue',
            'recommendation.slow_growth',
        }
        content_rows = SystemContent.query.filter(
            SystemContent.key.in_(content_keys),
            SystemContent.is_active.is_(True),
            SystemContent.finca_id.is_(None),
        ).all()
        content = {row.key: row.content for row in content_rows}

        def numeric_param(key):
            try:
                return float(content[f'param.predictive.{key}'])
            except (KeyError, TypeError, ValueError):
                return None

        params = {
            'weight_loss_pct': numeric_param('weight_loss_pct'),
            'control_overdue_days': numeric_param('control_overdue_days'),
            'adg_low': numeric_param('adg_low'),
        }

        ranked_controls = db.session.query(
            Control.id.label('control_id'),
            func.row_number().over(
                partition_by=Control.animal_id,
                order_by=(Control.checkup_date.desc(), Control.id.desc()),
            ).label('position'),
        ).filter(Control.animal_id.in_(animal_ids)).subquery()

        controls = db.session.query(Control).options(
            noload(Control.animals)
        ).join(
            ranked_controls,
            Control.id == ranked_controls.c.control_id,
        ).filter(
            ranked_controls.c.position <= 3
        ).order_by(
            Control.animal_id,
            Control.checkup_date.desc(),
            Control.id.desc(),
        ).all()

        controls_by_animal = defaultdict(list)
        for control in controls:
            controls_by_animal[control.animal_id].append(control)

        def category_for_message(message):
            normalized = (message or '').lower()
            if 'caída de peso' in normalized:
                return 'weight_loss'
            if 'sin control veterinario' in normalized:
                return 'control_overdue'
            if 'crecimiento lento' in normalized:
                return 'slow_growth'
            return None

        existing_alerts = AnimalAlert.query.filter(
            AnimalAlert.finca_id == finca_id,
            AnimalAlert.animal_id.in_(animal_ids),
            AnimalAlert.alert_type == AlertType.PREDICTIVE,
            AnimalAlert.is_read.is_(False),
            AnimalAlert.superseded_by_id.is_(None),
        ).all()
        existing_by_key = {}
        for alert in existing_alerts:
            category = category_for_message(alert.message)
            if category:
                existing_by_key[(alert.animal_id, category)] = alert

        now = datetime.now(UTC)

        def upsert_alert(animal, category, message, recommendation, priority):
            nonlocal alerts_created, alerts_updated
            existing = existing_by_key.get((animal.id, category))
            if existing:
                changed = (
                    existing.message != message
                    or existing.recommendation != recommendation
                    or existing.priority != priority
                )
                if changed:
                    existing.message = message
                    existing.recommendation = recommendation
                    existing.priority = priority
                    existing.triggered_at = now
                    alerts_updated += 1
                return

            alert = AnimalAlert(
                animal_id=animal.id,
                finca_id=finca_id,
                alert_type=AlertType.PREDICTIVE,
                message=message,
                recommendation=recommendation,
                priority=priority,
                is_read=False,
                triggered_at=now,
                dedupe_key=build_alert_dedupe_key(
                    finca_id=finca_id,
                    animal_id=animal.id,
                    alert_type=AlertType.PREDICTIVE,
                    message=message,
                    category=category,
                ),
            )
            db.session.add(alert)
            existing_by_key[(animal.id, category)] = alert
            alerts_created += 1

        for animal in animals:
            try:
                recent_controls = controls_by_animal.get(animal.id, [])
                if len(recent_controls) < 2:
                    continue

                w_actual = recent_controls[0].weight
                w_prev = recent_controls[1].weight
                if not w_actual or not w_prev or w_prev == 0:
                    continue

                weight_loss_pct = (w_prev - w_actual) / w_prev * 100

                # Regla 1: Caída de peso >10%
                wl_threshold = params['weight_loss_pct']
                if wl_threshold is not None and weight_loss_pct > wl_threshold:
                    upsert_alert(
                        animal,
                        'weight_loss',
                        f"⚠️ Caída de peso detectada: -{weight_loss_pct:.1f}% ({w_prev}→{w_actual} kg). Evaluar estado de salud y nutrición.",
                        content.get('recommendation.weight_loss_critical'),
                        AlertPriority.HIGH,
                    )

                # Regla 2: Animal sin control reciente (>90 días)
                last_ctrl = recent_controls[0]
                days_since = (datetime.now(UTC).date() - last_ctrl.checkup_date).days
                ctrl_days = params['control_overdue_days']
                if ctrl_days is not None and days_since > ctrl_days and animal.age_in_months and animal.age_in_months >= 6:
                    upsert_alert(
                        animal,
                        'control_overdue',
                        f"📊 Sin control veterinario hace {days_since} días. Programar revisión completa.",
                        content.get('recommendation.control_overdue'),
                        AlertPriority.MEDIUM,
                    )

                # Regla 3: ADG bajo sostenido
                if len(recent_controls) >= 3:
                    dates = [c.checkup_date for c in reversed(recent_controls) if c.weight]
                    weights = [c.weight for c in reversed(recent_controls) if c.weight]
                    if len(dates) >= 3 and len(weights) >= 3:
                        total_days = (dates[-1] - dates[0]).days
                        if total_days > 0:
                            adg = (weights[-1] - weights[0]) / total_days
                            adg_threshold = params['adg_low']
                            if adg_threshold is not None and adg < adg_threshold:
                                upsert_alert(
                                    animal,
                                    'slow_growth',
                                    f"📉 Crecimiento lento: ADG {adg:.3f} kg/día en {total_days} días de observación.",
                                    content.get('recommendation.slow_growth'),
                                    AlertPriority.MEDIUM,
                                )

            except Exception as e:
                logger.error(f"Error analizando animal {animal.id}: {e}")
                continue

        db.session.commit()
        logger.info(
            "Análisis predictivo de finca %s: %s nuevas, %s actualizadas",
            finca_id,
            alerts_created,
            alerts_updated,
        )

        heat_alerts = PredictiveEngineService.predict_heat_cycles(finca_id)
        alerts_created += heat_alerts.get('alerts_created', 0)
        alerts_updated += heat_alerts.get('alerts_updated', 0)

        return {
            "status": "success",
            "alerts_created": alerts_created,
            "alerts_updated": alerts_updated,
            "total_analyzed": len(animals)
        }

    @staticmethod
    def predict_heat_cycles(finca_id):
        from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
        from app.models.animals import Sex

        cows_query = Animals.query.filter_by(
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
            sex=Sex.Hembra
        ).all()

        heat_age_param = _get_predictive_param('heat_detection_age_months')
        if heat_age_param is not None:
            heat_age = int(heat_age_param)
            cows = [c for c in cows_query if c.age_in_months is not None and c.age_in_months >= heat_age]
        else:
            cows = cows_query

        if not cows:
            return {"alerts_created": 0, "alerts_updated": 0}

        alerts_created = 0
        alerts_updated = 0
        today = datetime.now(UTC).date()
        cow_ids = [cow.id for cow in cows]
        heat_window_start_param = _get_predictive_param("heat_window_start")
        recommendation = SystemContent.get_by_key('recommendation.heat_cycle')

        ranked_events = db.session.query(
            ReproductiveEvent.id.label('event_id'),
            func.row_number().over(
                partition_by=ReproductiveEvent.animal_id,
                order_by=(ReproductiveEvent.event_date.desc(), ReproductiveEvent.id.desc()),
            ).label('position'),
        ).filter(
            ReproductiveEvent.animal_id.in_(cow_ids),
            ReproductiveEvent.event_type.in_([EventType.Celo, EventType.Inseminacion]),
        ).subquery()
        latest_events = db.session.query(ReproductiveEvent).join(
            ranked_events,
            ReproductiveEvent.id == ranked_events.c.event_id,
        ).filter(ranked_events.c.position == 1).all()
        latest_by_animal = {event.animal_id: event for event in latest_events}

        positive_diagnoses = dict(db.session.query(
            ReproductiveEvent.animal_id,
            func.max(ReproductiveEvent.event_date),
        ).filter(
            ReproductiveEvent.animal_id.in_(cow_ids),
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
        ).group_by(ReproductiveEvent.animal_id).all())

        existing_alerts = AnimalAlert.query.filter(
            AnimalAlert.finca_id == finca_id,
            AnimalAlert.animal_id.in_(cow_ids),
            AnimalAlert.alert_type == AlertType.REPRODUCTION,
            AnimalAlert.is_read.is_(False),
            AnimalAlert.superseded_by_id.is_(None),
            AnimalAlert.message.ilike('%celo probable%'),
        ).all()
        existing_by_animal = {alert.animal_id: alert for alert in existing_alerts}

        for cow in cows:
            last_event = latest_by_animal.get(cow.id)

            if last_event:
                positive_date = positive_diagnoses.get(cow.id)
                if positive_date and positive_date >= last_event.event_date:
                    continue

                days_since = (today - last_event.event_date).days
                cycle_day = days_since % 21

                if heat_window_start_param is not None and (int(heat_window_start_param) <= cycle_day <= 21 or cycle_day == 0):
                    next_heat = today + timedelta(days=(21 - cycle_day) if cycle_day != 0 else 0)
                    message = f"🔔 Celo probable para el {next_heat.strftime('%d/%m/%Y')}."
                    existing = existing_by_animal.get(cow.id)

                    if existing:
                        if existing.message != message:
                            existing.message = message
                            existing.recommendation = recommendation.content if recommendation else None
                            existing.triggered_at = datetime.now(UTC)
                            alerts_updated += 1
                    else:
                        alert = AnimalAlert(
                            animal_id=cow.id,
                            finca_id=finca_id,
                            alert_type=AlertType.REPRODUCTION,
                            message=message,
                            recommendation=recommendation.content if recommendation else None,
                            priority=AlertPriority.HIGH,
                            is_read=False,
                            triggered_at=datetime.now(UTC),
                            dedupe_key=build_alert_dedupe_key(
                                finca_id=finca_id,
                                animal_id=cow.id,
                                alert_type=AlertType.REPRODUCTION,
                                message=message,
                                category='heat_cycle',
                            ),
                        )
                        db.session.add(alert)
                        existing_by_animal[cow.id] = alert
                        alerts_created += 1

        db.session.commit()
        return {"alerts_created": alerts_created, "alerts_updated": alerts_updated}

    @staticmethod
    def get_finca_insights_summary(finca_id):
        """Resumen ejecutivo del hato desde BD."""
        from app.models.livestock_summary import LivestockSummary

        summary = LivestockSummary.get_for_finca(finca_id)
        entry = SystemContent.get_by_key('insight.executive_summary', finca_id=finca_id)

        if entry:
            base = entry.content
        else:
            base = None

        detail_parts = []
        if summary:
            detail_parts.append(f"Total animales: {summary.total_animals}" if hasattr(summary, 'total_animals') else "")

        detail = " | ".join(filter(None, detail_parts))
        return f"{base}\n{detail}" if detail and base else (base or detail or '')
