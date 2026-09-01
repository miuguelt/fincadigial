"""
Motor de evaluación de alertas ganaderas — Finca Villa Luz.

Clase principal de orquestación. Las reglas de evaluación están separadas en:
  - alert_rules_health.py   (sanidad, vacunas, controles, enfermedades)
  - alert_rules_reproduction.py (gestación, celo, parto, inseminación)
  - alert_rules_growth.py   (peso, ADG, BCS, proyección, destete)
  - alert_rules_production.py (leche, métricas productivas)
"""

from contextlib import contextmanager
from datetime import date, datetime, timedelta, UTC
import logging
from app import db
from app.models.alerts import (
    AnimalAlert,
    AnimalAlertConfig,
    AlertPriority,
    build_alert_dedupe_key,
)
from app.models.animals import Animals
from app.models.control import Control
from app.models.inventory import InventoryLot
from app.models.activity_log import ActivityLog
from app.models.vaccinations import Vaccinations
from app.models.body_condition_scores import BodyConditionScore
from app.models.animal_health_history import AnimalHealthHistory
from app.services.push_notification_service import PushNotificationService


logger = logging.getLogger(__name__)


class AlertEngine:
    _weather_cache = {}
    _dedupe_cache: dict[int, set[str]] | None = None
    _weather_dedupe: set[int] | None = None
    _animal_record_cache: dict[int, str] | None = None
    _sse_batch: dict[int, int] | None = None
    _EVALUATION_CHUNK_SIZE = 250

    # Buffer de notificaciones push agrupadas por finca. Mientras está activo
    # (durante evaluate_all), _queue_push acumula en vez de enviar: un ciclo con
    # 1679 alertas generaba 1679 × usuarios_de_la_finca × suscripciones envíos
    # webpush. Al final se emite un único resumen por finca.
    _push_batch: dict | None = None

    @staticmethod
    @contextmanager
    def _batch_push():
        """Agrupa push y SSE emitidos dentro del ciclo completo."""
        previous = AlertEngine._push_batch
        previous_sse = AlertEngine._sse_batch
        AlertEngine._push_batch = {}
        AlertEngine._sse_batch = {}
        try:
            yield
        finally:
            batch = AlertEngine._push_batch
            sse_batch = AlertEngine._sse_batch
            AlertEngine._push_batch = previous
            AlertEngine._sse_batch = previous_sse
            AlertEngine._flush_push_batch(batch)
            AlertEngine._flush_sse_batch(sse_batch)

    @staticmethod
    def _queue_push(finca_id: int, title: str, body: str, data: dict) -> None:
        """Encolar un push si hay batch activo; si no, enviarlo de inmediato."""
        if AlertEngine._push_batch is None:
            PushNotificationService.send_to_finca(
                finca_id=finca_id, title=title, body=body, data=data
            )
            return
        AlertEngine._push_batch.setdefault(finca_id, []).append(
            {"title": title, "body": body, "data": data}
        )

    @staticmethod
    def _flush_push_batch(batch: dict | None) -> None:
        """Emitir un push por finca: el detalle si es una sola alerta, si no un resumen."""
        if not batch:
            return
        for finca_id, items in batch.items():
            try:
                if len(items) == 1:
                    item = items[0]
                    PushNotificationService.send_to_finca(
                        finca_id=finca_id,
                        title=item["title"],
                        body=item["body"],
                        data=item["data"],
                        tag=f"alertas-finca-{finca_id}",
                    )
                    continue

                criticas = sum(
                    1
                    for i in items
                    if str(i["data"].get("priority", "")).lower() == "crítica"
                )
                detalle = (
                    f"{criticas} crítica(s) y {len(items) - criticas} de prioridad alta"
                    if criticas
                    else f"{len(items)} de prioridad alta"
                )
                PushNotificationService.send_to_finca(
                    finca_id=finca_id,
                    title=f"{len(items)} alertas nuevas",
                    body=f"Se registraron {detalle}. Abra el panel para revisarlas.",
                    data={
                        "type": "alert_digest",
                        "count": len(items),
                        "url": "/alertas",
                    },
                    tag=f"alertas-finca-{finca_id}",
                )
            except Exception as e:
                logger.error(f"Error enviando resumen push de finca {finca_id}: {e}")

    @staticmethod
    def _queue_sse(finca_id: int, priority: AlertPriority) -> None:
        """Publica un solo cambio en vivo por finca durante evaluaciones masivas."""
        if AlertEngine._sse_batch is not None:
            AlertEngine._sse_batch[finca_id] = (
                AlertEngine._sse_batch.get(finca_id, 0) + 1
            )
            return
        try:
            from flask import current_app

            bus = current_app.extensions.get("event_bus")
            if not bus:
                return
            payload = {
                "endpoint": "alertas",
                "action": "alert_created",
                "type": f"alerta_{priority.value.lower()}",
                "message": "Nueva alerta disponible",
                "finca_id": finca_id,
                "timestamp": datetime.now(UTC).isoformat(),
            }
            bus.publish_payload(payload)
        except Exception:
            pass

    @staticmethod
    def _flush_sse_batch(batch: dict[int, int] | None) -> None:
        if not batch:
            return
        try:
            from flask import current_app

            bus = current_app.extensions.get("event_bus")
            if not bus:
                return
            for finca_id, count in batch.items():
                bus.publish_payload(
                    {
                        "endpoint": "alertas",
                        "action": "alerts_updated",
                        "type": "alertas_actualizadas",
                        "finca_id": finca_id,
                        "count": count,
                        "message": f"{count} alertas nuevas",
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                )
        except Exception:
            logger.warning(
                "No se pudo publicar el resumen SSE de alertas", exc_info=True
            )

    @staticmethod
    def _get_param(key: str) -> float | None:
        from app.models.system_content import SystemContent

        entry = SystemContent.get_by_key(f"param.alert.{key}")
        if entry:
            try:
                return float(entry.content)
            except (ValueError, TypeError):
                pass
        return None

    @staticmethod
    def _get_param_int(key: str) -> int | None:
        v = AlertEngine._get_param(key)
        return int(v) if v is not None else None

    # ── EVALUACIÓN PRINCIPAL ───────────────────────────────────────────

    @staticmethod
    def evaluate_all(finca_id: int | None = None) -> dict:
        results = {
            "triggered": 0,
            "processed_animals": 0,
            "inventory_alerts": 0,
            "infrastructure_alerts": 0,
            "water_alerts": 0,
            "errors": 0,
        }
        try:
            try:
                import flask

                flask.g.is_admin = True
            except RuntimeError:
                pass

            with AlertEngine._batch_push():
                AlertEngine._evaluate_all_inner(results, finca_id=finca_id)
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error crítico en AlertEngine: {e}")
            raise
        return results

    @staticmethod
    def _evaluate_all_inner(results: dict, finca_id: int | None = None) -> None:
        try:
            animals_query = db.session.query(Animals).filter_by(status="Vivo")
            if finca_id is not None:
                animals_query = animals_query.filter(Animals.finca_id == finca_id)
            animals = animals_query.all()
            results["processed_animals"] = len(animals)

            fincas_to_analyze = {
                animal.finca_id for animal in animals if animal.finca_id
            }
            animal_ids = [animal.id for animal in animals]
            active_configs = (
                AnimalAlertConfig.query.filter(
                    AnimalAlertConfig.is_active.is_(True),
                    db.or_(
                        AnimalAlertConfig.animal_id.in_(animal_ids),
                        db.and_(
                            AnimalAlertConfig.animal_id.is_(None),
                            AnimalAlertConfig.finca_id.in_(fincas_to_analyze),
                        ),
                    ),
                ).all()
                if animals
                else []
            )
            configs_by_animal = {}
            global_configs_by_finca = {}
            for config in active_configs:
                if config.animal_id is not None:
                    configs_by_animal.setdefault(config.animal_id, []).append(config)
                elif config.finca_id is not None:
                    global_configs_by_finca.setdefault(config.finca_id, []).append(
                        config
                    )

            cutoff = datetime.now(UTC) - timedelta(hours=24)
            try:
                for offset in range(
                    0, len(animals), AlertEngine._EVALUATION_CHUNK_SIZE
                ):
                    chunk = animals[
                        offset : offset + AlertEngine._EVALUATION_CHUNK_SIZE
                    ]
                    chunk_ids = [animal.id for animal in chunk]
                    existing_rows = (
                        db.session.query(
                            AnimalAlert.animal_id,
                            AnimalAlert.message,
                            AnimalAlert.alert_type,
                            AnimalAlert.config_id,
                            AnimalAlert.finca_id,
                            AnimalAlert.dedupe_key,
                        )
                        .filter(
                            AnimalAlert.animal_id.in_(chunk_ids),
                            AnimalAlert.superseded_by_id.is_(None),
                            db.or_(
                                AnimalAlert.triggered_at >= cutoff,
                                AnimalAlert.is_read.is_(False),
                            ),
                        )
                        .all()
                    )
                    AlertEngine._dedupe_cache = {
                        animal_id: set() for animal_id in chunk_ids
                    }
                    AlertEngine._weather_dedupe = set()
                    AlertEngine._animal_record_cache = {
                        animal.id: animal.record or "Animal" for animal in chunk
                    }
                    for (
                        animal_id,
                        message,
                        alert_type,
                        config_id,
                        existing_finca_id,
                        dedupe_key,
                    ) in existing_rows:
                        stable_key = dedupe_key or build_alert_dedupe_key(
                            finca_id=existing_finca_id,
                            animal_id=animal_id,
                            config_id=config_id,
                            alert_type=alert_type,
                            message=message,
                        )
                        AlertEngine._dedupe_cache.setdefault(animal_id, set()).add(
                            stable_key
                        )
                        normalized = (message or "").lower()
                        if "estrés térmico" in normalized or "thi" in normalized:
                            AlertEngine._weather_dedupe.add(animal_id)

                    for animal in chunk:
                        try:
                            finca_id = getattr(animal, "finca_id", None)
                            custom_configs = [
                                *configs_by_animal.get(animal.id, []),
                                *global_configs_by_finca.get(finca_id, []),
                            ]
                            results["triggered"] += AlertEngine._evaluate_predetermined(
                                animal, finca_id
                            )
                            results["triggered"] += AlertEngine._evaluate_custom(
                                animal, finca_id, custom_configs
                            )
                        except Exception as e:
                            logger.error(f"Error evaluando animal {animal.id}: {e}")
                            results["errors"] += 1
            finally:
                AlertEngine._dedupe_cache = None
                AlertEngine._weather_dedupe = None
                AlertEngine._animal_record_cache = None

            from app.services.predictive_engine_service import PredictiveEngineService

            for finca_id in fincas_to_analyze:
                try:
                    logger.info(
                        f"Iniciando análisis predictivo determinista para finca {finca_id}"
                    )
                    predictive_result = PredictiveEngineService.run_finca_analysis(finca_id)
                    results["triggered"] += predictive_result.get("alerts_created", 0)
                except Exception as e:
                    logger.error(f"Error en análisis predictivo para finca {finca_id}: {e}")
                    db.session.rollback()
                    results["errors"] += 1

            try:
                results["inventory_alerts"] = AlertEngine._evaluate_inventory(
                    finca_id=finca_id
                )
            except Exception as e:
                logger.error(f"Error evaluando inventario: {e}")
                db.session.rollback()

            if finca_id is None:
                try:
                    results["infrastructure_alerts"] = (
                        AlertEngine._evaluate_infrastructure_health()
                    )
                except Exception as e:
                    logger.error(f"Error evaluando salud de infraestructura: {e}")
                    db.session.rollback()

            try:
                results["water_alerts"] = AlertEngine._evaluate_water_sources(
                    fincas_to_analyze
                )
            except Exception as e:
                logger.error(f"Error evaluando fuentes de agua: {e}")
                db.session.rollback()

            try:
                results["farm_entity_alerts"] = AlertEngine._evaluate_farm_entities(
                    fincas_to_analyze
                )
            except Exception as e:
                logger.error(f"Error evaluando alertas de entidades de finca: {e}")
                db.session.rollback()

            try:
                logger.info("Generando recomendaciones deterministas para alertas nuevas...")
                AlertEngine.populate_ai_recommendations()
            except Exception as e:
                logger.error(f"Error generando recomendaciones deterministas: {e}")
                db.session.rollback()

            db.session.commit()
            logger.info(
                f"Evaluación completada — animales: {results['processed_animals']}, "
                f"alertas: {results['triggered']}, inventario: {results['inventory_alerts']}, "
                f"agua: {results['water_alerts']}, errores: {results['errors']}"
            )
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def populate_ai_recommendations():
        from app.models.system_content import SystemContent

        since = datetime.now(UTC) - timedelta(hours=48)
        pending_alerts = (
            AnimalAlert.query.filter(
                AnimalAlert.recommendation == None,
                AnimalAlert.superseded_by_id.is_(None),
                AnimalAlert.triggered_at >= since,
            )
            .limit(50)
            .all()
        )
        if not pending_alerts:
            return
        for alert in pending_alerts:
            alert_type = (
                alert.alert_type.value
                if hasattr(alert.alert_type, "value")
                else str(alert.alert_type)
            )
            priority = (
                alert.priority.value
                if hasattr(alert.priority, "value")
                else str(alert.priority)
            )
            key = f"recommendation.alert.{alert_type}.{priority}"
            entry = SystemContent.get_by_key(key)
            if not entry:
                key = f"recommendation.alert.{alert_type}"
                entry = SystemContent.get_by_key(key)
            if not entry:
                entry = SystemContent.get_by_key("recommendation.alert.generic")
            if entry:
                alert.recommendation = entry.content
                db.session.add(alert)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging

            logging.getLogger(__name__).warning(
                "DB Commit falló (infraestructura): %s", __db_err
            )
            try:
                if "session" in globals() or "session" in locals():
                    db.session.rollback()
                else:
                    db.rollback()
            except:
                pass

    # ── METEOROLOGÍA ───────────────────────────────────────────────────

    @classmethod
    def get_finca_weather(cls, finca_id):
        import time
        from app import cache
        import requests

        now = time.time()
        cb_key = f"circuit_breaker:open_meteo:{finca_id}"
        cb_fails_key = f"{cb_key}:fails"
        cache_available = True
        try:
            if cache.get(cb_key):
                return None
        except Exception as ce:
            cache_available = False
            logger.warning(
                f"Cache no disponible para circuit breaker del clima en Finca {finca_id}: {ce}"
            )

        if finca_id in cls._weather_cache:
            data, timestamp = cls._weather_cache[finca_id]
            if now - timestamp < 3600:
                return data
        from app.models.finca import Finca

        finca = Finca.query.get(finca_id) if finca_id else None
        lat = (
            finca.latitude
            if finca and getattr(finca, "latitude", None) is not None
            else None
        )
        lon = (
            finca.longitude
            if finca and getattr(finca, "longitude", None) is not None
            else None
        )
        if lat is None or lon is None:
            return None
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            if cache_available:
                try:
                    cache.delete(cb_fails_key)
                except Exception:
                    pass
            result = {
                "temp": data["current"]["temperature_2m"],
                "humidity": data["current"]["relative_humidity_2m"],
            }
        except Exception as e:
            fails = 0
            if cache_available:
                try:
                    fails = cache.get(cb_fails_key) or 0
                    fails += 1
                    cache.set(cb_fails_key, fails, timeout=3600)
                    if fails >= 3:
                        cache.set(cb_key, "OPEN", timeout=1800)
                        logger.error(
                            f"CIRCUIT BREAKER OPEN: Open-Meteo falló {fails} veces para Finca {finca_id}."
                        )
                except Exception as ce:
                    logger.warning(f"Error actualizando circuit breaker en cache: {ce}")
            else:
                logger.warning(
                    f"Error en Open-Meteo y cache no disponible para circuit breaker: {e}"
                )
            logger.warning(f"Error Open-Meteo Finca {finca_id}: {e}")
            result = AlertEngine._get_weather_fallback(finca_id)
        cls._weather_cache[finca_id] = (result, now)
        return result

    @classmethod
    def _get_weather_fallback(cls, finca_id):
        from app.models.system_content import SystemContent

        entry = SystemContent.get_by_key("config.weather_fallback", finca_id=finca_id)
        if entry and entry.extra:
            return entry.extra
        return None

    # ── REGLAS PREDETERMINADAS (delegan a módulos especializados) ──────

    @staticmethod
    def _evaluate_predetermined(animal, finca_id=None) -> int:
        n = 0
        today = date.today()
        age_months = animal.age_in_months or 0

        def trig(tipo, msg, prioridad):
            nonlocal n
            if AlertEngine._trigger_if_not_exists(
                animal.id, tipo, msg, prioridad, finca_id=finca_id
            ):
                n += 1

        from app.services.alert_rules_growth import evaluate_growth_rules
        from app.services.alert_rules_health import evaluate_health_rules
        from app.services.alert_rules_recommendations import (
            evaluate_recommendation_rules,
        )
        from app.services.alert_rules_reproduction import evaluate_reproduction_rules
        from app.services.alert_rules_production import evaluate_production_rules

        evaluate_growth_rules(animal, finca_id, trig, today, age_months)
        evaluate_health_rules(animal, finca_id, trig, today, age_months)
        evaluate_recommendation_rules(animal, finca_id, trig, today, age_months)
        evaluate_reproduction_rules(animal, finca_id, trig, today, age_months)
        evaluate_production_rules(animal, finca_id, trig, today, age_months)

        return n

    # ── REGLAS PERSONALIZADAS ─────────────────────────────────────────

    @staticmethod
    def _evaluate_custom(animal, finca_id=None, configs=None) -> int:
        n = 0
        today = date.today()
        if configs is None:
            all_configs = list(animal.alert_configs.filter_by(is_active=True).all())
            if finca_id:
                all_configs.extend(
                    AnimalAlertConfig.query.filter_by(
                        finca_id=finca_id,
                        animal_id=None,
                        is_active=True,
                    ).all()
                )
        else:
            all_configs = configs
        for cfg in all_configs:
            try:
                dim = cfg.dimension.lower()
                val = cfg.condition_value
                is_triggered = False
                if dim == "weight":
                    is_triggered = AlertEngine._check_condition(animal.weight, val)
                elif dim == "age":
                    is_triggered = AlertEngine._check_condition(
                        animal.age_in_months, val
                    )
                elif dim == "status":
                    is_triggered = animal.status.value == val
                elif dim == "sex":
                    is_triggered = animal.sex.value == val
                elif dim == "days_since_control":
                    last_c = animal.controls.order_by(
                        Control.checkup_date.desc()
                    ).first()
                    days = (today - last_c.checkup_date).days if last_c else 9999
                    is_triggered = AlertEngine._check_condition(days, val)
                elif dim == "is_pregnant":
                    is_triggered = animal.is_pregnant == (val.lower() == "true")
                elif dim == "is_lactating":
                    is_triggered = animal.is_lactating == (val.lower() == "true")
                elif dim == "days_since_calving":
                    if animal.last_calving_date:
                        days = (today - animal.last_calving_date).days
                        is_triggered = AlertEngine._check_condition(days, val)
                    else:
                        is_triggered = AlertEngine._check_condition(9999, val)
                elif dim == "days_since_vaccination":
                    last_v = animal.vaccinations.order_by(
                        Vaccinations.vaccination_date.desc()
                    ).first()
                    days = (today - last_v.vaccination_date).days if last_v else 9999
                    is_triggered = AlertEngine._check_condition(days, val)
                elif dim == "days_since_deworming":
                    last_d = (
                        AnimalHealthHistory.query.filter_by(
                            animal_id=animal.id, event_type="Deworming"
                        )
                        .order_by(AnimalHealthHistory.event_date.desc())
                        .first()
                    )
                    days = (today - last_d.event_date).days if last_d else 9999
                    is_triggered = AlertEngine._check_condition(days, val)
                elif dim == "body_condition_score":
                    last_bcs = animal.body_condition_scores.order_by(
                        BodyConditionScore.score_date.desc()
                    ).first()
                    if last_bcs:
                        is_triggered = AlertEngine._check_condition(last_bcs.score, val)
                elif dim == "milk_production":
                    from app.models.milk_production import MilkProduction

                    last_milk = (
                        MilkProduction.query.filter_by(animal_id=animal.id)
                        .order_by(MilkProduction.date.desc())
                        .first()
                    )
                    if last_milk:
                        is_triggered = AlertEngine._check_condition(
                            last_milk.liters, val
                        )
                elif dim == "days_since_milk_record":
                    from app.models.milk_production import MilkProduction

                    last_milk = (
                        MilkProduction.query.filter_by(animal_id=animal.id)
                        .order_by(MilkProduction.date.desc())
                        .first()
                    )
                    days = (today - last_milk.date).days if last_milk else 9999
                    is_triggered = AlertEngine._check_condition(days, val)
                if is_triggered:
                    priority = getattr(cfg, "priority", None) or AlertPriority.HIGH
                    if AlertEngine._trigger_if_not_exists(
                        animal.id,
                        cfg.alert_type,
                        cfg.message,
                        priority,
                        config_id=cfg.id,
                        finca_id=finca_id,
                    ):
                        n += 1
            except Exception:
                continue
        return n

    # ── INVENTARIO ────────────────────────────────────────────────────

    @staticmethod
    def _evaluate_inventory(finca_id: int | None = None) -> int:
        n = 0
        today = date.today()
        lots_query = InventoryLot.query.filter(InventoryLot.current_quantity > 0)
        if finca_id is not None:
            lots_query = lots_query.filter(InventoryLot.finca_id == finca_id)
        lots = lots_query.all()
        for lot in lots:
            try:
                days_to_exp = (lot.expiry_date - today).days
                if days_to_exp < 0:
                    if AlertEngine._log_farm_alert(
                        lot.finca_id,
                        f"INVENTARIO: Producto Vencido ({lot.lot_number})",
                        f"El lote de {lot.product_name} venció el {lot.expiry_date}.",
                        "danger",
                    ):
                        n += 1
                elif days_to_exp <= 30:
                    if AlertEngine._log_farm_alert(
                        lot.finca_id,
                        f"INVENTARIO: Próximo a Vencer ({lot.lot_number})",
                        f"El lote de {lot.product_name} vence en {days_to_exp} días.",
                        "warning",
                    ):
                        n += 1
                if lot.is_low_stock:
                    if AlertEngine._log_farm_alert(
                        lot.finca_id,
                        f"INVENTARIO: Stock Bajo ({lot.product_name})",
                        f"Solo {lot.current_quantity} {lot.unit} disponibles. Mínimo: {lot.min_stock}.",
                        "warning",
                    ):
                        n += 1
            except Exception:
                pass
        return n

    @staticmethod
    def _evaluate_infrastructure_health() -> int:
        n = 0
        from app.utils.health_check import HealthChecker
        from app import db, cache

        checker = HealthChecker(db, cache)
        health = checker.comprehensive_health_check()
        db_h = health["checks"]["database"]
        if db_h["status"] != "healthy":
            if AlertEngine._log_farm_alert(
                None,
                "INFRAESTRUCTURA: Error de Base de Datos",
                f"La conexión a la DB falló: {db_h.get('error', 'Desconocido')}",
                "danger",
            ):
                n += 1
        elif db_h.get("response_time_ms", 0) > 500:
            if AlertEngine._log_farm_alert(
                None,
                "INFRAESTRUCTURA: Latencia de DB Alta",
                f"La DB está respondiendo lento ({db_h['response_time_ms']}ms). Posible saturación.",
                "warning",
            ):
                n += 1
        cache_h = health["checks"]["cache"]
        if cache_h["status"] == "unhealthy":
            if AlertEngine._log_farm_alert(
                None,
                "INFRAESTRUCTURA: Error de Redis",
                "Redis no responde. Las funciones de tiempo real y caché están deshabilitadas.",
                "danger",
            ):
                n += 1
        sys_h = health["checks"]["system_resources"]
        if sys_h["status"] != "healthy":
            for warning in sys_h.get("warnings", []):
                if AlertEngine._log_farm_alert(
                    None,
                    "INFRAESTRUCTURA: Recursos Críticos",
                    warning,
                    "warning" if sys_h["status"] == "warning" else "danger",
                ):
                    n += 1
        cel_h = health["checks"]["celery"]
        if cel_h["status"] != "healthy":
            if AlertEngine._log_farm_alert(
                None,
                "INFRAESTRUCTURA: Workers Inactivos",
                "No hay workers de Celery activos. Las tareas pesadas y alertas no se procesarán.",
                "danger",
            ):
                n += 1
        return n

    @staticmethod
    def _evaluate_water_sources(fincas) -> int:
        n = 0
        from app.models.campesino import WaterSource, WaterMeasurement
        from app import db
        import logging
        from datetime import datetime, UTC, timedelta

        logger = logging.getLogger(__name__)

        for finca_id in fincas:
            sources = WaterSource.query.filter_by(finca_id=finca_id).all()
            for source in sources:
                # Obtener la última medición
                latest_measurement = (
                    WaterMeasurement.query.filter_by(water_source_id=source.id)
                    .order_by(WaterMeasurement.measured_at.desc())
                    .first()
                )

                if not latest_measurement:
                    continue

                # Regla Crítica: Nivel bajo
                if (
                    latest_measurement.level_percent is not None
                    and latest_measurement.level_percent < 25
                ):
                    if AlertEngine._log_farm_alert(
                        finca_id,
                        f"AGUA CRÍTICA: {source.name}",
                        f"El nivel de agua reportado es peligrosamente bajo ({latest_measurement.level_percent}%).",
                        "danger",
                    ):
                        n += 1

                # Regla de Advertencia: pH Anormal (Rango ideal 6.5 a 8.5)
                if latest_measurement.ph is not None:
                    if latest_measurement.ph < 6.5 or latest_measurement.ph > 8.5:
                        if AlertEngine._log_farm_alert(
                            finca_id,
                            f"CALIDAD AGUA: {source.name}",
                            f"El pH registrado ({latest_measurement.ph}) está fuera del rango óptimo (6.5 - 8.5).",
                            "warning",
                        ):
                            n += 1

        return n

    @staticmethod
    def _evaluate_farm_entities(fincas) -> int:
        """Evalúa reglas personalizadas para entidades de finca (cultivos, agua)."""
        n = 0
        today = date.today()
        from app.models.farm_entity_alerts import FarmEntityAlertConfig, FarmEntityAlert
        from app.models.campesino import (
            CropPlot,
            CropActivity,
            CropStatus,
            WaterSource,
            WaterMeasurement,
        )

        for finca_id in fincas:
            configs = FarmEntityAlertConfig.query.filter_by(
                finca_id=finca_id,
                is_active=True,
                is_deleted=False,
            ).all()

            for cfg in configs:
                try:
                    dim = cfg.dimension.lower()
                    val = cfg.condition_value
                    entities = []

                    if cfg.entity_type == "crop_plot":
                        if cfg.entity_id:
                            crop = CropPlot.query.filter_by(
                                id=cfg.entity_id, finca_id=finca_id
                            ).first()
                            entities = [crop] if crop else []
                        else:
                            # Native PG enum stores member NAMES (PLANNED/ACTIVE); raw
                            # lowercase strings raise "invalid input value for enum".
                            entities = (
                                CropPlot.query.filter_by(finca_id=finca_id)
                                .filter(
                                    CropPlot.status.in_(
                                        [CropStatus.PLANNED, CropStatus.ACTIVE]
                                    )
                                )
                                .all()
                            )
                    elif cfg.entity_type == "water_source":
                        if cfg.entity_id:
                            source = WaterSource.query.filter_by(
                                id=cfg.entity_id, finca_id=finca_id
                            ).first()
                            entities = [source] if source else []
                        else:
                            entities = WaterSource.query.filter_by(
                                finca_id=finca_id
                            ).all()

                    for entity in entities:
                        is_triggered = False
                        entity_value = None

                        if cfg.entity_type == "crop_plot":
                            if dim == "days_since_sowing":
                                if entity.sowing_date:
                                    entity_value = (today - entity.sowing_date).days
                                else:
                                    entity_value = 9999
                            elif dim == "days_until_harvest":
                                if entity.expected_harvest_date:
                                    entity_value = (
                                        entity.expected_harvest_date - today
                                    ).days
                                else:
                                    entity_value = 9999
                            elif dim == "days_since_last_activity":
                                last_activity = (
                                    CropActivity.query.filter_by(crop_plot_id=entity.id)
                                    .order_by(CropActivity.activity_date.desc())
                                    .first()
                                )
                                if last_activity:
                                    entity_value = (
                                        today - last_activity.activity_date
                                    ).days
                                else:
                                    entity_value = 9999
                            elif dim == "area":
                                entity_value = entity.area or 0

                        elif cfg.entity_type == "water_source":
                            last_measurement = (
                                WaterMeasurement.query.filter_by(
                                    water_source_id=entity.id
                                )
                                .order_by(WaterMeasurement.measured_at.desc())
                                .first()
                            )
                            if dim == "water_level":
                                entity_value = (
                                    last_measurement.level_percent
                                    if last_measurement
                                    else None
                                )
                            elif dim == "ph":
                                entity_value = (
                                    last_measurement.ph if last_measurement else None
                                )
                            elif dim == "turbidity":
                                entity_value = (
                                    last_measurement.turbidity
                                    if last_measurement
                                    else None
                                )
                            elif dim == "flow_rate":
                                entity_value = (
                                    last_measurement.flow_liters_minute
                                    if last_measurement
                                    else None
                                )
                            elif dim == "days_since_measurement":
                                if last_measurement:
                                    entity_value = (
                                        today - last_measurement.measured_at.date()
                                    ).days
                                else:
                                    entity_value = 9999

                        if entity_value is not None:
                            is_triggered = AlertEngine._check_condition(
                                entity_value, val
                            )

                        if is_triggered:
                            entity_name = getattr(
                                entity,
                                "name",
                                getattr(entity, "crop_name", f"ID {entity.id}"),
                            )
                            message = cfg.message.replace("{entity_name}", entity_name)
                            priority = cfg.priority or AlertPriority.MEDIUM
                            priority_value = getattr(priority, "value", str(priority))

                            existing = FarmEntityAlert.query.filter_by(
                                entity_type=cfg.entity_type,
                                entity_id=entity.id,
                                config_id=cfg.id,
                                is_read=False,
                            ).first()

                            if not existing:
                                alert = FarmEntityAlert(
                                    entity_type=cfg.entity_type,
                                    entity_id=entity.id,
                                    config_id=cfg.id,
                                    alert_type=cfg.entity_type.replace(
                                        "_", " "
                                    ).title(),
                                    message=message,
                                    priority=priority_value,
                                    finca_id=finca_id,
                                )
                                db.session.add(alert)
                                n += 1
                except Exception as e:
                    logger.error(f"Error evaluando config {cfg.id}: {e}")
                    # Clear the aborted transaction so remaining configs can
                    # still be evaluated (otherwise every later query fails
                    # with "current transaction is aborted").
                    db.session.rollback()
                    continue

        return n

    @staticmethod
    def _log_farm_alert(finca_id, title, description, severity):
        exists = ActivityLog.query.filter(
            ActivityLog.finca_id == finca_id,
            ActivityLog.title == title,
            ActivityLog.created_at >= date.today(),
        ).first()
        if not exists:
            ActivityLog.create(
                action="ALERTA",
                entity="Inventory",
                title=title,
                description=description,
                severity=severity,
                finca_id=finca_id,
            )
            if severity in ["danger", "warning"] and finca_id:
                try:
                    AlertEngine._queue_push(
                        finca_id=finca_id,
                        title=f" {title}",
                        body=description,
                        data={
                            "type": "inventory_alert",
                            "severity": severity,
                            "url": "/inventario",
                        },
                    )
                except Exception as e:
                    logger.error(
                        f"Error enviando push notification para inventario: {e}"
                    )
            return True
        return False

    # ── HELPERS ────────────────────────────────────────────────────────

    @staticmethod
    def _check_condition(current_val, condition_str: str) -> bool:
        if current_val is None:
            return False
        s = condition_str.strip()
        target_val_str = s
        operator = "=="
        if s.startswith(">="):
            operator = ">="
            target_val_str = s[2:]
        elif s.startswith("<="):
            operator = "<="
            target_val_str = s[2:]
        elif s.startswith(">"):
            operator = ">"
            target_val_str = s[1:]
        elif s.startswith("<"):
            operator = "<"
            target_val_str = s[1:]
        elif s.startswith("="):
            operator = "=="
            target_val_str = s[1:]
        target_val_str = target_val_str.strip()
        try:
            from datetime import date as py_date

            target_date = py_date.fromisoformat(target_val_str)
            cur_date = None
            if isinstance(current_val, py_date):
                cur_date = current_val
            elif isinstance(current_val, str):
                cur_date = py_date.fromisoformat(current_val)
            if cur_date:
                if operator == ">=":
                    return cur_date >= target_date
                if operator == "<=":
                    return cur_date <= target_date
                if operator == ">":
                    return cur_date > target_date
                if operator == "<":
                    return cur_date < target_date
                if operator == "==":
                    return cur_date == target_date
        except Exception:
            pass
        try:
            c_val = float(current_val)
            t_val = float(target_val_str)
            if operator == ">=":
                return c_val >= t_val
            if operator == "<=":
                return c_val <= t_val
            if operator == ">":
                return c_val > t_val
            if operator == "<":
                return c_val < t_val
            if operator == "==":
                return c_val == t_val
            return c_val == t_val
        except (ValueError, TypeError):
            return str(current_val) == target_val_str

    @staticmethod
    def _trigger_if_not_exists(
        animal_id, alert_type, message, priority, config_id=None, finca_id=None
    ) -> bool:
        cutoff = datetime.now(UTC) - timedelta(hours=24)
        dedupe_key = build_alert_dedupe_key(
            finca_id=finca_id,
            animal_id=animal_id,
            config_id=config_id,
            alert_type=alert_type,
            message=message,
        )

        # 1. De-duplicación estándar: si ya existe una alerta igual sin leer o en las últimas 24h, no duplicarla.
        if AlertEngine._dedupe_cache is not None:
            existing_messages = AlertEngine._dedupe_cache.setdefault(animal_id, set())
            if dedupe_key in existing_messages:
                return False
        else:
            recent = AnimalAlert.query.filter(
                AnimalAlert.animal_id == animal_id,
                AnimalAlert.finca_id == finca_id,
                AnimalAlert.superseded_by_id.is_(None),
                db.or_(
                    AnimalAlert.triggered_at >= cutoff,
                    AnimalAlert.is_read.is_(False),
                ),
            ).all()
            if any(
                (
                    row.dedupe_key
                    or build_alert_dedupe_key(
                        finca_id=row.finca_id,
                        animal_id=row.animal_id,
                        config_id=row.config_id,
                        alert_type=row.alert_type,
                        message=row.message,
                    )
                )
                == dedupe_key
                for row in recent
            ):
                return False

        # 2. De-duplicación especial para Estrés Térmico (Clima) para evitar inundar la DB
        # cuando el valor del THI fluctúa levemente y cambia el string exacto.
        if "estrés térmico" in message.lower() or "thi" in message.lower():
            if (
                AlertEngine._weather_dedupe is not None
                and animal_id in AlertEngine._weather_dedupe
            ):
                return False
            if AlertEngine._weather_dedupe is None:
                recent_weather = AnimalAlert.query.filter(
                    AnimalAlert.animal_id == animal_id,
                    AnimalAlert.is_read.is_(False),
                    AnimalAlert.superseded_by_id.is_(None),
                    db.or_(
                        AnimalAlert.message.ilike("%estrés térmico%"),
                        AnimalAlert.message.ilike("%thi%"),
                    ),
                ).first()
                if recent_weather:
                    return False

        db.session.add(
            AnimalAlert(
                animal_id=animal_id,
                config_id=config_id,
                alert_type=alert_type,
                message=message,
                priority=priority,
                triggered_at=datetime.now(UTC),
                finca_id=finca_id,
                is_read=False,
                dedupe_key=dedupe_key,
            )
        )
        if AlertEngine._dedupe_cache is not None:
            AlertEngine._dedupe_cache.setdefault(animal_id, set()).add(dedupe_key)
        if AlertEngine._weather_dedupe is not None and (
            "estrés térmico" in message.lower() or "thi" in message.lower()
        ):
            AlertEngine._weather_dedupe.add(animal_id)
        if finca_id:
            if priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]:
                try:
                    if AlertEngine._animal_record_cache is not None:
                        animal_record = AlertEngine._animal_record_cache.get(
                            animal_id, "Animal"
                        )
                    else:
                        animal = db.session.get(Animals, animal_id)
                        animal_record = animal.record if animal else "Animal"
                    AlertEngine._queue_push(
                        finca_id=finca_id,
                        title=f" Alerta {priority.value}: {animal_record}",
                        body=message,
                        data={
                            "type": "alert",
                            "animal_id": animal_id,
                            "alert_type": alert_type.value
                            if hasattr(alert_type, "value")
                            else str(alert_type),
                            "priority": priority.value.lower()
                            if hasattr(priority, "value")
                            else str(priority).lower(),
                            "url": f"/animales/{animal_id}",
                        },
                    )
                except Exception as e:
                    logger.error(f"Error enviando push notification: {e}")
            AlertEngine._queue_sse(finca_id, priority)
        return True
