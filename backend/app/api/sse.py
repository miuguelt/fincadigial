import logging
import time
import json
import threading
import queue
import flask
from ..utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

def init_sse_bus(app):
    try:
        from ..utils.redis_bus import RedisEventBus, InMemoryEventBus
        redis_client = app.extensions.get('redis')
        
        if redis_client:
            app.extensions["event_bus"] = RedisEventBus(redis_client)
            logger.info("SSE Bus: Utilizando Redis (Escalable)")
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
            
        sse_ip_lock = threading.Lock()
        sse_ip_counts = {}
        sse_ip_cooldowns = {}
        app.extensions["sse_ip_lock"] = sse_ip_lock
        app.extensions["sse_ip_counts"] = sse_ip_counts
        app.extensions["sse_ip_cooldowns"] = sse_ip_cooldowns
    except Exception:
        logging.getLogger(__name__).exception('No se pudo inicializar event_bus')

def sse_events_handler():
    """Handler para eventos Server-Sent Events (SSE)."""
    logger.info(f"Petición SSE recibida: {flask.request.method} {flask.request.path}")
    try:
        # Responder a HEAD para validación de infraestructura (load balancers, etc.)
        if flask.request.method == 'HEAD':
            return APIResponse.success(message='SSE endpoint ready')

        bus = flask.current_app.extensions.get("event_bus")
        if not bus:
            logger.warning("Intento de conexión SSE sin event_bus inicializado")
            # Usar flask.abort o una respuesta directa para evitar problemas con tuples en streaming
            return flask.Response(
                json.dumps({'success': False, 'message': 'Eventos no disponibles'}),
                status=503,
                mimetype='application/json'
            )
        
        def event_generator():
            logger.debug("Iniciando generator SSE")
            # Crear cola de suscripción
            q = bus.subscribe()
            try:
                # 1. Headers de SSE y configuración inicial
                yield f"retry: 5000\n\n"
                yield f"data: {json.dumps({'endpoint':'system','action':'connected','timestamp':time.time()})}\n\n"
                
                last_ping = time.time()
                while True:
                    try:
                        payload = q.get(timeout=25)
                        if payload:
                            yield f"data: {payload}\n\n"
                            last_ping = time.time()
                            
                    except queue.Empty:
                        now = time.time()
                        if now - last_ping >= 25:
                            yield f"data: {json.dumps({'endpoint':'system','action':'ping','timestamp':now})}\n\n"
                            last_ping = now
                            
            except GeneratorExit:
                logger.debug("Conexión SSE cerrada por el cliente (GeneratorExit)")
            except Exception as e:
                logger.error(f"Error en event_generator SSE: {e}")
            finally:
                bus.unsubscribe(q)

        logger.info("Retornando respuesta stream SSE")
        return flask.Response(
            event_generator(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': flask.request.headers.get('Origin', '*')
            }
        )
    except Exception as e:
        logger.exception(f"Fallo crítico inicializando stream SSE: {e}")
        # En caso de error crítico, retornar JSON de error con status 500
        return flask.Response(
            json.dumps({'success': False, 'message': f'Error inicializando stream: {str(e)}'}),
            status=500,
            mimetype='application/json'
        )
