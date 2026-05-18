"""
Middleware de optimización de imágenes para Villa Luz
=======================================================
Convierte automáticamente las imágenes subidas a formato WebP para
reducir el tamaño de transferencia hasta un 70% sin pérdida visual
perceptible. Crítico en zonas rurales con conectividad limitada.
"""

import io
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Reducción de calidad para WebP (0-100, 82 es punto óptimo visión/peso)
WEBP_QUALITY = 82
# Dimensión máxima de un lado (ancho o alto) en píxeles
MAX_DIMENSION = 1200
# Miniatura para listados
THUMB_SIZE = (320, 320)


def _open_image(data: bytes):
    """Abre bytes de imagen con Pillow."""
    try:
        from PIL import Image
        return Image.open(io.BytesIO(data))
    except Exception as exc:
        raise ValueError(f"No se pudo abrir la imagen: {exc}") from exc


def optimize_image_to_webp(
    image_data: bytes,
    max_dimension: int = MAX_DIMENSION,
    quality: int = WEBP_QUALITY,
    generate_thumb: bool = False,
    thumb_size: Tuple[int, int] = THUMB_SIZE,
) -> Tuple[bytes, Optional[bytes]]:
    """
    Recibe bytes de una imagen (cualquier formato), la redimensiona si es
    demasiado grande y la convierte a WebP.

    Returns
    -------
    (webp_bytes, thumb_bytes | None)
        webp_bytes  → imagen principal en WebP
        thumb_bytes → miniatura WebP si generate_thumb=True, si no None
    """
    from PIL import Image

    img = _open_image(image_data)

    # Convertir a RGB (necesario para WebP si la imagen tiene canal alpha o es palette)
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Redimensionar si algún lado supera max_dimension (mantiene ratio)
    w, h = img.size
    if max(w, h) > max_dimension:
        ratio = max_dimension / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        logger.debug("Imagen redimensionada de %dx%d a %dx%d", w, h, *new_size)

    # Imagen principal → WebP
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    webp_bytes = buf.getvalue()

    # Miniatura opcional
    thumb_bytes: Optional[bytes] = None
    if generate_thumb:
        thumb = img.copy()
        thumb.thumbnail(thumb_size, Image.LANCZOS)
        tbuf = io.BytesIO()
        thumb.save(tbuf, format="WEBP", quality=75, method=6)
        thumb_bytes = tbuf.getvalue()

    reduction = (1 - len(webp_bytes) / len(image_data)) * 100
    logger.info(
        "Imagen optimizada: %d KB → %d KB (%.1f%% menor, WebP q=%d)",
        len(image_data) // 1024,
        len(webp_bytes) // 1024,
        reduction,
        quality,
    )
    return webp_bytes, thumb_bytes


def optimize_file_on_disk(filepath: str | Path, quality: int = WEBP_QUALITY) -> Path:
    """
    Convierte en disco una imagen existente a WebP (sobrescribe con misma base de nombre).
    Devuelve la nueva ruta con extensión .webp.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"No se encontró: {filepath}")

    with open(filepath, "rb") as f:
        original_data = f.read()

    webp_data, _ = optimize_image_to_webp(original_data, quality=quality)

    webp_path = filepath.with_suffix(".webp")
    with open(webp_path, "wb") as f:
        f.write(webp_data)

    # Eliminar original si es diferente al destino
    if webp_path != filepath:
        filepath.unlink(missing_ok=True)

    logger.info("Convertido en disco: %s → %s", filepath.name, webp_path.name)
    return webp_path


def is_valid_image(data: bytes, max_size_mb: float = 10.0) -> Tuple[bool, str]:
    """
    Valida que los bytes sean una imagen real y no superen el tamaño máximo.

    Returns (ok, mensaje_error)
    """
    if len(data) > max_size_mb * 1024 * 1024:
        return False, f"La imagen supera el límite de {max_size_mb} MB"

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        img.verify()  # Detecta archivos corruptos sin descodificar por completo
        return True, ""
    except Exception as exc:
        return False, f"Archivo de imagen inválido: {exc}"
