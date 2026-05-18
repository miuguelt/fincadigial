import flask
from datetime import datetime, timezone
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.sync import Device
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id


devices_ns = Namespace("devices", description="Dispositivos autorizados para sincronizacion rural")


def _device_dict(device: Device):
    return {
        "id": device.id,
        "device_id": device.device_id,
        "name": device.name,
        "platform": device.platform,
        "status": device.status.value if hasattr(device.status, "value") else device.status,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "finca_id": device.finca_id,
        "user_id": device.user_id,
    }


@devices_ns.route("")
class DevicesResource(Resource):
    @jwt_required()
    def get(self):
        finca_id = get_current_finca_id() or flask.request.args.get("finca_id", type=int)
        if not finca_id:
            return APIResponse.error("finca_id es requerido", status_code=400)
        devices = Device.query.filter_by(finca_id=finca_id).order_by(Device.updated_at.desc()).all()
        return APIResponse.success([_device_dict(device) for device in devices])


@devices_ns.route("/register")
class DeviceRegisterResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = get_current_finca_id() or payload.get("finca_id")
        user_id = get_jwt_identity()
        device_id = payload.get("device_id")
        name = payload.get("name")
        if not finca_id or not device_id or not name:
            return APIResponse.validation_error({
                "finca_id": "requerido",
                "device_id": "requerido",
                "name": "requerido",
            })

        device = Device.query.filter_by(finca_id=finca_id, device_id=device_id).first()
        if not device:
            device = Device(finca_id=finca_id, device_id=device_id, name=name, user_id=user_id)
            db.session.add(device)
        device.name = name
        device.public_key = payload.get("public_key")
        device.platform = payload.get("platform")
        device.last_seen_at = datetime.now(timezone.utc)
        db.session.commit()
        return APIResponse.success(_device_dict(device), message="Dispositivo registrado", status_code=201)
