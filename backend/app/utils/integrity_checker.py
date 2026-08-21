"""Compatibilidad: verificación de integridad referencial previa al borrado.

La lógica vive ahora en :mod:`app.utils.deletion`, que clasifica las
dependencias combinando las cascadas del ORM con las reglas ``ON DELETE`` del
esquema. Este módulo conserva la interfaz histórica para el código que aún la
consume.
"""

import logging
import time
from dataclasses import dataclass
from typing import Any

from app.utils.deletion import CASCADE, build_deletion_report

logger = logging.getLogger(__name__)


@dataclass
class IntegrityWarning:
    """Advertencia de integridad referencial (formato heredado)."""

    dependent_table: str
    dependent_count: int
    dependent_field: str
    cascade_delete: bool = False
    warning_message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "table": self.dependent_table,
            "count": self.dependent_count,
            "field": self.dependent_field,
            "cascade_delete": self.cascade_delete,
            "message": self.warning_message,
        }


def _to_warnings(report) -> list[IntegrityWarning]:
    return [
        IntegrityWarning(
            dependent_table=dependency.table,
            dependent_count=dependency.count,
            dependent_field=dependency.column,
            cascade_delete=dependency.resolution == CASCADE,
            warning_message=dependency.message,
        )
        for dependency in report.dependencies
    ]


class OptimizedIntegrityChecker:
    """Fachada sobre :mod:`app.utils.deletion` con caché de corta duración."""

    _cache: dict[str, list[IntegrityWarning]] = {}
    _cache_timestamps: dict[str, float] = {}
    CACHE_TTL = 30  # segundos

    @classmethod
    def _get_cache_key(cls, model_class: type, record_id: int) -> str:
        return f"{model_class.__name__}_{record_id}"

    @classmethod
    def _is_cache_valid(cls, cache_key: str) -> bool:
        timestamp = cls._cache_timestamps.get(cache_key)
        return timestamp is not None and (time.time() - timestamp) < cls.CACHE_TTL

    @classmethod
    def _cache_result(cls, cache_key: str, result: list[IntegrityWarning]) -> None:
        cls._cache[cache_key] = result
        cls._cache_timestamps[cache_key] = time.time()
        cls._cleanup_expired_cache()

    @classmethod
    def _cleanup_expired_cache(cls) -> None:
        now = time.time()
        expired = [
            key
            for key, timestamp in cls._cache_timestamps.items()
            if (now - timestamp) > cls.CACHE_TTL
        ]
        for key in expired:
            cls._cache.pop(key, None)
            cls._cache_timestamps.pop(key, None)

    @classmethod
    def clear_cache(cls) -> None:
        cls._cache.clear()
        cls._cache_timestamps.clear()

    @classmethod
    def get_cache_stats(cls) -> dict[str, Any]:
        now = time.time()
        valid = sum(
            1
            for timestamp in cls._cache_timestamps.values()
            if (now - timestamp) <= cls.CACHE_TTL
        )
        return {
            "total_entries": len(cls._cache),
            "valid_entries": valid,
            "expired_entries": len(cls._cache) - valid,
            "cache_ttl_seconds": cls.CACHE_TTL,
        }

    @classmethod
    def check_integrity_fast(
        cls, model_class: type, record_id: int
    ) -> list[IntegrityWarning]:
        """Dependencias vigentes de un registro, en el formato heredado."""
        if not record_id or record_id <= 0:
            return []

        cache_key = cls._get_cache_key(model_class, record_id)
        if cls._is_cache_valid(cache_key):
            return cls._cache[cache_key]

        try:
            warnings = _to_warnings(build_deletion_report(model_class, record_id))
        except Exception as exc:
            logger.error(
                "Error verificando integridad de %s:%s: %s",
                model_class.__name__,
                record_id,
                exc,
            )
            return [
                IntegrityWarning(
                    dependent_table="unknown",
                    dependent_count=0,
                    dependent_field="unknown",
                    warning_message=f"No se pudo verificar la integridad: {exc}",
                )
            ]

        cls._cache_result(cache_key, warnings)
        return warnings

    @classmethod
    def can_delete_safely(
        cls, model_class: type, record_id: int
    ) -> tuple[bool, list[IntegrityWarning]]:
        warnings = cls.check_integrity_fast(model_class, record_id)
        return all(warning.cascade_delete for warning in warnings), warnings

    @classmethod
    def get_deletion_summary(cls, model_class: type, record_id: int) -> dict[str, Any]:
        report = build_deletion_report(model_class, record_id)
        return {
            "can_delete": report.can_delete,
            "total_dependents": report.total_dependents,
            "cascade_deletions": report.cascade_total,
            "blocking_dependencies": sum(dep.count for dep in report.blocking),
            "warnings": [warning.to_dict() for warning in _to_warnings(report)],
            "summary_message": report.message,
        }

    @classmethod
    def get_batch_dependencies(
        cls, record_ids: list[int], model_name: str
    ) -> dict[int, list[dict]]:
        """Dependencias de varios registros del mismo modelo."""
        if not record_ids:
            return {}

        try:
            from app.models import animals

            model_class = animals.Animals
        except ImportError:
            logger.error("No se pudo importar el modelo %s", model_name)
            return {}

        results: dict[int, list[dict]] = {}
        for record_id in record_ids:
            report = build_deletion_report(model_class, record_id)
            results[record_id] = [
                dependency.to_dict() for dependency in report.dependencies
            ]
        return results


def check_before_delete(model_class: type, record_id: int) -> dict[str, Any]:
    """Resumen de lo que ocurriría al eliminar un registro."""
    return OptimizedIntegrityChecker.get_deletion_summary(model_class, record_id)
