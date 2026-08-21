import os
import shutil
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import flask
import logging

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}

CHAT_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "svg"}
CHAT_DOCUMENT_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
    "ppt",
    "pptx",
    "rtf",
}
CHAT_VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "avi", "mkv", "3gp"}
CHAT_AUDIO_EXTENSIONS = {"mp3", "ogg", "wav", "m4a", "aac", "opus"}

CHAT_ALLOWED_EXTENSIONS = (
    CHAT_IMAGE_EXTENSIONS
    | CHAT_DOCUMENT_EXTENSIONS
    | CHAT_VIDEO_EXTENSIONS
    | CHAT_AUDIO_EXTENSIONS
)

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "txt": "text/plain",
    "csv": "text/csv",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "avi": "video/x-msvideo",
    "mkv": "video/x-matroska",
    "mp3": "audio/mpeg",
    "ogg": "audio/ogg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
}


def allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_extension(filename):
    """Obtiene la extensión del archivo"""
    if "." in filename:
        return filename.rsplit(".", 1)[1].lower()
    return None


def get_mime_type(filename):
    """Obtiene el tipo MIME basado en la extensión del archivo"""
    ext = get_file_extension(filename)
    return MIME_TYPES.get(ext, "application/octet-stream")


def generate_unique_filename(original_filename):
    """
    Genera un nombre único para el archivo usando timestamp y UUID.
    Formato: timestamp_uuid_original.ext
    """
    ext = get_file_extension(original_filename)
    if not ext:
        ext = "jpg"  # extensión por defecto

    # Limpiar el nombre original
    safe_name = secure_filename(original_filename)
    base_name = safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name

    # Generar nombre único
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]

    return f"{timestamp}_{unique_id}_{base_name}.{ext}"


def get_animal_upload_path(animal_id):
    """
    Genera la ruta de almacenamiento para las imágenes de un animal.
    Formato: static/uploads/animals/{animal_id}/
    """
    upload_folder = flask.current_app.config.get("UPLOAD_FOLDER", "static/uploads")
    return os.path.join(upload_folder, "animals", str(animal_id))


def get_user_avatar_path(user_id):
    """
    Ruta para avatares de usuario.
    Formato: static/uploads/avatars/
    """
    upload_folder = flask.current_app.config.get("UPLOAD_FOLDER", "static/uploads")
    return os.path.join(upload_folder, "avatars")


def save_user_avatar(user_id, file):
    """Guarda la foto de perfil de un usuario."""
    upload_dir = get_user_avatar_path(user_id)
    ensure_upload_directory(upload_dir)

    ext = get_file_extension(file.filename) or "jpg"
    filename = f"avatar_{user_id}.{ext}"
    full_path = os.path.join(upload_dir, filename)

    # Procesar con Pillow para normalizar tamaño
    from PIL import Image
    import io

    img = Image.open(file)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Cuadrado centrado 400x400
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = (width + min_dim) / 2
    bottom = (height + min_dim) / 2
    img = img.crop((left, top, right, bottom))
    img.thumbnail((400, 400), Image.Resampling.LANCZOS)

    img.save(full_path, "JPEG", quality=85, optimize=True)

    relative_path = f"static/uploads/avatars/{filename}"
    return get_public_url(relative_path)


def ensure_upload_directory(directory_path):
    """Crea el directorio de uploads si no existe"""
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Error creando directorio {directory_path}: {str(e)}")
        return False


def save_animal_image(
    file, animal_id, generate_thumbnail=True, skip_pillow=False, filename=None
):
    """
    Guarda una imagen de animal, la redimensiona si es muy grande y genera una miniatura.

    Args:
        file: FileStorage object de werkzeug o BytesIO
        animal_id: ID del animal al que pertenece la imagen
        generate_thumbnail: Si se debe generar una versión reducida
        skip_pillow: Si True, guarda el archivo tal cual sin reprocesar con Pillow
                     (útil cuando ya viene pre-optimizado como WebP)
        filename: Nombre del archivo (requerido si file es BytesIO)

    Returns:
        dict con filename, filepath, thumb_path, file_size, mime_type
    """
    return _save_image(
        file,
        upload_dir=get_animal_upload_path(animal_id),
        relative_dir=f"static/uploads/animals/{animal_id}",
        generate_thumbnail=generate_thumbnail,
        skip_pillow=skip_pillow,
        filename=filename,
        owner_label=f"animal {animal_id}",
    )


