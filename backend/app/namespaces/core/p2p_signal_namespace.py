"""
p2p_signal_namespace.py
=======================
Relay de señalización WebRTC para conexiones P2P entre dispositivos en la misma LAN.
Los mensajes de señalización (OFFER/ANSWER/ICE) son EFÍMEROS — viven ~30s en memoria.
NO se persisten en PostgreSQL.

Endpoints:
    POST /p2p/heartbeat          → Registra presencia del dispositivo (TTL 60s)
    GET  /p2p/peers              → Lista peers activos en la misma finca
    POST /p2p/signal/post        → Publica un mensaje de señalización
    GET  /p2p/signal/poll        → Recoge mensajes pendientes para este dispositivo
"""

import time
import threading
import logging
import traceback
from flask_restx import Namespace, Resource
import flask
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

p2p_signal_ns = Namespace("p2p", description="Señalización P2P para WebRTC en LAN")

logger = logging.getLogger(__name__)

# ─── Almacenamiento en memoria (sin DB) ───────────────────────────────────────

_lock = threading.Lock()

# Peers activos: { finca_id: { device_id: { name, user_id, last_seen } } }
_active_peers: dict = {}

# Cola de señalización: { to_device_id: [ {from, type, payload, ts}, ... ] }
_signal_queue: dict = {}

PEER_TTL_S   = 60   # segundos antes de expirar un peer del mapa
SIGNAL_TTL_S = 30   # segundos antes de descartar una señal no recogida
MAX_SIGNALS  = 50   # máx señales por dispositivo destino


def _now() -> float:
    return time.monotonic()


_last_cleanup_time = 0.0

def _cleanup_expired() -> None:
    """Limpia peers y señales expiradas. Llamado con límite de frecuencia (cada 10s)."""
    global _last_cleanup_time
    now = _now()
    if now - _last_cleanup_time < 10.0:
        return
    _last_cleanup_time = now

    # Expirar peers
    for finca_id in list(_active_peers.keys()):
        for device_id in list(_active_peers[finca_id].keys()):
            if now - _active_peers[finca_id][device_id]["last_seen"] > PEER_TTL_S:
                del _active_peers[finca_id][device_id]
        if not _active_peers[finca_id]:
            del _active_peers[finca_id]

    # Expirar señales
    for device_id in list(_signal_queue.keys()):
        _signal_queue[device_id] = [
            s for s in _signal_queue[device_id]
            if now - s["ts"] <= SIGNAL_TTL_S
        ]
        if not _signal_queue[device_id]:
            del _signal_queue[device_id]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@p2p_signal_ns.route("/heartbeat")
class P2PHeartbeat(Resource):
    """Anuncia la presencia de este dispositivo en la red local de la finca."""

    def post(self):
        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            try:
                verify_jwt_in_request(optional=True)
            except Exception:
                pass
            payload   = flask.request.get_json(silent=True) or {}
            user_id   = get_jwt_identity()
            finca_id  = get_current_finca_id() or payload.get("finca_id")
            device_id = str(payload.get("device_id") or "").strip()
            name      = str(payload.get("device_name") or payload.get("name") or "").strip()
            if not name and device_id:
                name = f"Disp-{device_id[-4:]}" if len(device_id) >= 4 else f"Disp-{device_id}"

            if not finca_id or not device_id:
                return APIResponse.validation_error({
                    "finca_id":  "requerido" if not finca_id else None,
                    "device_id": "requerido" if not device_id else None,
                })

            with _lock:
                _cleanup_expired()
                if finca_id not in _active_peers:
                    _active_peers[finca_id] = {}
                _active_peers[finca_id][device_id] = {
                    "name":      name,
                    "user_id":   user_id or payload.get("user_id"),
                    "last_seen": _now(),
                }

            return APIResponse.success({"registered": True, "ttl_seconds": PEER_TTL_S})
        except Exception as e:
            logger.error(f"Error in P2PHeartbeat: {e}\nTraceback:\n{traceback.format_exc()}")
            return APIResponse.error(
                message="Error interno al registrar latido P2P",
                status_code=500,
                error_code="P2P_HEARTBEAT_ERROR",
                details={"error": str(e)}
            )


