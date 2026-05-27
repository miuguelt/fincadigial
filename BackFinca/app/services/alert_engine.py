"""
Motor de evaluación de alertas ganaderas — Finca Villa Luz.

Clase principal de orquestación. Las reglas de evaluación están separadas en:
  - alert_rules_health.py   (sanidad, vacunas, controles, enfermedades)
  - alert_rules_reproduction.py (gestación, celo, parto, inseminación)
  - alert_rules_growth.py   (peso, ADG, BCS, proyección, destete)
  - alert_rules_production.py (leche, métricas productivas)
"""
from datetime import date, datetime, timedelta, UTC
import logging
from app import db
from app.models.alerts import AnimalAlert, AnimalAlertConfig, AlertType, AlertPriority
from app.models.animals import Animals
from app.models.control import Control
from app.models.inventory import InventoryLot
from app.models.activity_log import ActivityLog
from app.services.push_notification_service import PushNotificationService


logger = logging.getLogger(__name__)


class AlertEngine:

    _weather_cache = {}

    @staticmethod
    def _get_param(key: str) -> float | None:
        from app.models.system_content import SystemContent
        entry = SystemContent.get_by_key(f'param.alert.{key}')
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
    def evaluate_all() -> dict:
        results = {
            'triggered': 0,
            'processed_animals': 0,
            'inventory_alerts': 0,
            'errors': 0,
        }
        try:
            try:
                import flask
                flask.g.is_admin = True
            except RuntimeError:
                pass

            animals = db.session.query(Animals).filter_by(status='Vivo').all()
            results['processed_animals'] = len(animals)

            fincas_to_analyze = set()

            for animal in animals:
                try:
                    finca_id = getattr(animal, 'finca_id', None)
                    if finca_id:
                        fincas_to_analyze.add(finca_id)
                    results['triggered'] += AlertEngine._evaluate_predetermined(animal, finca_id)
                    results['triggered'] += AlertEngine._evaluate_custom(animal, finca_id)
                except Exception as e:
                    logger.error(f"Error evaluando animal {animal.id}: {e}")
                    results['errors'] += 1

            from app.services.predictive_engine_service import PredictiveEngineService
            for finca_id in fincas_to_analyze:
                try:
                    logger.info(f"Iniciando análisis predictivo IA para finca {finca_id}")
                    ai_result = PredictiveEngineService.run_finca_analysis(finca_id)
                    results['triggered'] += ai_result.get('alerts_created', 0)
                except Exception as e:
                    logger.error(f"Error en análisis IA para finca {finca_id}: {e}")
                    results['errors'] += 1

            try:
                results['inventory_alerts'] = AlertEngine._evaluate_inventory()
            except Exception as e:
                logger.error(f"Error evaluando inventario: {e}")

            try:
                results['infrastructure_alerts'] = AlertEngine._evaluate_infrastructure_health()
            except Exception as e:
                logger.error(f"Error evaluando salud de infraestructura: {e}")

            try:
                logger.info("Generando recomendaciones IA para alertas nuevas...")
                AlertEngine.populate_ai_recommendations()
            except Exception as e:
                logger.error(f"Error generando recomendaciones IA: {e}")

            db.session.commit()
            logger.info(
                f"Evaluación completada — animales: {results['processed_animals']}, "
                f"alertas: {results['triggered']}, inventario: {results['inventory_alerts']}, "
                f"errores: {results['errors']}"
            )
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error crítico en AlertEngine: {e}")
            raise
        return results

    @staticmethod
    def populate_ai_recommendations():
        from app.models.system_content import SystemContent
        since = datetime.now(UTC) - timedelta(hours=48)
        pending_alerts = AnimalAlert.query.filter(
            AnimalAlert.recommendation == None,
            AnimalAlert.triggered_at >= since
        ).limit(50).all()
        if not pending_alerts:
            return
        for alert in pending_alerts:
            alert_type = alert.alert_type.value if hasattr(alert.alert_type, 'value') else str(alert.alert_type)
            priority = alert.priority.value if hasattr(alert.priority, 'value') else str(alert.priority)
            key = f'recommendation.alert.{alert_type}.{priority}'
            entry = SystemContent.get_by_key(key)
            if not entry:
                key = f'recommendation.alert.{alert_type}'
                entry = SystemContent.get_by_key(key)
            if not entry:
                entry = SystemContent.get_by_key('recommendation.alert.generic')
            if entry:
                alert.recommendation = entry.content
                db.session.add(alert)
        db.session.commit()

    # ── METEOROLOGÍA ───────────────────────────────────────────────────

    @classmethod
    def get_finca_weather(cls, finca_id):
        import time
        from app import cache
        import requests
        now = time.time()
        cb_key = f'circuit_breaker:open_meteo:{finca_id}'
        cb_fails_key = f'{cb_key}:fails'
        if cache.get(cb_key):
            return None
        if finca_id in cls._weather_cache:
            data, timestamp = cls._weather_cache[finca_id]
            if now - timestamp < 3600:
                return data
        from app.models.finca import Finca
        finca = Finca.query.get(finca_id) if finca_id else None
        lat = finca.latitude if finca and getattr(finca, 'latitude', None) is not None else 4.6097
        lon = finca.longitude if finca and getattr(finca, 'longitude', None) is not None else -74.0817
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            cache.delete(cb_fails_key)
            result = {'temp': data['current']['temperature_2m'], 'humidity': data['current']['relative_humidity_2m']}
        except Exception as e:
            fails = cache.get(cb_fails_key) or 0
            fails += 1
            cache.set(cb_fails_key, fails, timeout=3600)
            if fails >= 3:
                cache.set(cb_key, 'OPEN', timeout=1800)
                logger.error(f"CIRCUIT BREAKER OPEN: Open-Meteo falló {fails} veces para Finca {finca_id}.")
            logger.warning(f"Error Open-Meteo Finca {finca_id}: {e}")
            result = AlertEngine._get_weather_fallback(finca_id)
        cls._weather_cache[finca_id] = (result, now)
        return result

    @classmethod
    def _get_weather_fallback(cls, finca_id):
        from app.models.system_content import SystemContent
        entry = SystemContent.get_by_key('config.weather_fallback', finca_id=finca_id)
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
            if AlertEngine._trigger_if_not_exists(animal.id, tipo, msg, prioridad, finca_id=finca_id):
                n += 1

        from app.services.alert_rules_growth import evaluate_growth_rules
        from app.services.alert_rules_health import evaluate_health_rules
        from app.services.alert_rules_reproduction import evaluate_reproduction_rules
        from app.services.alert_rules_production import evaluate_production_rules
        evaluate_growth_rules(animal, finca_id, trig, today, age_months)
        evaluate_health_rules(animal, finca_id, trig, today, age_months)
        evaluate_reproduction_rules(animal, finca_id, trig, today, age_months)
        evaluate_production_rules(animal, finca_id, trig, today, age_months)

        return n

    # ── REGLAS PERSONALIZADAS ─────────────────────────────────────────

    @staticmethod
    def _evaluate_custom(animal, finca_id=None) -> int:
        n = 0
        today = date.today()
        all_configs = []
        all_configs.extend(animal.alert_configs.filter_by(is_active=True).all())
        if finca_id:
            global_configs = AnimalAlertConfig.query.filter_by(finca_id=finca_id, animal_id=None, is_active=True).all()
            all_configs.extend(global_configs)
        for cfg in all_configs:
            try:
                dim = cfg.dimension.lower()
                val = cfg.condition_value
                is_triggered = False
                if dim == 'weight':
                    is_triggered = AlertEngine._check_condition(animal.weight, val)
                elif dim == 'age':
                    is_triggered = AlertEngine._check_condition(animal.age_in_months, val)
                elif dim == 'status':
                    is_triggered = (animal.status.value == val)
                elif dim == 'sex':
                    is_triggered = (animal.sex.value == val)
                elif dim == 'days_since_control':
                    last_c = animal.controls.order_by(Control.checkup_date.desc()).first()
                    days = (today - last_c.checkup_date).days if last_c else 9999
                    is_triggered = AlertEngine._check_condition(days, val)
                if is_triggered:
                    priority = getattr(cfg, 'priority', None) or AlertPriority.HIGH
                    if AlertEngine._trigger_if_not_exists(animal.id, cfg.alert_type, cfg.message, priority, config_id=cfg.id, finca_id=finca_id):
                        n += 1
            except Exception:
                continue
        return n

    # ── INVENTARIO ────────────────────────────────────────────────────

    @staticmethod
    def _evaluate_inventory() -> int:
        n = 0
        today = date.today()
        lots = InventoryLot.query.filter(InventoryLot.current_quantity > 0).all()
        for lot in lots:
            try:
                days_to_exp = (lot.expiry_date - today).days
                if days_to_exp < 0:
                    if AlertEngine._log_farm_alert(lot.finca_id, f"INVENTARIO: Producto Vencido ({lot.lot_number})", f"El lote de {lot.product_name} venció el {lot.expiry_date}.", 'danger'):
                        n += 1
                elif days_to_exp <= 30:
                    if AlertEngine._log_farm_alert(lot.finca_id, f"INVENTARIO: Próximo a Vencer ({lot.lot_number})", f"El lote de {lot.product_name} vence en {days_to_exp} días.", 'warning'):
                        n += 1
                if lot.is_low_stock:
                    if AlertEngine._log_farm_alert(lot.finca_id, f"INVENTARIO: Stock Bajo ({lot.product_name})", f"Solo {lot.current_quantity} {lot.unit} disponibles. Mínimo: {lot.min_stock}.", 'warning'):
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
        db_h = health['checks']['database']
        if db_h['status'] != 'healthy':
            if AlertEngine._log_farm_alert(None, "INFRAESTRUCTURA: Error de Base de Datos", f"La conexión a la DB falló: {db_h.get('error', 'Desconocido')}", 'danger'):
                n += 1
        elif db_h.get('response_time_ms', 0) > 500:
            if AlertEngine._log_farm_alert(None, "INFRAESTRUCTURA: Latencia de DB Alta", f"La DB está respondiendo lento ({db_h['response_time_ms']}ms). Posible saturación.", 'warning'):
                n += 1
        cache_h = health['checks']['cache']
        if cache_h['status'] == 'unhealthy':
            if AlertEngine._log_farm_alert(None, "INFRAESTRUCTURA: Error de Redis", "Redis no responde. Las funciones de tiempo real y caché están deshabilitadas.", 'danger'):
                n += 1
        sys_h = health['checks']['system_resources']
        if sys_h['status'] != 'healthy':
            for warning in sys_h.get('warnings', []):
                if AlertEngine._log_farm_alert(None, "INFRAESTRUCTURA: Recursos Críticos", warning, 'warning' if sys_h['status'] == 'warning' else 'danger'):
                    n += 1
        cel_h = health['checks']['celery']
        if cel_h['status'] != 'healthy':
            if AlertEngine._log_farm_alert(None, "INFRAESTRUCTURA: Workers Inactivos", "No hay workers de Celery activos. Las tareas pesadas y alertas no se procesarán.", 'danger'):
                n += 1
        return n

    @staticmethod
    def _log_farm_alert(finca_id, title, description, severity):
        exists = ActivityLog.query.filter(ActivityLog.finca_id == finca_id, ActivityLog.title == title, ActivityLog.created_at >= date.today()).first()
        if not exists:
            ActivityLog.create(action='ALERTA', entity='Inventory', title=title, description=description, severity=severity, finca_id=finca_id)
            if severity in ['danger', 'warning'] and finca_id:
                try:
                    PushNotificationService.send_to_finca(finca_id=finca_id, title=f" {title}", body=description, data={'type': 'inventory_alert', 'severity': severity, 'url': '/inventario'})
                except Exception as e:
                    logger.error(f"Error enviando push notification para inventario: {e}")
            return True
        return False

    # ── HELPERS ────────────────────────────────────────────────────────

    @staticmethod
    def _check_condition(current_val, condition_str: str) -> bool:
        if current_val is None:
            return False
        s = condition_str.strip()
        target_val_str = s
        operator = '=='
        if s.startswith('>='): operator = '>='; target_val_str = s[2:]
        elif s.startswith('<='): operator = '<='; target_val_str = s[2:]
        elif s.startswith('>'): operator = '>'; target_val_str = s[1:]
        elif s.startswith('<'): operator = '<'; target_val_str = s[1:]
        elif s.startswith('='): operator = '=='; target_val_str = s[1:]
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
                if operator == '>=': return cur_date >= target_date
                if operator == '<=': return cur_date <= target_date
                if operator == '>': return cur_date > target_date
                if operator == '<': return cur_date < target_date
                if operator == '==': return cur_date == target_date
        except Exception:
            pass
        try:
            c_val = float(current_val)
            t_val = float(target_val_str)
            if operator == '>=': return c_val >= t_val
            if operator == '<=': return c_val <= t_val
            if operator == '>': return c_val > t_val
            if operator == '<': return c_val < t_val
            if operator == '==': return c_val == t_val
            return c_val == t_val
        except (ValueError, TypeError):
            return str(current_val) == target_val_str

    @staticmethod
    def _trigger_if_not_exists(animal_id, alert_type, message, priority, config_id=None, finca_id=None) -> bool:
        cutoff = datetime.now(UTC) - timedelta(hours=24)
        recent = AnimalAlert.query.filter(AnimalAlert.animal_id == animal_id, AnimalAlert.message == message, AnimalAlert.triggered_at >= cutoff).first()
        if recent:
            return False
        AnimalAlert.create(animal_id=animal_id, config_id=config_id, alert_type=alert_type, message=message, priority=priority, triggered_at=datetime.now(UTC), finca_id=finca_id)
        if finca_id:
            if priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]:
                try:
                    animal = Animals.query.get(animal_id)
                    animal_record = animal.record if animal else "Animal"
                    PushNotificationService.send_to_finca(finca_id=finca_id, title=f" Alerta {priority.value}: {animal_record}", body=message, data={'type': 'alert', 'animal_id': animal_id, 'alert_type': alert_type.value if hasattr(alert_type, 'value') else str(alert_type), 'priority': priority.value.lower() if hasattr(priority, 'value') else str(priority).lower(), 'url': f'/animales/{animal_id}'})
                except Exception as e:
                    logger.error(f"Error enviando push notification: {e}")
            try:
                from app import sse
                sse_data = {'type': f'alerta_{priority.value.lower()}', 'message': message, 'animal_id': animal_id, 'timestamp': datetime.now(UTC).isoformat()}
                sse.publish(sse_data, type='alertas')
            except Exception:
                pass
        return True
