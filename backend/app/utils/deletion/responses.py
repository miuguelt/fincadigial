"""Respuestas HTTP del borrado: bloqueos explicados y dependencias consultables."""

from app.utils.response_handler import APIResponse

from .dependency_map import CASCADE
from .errors import explain_integrity_error
from .report import DeletionReport

INTEGRITY_ERROR_CODE = "REFERENTIAL_INTEGRITY_BLOCKED"


def blocked_delete_response(report: DeletionReport) -> tuple:
    """409 con el motivo por el que la eliminación rompería la integridad."""
    return APIResponse.error(
        message=report.message,
        status_code=409,
        error_code=INTEGRITY_ERROR_CODE,
        details=report.to_dict(),
    )


def integrity_error_response(error: Exception, record_label: str) -> tuple:
    """409 cuando es la base de datos la que rechaza el borrado."""
    explanation = explain_integrity_error(error, record_label)
    return APIResponse.error(
        message=str(explanation["message"]),
        status_code=409,
        error_code=INTEGRITY_ERROR_CODE,
        details=explanation["details"],
    )


def dependencies_payload(report: DeletionReport) -> dict:
    """Datos del diálogo de confirmación previo a eliminar."""
    dependencies = []
    for dependency in report.dependencies:
        data = dependency.to_dict()
        data["cascade_delete"] = dependency.resolution == CASCADE
        dependencies.append(data)

    return {
        "id": report.record_id,
        "hasDependencies": report.total_dependents > 0,
        "canDelete": report.can_delete,
        "totalDependencies": report.total_dependents,
        "message": report.message,
        "dependencies": dependencies,
        "blocking": [dep.to_dict() for dep in report.blocking],
    }