@p2p_signal_ns.route("/peers")
class P2PPeers(Resource):
    """Lista los dispositivos activos en la misma finca (vivos en los últimos 60s)."""

    def get(self):
        try:
            from flask_jwt_extended import verify_jwt_in_request
            try:
                verify_jwt_in_request(optional=True)
            except Exception:
                pass
            finca_id = get_current_finca_id() or flask.request.args.get("finca_id", type=int)
            my_device = str(flask.request.args.get("device_id") or "").strip()
            if not finca_id:
                return APIResponse.validation_error({"finca_id": "requerido"})

            with _lock:
                _cleanup_expired()
                raw = _active_peers.get(finca_id, {})

            peers = [
                {
                    "device_id":   did,
                    "name":        info["name"],
                    "user_id":     info["user_id"],
                    "seconds_ago": int(_now() - info["last_seen"]),
                }
                for did, info in raw.items()
                if did != my_device
            ]
            return APIResponse.success({"peers": peers, "count": len(peers)})
        except Exception as e:
            logger.error(f"Error in P2PPeers: {e}\nTraceback:\n{traceback.format_exc()}")
            return APIResponse.error(
                message="Error interno al listar peers P2P",
                status_code=500,
                error_code="P2P_PEERS_ERROR",
                details={"error": str(e)}
            )


@p2p_signal_ns.route("/signal/post")
class P2PSignalPost(Resource):
    """
    Publica un mensaje de señalización WebRTC (OFFER/ANSWER/ICE) para otro dispositivo.
    El mensaje espera en cola hasta que el destino haga polling (máx 30s).
    """

    def post(self):
        try:
            from flask_jwt_extended import verify_jwt_in_request
            try:
                verify_jwt_in_request(optional=True)
            except Exception:
                pass
            payload     = flask.request.get_json(silent=True) or {}
            from_device = str(payload.get("from_device") or "").strip()
            to_device   = str(payload.get("to_device") or "").strip()
            sig_type    = str(payload.get("type") or "").strip()       # OFFER | ANSWER | ICE
            sig_payload = payload.get("payload")

            if not from_device or not to_device or not sig_type:
                return APIResponse.validation_error({
                    "from_device": "requerido" if not from_device else None,
                    "to_device":   "requerido" if not to_device else None,
                    "type":        "requerido (OFFER|ANSWER|ICE)" if not sig_type else None,
                })

            with _lock:
                _cleanup_expired()
                if to_device not in _signal_queue:
                    _signal_queue[to_device] = []
                # Limitar el backlog para no saturar memoria
                if len(_signal_queue[to_device]) < MAX_SIGNALS:
                    _signal_queue[to_device].append({
                        "from":    from_device,
                        "type":    sig_type,
                        "payload": sig_payload,
                        "ts":      _now(),
                    })

            return APIResponse.success({"queued": True}, status_code=202)
        except Exception as e:
            logger.error(f"Error in P2PSignalPost: {e}\nTraceback:\n{traceback.format_exc()}")
            return APIResponse.error(
                message="Error interno al publicar señal P2P",
                status_code=500,
                error_code="P2P_SIGNAL_POST_ERROR",
                details={"error": str(e)}
            )


@p2p_signal_ns.route("/signal/poll")
class P2PSignalPoll(Resource):
    """
    Recoge todos los mensajes de señalización pendientes para este dispositivo.
    Los mensajes se consumen (eliminan) al ser devueltos.
    Polling recomendado: cada 1-2 segundos mientras hay una negociación WebRTC activa.
    """

    def get(self):
        try:
            from flask_jwt_extended import verify_jwt_in_request
            try:
                verify_jwt_in_request(optional=True)
            except Exception:
                pass
            device_id = str(flask.request.args.get("device_id") or "").strip()
            if not device_id:
                return APIResponse.validation_error({"device_id": "requerido"})

            with _lock:
                _cleanup_expired()
                signals = _signal_queue.pop(device_id, [])

            return APIResponse.success({
                "signals": [
                    {"from": s["from"], "type": s["type"], "payload": s["payload"]}
                    for s in signals
                ],
                "count": len(signals),
            })
        except Exception as e:
            logger.error(f"Error in P2PSignalPoll: {e}\nTraceback:\n{traceback.format_exc()}")
            return APIResponse.error(
                message="Error interno al consultar señales P2P",
                status_code=500,
                error_code="P2P_SIGNAL_POLL_ERROR",
                details={"error": str(e)}
            )


@p2p_signal_ns.route("/health")
class P2PHealth(Resource):
    """Verificar que el servicio de señalización está activo."""

    def get(self):
        try:
            with _lock:
                peer_count   = sum(len(v) for v in _active_peers.values())
                signal_count = sum(len(v) for v in _signal_queue.values())
            return APIResponse.success({
                "status":        "ok",
                "active_peers":  peer_count,
                "queued_signals": signal_count,
            })
        except Exception as e:
            logger.error(f"Error in P2PHealth: {e}\nTraceback:\n{traceback.format_exc()}")
            return APIResponse.error(
                message="Error interno al consultar salud P2P",
                status_code=500,
                error_code="P2P_HEALTH_ERROR",
                details={"error": str(e)}
            )
