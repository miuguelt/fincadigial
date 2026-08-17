"""
Optimized Referential Integrity Checker for Fast and Accurate Dependency Validation

This module provides high-performance queries to check referential integrity
before deletion operations, with optimized database queries and caching.
"""

from sqlalchemy import text
from app import db
import logging
from typing import Any
from dataclasses import dataclass
from functools import lru_cache
import time

logger = logging.getLogger(__name__)


def _validate_sql_identifier(name: str) -> None:
    """Valida que un nombre sea un identificador SQL seguro."""
    if not name or not isinstance(name, str):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    if not all(c.isalnum() or c == "_" for c in name):
        raise ValueError(f"SQL identifier contains invalid characters: {name!r}")
    if name[0].isdigit():
        raise ValueError(f"SQL identifier starts with digit: {name!r}")


@dataclass
class IntegrityWarning:
    """Estructura para advertencias de integridad referencial"""

    dependent_table: str
    dependent_count: int
    dependent_field: str
    cascade_delete: bool = False
    warning_message: str = ""

    def to_dict(self):
        return {
            "table": self.dependent_table,
            "count": self.dependent_count,
            "field": self.dependent_field,
            "cascade_delete": self.cascade_delete,
            "message": self.warning_message,
        }


class OptimizedIntegrityChecker:
    """
    Optimized integrity checker with fast queries and caching for performance.

    Features:
    - Batch dependency checking with single queries
    - Indexed-based queries for maximum speed
    - Result caching for repeated checks
    - Detailed warning messages
    - Support for cascade delete detection
    """

    # Cache ultra-rápido para resultados de verificación (TTL: 30 segundos)
    _cache = {}
    _cache_timestamps = {}
    CACHE_TTL = 30  # 30 segundos - muy fresco para eliminación en tiempo real

    @classmethod
    def _get_cache_key(cls, model_class: type, record_id: int) -> str:
        """Genera clave de cache única"""
        return f"{model_class.__name__}_{record_id}"

    @classmethod
    def _is_cache_valid(cls, cache_key: str) -> bool:
        """Verifica si el cache es válido"""
        if cache_key not in cls._cache_timestamps:
            return False
        return (time.time() - cls._cache_timestamps[cache_key]) < cls.CACHE_TTL

    @classmethod
    def _cache_result(cls, cache_key: str, result: list[IntegrityWarning]):
        """Almacena resultado en cache con limpieza automática"""
        cls._cache[cache_key] = result
        cls._cache_timestamps[cache_key] = time.time()

        # Limpiar cache antiguo para evitar crecimiento indefinido
        cls._cleanup_expired_cache()

    @classmethod
    def _cleanup_expired_cache(cls):
        """Limpia entradas de cache expiradas para mantener memoria óptima"""
        current_time = time.time()
        expired_keys = [
            key
            for key, timestamp in cls._cache_timestamps.items()
            if (current_time - timestamp) > cls.CACHE_TTL
        ]

        for key in expired_keys:
            cls._cache.pop(key, None)
            cls._cache_timestamps.pop(key, None)

        if expired_keys:
            logger.debug(f"Limpiadas {len(expired_keys)} entradas de cache expiradas")

    @classmethod
    def clear_cache(cls):
        """Limpia toda la cache manualmente"""
        cls._cache.clear()
        cls._cache_timestamps.clear()
        logger.info("Cache de integridad referencial limpiado manualmente")

    @classmethod
    def get_cache_stats(cls) -> dict[str, Any]:
        """Obtiene estadísticas del cache para monitoreo"""
        current_time = time.time()
        valid_entries = sum(
            1
            for timestamp in cls._cache_timestamps.values()
            if (current_time - timestamp) <= cls.CACHE_TTL
        )

        return {
            "total_entries": len(cls._cache),
            "valid_entries": valid_entries,
            "expired_entries": len(cls._cache) - valid_entries,
            "cache_ttl_seconds": cls.CACHE_TTL,
            "memory_usage_estimate": len(str(cls._cache)),  # Estimación simple
        }

    @classmethod
    def check_integrity_fast(
        cls, model_class: type, record_id: int
    ) -> list[IntegrityWarning]:
        """
        Verificación ultra-rápida de integridad referencial usando queries optimizadas.

        Optimizaciones implementadas:
        - EXISTS en lugar de COUNT para detener búsqueda en primer match
        - UNION ALL para reducir roundtrips a la base de datos
        - Cache con TTL más corto para datos frescos
        - Queries preparadas para reutilización

        Args:
            model_class: Clase del modelo a verificar
            record_id: ID del registro a verificar

        Returns:
            Lista de advertencias de integridad
        """
        cache_key = cls._get_cache_key(model_class, record_id)

        # Verificar cache primero (más rápido que cualquier query)
        if cls._is_cache_valid(cache_key):
            logger.debug(
                f"Usando cache para integridad de {model_class.__name__}:{record_id}"
            )
            return cls._cache[cache_key]

        start_time = time.time()
        warnings = []

        try:
            # Validación temprana para evitar queries innecesarias
            if not record_id or record_id <= 0:
                logger.warning(
                    f"ID inválido para verificación de integridad: {record_id}"
                )
                return warnings

            # Obtener relaciones del modelo usando SQLAlchemy introspección
            relationships = cls._get_model_relationships(model_class)

            # Si no hay relaciones, devolver inmediatamente
            if not relationships:
                cls._cache_result(cache_key, warnings)
                return warnings

            # Query batch ultra-optimizada con UNION ALL
            batch_results = cls._batch_check_dependencies(
                model_class, record_id, relationships
            )

            # Procesar resultados y generar advertencias
            for table_name, count, field_name, cascade in batch_results:
                if count > 0:
                    warning = IntegrityWarning(
                        dependent_table=table_name,
                        dependent_count=count,
                        dependent_field=field_name,
                        cascade_delete=cascade,
                        warning_message=cls._generate_warning_message(
                            table_name, count, cascade
                        ),
                    )
                    warnings.append(warning)

            # Cache de resultados solo si hay advertencias o para confirmar que no las hay
            cls._cache_result(cache_key, warnings)

            elapsed = time.time() - start_time
            logger.debug(
                f"Verificación de integridad ultra-rápida para {model_class.__name__}:{record_id} completada en {elapsed:.3f}s"
            )

        except Exception as e:
            logger.error(
                f"Error en verificación de integridad para {model_class.__name__}:{record_id}: {e}"
            )
            # En caso de error, devolver advertencia genérica
            warnings.append(
                IntegrityWarning(
                    dependent_table="unknown",
                    dependent_count=0,
                    dependent_field="unknown",
                    warning_message=f"No se pudo verificar la integridad: {str(e)}",
                )
            )

        return warnings

    @classmethod
    def _get_model_relationships(cls, model_class: type) -> list[dict]:
        """
        Obtiene las relaciones del modelo usando introspección SQLAlchemy.
        """
        relationships = []
        mapper = model_class.__mapper__
        table_name = model_class.__tablename__

        # 1. Relaciones declaradas en SQLAlchemy (relationships)
        for rel in mapper.relationships:
            # Solo procesar si está en _namespace_relations para evitar ciclos infinitos
            if (
                hasattr(model_class, "_namespace_relations")
                and rel.key in model_class._namespace_relations
            ):
                target_model = rel.mapper.class_
                target_table = target_model.__tablename__

                # Identificar columnas FK
                foreign_keys = []
                if rel.direction.name == "ONETOMANY":
                    # Para ONETOMANY, la FK está en la tabla remota
                    foreign_keys = [str(col.name) for col in rel.remote_side]
                else:
                    # Para MANYTOONE u otros, la FK está en la tabla local
                    foreign_keys = [str(col.name) for col in rel.local_columns]

                # Si no hay local_columns/remote_side, buscar en la tabla destino
                if not foreign_keys:
                    for column in target_model.__table__.columns:
                        for fk in column.foreign_keys:
                            if fk.column.table.name == table_name:
                                foreign_keys.append(str(column.name))
                                break

                relationships.append(
                    {
                        "name": rel.key,
                        "target_table": target_table,
                        "foreign_keys": foreign_keys or [f"{table_name}_id"],
                        "cascade": "delete" in rel.cascade
                        or "delete-orphan" in rel.cascade,
                        "collection": rel.uselist,
                        "reverse": not rel.viewonly
                        and any(
                            fk.column.table.name == table_name
                            for col in target_model.__table__.columns
                            for fk in col.foreign_keys
                        ),
                    }
                )

        # 2. Búsqueda exhaustiva en TODAS las tablas registradas para encontrar quién apunta a nosotros
        for table in db.metadata.tables.values():
            if table.name == table_name:
                continue  # Auto-referencias se manejan en batch_check

            for column in table.columns:
                for fk in column.foreign_keys:
                    # Si esta tabla tiene una FK que apunta a nuestra tabla
                    if fk.column.table.name == table_name:
                        # Evitar duplicados si ya se agregó por relationship
                        if any(
                            r["target_table"] == table.name
                            and column.name in r["foreign_keys"]
                            for r in relationships
                        ):
                            continue

                        relationships.append(
                            {
                                "name": f"fk_{table.name}_{column.name}",
                                "target_table": table.name,
                                "foreign_keys": [str(column.name)],
                                "cascade": False,
                                "collection": True,
                                "reverse": True,
                            }
                        )
                        logger.debug(
                            f"Detectada dependencia inversa vía FK: {table.name}.{column.name} -> {table_name}"
                        )

        return relationships

    @classmethod
    def _batch_check_dependencies(
        cls, model_class: type, record_id: int, relationships: list[dict]
    ) -> list[tuple]:
        """
        Verificación batch ultra-optimizada usando UNION ALL para reducir roundtrips.

        Returns:
            Lista de tuplas: (table_name, count, field_name, cascade)
        """
        results = []
        table_name = model_class.__tablename__

        # Separar relaciones por tipo para procesamiento optimizado
        reverse_deps = []
        forward_deps = []
        self_refs = []  # Auto-referencias especiales (padre/madre)

        for rel in relationships:
            if rel.get("reverse"):
                reverse_deps.append(rel)
            elif rel["target_table"] == table_name:
                # Es una auto-referencia (padre/madre)
                self_refs.append(rel)
            else:
                forward_deps.append(rel)

        # Procesar auto-referencias (padre/madre) primero
        for rel in self_refs:
            try:
                # Para auto-referencias, usar el campo FK específico
                raw_field = (
                    rel["foreign_keys"][0]
                    if rel["foreign_keys"]
                    else f"{table_name}_id"
                )
                field_name = raw_field.split(".")[-1].strip('`" ')
                count = cls._check_reverse_dependency(table_name, field_name, record_id)
                results.append((table_name, count, field_name, rel["cascade"]))
                logger.debug(f"Auto-referencia {field_name}: {count} dependencias")
            except Exception as e:
                logger.warning(f"Error verificando auto-referencia {rel['name']}: {e}")

        # Procesar dependencias inversas con UNION ALL si hay múltiples
        if reverse_deps:
            try:
                results.extend(
                    cls._batch_check_reverse_dependencies(reverse_deps, record_id)
                )
            except Exception as e:
                logger.warning(f"Error en batch de dependencias inversas: {e}")
                # Fallback a procesamiento individual
                for rel in reverse_deps:
                    raw_field = rel["foreign_keys"][0]
                    field_name = raw_field.split(".")[-1].strip('`" ')
                    count = cls._check_reverse_dependency(
                        rel["target_table"], rel["foreign_keys"][0], record_id
                    )
                    results.append(
                        (rel["target_table"], count, field_name, rel["cascade"])
                    )

        # Procesar dependencias directas con UNION ALL si hay múltiples
        if forward_deps:
            try:
                results.extend(
                    cls._batch_check_forward_dependencies(
                        forward_deps, table_name, record_id
                    )
                )
            except Exception as e:
                logger.warning(f"Error en batch de dependencias directas: {e}")
                # Fallback a procesamiento individual
                for rel in forward_deps:
                    fk_field = (
                        rel["foreign_keys"][0]
                        if rel["foreign_keys"]
                        else f"{table_name}_id"
                    )
                    column_name = fk_field.split(".")[-1].strip('`" ')
                    count = cls._check_forward_dependency(
                        rel["target_table"], table_name, record_id, fk_field
                    )
                    results.append(
                        (rel["target_table"], count, column_name, rel["cascade"])
                    )

        return results

    @classmethod
    def _batch_check_reverse_dependencies(
        cls, reverse_deps: list[dict], record_id: int
    ) -> list[tuple]:
        """
        Verificación batch de dependencias inversas usando UNION ALL.
        Reduce múltiples queries a una sola query.
        """
        if not reverse_deps:
            return []

        # Construir query UNION ALL para todas las dependencias inversas
        union_queries = []
        results = []

        for rel in reverse_deps:
            table_name = rel["target_table"]
            fk_field = rel["foreign_keys"][0]
            column_name = fk_field.split(".")[-1].strip('`" ')

            # Subquery para cada tabla con EXISTS optimizado
            subquery = f"""
                SELECT
                    '{table_name}' as table_name,
                    '{column_name}' as field_name,
                    {str(rel["cascade"]).lower()} as cascade_delete,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM "{table_name}"
                            WHERE "{column_name}" = :record_id
                            LIMIT 1
                        ) THEN 1
                        ELSE 0
                    END as count
            """
            union_queries.append(subquery)

        # Ejecutar query UNION ALL
        if not union_queries:
            return results

        try:
            union_query = " UNION ALL ".join(union_queries)
            query = text(union_query)

            batch_results = db.session.execute(
                query, {"record_id": record_id}
            ).fetchall()

            for row in batch_results:
                results.append(
                    (row.table_name, row.count, row.field_name, row.cascade_delete)
                )

        except Exception as e:
            logger.error(
                f"Error ejecutando batch query para dependencias inversas: {e}"
            )
            raise

        return results

    @classmethod
    def _batch_check_forward_dependencies(
        cls, forward_deps: list[dict], parent_table: str, record_id: int
    ) -> list[tuple]:
        """
        Verificación batch de dependencias directas usando UNION ALL.
        """
        if not forward_deps:
            return []

        # Construir query UNION ALL para todas las dependencias directas
        union_queries = []
        results = []

        for rel in forward_deps:
            table_name = rel["target_table"]
            # Usar el nombre de columna FK correcto de la relación en lugar de asumir el patrón
            fk_field = (
                rel["foreign_keys"][0] if rel["foreign_keys"] else f"{parent_table}_id"
            )
            column_name = fk_field.split(".")[-1].strip('`" ')

            # Validar que la columna exista realmente en la tabla de destino.
            # Cuando la relación es MANY-TO-ONE (ej: animal -> breed), no hay
            # una columna en la tabla de destino que apunte al registro actual,
            # por lo que debemos omitirla para evitar errores SQL.
            table_metadata = db.metadata.tables.get(table_name)
            if table_metadata is None or column_name not in table_metadata.columns:
                logger.debug(
                    "Omitiendo verificación directa para %s.%s: columna inexistente en tabla destino",
                    table_name,
                    column_name,
                )
                continue

            # Subquery para cada tabla con EXISTS optimizado
            subquery = f"""
                SELECT
                    '{table_name}' as table_name,
                    '{column_name}' as field_name,
                    {str(rel["cascade"]).lower()} as cascade_delete,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM "{table_name}"
                            WHERE "{column_name}" = :record_id
                            LIMIT 1
                        ) THEN 1
                        ELSE 0
                    END as count
            """
            union_queries.append(subquery)

        # Ejecutar query UNION ALL
        if not union_queries:
            return results

        try:
            union_query = " UNION ALL ".join(union_queries)
            query = text(union_query)

            batch_results = db.session.execute(
                query, {"record_id": record_id}
            ).fetchall()

            for row in batch_results:
                results.append(
                    (row.table_name, row.count, row.field_name, row.cascade_delete)
                )

        except Exception as e:
            logger.error(
                f"Error ejecutando batch query para dependencias directas: {e}"
            )
            raise

        return results

    @classmethod
    def _check_reverse_dependency(
        cls, dependent_table: str, foreign_key_field: str, record_id: int
    ) -> int:
        """
        Verificación instantánea de dependencias inversas usando EXISTS optimizado.

        Optimizaciones:
        - EXISTS con LIMIT 1 para detener en primer match
        - Prepared statements para reutilización
        - Cache de resultados para consultas repetitivas
        """
        try:
            # Query ultra-optimizada con EXISTS para máximo rendimiento
            # EXISTS detiene la búsqueda en el primer match vs COUNT que escanea todos
            column_name = foreign_key_field.rsplit(".", maxsplit=1)[-1].strip('`" ')
            _validate_sql_identifier(dependent_table)
            _validate_sql_identifier(column_name)
            query = text(f"""
                SELECT CASE
                    WHEN EXISTS (
                        SELECT 1 FROM "{dependent_table}"
                        WHERE "{column_name}" = :record_id
                        LIMIT 1
                    ) THEN 1
                    ELSE 0
                END as count
            """)

            result = db.session.execute(query, {"record_id": record_id}).fetchone()
            return result.count if result else 0

        except Exception as e:
            logger.error(
                f"Error en query de dependencia inversa para {dependent_table}: {e}"
            )
            return 0

    @classmethod
    def _check_forward_dependency(
        cls,
        dependent_table: str,
        parent_table: str,
        record_id: int,
        fk_field: str = None,
    ) -> int:
        """
        Verifica dependencias directas (registros hijos de este registro).

        Usa query optimizada con COUNT EXISTS para máximo rendimiento.
        """
        try:
            # Usar el nombre de columna FK proporcionado o el patrón predeterminado como fallback
            if fk_field is None:
                fk_field = f"{parent_table}_id"
            column_name = fk_field.split(".")[-1].strip('`" ')
            _validate_sql_identifier(dependent_table)
            _validate_sql_identifier(column_name)

            # Query ultra-optimizada con EXISTS para mejor rendimiento
            query = text(f"""
                SELECT CASE
                    WHEN EXISTS (
                        SELECT 1 FROM "{dependent_table}"
                        WHERE "{column_name}" = :record_id
                        LIMIT 1
                    ) THEN 1
                    ELSE 0
                END as count
            """)

            result = db.session.execute(query, {"record_id": record_id}).fetchone()
            return result.count if result else 0

        except Exception as e:
            logger.error(
                f"Error en query de dependencia directa para {dependent_table}: {e}"
            )
            return 0

    @classmethod
    def _generate_warning_message(
        cls, table_name: str, count: int, cascade: bool
    ) -> str:
        """Genera mensaje de advertencia descriptivo"""
        table_display = cls._get_display_table_name(table_name)

        if cascade:
            return (
                f"Se eliminarán automáticamente {count} registro(s) de {table_display}"
            )
        else:
            return f"No se puede eliminar mientras existan {count} registro(s) relacionados en {table_display}"

    @classmethod
    @lru_cache(maxsize=128)
    def _get_display_table_name(cls, table_name: str) -> str:
        """Obtiene nombre legible de la tabla (con cache)"""
        display_names = {
            "animals": "Animales",
            "breeds": "Razas",
            "species": "Especies",
            "treatments": "Tratamientos",
            "vaccinations": "Vacunaciones",
            "diseases": "Enfermedades",
            "medications": "Medicamentos",
            "vaccines": "Vacunas",
            "controls": "Controles",
            "fields": "Campos",
            "animal_fields": "Campos por Animal",
            "genetic_improvements": "Mejoras Genéticas",
            "animal_diseases": "Enfermedades por Animal",
            "treatment_medications": "Medicamentos por Tratamiento",
            "treatment_vaccines": "Vacunas por Tratamiento",
        }
        return display_names.get(table_name, table_name.capitalize())

    @classmethod
    def can_delete_safely(
        cls, model_class: type, record_id: int
    ) -> tuple[bool, list[IntegrityWarning]]:
        """
        Determina si un registro puede ser eliminado seguramente.

        Returns:
            Tuple[can_delete, warnings]
        """
        warnings = cls.check_integrity_fast(model_class, record_id)

        # Puede eliminarse si no hay advertencias o todas son cascade delete
        can_delete = all(warning.cascade_delete for warning in warnings)

        return can_delete, warnings

    @classmethod
    def get_deletion_summary(cls, model_class: type, record_id: int) -> dict[str, Any]:
        """
        Obtiene un resumen completo de lo que sucederá en la eliminación.

        Returns:
            Diccionario con resumen de eliminación
        """
        warnings = cls.check_integrity_fast(model_class, record_id)

        # Contar registros que se eliminarán (cascade)
        cascade_count = sum(w.dependent_count for w in warnings if w.cascade_delete)

        # Contar registros que bloquean la eliminación
        blocking_count = sum(
            w.dependent_count for w in warnings if not w.cascade_delete
        )

        can_delete = blocking_count == 0

        return {
            "can_delete": can_delete,
            "total_dependents": sum(w.dependent_count for w in warnings),
            "cascade_deletions": cascade_count,
            "blocking_dependencies": blocking_count,
            "warnings": [w.to_dict() for w in warnings],
            "summary_message": cls._generate_summary_message(
                can_delete, cascade_count, blocking_count
            ),
        }

    @classmethod
    def get_batch_dependencies(
        cls, record_ids: list[int], model_name: str
    ) -> dict[int, list[dict]]:
        """
        Verificación batch de dependencias para múltiples registros.

        Optimizado para verificar múltiples animales en una sola consulta batch.

        Args:
            record_ids: Lista de IDs a verificar
            model_name: Nombre del modelo (ej: 'animals')

        Returns:
            Diccionario {record_id: [dependencies]}
        """
        if not record_ids:
            return {}

        # Importar dinámicamente el modelo
        try:
            from app.models import animals

            model_class = animals.Animals
        except ImportError:
            logger.error(f"No se pudo importar el modelo {model_name}")
            return {}

        # Obtener relaciones del modelo
        relationships = cls._get_model_relationships(model_class)

        # Resultados por ID
        results = {record_id: [] for record_id in record_ids}

        # Procesar cada tipo de relación por separado para optimización
        for rel in relationships:
            target_table = rel["target_table"]

            # Para relaciones inversas (otros registros que apuntan a estos)
            if rel.get("reverse"):
                for fk_field in rel["foreign_keys"]:
                    try:
                        column_name = fk_field.split(".")[-1].strip('`" ')
                        _validate_sql_identifier(target_table)
                        _validate_sql_identifier(column_name)
                        # Usar IN para verificar múltiples IDs en una sola consulta
                        placeholders = ",".join([str(id) for id in record_ids])
                        query = text(f"""
                            SELECT "{column_name}" as record_id, COUNT(*) as count
                            FROM "{target_table}"
                            WHERE "{column_name}" IN ({placeholders})
                            GROUP BY "{column_name}"
                        """)

                        batch_results = db.session.execute(query).fetchall()

                        # Asignar resultados a los IDs correspondientes
                        for row in batch_results:
                            record_id = row.record_id
                            if record_id in results:
                                results[record_id].append(
                                    {
                                        "table": target_table,
                                        "count": row.count,
                                        "field": fk_field,
                                        "cascade_delete": rel["cascade"],
                                    }
                                )

                    except Exception as e:
                        logger.error(f"Error en batch query para {target_table}: {e}")
                        continue

            # Para auto-referencias (padre/madre)
            elif target_table == model_class.__tablename__:
                for fk_field in rel["foreign_keys"]:
                    try:
                        column_name = fk_field.split(".")[-1].strip('`" ')
                        _validate_sql_identifier(target_table)
                        _validate_sql_identifier(column_name)
                        placeholders = ",".join([str(id) for id in record_ids])
                        query = text(f"""
                            SELECT "{column_name}" as record_id, COUNT(*) as count
                            FROM "{target_table}"
                            WHERE "{column_name}" IN ({placeholders})
                            GROUP BY "{column_name}"
                        """)

                        batch_results = db.session.execute(query).fetchall()

                        for row in batch_results:
                            record_id = row.record_id
                            if record_id in results:
                                results[record_id].append(
                                    {
                                        "table": target_table,
                                        "count": row.count,
                                        "field": fk_field,
                                        "cascade_delete": rel["cascade"],
                                    }
                                )

                    except Exception as e:
                        logger.error(
                            f"Error en batch auto-referencia para {fk_field}: {e}"
                        )
                        continue

            # Para relaciones directas (registros hijos)
            else:
                fk_field = f"{model_class.__tablename__}_id"
                column_name = fk_field.split(".")[-1].strip('`" ')
                _validate_sql_identifier(target_table)
                _validate_sql_identifier(column_name)
                table_metadata = db.metadata.tables.get(target_table)
                if table_metadata is None or column_name not in table_metadata.columns:
                    logger.debug(
                        "Omitiendo verificación directa en batch para %s.%s: columna inexistente en tabla destino",
                        target_table,
                        column_name,
                    )
                    continue

                try:
                    placeholders = ",".join([str(id) for id in record_ids])
                    query = text(f"""
                        SELECT "{column_name}" as record_id, COUNT(*) as count
                        FROM "{target_table}"
                        WHERE "{column_name}" IN ({placeholders})
                        GROUP BY "{column_name}"
                    """)

                    batch_results = db.session.execute(query).fetchall()

                    for row in batch_results:
                        record_id = row.record_id
                        if record_id in results:
                            results[record_id].append(
                                {
                                    "table": target_table,
                                    "count": row.count,
                                    "field": fk_field,
                                    "cascade_delete": rel["cascade"],
                                }
                            )

                except Exception as e:
                    logger.error(
                        f"Error en batch query directa para {target_table}: {e}"
                    )
                    continue

        return results

    @classmethod
    def _generate_summary_message(
        cls, can_delete: bool, cascade_count: int, blocking_count: int
    ) -> str:
        """Genera mensaje de resumen"""
        if can_delete and cascade_count > 0:
            return f"Eliminación segura. Se eliminarán {cascade_count} registro(s) relacionados automáticamente."
        elif can_delete:
            return "Eliminación segura. No hay registros relacionados."
        else:
            return f"No se puede eliminar. Hay {blocking_count} registro(s) relacionados que lo impiden."


# Función de conveniencia para uso rápido
def check_before_delete(model_class: type, record_id: int) -> dict[str, Any]:
    """
    Función de conveniencia para verificar integridad antes de eliminar.

    Returns:
        Diccionario con resultado de la verificación
    """
    return OptimizedIntegrityChecker.get_deletion_summary(model_class, record_id)
