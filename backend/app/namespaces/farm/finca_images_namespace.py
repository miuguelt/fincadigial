import flask
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import get_jwt_identity, jwt_required
import logging

from app import db
from app.models.finca import Finca
from app.models.finca_images import FincaImages
from app.services.finca_image_service import (
    can_manage_finca_images,
    get_public_finca_images,
)
from app.utils.response_handler import APIResponse
from app.utils.file_storage import (
    save_finca_image,
    delete_finca_image,
    get_public_url,
    allowed_file,
)

logger = logging.getLogger(__name__)

finca_images_ns = Namespace(
    "finca-images",
    description="Operaciones con imágenes de fincas",
    path="/finca-images",
)

image_model = finca_images_ns.model(
    "FincaImage",
    {
        "id": fields.Integer(description="ID de la imagen"),
        "finca_id": fields.Integer(required=True, description="ID de la finca"),
        "filename": fields.String(description="Nombre del archivo"),
        "filepath": fields.String(description="Ruta del archivo"),
        "file_size": fields.Integer(description="Tamaño en bytes"),
        "mime_type": fields.String(description="Tipo MIME"),
        "is_primary": fields.Boolean(description="Imagen principal"),
        "url": fields.String(description="URL pública"),
        "created_at": fields.DateTime(description="Fecha de creación"),
    },
)


@finca_images_ns.route("/upload")
class FincaImageUpload(Resource):
    @jwt_required()
    @finca_images_ns.doc(
        description="Subir imágenes para una finca",
        params={
            "finca_id": "ID de la finca (form field)",
            "files": "Archivos de imagen (multipart/form-data)",
        },
    )
    def post(self):
        try:
            finca_id = flask.request.form.get("finca_id", type=int)
            if not finca_id:
                return APIResponse.error(
                    message="El campo finca_id es requerido", status_code=400
                )

            finca = Finca.query.get(finca_id)
            if not finca:
                return APIResponse.error(
                    message=f"Finca con ID {finca_id} no encontrada", status_code=404
                )
            if not can_manage_finca_images(get_jwt_identity(), finca_id):
                return APIResponse.forbidden(
                    "No tienes permiso para administrar las fotos de esta finca"
                )

            files = flask.request.files.getlist("files")
            if not files or len(files) == 0:
                return APIResponse.error(
                    message="No se proporcionaron archivos", status_code=400
                )

            uploaded_images = []
            errors = []

            from app.utils.image_optimizer import optimize_image_to_webp, is_valid_image

            for file in files:
                try:
                    if not file or file.filename == "":
                        errors.append({"filename": "unknown", "error": "Archivo vacío"})
                        continue

                    if not allowed_file(file.filename):
                        errors.append(
                            {
                                "filename": file.filename,
                                "error": "Tipo de archivo no permitido",
                            }
                        )
                        continue

                    raw_bytes = file.read()
                    ok, err_msg = is_valid_image(raw_bytes)
                    if not ok:
                        errors.append({"filename": file.filename, "error": err_msg})
                        continue

                    try:
                        webp_bytes, thumb_bytes = optimize_image_to_webp(
                            raw_bytes, generate_thumb=True
                        )
                        optimized = True
                    except Exception as img_err:
                        logger.warning(
                            "No se pudo convertir a WebP (%s): %s",
                            file.filename,
                            img_err,
                        )
                        optimized = False

                    import io

                    if optimized:
                        webp_filename = file.filename.rsplit(".", 1)[0] + ".webp"
                        file_info = save_finca_image(
                            io.BytesIO(webp_bytes),
                            finca_id,
                            skip_pillow=True,
                            generate_thumbnail=False,
                            filename=webp_filename,
                        )
                        file_info["mime_type"] = "image/webp"
                    else:
                        file.seek(0)
                        file_info = save_finca_image(file, finca_id)

                    image = FincaImages(
                        finca_id=finca_id,
                        filename=file_info["filename"],
                        filepath=file_info["filepath"],
                        thumbnail_path=file_info.get("thumb_path"),
                        file_size=file_info["file_size"],
                        mime_type="image/webp" if optimized else file_info["mime_type"],
                        is_primary=False,
                    )

                    db.session.add(image)
                    db.session.flush()

                    uploaded_images.append(
                        {
                            "id": image.id,
                            "filename": image.filename,
                            "url": get_public_url(image.filepath),
                            "size": image.file_size,
                            "optimized": optimized,
                        }
                    )

                except Exception as e:
                    logger.error(
                        "Error procesando archivo %s: %s", file.filename, str(e)
                    )
                    errors.append({"filename": file.filename, "error": str(e)})

            if uploaded_images:
                db.session.commit()

                if FincaImages.query.filter_by(finca_id=finca_id).count() == len(
                    uploaded_images
                ):
                    first_image = FincaImages.query.get(uploaded_images[0]["id"])
                    if first_image:
                        first_image.is_primary = True
                        db.session.commit()
            else:
                db.session.rollback()

            response_data = {
                "uploaded": uploaded_images,
                "total_uploaded": len(uploaded_images),
                "total_errors": len(errors),
                "errors": errors if errors else None,
            }

            if len(uploaded_images) > 0:
                message = f"{len(uploaded_images)} imagen(es) subida(s) exitosamente"
                if errors:
                    message += f" ({len(errors)} error(es))"
                return APIResponse.success(data=response_data, message=message)
            else:
                return APIResponse.error(
                    message="No se pudo subir ninguna imagen",
                    details=response_data,
                    status_code=400,
                )

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error en upload de imágenes de finca: {str(e)}")
            return APIResponse.error(
                message=f"Error al subir imágenes: {str(e)}", status_code=500
            )


