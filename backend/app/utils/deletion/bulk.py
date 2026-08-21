"""Eliminación de varios registros informando uno por uno qué pasó.

Un lote nunca se elimina "a medias en silencio": cada registro que no se pudo
eliminar viaja de vuelta con su motivo.
"""

import logging

from sqlalchemy.exc import IntegrityError

from app import db

from .errors import explain_integrity_error
from .report import build_deletion_report

logger = logging.getLogger(__name__)


def _scoped_query(model_class: type):
    """Consulta ya limitada a la finca del usuario en sesión."""
    from app.utils.tenant_context import apply_tenant_filter

    return apply_tenant_filter(model_class.query, model_class)


def bulk_delete_records(model_class: type, ids: list[int]) -> dict:
    """Elimina los registros que puedan eliminarse y explica los que no.

    Cada registro se confirma por separado: un bloqueo no debe descartar el
    trabajo ya hecho con los demás.
    """
    instances = {
        instance.id: instance
        for instance in _scoped_query(model_class).filter(model_class.id.in_(ids)).all()
    }

    deleted_ids: list[int] = []
    blocked: list[dict] = []
    cascade_total = 0

    for record_id in ids:
        instance = instances.get(record_id)
        if instance is None:
            continue

        report = build_deletion_report(model_class, record_id, instance=instance)
        if not report.can_delete:
            blocked.append(
                {
                    "id": record_id,
                    "label": report.record_label,
                    "message": report.message,
                    "blocking": [dep.to_dict() for dep in report.blocking],
                }
            )
            continue

        try:
            instance.delete()
            deleted_ids.append(record_id)
            cascade_total += report.cascade_total
        except IntegrityError as error:
            db.session.rollback()
            logger.warning(
                "La BD rechazó eliminar %s id=%s: %s",
                model_class.__name__,
                record_id,
                error,
            )
            explanation = explain_integrity_error(error, report.record_label)
            blocked.append(
                {
                    "id": record_id,
                    "label": report.record_label,
                    "message": explanation["message"],
                    "blocking": explanation["details"]["blocking"],
                }
            )

    missing_ids = [record_id for record_id in ids if record_id not in instances]

    return {
        "deleted_ids": deleted_ids,
        "blocked": blocked,
        "missing_ids": missing_ids,
        "cascade_total": cascade_total,
    }


def bulk_delete_message(result: dict, entity_plural: str) -> str:
    """Resumen en español de lo que ocurrió con el lote."""
    eliminados = len(result["deleted_ids"])
    bloqueados = len(result["blocked"])
    faltantes = len(result["missing_ids"])

    partes = [f"{eliminados} {entity_plural} eliminados"]
    if result["cascade_total"]:
        partes.append(f"{result['cascade_total']} registro(s) relacionados")
    if bloqueados:
        partes.append(f"{bloqueados} no se pudieron eliminar por dependencias")
    if faltantes:
        partes.append(f"{faltantes} ya no existían")
    return ". ".join(partes) + "."
