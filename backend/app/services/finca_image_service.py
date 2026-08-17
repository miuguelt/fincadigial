from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.models.finca_images import FincaImages
from app.models.user_finca import UserFinca
from app.utils.file_storage import get_public_url


def can_manage_finca_images(user_id: Any, finca_id: int) -> bool:
    """Valida que el usuario tenga una membresía activa en la finca."""
    if not user_id:
        return False
    return UserFinca.has_access(int(user_id), finca_id)


def serialize_public_image(image: FincaImages) -> dict[str, Any]:
    """Expone solo los campos necesarios para mostrar una foto."""
    image_url = get_public_url(image.filepath)
    return {
        "id": image.id,
        "finca_id": image.finca_id,
        "filename": image.filename,
        "filepath": image.filepath,
        "file_size": image.file_size,
        "mime_type": image.mime_type,
        "is_primary": image.is_primary,
        "url": image_url,
        "thumbnail_url": get_public_url(image.thumbnail_path)
        if image.thumbnail_path
        else image_url,
        "created_at": image.created_at.isoformat() if image.created_at else None,
        "updated_at": image.updated_at.isoformat() if image.updated_at else None,
    }


def get_public_finca_images(finca_id: int) -> list[dict[str, Any]]:
    images = (
        FincaImages.query.filter_by(finca_id=finca_id)
        .order_by(FincaImages.is_primary.desc(), FincaImages.created_at.desc())
        .all()
    )
    return [serialize_public_image(image) for image in images]


def get_public_finca_images_map(
    finca_ids: list[int],
) -> dict[int, list[dict[str, Any]]]:
    if not finca_ids:
        return {}
    images = (
        FincaImages.query.filter(FincaImages.finca_id.in_(finca_ids))
        .order_by(FincaImages.is_primary.desc(), FincaImages.created_at.desc())
        .all()
    )
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for image in images:
        grouped[image.finca_id].append(serialize_public_image(image))
    return dict(grouped)
