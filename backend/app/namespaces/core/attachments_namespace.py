import base64
import hashlib
import os
import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.sync import AttachmentBlob
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id


attachments_ns = Namespace("attachments", description="Adjuntos offline por chunks")


def _attachment_dir(finca_id):
    base = os.path.join("static", "uploads", "offline_attachments", str(finca_id))
    os.makedirs(base, exist_ok=True)
    return base


@attachments_ns.route("/chunk")
class AttachmentChunkResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = get_current_finca_id() or payload.get("finca_id")
        attachment_id = payload.get("attachment_id")
        chunk_b64 = payload.get("chunk")
        if not finca_id or not attachment_id or not chunk_b64:
            return APIResponse.validation_error({
                "finca_id": "requerido",
                "attachment_id": "requerido",
                "chunk": "base64 requerido",
            })
        try:
            chunk = base64.b64decode(chunk_b64)
        except Exception:
            return APIResponse.error("chunk no es base64 valido", status_code=400)

        path = os.path.join(_attachment_dir(finca_id), f"{secure_filename(attachment_id)}.part")
        with open(path, "ab") as fh:
            fh.write(chunk)
        size = os.path.getsize(path)
        return APIResponse.success({"attachment_id": attachment_id, "received_size": size}, status_code=202)


@attachments_ns.route("/complete")
class AttachmentCompleteResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = get_current_finca_id() or payload.get("finca_id")
        user_id = get_jwt_identity()
        attachment_id = payload.get("attachment_id")
        sha256 = payload.get("sha256")
        filename = secure_filename(payload.get("filename") or f"{attachment_id}.bin")
        if not finca_id or not attachment_id or not sha256:
            return APIResponse.validation_error({
                "finca_id": "requerido",
                "attachment_id": "requerido",
                "sha256": "requerido",
            })

        base = _attachment_dir(finca_id)
        part_path = os.path.join(base, f"{secure_filename(attachment_id)}.part")
        if not os.path.exists(part_path):
            return APIResponse.not_found("Adjunto parcial")

        digest = hashlib.sha256()
        with open(part_path, "rb") as fh:
            for block in iter(lambda: fh.read(1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != sha256:
            return APIResponse.error("Hash sha256 no coincide", status_code=409)

        final_path = os.path.join(base, filename)
        os.replace(part_path, final_path)
        size = os.path.getsize(final_path)

        blob = AttachmentBlob.query.filter_by(attachment_id=attachment_id, finca_id=finca_id).first()
        if not blob:
            blob = AttachmentBlob(
                attachment_id=attachment_id,
                finca_id=finca_id,
                filename=filename,
                sha256=sha256,
                uploaded_by=user_id,
            )
            db.session.add(blob)
        blob.entity_type = payload.get("entity_type")
        blob.entity_id = str(payload.get("entity_id")) if payload.get("entity_id") is not None else None
        blob.content_type = payload.get("content_type")
        blob.total_size = size
        blob.received_size = size
        blob.storage_path = final_path.replace("\\", "/")
        blob.is_complete = True
        db.session.commit()

        return APIResponse.success({
            "attachment_id": blob.attachment_id,
            "filename": blob.filename,
            "sha256": blob.sha256,
            "total_size": blob.total_size,
            "storage_path": blob.storage_path,
        }, message="Adjunto completado", status_code=201)
