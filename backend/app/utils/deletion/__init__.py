"""Borrado con integridad referencial explicada.

Punto único donde se decide si un registro puede eliminarse, qué arrastra
consigo y cómo se le explica al operador cuando no es posible.
"""

from .dependency_map import (
    BLOCK,
    CASCADE,
    DETACH,
    KEEP,
    DependencyLink,
    cascading_relationships,
    dependency_links,
)
from .errors import explain_integrity_error, is_foreign_key_violation
from .labels import table_label
from .report import Dependency, DeletionReport, build_deletion_report
from .responses import (
    INTEGRITY_ERROR_CODE,
    blocked_delete_response,
    dependencies_payload,
    integrity_error_response,
)

__all__ = [
    "BLOCK",
    "CASCADE",
    "DETACH",
    "KEEP",
    "INTEGRITY_ERROR_CODE",
    "Dependency",
    "DeletionReport",
    "DependencyLink",
    "blocked_delete_response",
    "build_deletion_report",
    "dependencies_payload",
    "cascading_relationships",
    "dependency_links",
    "explain_integrity_error",
    "integrity_error_response",
    "is_foreign_key_violation",
    "table_label",
]
