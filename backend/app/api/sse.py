import logging
import time
import json
import threading
import queue
import flask
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from ..utils.response_handler import APIResponse

logger = logging.getLogger(__name__)


def init_sse_bus(app):
    try:
        from ..utils.redis_bus import RedisEventBus, InMemoryEventBus
        redis_client = app.extensions.get('redis')
        redis_pubsub_client = app.extensions.get('redis_pubsub')

        if redis_client and redis_pubsub_client:
            app.extensions["event_bus"] = RedisEventBus(redis_client, redis_pubsub_client)
            logger.info("SSE Bus: Utilizando Redis (Escalable)")
        elif redis_client:
            app.extensions["event_bus"] = RedisEventBus(redis_client, redis_client)
            logger.info("SSE Bus: Utilizando Redis (cliente compartido)")
        else:
            app.extensions["event_bus"] = InMemoryEventBus()
            if not app.debug:
                logger.warning(
                    "SSE Bus: Utilizando InMemory en producción. "
                    "Eventos SSE NO se propagan entre workers de Gunicorn. "
                    "Configurar REDIS_URL para corregir."
                )
            else:
                logger.info("SSE Bus: Utilizando Memoria (dev - sin Redis)")

        # Invalidación de caché entre workers: cada escritura publica en el bus y
        # todos los procesos suscritos limpian su LRU local. Sin esto, con varios
        # workers de gunicorn un usuario seguía viendo la lista cacheada (hasta el
        # TTL del modelo) después de que otro usuario creara o editara un registro.
        bus = app.extensions.get("event_bus")
        if bus is not None and hasattr(bus, "add_event_hook"):
            from ..utils.cache_helpers import invalidate_from_event
            bus.add_event_hook(invalidate_from_event)

        # Estructuras de control de conexiones SSE por IP
        app.extensions["sse_ip_lock"] = threading.Lock()
        app.extensions["sse_ip_counts"] = {}    # { ip: count }
        app.extensions["sse_ip_cooldowns"] = {}  # { ip: timestamp_hasta }
    except Exception:
        logging.getLogger(__name__).exception('No se pudo inicializar event_bus')


def _is_internal_event(payload) -> bool:
    """Eventos de coordinación entre workers que el navegador no debe recibir."""
    from ..utils.cache_helpers import _INVALIDATION_ACTION
    try:
        if isinstance(payload, bytes):
            payload = payload.decode('utf-8')
        if isinstance(payload, str):
            payload = json.loads(payload)
        return isinstance(payload, dict) and payload.get('action') == _INVALIDATION_ACTION
    except Exception:
        return False


def _event_visible_to_user(payload, user_identity) -> bool:
    """Keep targeted notifications private while preserving broadcast events."""
    try:
        decoded = payload
        if isinstance(decoded, bytes):
            decoded = decoded.decode('utf-8')
        if isinstance(decoded, str):
            decoded = json.loads(decoded)
        if not isinstance(decoded, dict):
            return True

        recipient_id = decoded.get('recipient_id')
        if recipient_id is None:
            return True
        return str(recipient_id) == str(user_identity)
    except Exception:
        # Malformed non-targeted coordination events keep the previous behavior.
        return True


def _get_client_ip() -> str:
    """Obtiene la IP real del cliente respetando X-Forwarded-For (detrás de proxy)."""
    forwarded_for = flask.request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return flask.request.remote_addr or '0.0.0.0'


def _sse_slot_key(user_identity, ip: str) -> str:
    """Clave de cupo SSE: por usuario autenticado, con la IP como respaldo.

    Contar por IP dejaba sin eventos en vivo al cuarto administrador conectado
    desde la misma red (NAT de la finca): todos compartían el mismo cupo.
    """
    if user_identity is not None and str(user_identity) != '':
        return f"user:{user_identity}"
    return f"ip:{ip}"


def _acquire_sse_slot(app, key: str) -> tuple[bool, str]:
    """
    Verifica y registra una conexión SSE para la clave dada (usuario o IP).
    Retorna (ok, motivo) — si ok=False, motivo contiene el mensaje de error.
    """
    lock = app.extensions.get("sse_ip_lock")
    ip_counts = app.extensions.get("sse_ip_counts", {})
    ip_cooldowns = app.extensions.get("sse_ip_cooldowns", {})

    if not lock:
        return True, ""  # Sin control inicializado, permitir

    max_conn = app.config.get("SSE_MAX_CONN_PER_IP", 3)
    cooldown_s = app.config.get("SSE_COOLDOWN_SECONDS", 15)

    # Optimización para desarrollo (evitar bloqueos por HMR / recargas rápidas)
    if app.debug:
        max_conn = max(max_conn, 15)
        cooldown_s = 2

    with lock:
        now = time.time()

        # Verificar cooldown activo (reconexión demasiado rápida)
        cooldown_until = ip_cooldowns.get(key, 0)
        if now < cooldown_until:
            wait_s = int(cooldown_until - now)
            return False, f"Demasiadas reconexiones. Espera {wait_s}s."

        # Verificar límite de conexiones simultáneas
        current = ip_counts.get(key, 0)
        if current >= max_conn:
            # Activar cooldown para evitar spam de reconexiones
            ip_cooldowns[key] = now + cooldown_s
            return False, f"Límite de {max_conn} conexiones simultáneas alcanzado."

        # Registrar conexión
        ip_counts[key] = current + 1

    return True, ""


