import uuid
from datetime import datetime, timezone
import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.sync import (
    Device,
    SyncOperation,
    SyncOperationReceipt,
    SyncConflict,
    SyncOperationStatus,
)
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id


sync_ns = Namespace("sync", description="Sincronizacion rural offline-first")


def _finca_id_from_request(payload=None):
    payload = payload or {}
    return get_current_finca_id() or payload.get("finca_id")


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _operation_dict(op: SyncOperation):
    return {
        "cursor": op.id,
        "operation_id": op.operation_id,
        "entity_type": op.entity_type,
        "entity_id": op.entity_id,
        "operation": op.operation,
        "payload": op.payload,
        "base_version": op.base_version,
        "logical_clock": op.logical_clock,
        "priority": op.priority,
        "status": op.status.value if hasattr(op.status, "value") else op.status,
        "origin_device_id": op.origin_device_id,
        "author_user_id": op.author_user_id,
        "finca_id": op.finca_id,
        "created_at_device": op.created_at_device.isoformat() if op.created_at_device else None,
        "created_at": op.created_at.isoformat() if op.created_at else None,
    }


@sync_ns.route("/health")
class SyncHealthResource(Resource):
    def get(self):
        return APIResponse.success({"status": "ok", "service": "villaluz-sync"})


@sync_ns.route("/push")
class SyncPushResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = _finca_id_from_request(payload)
        user_id = get_jwt_identity()
        if not finca_id:
            return APIResponse.error("finca_id es requerido", status_code=400)

        device_id = payload.get("device_id")
        operations = payload.get("operations") or []
        if not device_id or not isinstance(operations, list):
            return APIResponse.validation_error({"device_id": "requerido", "operations": "lista requerida"})

        device = Device.query.filter_by(finca_id=finca_id, device_id=device_id).first()
        if not device:
            device = Device(
                finca_id=finca_id,
                device_id=device_id,
                name=payload.get("device_name") or f"Dispositivo {device_id[-4:]}",
                platform=payload.get("platform"),
                user_id=user_id,
                last_seen_at=datetime.now(timezone.utc),
            )
            db.session.add(device)
        else:
            device.last_seen_at = datetime.now(timezone.utc)

        accepted = []
        duplicates = []
        conflicts = []

        for item in operations:
            if not isinstance(item, dict):
                continue
            operation_id = item.get("operation_id") or item.get("id") or str(uuid.uuid4())
            existing = SyncOperation.query.filter_by(operation_id=operation_id).first()
            if existing:
                duplicates.append(operation_id)
                receipt = SyncOperationReceipt.query.filter_by(
                    operation_id=operation_id,
                    device_id=device_id,
                    finca_id=finca_id,
                ).first()
                if not receipt:
                    db.session.add(SyncOperationReceipt(
                        operation_id=operation_id,
                        device_id=device_id,
                        finca_id=finca_id,
                        applied=existing.status == SyncOperationStatus.APPLIED,
                    ))
                continue

            entity_type = item.get("entity_type")
            operation = item.get("operation")
            if not entity_type or not operation:
                conflicts.append({
                    "operation_id": operation_id,
                    "reason": "entity_type y operation son requeridos",
                })
                continue

            op = SyncOperation(
                operation_id=operation_id,
                entity_type=entity_type,
                entity_id=str(item.get("entity_id")) if item.get("entity_id") is not None else None,
                operation=str(operation).lower(),
                payload=item.get("payload"),
                base_version=item.get("base_version"),
                logical_clock=item.get("logical_clock"),
                priority=int(item.get("priority") or 100),
                status=SyncOperationStatus.PENDING,
                signature=item.get("signature"),
                origin_device_id=item.get("origin_device_id") or device_id,
                author_user_id=item.get("author_user_id") or user_id,
                finca_id=finca_id,
                created_at_device=_parse_dt(item.get("created_at_device")),
            )
            db.session.add(op)
            db.session.add(SyncOperationReceipt(
                operation_id=operation_id,
                device_id=device_id,
                finca_id=finca_id,
                applied=False,
            ))
            accepted.append(operation_id)

        db.session.commit()
        return APIResponse.success({
            "accepted": accepted,
            "duplicates": duplicates,
            "conflicts": conflicts,
        }, message="Operaciones recibidas", status_code=202)


@sync_ns.route("/pull")
class SyncPullResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = _finca_id_from_request(payload)
        device_id = payload.get("device_id")
        last_cursor = int(payload.get("last_cursor") or 0)
        limit = min(int(payload.get("limit") or 100), 500)
        if not finca_id or not device_id:
            return APIResponse.validation_error({"finca_id": "requerido", "device_id": "requerido"})

        query = (
            SyncOperation.query
            .filter(SyncOperation.finca_id == finca_id)
            .filter(SyncOperation.id > last_cursor)
            .filter(SyncOperation.origin_device_id != device_id)
            .order_by(SyncOperation.priority.asc(), SyncOperation.id.asc())
            .limit(limit)
        )
        operations = query.all()

        for op in operations:
            receipt = SyncOperationReceipt.query.filter_by(
                operation_id=op.operation_id,
                device_id=device_id,
                finca_id=finca_id,
            ).first()
            if not receipt:
                db.session.add(SyncOperationReceipt(
                    operation_id=op.operation_id,
                    device_id=device_id,
                    finca_id=finca_id,
                    applied=False,
                ))
        db.session.commit()

        next_cursor = max([op.id for op in operations], default=last_cursor)
        return APIResponse.success({
            "operations": [_operation_dict(op) for op in operations],
            "next_cursor": next_cursor,
            "has_more": len(operations) == limit,
        })


@sync_ns.route("/resolve-conflict")
class SyncResolveConflictResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = _finca_id_from_request(payload)
        user_id = get_jwt_identity()
        conflict_id = payload.get("conflict_id")
        resolution = payload.get("resolution")
        if not finca_id or not conflict_id or not resolution:
            return APIResponse.validation_error({
                "finca_id": "requerido",
                "conflict_id": "requerido",
                "resolution": "requerido",
            })

        conflict = SyncConflict.query.filter_by(id=conflict_id, finca_id=finca_id).first()
        if not conflict:
            return APIResponse.not_found("Conflicto")

        conflict.resolution = resolution
        conflict.resolved_by = user_id
        conflict.resolved_at = datetime.now(timezone.utc)
        op = SyncOperation.query.filter_by(operation_id=conflict.operation_id).first()
        if op:
            op.status = SyncOperationStatus.APPLIED if resolution != "reject" else SyncOperationStatus.REJECTED
            op.applied_at = datetime.now(timezone.utc)
        db.session.commit()
        return APIResponse.success({"conflict_id": conflict.id, "resolution": resolution})