def get_finca_upload_path(finca_id):
    """
    Genera la ruta de almacenamiento para las imágenes de una finca.
    Formato: static/uploads/fincas/{finca_id}/
    """
    upload_folder = flask.current_app.config.get("UPLOAD_FOLDER", "static/uploads")
    return os.path.join(upload_folder, "fincas", str(finca_id))


def save_finca_image(
    file, finca_id, generate_thumbnail=True, skip_pillow=False, filename=None
):
    """Guarda una imagen de finca. Misma semántica que save_animal_image."""
    return _save_image(
        file,
        upload_dir=get_finca_upload_path(finca_id),
        relative_dir=f"static/uploads/fincas/{finca_id}",
        generate_thumbnail=generate_thumbnail,
        skip_pillow=skip_pillow,
        filename=filename,
        owner_label=f"finca {finca_id}",
    )


def delete_finca_image(filepath):
    """Elimina físicamente una imagen de finca (y su miniatura si existe)."""
    return delete_animal_image(filepath)


def _save_image(
    file,
    upload_dir,
    relative_dir,
    generate_thumbnail=True,
    skip_pillow=False,
    filename=None,
    owner_label="",
):
    """Shared image pipeline used by the animal and finca savers."""
    try:
        import io

        # Determinar nombre de archivo
        original_filename = filename if filename else getattr(file, "filename", "")
        if not original_filename:
            raise ValueError("No se proporcionó nombre de archivo")

        if not allowed_file(original_filename):
            raise ValueError(
                f"Tipo de archivo no permitido. Extensiones permitidas: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Leer archivo en memoria para procesar
        img_data = file.read()
        file_size = len(img_data)

        # Validar tamaño original
        max_size = flask.current_app.config.get(
            "MAX_IMAGE_SIZE", 10 * 1024 * 1024
        )  # 10MB para proceso
        if file_size > max_size:
            raise ValueError("El archivo excede el tamaño máximo permitido")

        # Generar nombres
        unique_filename = generate_unique_filename(original_filename)
        thumb_filename = f"thumb_{unique_filename}"

        if not ensure_upload_directory(upload_dir):
            raise OSError("No se pudo crear el directorio de uploads")

        # ── Ruta rápida: archivo ya pre-optimizado (WebP), sin Pillow ──
        if skip_pillow:
            full_path = os.path.join(upload_dir, unique_filename)
            with open(full_path, "wb") as f:
                f.write(img_data)
            relative_path = f"{relative_dir}/{unique_filename}"
            mime = get_mime_type(unique_filename)
            return {
                "filename": unique_filename,
                "filepath": relative_path,
                "thumb_path": None,
                "file_size": os.path.getsize(full_path),
                "mime_type": mime,
            }

        # ── Ruta completa: procesar con Pillow ──
        from PIL import Image

        # Procesar Imagen con Pillow
        img = Image.open(io.BytesIO(img_data))

        # Corregir orientación EXIF si existe
        try:
            from PIL import ImageOps

            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # 1. Guardar Versión Optimizada (Max 1600px)
        max_dim = 1600
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        full_path = os.path.join(upload_dir, unique_filename)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(full_path, "JPEG", quality=85, optimize=True)

        # 2. Generar Miniatura (Max 400px)
        thumb_relative_path = None
        if generate_thumbnail:
            thumb_img = img.copy()
            thumb_img.thumbnail((400, 400), Image.Resampling.LANCZOS)
            thumb_full_path = os.path.join(upload_dir, thumb_filename)
            thumb_img.save(thumb_full_path, "JPEG", quality=70, optimize=True)
            thumb_relative_path = f"{relative_dir}/{thumb_filename}"

        relative_path = f"{relative_dir}/{unique_filename}"

        return {
            "filename": unique_filename,
            "filepath": relative_path,
            "thumb_path": thumb_relative_path,
            "file_size": os.path.getsize(full_path),
            "mime_type": "image/jpeg",
        }

    except Exception as e:
        logger.error(f"Error procesando imagen para {owner_label}: {str(e)}")
        raise


def delete_animal_image(filepath):
    """
    Elimina físicamente un archivo de imagen.

    Args:
        filepath: Ruta relativa del archivo (ej: static/uploads/animals/123/image.jpg)

    Returns:
        bool: True si se eliminó correctamente, False en caso contrario
    """
    try:
        if not filepath:
            return False

        # Construir ruta absoluta
        full_path = os.path.join(flask.current_app.root_path, "..", filepath)
        full_path = os.path.normpath(full_path)

        # Verificar que existe
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            logger.info(f"Archivo eliminado: {full_path}")
            return True
        else:
            logger.warning(f"Archivo no encontrado: {full_path}")
            return False

    except Exception as e:
        logger.error(f"Error eliminando archivo {filepath}: {str(e)}")
        return False


def _cleanup_empty_parents(start_path, stop_at):
    """
    Elimina directorios vacíos ascendiendo hasta stop_at (exclusivo).
    """
    stop_at = os.path.normpath(stop_at)
    current = os.path.dirname(os.path.normpath(start_path))

    while current and current.startswith(stop_at) and current != stop_at:
        try:
            if os.path.isdir(current) and not os.listdir(current):
                os.rmdir(current)
                current = os.path.dirname(current)
            else:
                break
        except OSError:
            break


def delete_animal_directory(animal_id):
    """
    Elimina todo el directorio de uploads asociado a un animal.
    """
    try:
        upload_folder = flask.current_app.config.get("UPLOAD_FOLDER", "static/uploads")
        relative_path = os.path.join(upload_folder, "animals", str(animal_id))
        base_path = os.path.normpath(os.path.join(flask.current_app.root_path, ".."))
        full_path = os.path.normpath(os.path.join(base_path, relative_path))
        uploads_root = os.path.normpath(os.path.join(base_path, upload_folder))

        if not full_path.startswith(uploads_root):
            logger.warning(
                "Intento de eliminar directorio fuera de uploads (animal_id=%s, path=%s)",
                animal_id,
                full_path,
            )
            return False

        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
            logger.info("Directorio de animal %s eliminado: %s", animal_id, full_path)
            _cleanup_empty_parents(full_path, uploads_root)
            return True

        logger.debug("Directorio de animal %s no existe (%s)", animal_id, full_path)
        return False
    except Exception as e:
        logger.error(f"Error eliminando directorio del animal {animal_id}: {str(e)}")
        return False


def get_public_url(filepath):
    """
    Genera la URL pública accesible desde el frontend usando el endpoint público.

    Args:
        filepath: Ruta relativa del archivo

    Returns:
        str: URL completa del archivo
    """
    import flask

    # Derivar origen preferentemente desde flask.request.host_url
    try:
        if flask.request and getattr(flask.request, "host_url", None):
            base_url = (flask.request.host_url or "").rstrip("/")
        elif flask.request and flask.request.host:
            scheme = "https" if flask.request.is_secure else "http"
            base_url = f"{scheme}://{flask.request.host}"
        else:
            base_url = flask.current_app.config.get("API_BASE_URL_NO_VERSION", "")
    except Exception:
        base_url = flask.current_app.config.get("API_BASE_URL_NO_VERSION", "")

    # Normalizar filepath y extraer ruta relativa
    relative_path = (filepath or "").replace("\\", "/")
    if relative_path.startswith("static/uploads/"):
        relative_path = relative_path[len("static/uploads/") :]
    return f"{base_url}/api/v1/public/images/{relative_path}"


def validate_image_count(animal_id, max_images=20):
    """
    Valida que un animal no exceda el número máximo de imágenes permitidas.

    Args:
        animal_id: ID del animal
        max_images: Número máximo de imágenes permitidas

    Returns:
        tuple: (bool, int) - (es_válido, cantidad_actual)
    """
    try:
        from app.models.animal_images import AnimalImages

        current_count = AnimalImages.query.filter_by(animal_id=animal_id).count()
        return (current_count < max_images, current_count)
    except Exception as e:
        logger.error(f"Error validando cantidad de imágenes: {str(e)}")
        return (True, 0)  # En caso de error, permitir la subida


def chat_allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida para el chat"""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in CHAT_ALLOWED_EXTENSIONS
    )


def get_chat_attachment_category(file_ext: str) -> tuple[str, str]:
    """
    Retorna la categoría de almacenamiento en volumen y el tipo de adjunto.
    Returns:
        (category_folder, attachment_type)
        ej: ('images', 'image'), ('videos', 'video'), ('documents', 'file'), ('audio', 'audio')
    """
    ext = file_ext.lower().lstrip(".")
    if ext in CHAT_IMAGE_EXTENSIONS:
        return ("images", "image")
    if ext in CHAT_VIDEO_EXTENSIONS:
        return ("videos", "video")
    if ext in CHAT_AUDIO_EXTENSIONS:
        return ("audio", "audio")
    return ("documents", "file")


def get_chat_upload_path(finca_id, category: str = "documents", now: datetime | None = None) -> tuple[str, str]:
    """
    Genera la ruta absoluta de almacenamiento y la ruta relativa para URLs.
    Estructura jerárquica en volumen:
    static/uploads/chat/finca_{finca_id}/{YYYY}/{MM}/{category}/
    """
    upload_folder = flask.current_app.config.get("UPLOAD_FOLDER", "static/uploads")
    date_now = now or datetime.utcnow()
    year = str(date_now.year)
    month = f"{date_now.month:02d}"

    relative_dir = os.path.join("static", "uploads", "chat", f"finca_{finca_id}", year, month, category)
    relative_web_dir = relative_dir.replace("\\", "/")
    absolute_dir = os.path.join(upload_folder, "chat", f"finca_{finca_id}", year, month, category)
    return (absolute_dir, relative_web_dir)


def save_chat_file(file, finca_id):
    """
    Guarda un archivo para el chat con organización jerárquica en el volumen.

    Args:
        file: FileStorage object de werkzeug
        finca_id: ID de la finca para organizar por tenant

    Returns:
        dict con url, type, name, file_size, extension, mime_type
    """
    try:
        # Validar archivo
        if not file or file.filename == "":
            raise ValueError("No se proporcionó ningún archivo")

        if not chat_allowed_file(file.filename):
            raise ValueError(
                f"Tipo de archivo no permitido. Extensiones permitidas: {', '.join(sorted(CHAT_ALLOWED_EXTENSIONS))}"
            )

        # Validar tamaño (50MB por defecto)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        max_size = flask.current_app.config.get(
            "MAX_CHAT_FILE_SIZE", 50 * 1024 * 1024
        )  # 50MB
        if file_size > max_size:
            raise ValueError(
                f"El archivo excede el tamaño máximo permitido de {max_size // (1024 * 1024)}MB"
            )

        # Sanitizar nombre y clasificar categoría
        safe_name = secure_filename(file.filename) or "archivo"
        file_ext = safe_name.rsplit(".", 1)[1].lower() if "." in safe_name else "bin"
        category, attachment_type = get_chat_attachment_category(file_ext)

        # Generar nombre único anti-colisiones (timestamp + uuid8 + safe_name)
        now = datetime.utcnow()
        timestamp = str(int(now.timestamp()))
        unique_token = uuid.uuid4().hex[:8]
        unique_filename = f"{timestamp}_{unique_token}_{safe_name}"

        # Crear directorio jerárquico en volumen
        absolute_dir, relative_web_dir = get_chat_upload_path(finca_id, category, now)
        if not ensure_upload_directory(absolute_dir):
            raise OSError("No se pudo crear el directorio de uploads en el volumen")

        # Guardar archivo
        file_path = os.path.join(absolute_dir, unique_filename)
        file.save(file_path)

        # Generar URL pública consistente
        relative_file_path = f"{relative_web_dir}/{unique_filename}"
        public_url = get_public_url(relative_file_path)

        return {
            "url": public_url,
            "type": attachment_type,
            "name": safe_name,
            "file_size": file_size,
            "extension": file_ext,
            "mime_type": get_mime_type(safe_name),
        }

    except Exception as e:
        logger.error(f"Error guardando archivo de chat: {str(e)}")
        raise


def get_chat_file_url(finca_id, filename):
    """
    Genera la URL pública para un archivo del chat.
    """
    relative_path = f"static/uploads/chat/finca_{finca_id}/{filename}"
    return get_public_url(relative_path)

