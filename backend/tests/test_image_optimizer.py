import io
import pytest
from pathlib import Path
from PIL import Image
from app.utils.image_optimizer import (
    optimize_image_to_webp,
    optimize_file_on_disk,
    is_valid_image,
)


@pytest.fixture
def dummy_image_bytes():
    # Crear una imagen RGB simple en memoria
    img = Image.new("RGB", (100, 100), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def dummy_png_rgba_bytes():
    # Crear una imagen RGBA simple en memoria
    img = Image.new("RGBA", (100, 100), color=(255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def dummy_large_image_bytes():
    # Crear una imagen grande en memoria
    img = Image.new("RGB", (1500, 800), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.unit
class TestImageOptimizer:
    def test_optimize_image_to_webp_basic(self, dummy_image_bytes):
        webp_bytes, thumb_bytes = optimize_image_to_webp(dummy_image_bytes)
        assert webp_bytes is not None
        assert len(webp_bytes) > 0
        assert thumb_bytes is None

        # Verificar que es realmente WebP
        img = Image.open(io.BytesIO(webp_bytes))
        assert img.format == "WEBP"

    def test_optimize_image_to_webp_rgba(self, dummy_png_rgba_bytes):
        webp_bytes, thumb_bytes = optimize_image_to_webp(dummy_png_rgba_bytes)
        assert webp_bytes is not None
        assert len(webp_bytes) > 0
        img = Image.open(io.BytesIO(webp_bytes))
        assert img.format == "WEBP"
        assert img.mode == "RGB"  # Convertido a RGB

    def test_optimize_image_to_webp_with_thumbnail(self, dummy_image_bytes):
        webp_bytes, thumb_bytes = optimize_image_to_webp(
            dummy_image_bytes, generate_thumb=True
        )
        assert webp_bytes is not None
        assert thumb_bytes is not None

        # Verificar miniatura
        thumb_img = Image.open(io.BytesIO(thumb_bytes))
        assert thumb_img.format == "WEBP"
        assert thumb_img.size[0] <= 320
        assert thumb_img.size[1] <= 320

    def test_optimize_image_to_webp_resize_large(self, dummy_large_image_bytes):
        webp_bytes, thumb_bytes = optimize_image_to_webp(
            dummy_large_image_bytes, max_dimension=1000
        )
        assert webp_bytes is not None

        img = Image.open(io.BytesIO(webp_bytes))
        assert max(img.size) == 1000

    def test_is_valid_image(self, dummy_image_bytes):
        ok, msg = is_valid_image(dummy_image_bytes)
        assert ok is True
        assert msg == ""

        # Demasiado grande (simulado con límite de 0.00001 MB)
        ok, msg = is_valid_image(dummy_image_bytes, max_size_mb=0.00001)
        assert ok is False
        assert "supera el límite" in msg

        # Archivo corrupto / inválido
        ok, msg = is_valid_image(b"not an image data")
        assert ok is False
        assert "inválido" in msg or "No se pudo" in msg

    def test_optimize_file_on_disk(self, tmp_path, dummy_image_bytes):
        # Crear un archivo de imagen en un directorio temporal
        img_path = tmp_path / "temp_image.jpg"
        with open(img_path, "wb") as f:
            f.write(dummy_image_bytes)

        # Optimizar en disco
        webp_path = optimize_file_on_disk(img_path)

        assert webp_path.exists()
        assert webp_path.suffix == ".webp"
        assert not img_path.exists()  # El original debe haber sido borrado

        # Comprobar que no existe el archivo origen
        with pytest.raises(FileNotFoundError):
            optimize_file_on_disk(img_path)
