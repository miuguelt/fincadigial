"""Propagación del borrado lógico a los registros hijos.

El borrado por defecto es lógico: la fila permanece en la tabla, así que las
cascadas ``ON DELETE`` de la base de datos nunca se disparan. Sin esta
propagación, los hijos de un registro eliminado seguirían activos apuntando a
un padre invisible.
"""

import logging
from datetime import UTC, datetime

from app import db

from .dependency_map import cascading_relationships

logger = logging.getLogger(__name__)


def apply_delete(instance, hard_delete: bool = False) -> None:
    """Marca (o borra) la instancia y propaga el borrado lógico a sus hijos."""
    if hard_delete:
        db.session.delete(instance)
        return

    deleted_at = datetime.now(UTC)
    instance.is_deleted = True
    instance.deleted_at = deleted_at
    db.session.add(instance)
    cascade_soft_delete(instance, deleted_at)


def apply_restore(instance) -> None:
    """Restaura la instancia y los hijos que se eliminaron con ella."""
    deleted_at = instance.deleted_at
    instance.is_deleted = False
    instance.deleted_at = None
    cascade_restore(instance, deleted_at)


def _as_naive(value):
    """Compara marcas de tiempo sin importar si llevan zona horaria."""
    if value is not None and value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


def _children(instance, relationship_name: str) -> list:
    related = getattr(instance, relationship_name, None)
    if related is None:
        return []
    if hasattr(related, "all"):  # lazy="dynamic"
        return related.all()
    if isinstance(related, list):
        return related
    return [related]


def _call(instance, method_name: str, **kwargs) -> None:
    """Invoca delete/restore respetando firmas que no aceptan ``hard_delete``."""
    method = getattr(instance, method_name)
    try:
        method(**kwargs)
    except TypeError:
        kwargs.pop("hard_delete", None)
        method(**kwargs)


def cascade_soft_delete(instance, deleted_at) -> int:
    """Marca como eliminados los hijos de las relaciones con cascada declarada.

    Devuelve cuántos registros se marcaron. El recorrido se detiene solo en los
    hijos ya eliminados, lo que también corta ciclos entre relaciones.
    """
    marked = 0
    for relationship_name in cascading_relationships(type(instance)):
        for child in _children(instance, relationship_name):
            if child is None or getattr(child, "is_deleted", False):
                continue
            try:
                _call(child, "delete", commit=False, hard_delete=False)
                child.deleted_at = deleted_at
                marked += 1
            except Exception as exc:
                logger.error(
                    "No se pudo eliminar en cascada %s id=%s: %s",
                    type(child).__name__,
                    getattr(child, "id", None),
                    exc,
                )
                raise
    return marked


def cascade_restore(instance, deleted_at) -> int:
    """Restaura los hijos que se eliminaron junto con este registro.

    Se reconocen por su marca de tiempo: un hijo eliminado antes que el padre
    fue una decisión aparte y debe seguir eliminado.
    """
    if deleted_at is None:
        return 0

    reference = _as_naive(deleted_at)
    restored = 0
    for relationship_name in cascading_relationships(type(instance)):
        for child in _children(instance, relationship_name):
            if child is None or not getattr(child, "is_deleted", False):
                continue
            child_deleted_at = _as_naive(getattr(child, "deleted_at", None))
            if child_deleted_at is None or child_deleted_at < reference:
                continue
            try:
                _call(child, "restore", commit=False)
                restored += 1
            except Exception as exc:
                logger.error(
                    "No se pudo restaurar en cascada %s id=%s: %s",
                    type(child).__name__,
                    getattr(child, "id", None),
                    exc,
                )
                raise
    return restored