@finca_images_ns.route("/<int:finca_id>")
class FincaImagesList(Resource):
    @jwt_required(optional=True)
    @finca_images_ns.doc(description="Obtener todas las imágenes de una finca")
    def get(self, finca_id):
        try:
            finca = Finca.query.get(finca_id)
            if not finca:
                return APIResponse.error(
                    message=f"Finca con ID {finca_id} no encontrada", status_code=404
                )

            images_data = get_public_finca_images(finca_id)

            server_origin = (
                (flask.request.host_url or "").rstrip("/")
                if flask.request
                else flask.current_app.config.get("API_BASE_URL_NO_VERSION", "").rstrip(
                    "/"
                )
            )
            return APIResponse.success(
                data={
                    "finca_id": finca_id,
                    "total": len(images_data),
                    "images": images_data,
                    "base_url": server_origin,
                },
                message=f"{len(images_data)} imagen(es) encontrada(s)",
            )

        except Exception as e:
            logger.error(f"Error obteniendo imágenes de finca {finca_id}: {str(e)}")
            return APIResponse.error(
                message=f"Error al obtener imágenes: {str(e)}", status_code=500
            )


@finca_images_ns.route("/image/<int:image_id>")
class FincaImageDetail(Resource):
    @jwt_required()
    @finca_images_ns.doc(description="Eliminar una imagen de finca")
    def delete(self, image_id):
        try:
            image = FincaImages.query.get(image_id)
            if not image:
                return APIResponse.error(
                    message=f"Imagen con ID {image_id} no encontrada", status_code=404
                )
            if not can_manage_finca_images(get_jwt_identity(), image.finca_id):
                return APIResponse.forbidden(
                    "No tienes permiso para administrar las fotos de esta finca"
                )

            finca_id = image.finca_id
            was_primary = image.is_primary
            filepath = image.filepath

            db.session.delete(image)
            db.session.commit()

            delete_finca_image(filepath)

            if was_primary:
                next_image = (
                    FincaImages.query.filter_by(finca_id=finca_id)
                    .order_by(FincaImages.created_at.desc())
                    .first()
                )
                if next_image:
                    next_image.is_primary = True
                    db.session.commit()

            return APIResponse.success(
                message="Imagen eliminada exitosamente",
                data={"id": image_id, "finca_id": finca_id},
            )

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error eliminando imagen de finca {image_id}: {str(e)}")
            return APIResponse.error(
                message=f"Error al eliminar imagen: {str(e)}", status_code=500
            )


@finca_images_ns.route("/image/<int:image_id>/set-primary")
class SetPrimaryFincaImage(Resource):
    @jwt_required()
    @finca_images_ns.doc(description="Establecer una imagen como principal de la finca")
    def put(self, image_id):
        try:
            image = FincaImages.query.get(image_id)
            if not image:
                return APIResponse.error(
                    message=f"Imagen con ID {image_id} no encontrada", status_code=404
                )
            if not can_manage_finca_images(get_jwt_identity(), image.finca_id):
                return APIResponse.forbidden(
                    "No tienes permiso para administrar las fotos de esta finca"
                )

            FincaImages.query.filter_by(finca_id=image.finca_id).update(
                {"is_primary": False}
            )

            image.is_primary = True
            db.session.commit()

            return APIResponse.success(
                message="Imagen establecida como principal",
                data=image.to_namespace_dict(),
            )

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error estableciendo imagen principal {image_id}: {str(e)}")
            return APIResponse.error(
                message=f"Error al establecer imagen principal: {str(e)}",
                status_code=500,
            )
