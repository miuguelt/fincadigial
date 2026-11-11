import re
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
    raw_finca = "" if finca_id is None else str(finca_id)
    safe_finca_id = re.sub(r"[^a-zA-Z0-9_-]", "", raw_finca)
    if not safe_finca_id:
        raise ValueError("finca_id inválido")
    upload_root = os.path.abspath(flask.current_app.config.get("UPLOAD_FOLDER", os.path.join("static", "uploads")))
    base = os.path.abspath(os.path.join(upload_root, "offline_attachments", safe_finca_id))
    try:
        if os.path.commonpath([upload_root, base]) != upload_root:
            raise ValueError("finca_id fuera de límites autorizados")
    except ValueError:
        raise ValueError("finca_id fuera de límites autorizados")
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
            return APIResponse.validation_error(
                {
                    "finca_id": "requerido",
                    "attachment_id": "requerido",
                    "chunk": "base64 requerido",
                }
            )
        try:
            chunk = base64.b64decode(chunk_b64)
        except Exception:
            return APIResponse.error("chunk no es base64 valido", status_code=400)

        if not re.match(r"^[a-zA-Z0-9_-]+$", str(attachment_id or "")):
            return APIResponse.validation_error({"attachment_id": "Formato de ID inválido"})
        base_dir = _attachment_dir(finca_id)
        clean_part_name = f"{secure_filename(attachment_id)}.part"
        path = os.path.abspath(os.path.join(base_dir, clean_part_name))
        if os.path.commonpath([base_dir, path]) != base_dir:
            return APIResponse.error("Ruta no autorizada", status_code=400)
        with open(path, "ab") as fh:
            fh.write(chunk)
        size = os.path.getsize(path)
        return APIResponse.success(
            {"attachment_id": attachment_id, "received_size": size}, status_code=202
        )


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
            return APIResponse.validation_error(
                {
                    "finca_id": "requerido",
                    "attachment_id": "requerido",
                    "sha256": "requerido",
                }
            )

        if not re.match(r"^[a-zA-Z0-9_-]+$", str(attachment_id or "")):
            return APIResponse.validation_error({"attachment_id": "Formato de ID inválido"})
        base = _attachment_dir(finca_id)
        part_path = os.path.abspath(os.path.join(base, f"{secure_filename(attachment_id)}.part"))
        if os.path.commonpath([base, part_path]) != base:
            return APIResponse.error("Ruta no autorizada", status_code=400)
        if not os.path.exists(part_path):
            return APIResponse.not_found("Adjunto parcial")

        digest = hashlib.sha256()
        with open(part_path, "rb") as fh:
            for block in iter(lambda: fh.read(1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != sha256:
            return APIResponse.error("Hash sha256 no coincide", status_code=409)

        total_size = os.path.getsize(part_path)
        content_type = str(payload.get("content_type") or "").lower()
        if payload.get("entity_type") == "technical_assistance":
            if not (content_type.startswith("image/") or content_type.startswith("audio/")):
                return APIResponse.error(
                    "La asistencia técnica solo admite fotos o audios",
                    status_code=422,
                )
            if total_size > 15 * 1024 * 1024:
                return APIResponse.error(
                    "El adjunto de asistencia no puede superar 15 MB",
                    status_code=413,
                )

        final_path = os.path.abspath(os.path.join(base, filename))
        if os.path.commonpath([base, final_path]) != base:
            return APIResponse.error("Ruta de archivo no autorizada", status_code=400)
        os.replace(part_path, final_path)
        size = os.path.getsize(final_path)

        blob = AttachmentBlob.query.filter_by(
            attachment_id=attachment_id, finca_id=finca_id
        ).first()
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
        blob.entity_id = (
            str(payload.get("entity_id"))
            if payload.get("entity_id") is not None
            else None
        )
        blob.content_type = content_type or payload.get("content_type")
        blob.total_size = size
        blob.received_size = size
        blob.storage_path = final_path.replace("\\", "/")
        blob.is_complete = True
        db.session.commit()

        return APIResponse.success(
            {
                "id": blob.id,
                "attachment_id": blob.attachment_id,
                "filename": blob.filename,
                "sha256": blob.sha256,
                "total_size": blob.total_size,
                "storage_path": blob.storage_path,
            },
            message="Adjunto completado",
            status_code=201,
        )
