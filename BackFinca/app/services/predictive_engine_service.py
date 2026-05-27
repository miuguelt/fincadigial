import logging
from datetime import datetime, timedelta, UTC
from app.models.animals import Animals, AnimalStatus
from app.models.control import Control
from app.models.alerts import AnimalAlert, AlertType, AlertPriority
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

        alerts_created = 0

        for animal in animals:
            try:
                recent_controls = animal.controls.order_by(Control.checkup_date.desc()).limit(3).all()
                if len(recent_controls) < 2:
                    continue

                w_actual = recent_controls[0].weight
                w_prev = recent_controls[1].weight
                if not w_actual or not w_prev or w_prev == 0:
                    continue

                weight_loss_pct = (w_prev - w_actual) / w_prev * 100

                # Regla 1: Caída de peso >10%
                wl_threshold = _get_predictive_param("weight_loss_pct")
                if wl_threshold is not None and weight_loss_pct > wl_threshold:
                    existing = AnimalAlert.query.filter(
                        AnimalAlert.animal_id == animal.id,
                        AnimalAlert.alert_type == AlertType.PREDICTIVE,
                        AnimalAlert.message.ilike('%caída de peso%'),
                        AnimalAlert.triggered_at > datetime.now(UTC) - timedelta(days=1)
                    ).first()

                    if not existing:
                        rec = SystemContent.get_by_key('recommendation.weight_loss_critical')
                        AnimalAlert.create(
                            animal_id=animal.id,
                            finca_id=finca_id,
                            alert_type=AlertType.PREDICTIVE,
                            message=f"⚠️ Caída de peso detectada: -{weight_loss_pct:.1f}% ({w_prev}→{w_actual} kg). Evaluar estado de salud y nutrición.",
                            recommendation=rec.content if rec else None,
                            priority=AlertPriority.HIGH,
                            commit=True
                        )
                        alerts_created += 1
                        logger.info(f"Alerta predictiva (peso) creada para {animal.record}")

                # Regla 2: Animal sin control reciente (>90 días)
                last_ctrl = recent_controls[0]
                days_since = (datetime.now(UTC).date() - last_ctrl.checkup_date).days
                ctrl_days = _get_predictive_param("control_overdue_days")
                if ctrl_days is not None and days_since > ctrl_days and animal.age_in_months and animal.age_in_months >= 6:
                    existing = AnimalAlert.query.filter(
                        AnimalAlert.animal_id == animal.id,
                        AnimalAlert.alert_type == AlertType.PREDICTIVE,
                        AnimalAlert.message.ilike('%sin control%'),
                        AnimalAlert.triggered_at > datetime.now(UTC) - timedelta(days=1)
                    ).first()

                    if not existing:
                        rec = SystemContent.get_by_key('recommendation.control_overdue')
                        AnimalAlert.create(
                            animal_id=animal.id,
                            finca_id=finca_id,
                            alert_type=AlertType.PREDICTIVE,
                            message=f"📊 Sin control veterinario hace {days_since} días. Programar revisión completa.",
                            recommendation=rec.content if rec else None,
                            priority=AlertPriority.MEDIUM,
                            commit=True
                        )
                        alerts_created += 1
                        logger.info(f"Alerta predictiva (control) creada para {animal.record}")

                # Regla 3: ADG bajo sostenido
                if len(recent_controls) >= 3:
                    dates = [c.checkup_date for c in reversed(recent_controls) if c.weight]
                    weights = [c.weight for c in reversed(recent_controls) if c.weight]
                    if len(dates) >= 3 and len(weights) >= 3:
                        total_days = (dates[-1] - dates[0]).days
                        if total_days > 0:
                            adg = (weights[-1] - weights[0]) / total_days
                            adg_threshold = _get_predictive_param("adg_low")
                            if adg_threshold is not None and adg < adg_threshold:
                                existing = AnimalAlert.query.filter(
                                    AnimalAlert.animal_id == animal.id,
                                    AnimalAlert.alert_type == AlertType.PREDICTIVE,
                                    AnimalAlert.message.ilike('%crecimiento lento%'),
                                    AnimalAlert.triggered_at > datetime.now(UTC) - timedelta(days=1)
                                ).first()

                                if not existing:
                                    rec = SystemContent.get_by_key('recommendation.slow_growth')
                                    AnimalAlert.create(
                                        animal_id=animal.id,
                                        finca_id=finca_id,
                                        alert_type=AlertType.PREDICTIVE,
                                        message=f"📉 Crecimiento lento: ADG {adg:.3f} kg/día en {total_days} días de observación.",
                                        recommendation=rec.content if rec else None,
                                        priority=AlertPriority.MEDIUM,
                                        commit=True
                                    )
                                    alerts_created += 1
                                    logger.info(f"Alerta predictiva (ADG) creada para {animal.record}")

            except Exception as e:
                logger.error(f"Error analizando animal {animal.id}: {e}")
                continue

        heat_alerts = PredictiveEngineService.predict_heat_cycles(finca_id)
        alerts_created += heat_alerts.get('alerts_created', 0)

        return {
            "status": "success",
            "alerts_created": alerts_created,
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

        alerts_created = 0
        today = datetime.now(UTC).date()

        for cow in cows:
            last_event = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == cow.id,
                ReproductiveEvent.event_type.in_([EventType.Celo, EventType.Inseminacion])
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if last_event:
                is_pregnant = ReproductiveEvent.query.filter_by(
                    animal_id=cow.id,
                    event_type=EventType.Diagnostico,
                    diagnosis_result=DiagnosisResult.Positivo
                ).filter(ReproductiveEvent.event_date >= last_event.event_date).first()

                if is_pregnant:
                    continue

                days_since = (today - last_event.event_date).days
                cycle_day = days_since % 21

                heat_window_start_param = _get_predictive_param("heat_window_start")
                if heat_window_start_param is not None and (int(heat_window_start_param) <= cycle_day <= 21 or cycle_day == 0):
                    next_heat = today + timedelta(days=(21 - cycle_day) if cycle_day != 0 else 0)

                    existing = AnimalAlert.query.filter(
                        AnimalAlert.animal_id == cow.id,
                        AnimalAlert.alert_type == AlertType.REPRODUCTION,
                        AnimalAlert.message.ilike('%celo probable%'),
                        AnimalAlert.triggered_at > datetime.now(UTC) - timedelta(days=5)
                    ).first()

                    if not existing:
                        rec = SystemContent.get_by_key('recommendation.heat_cycle')
                        AnimalAlert.create(
                            animal_id=cow.id,
                            finca_id=finca_id,
                            alert_type=AlertType.REPRODUCTION,
                            message=f"🔔 Celo probable para el {next_heat.strftime('%d/%m/%Y')}.",
                            recommendation=rec.content if rec else None,
                            priority=AlertPriority.HIGH,
                            commit=True
                        )
                        alerts_created += 1

        return {"alerts_created": alerts_created}

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