def _release_sse_slot(app, key: str):
    """Libera una conexión SSE registrada para la clave dada."""
    lock = app.extensions.get("sse_ip_lock")
    ip_counts = app.extensions.get("sse_ip_counts", {})

    if not lock:
        return

    with lock:
        current = ip_counts.get(key, 0)
        if current > 0:
            ip_counts[key] = current - 1
        else:
            ip_counts.pop(key, None)


def sse_events_handler():
    """Handler para eventos Server-Sent Events (SSE)."""
    logger.info(f"Petición SSE recibida: {flask.request.method} {flask.request.path}")

    try:
        # ── Responder a HEAD para validación de infraestructura / load balancers ──
        if flask.request.method == 'HEAD':
            return APIResponse.success(message='SSE endpoint ready')

        # ── Autenticación JWT obligatoria ──────────────────────────────────────
        try:
            verify_jwt_in_request()
            user_identity = get_jwt_identity()
        except Exception as jwt_err:
            logger.warning(f"[SSE] Conexión rechazada: JWT inválido o ausente — {jwt_err}")
            return flask.Response(
                json.dumps({'success': False, 'message': 'Autenticación requerida', 'code': 'AUTH_REQUIRED'}),
                status=401,
                mimetype='application/json'
            )

        # ── Límite de conexiones simultáneas por IP ────────────────────────────
        client_ip = _get_client_ip()
        slot_key = _sse_slot_key(user_identity, client_ip)
        allowed, reason = _acquire_sse_slot(flask.current_app._get_current_object(), slot_key)
        if not allowed:
            logger.warning(f"[SSE] Conexión rechazada para {client_ip}: {reason}")
            return flask.Response(
                json.dumps({'success': False, 'message': reason, 'code': 'TOO_MANY_CONNECTIONS'}),
                status=429,
                mimetype='application/json',
                headers={'Retry-After': '15'}
            )

        # ── Event bus ─────────────────────────────────────────────────────────
        bus = flask.current_app.extensions.get("event_bus")
        if not bus:
            _release_sse_slot(flask.current_app._get_current_object(), slot_key)
            logger.warning("Intento de conexión SSE sin event_bus inicializado")
            return flask.Response(
                json.dumps({'success': False, 'message': 'Eventos no disponibles'}),
                status=503,
                mimetype='application/json'
            )

        # Capturar la app para uso dentro del generador (fuera del contexto de request)
        app_ref = flask.current_app._get_current_object()

        # Asegurar que user_identity sea serializable
        def _safe_user(identity):
            if isinstance(identity, dict):
                return {k: str(v) for k, v in identity.items()}
            if hasattr(identity, '__dict__'):
                return str(identity)
            return str(identity) if identity is not None else None

        safe_user_identity = _safe_user(user_identity)

        def event_generator():
            logger.debug(f"[SSE] Iniciando stream para usuario={safe_user_identity} ip={client_ip}")
            q = bus.subscribe()
            try:
                # Cabecera de reintentos y evento de bienvenida
                yield "retry: 5000\n\n"
                yield f"data: {json.dumps({'endpoint': 'system', 'action': 'connected', 'timestamp': time.time(), 'user': safe_user_identity})}\n\n"

                last_ping = time.time()
                ping_interval = app_ref.config.get("SSE_PING_INTERVAL_SECONDS", 25)

                while True:
                    try:
                        payload = q.get(timeout=ping_interval)
                        if (
                            payload
                            and not _is_internal_event(payload)
                            and _event_visible_to_user(payload, safe_user_identity)
                        ):
                            yield f"data: {payload}\n\n"
                            last_ping = time.time()

                    except queue.Empty:
                        # Ping de keepalive para mantener la conexión viva
                        now = time.time()
                        if now - last_ping >= ping_interval:
                            yield f"data: {json.dumps({'endpoint': 'system', 'action': 'ping', 'timestamp': now})}\n\n"
                            last_ping = now

            except GeneratorExit:
                logger.debug(f"[SSE] Conexión cerrada por cliente — usuario={user_identity} ip={client_ip}")
            except Exception as e:
                logger.error(f"[SSE] Error en stream para usuario={user_identity}: {e}")
            finally:
                # SIEMPRE liberar el slot al desconectar
                bus.unsubscribe(q)
                _release_sse_slot(app_ref, slot_key)
                logger.debug(f"[SSE] Slot liberado para {slot_key} (ip={client_ip})")

        logger.info(f"[SSE] Stream iniciado — usuario={user_identity} ip={client_ip}")
        return flask.Response(
            event_generator(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': flask.request.headers.get('Origin', '*'),
                'Access-Control-Allow-Credentials': 'true',
            }
        )

    except Exception as e:
        logger.exception(f"[SSE] Fallo crítico inicializando stream: {e}")
        import traceback
        logger.error(f"[SSE] Traceback: {traceback.format_exc()}")
        return flask.Response(
            json.dumps({'success': False, 'message': f'Error inicializando stream: {str(e)}', 'error_type': type(e).__name__}),
            status=500,
            mimetype='application/json'
        )
