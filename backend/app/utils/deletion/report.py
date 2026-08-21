"""Informe de eliminación: qué depende de un registro y qué pasa si se borra."""

import logging
from dataclasses import dataclass, field

from sqlalchemy import text

from app import db

from .dependency_map import BLOCK, CASCADE, DETACH, KEEP, DependencyLink, dependency_links
from .labels import blocking_message, cascade_message, keep_message, singular_label, table_label
from .samples import fetch_samples
from .sql import quote_identifier, soft_delete_filter

logger = logging.getLogger(__name__)


@dataclass
class Dependency:
    """Un grupo de registros dependientes, ya contado y explicado."""

    table: str
    column: str
    count: int
    resolution: str
    message: str
    relationship: str | None = None
    self_reference: bool = False
    samples: list[dict[str, object]] = field(default_factory=list)

    @property
    def label(self) -> str:
        return table_label(self.table)

    def to_dict(self) -> dict[str, object]:
        return {
            "table": self.table,
            "label": self.label,
            "field": self.column,
            "count": self.count,
            "resolution": self.resolution,
            "cascade_delete": self.resolution == CASCADE,
            "message": self.message,
            "samples": self.samples,
        }


@dataclass
class DeletionReport:
    """Resultado de evaluar la eliminación de un registro."""

    model_name: str
    record_id: int
    record_label: str
    hard_delete: bool
    dependencies: list[Dependency]

    @property
    def blocking(self) -> list[Dependency]:
        return [dep for dep in self.dependencies if dep.resolution == BLOCK]

    @property
    def cascading(self) -> list[Dependency]:
        return [dep for dep in self.dependencies if dep.resolution == CASCADE]

    @property
    def can_delete(self) -> bool:
        return not self.blocking

    @property
    def total_dependents(self) -> int:
        return sum(dep.count for dep in self.dependencies)

    @property
    def cascade_total(self) -> int:
        return sum(dep.count for dep in self.cascading)

    @property
    def message(self) -> str:
        """Explicación en español lista para mostrarle al operador."""
        if self.blocking:
            detalle = "\n".join(f"• {dep.message}" for dep in self.blocking)
            return (
                f"No se puede eliminar {self.record_label} porque otros registros "
                f"dependen de él y la base de datos debe seguir siendo consistente:\n"
                f"{detalle}\n"
                "Elimine o reasigne esos registros y vuelva a intentarlo."
            )
        if self.cascading:
            return (
                f"Al eliminar {self.record_label} también se eliminarán "
                f"{self.cascade_total} registro(s) relacionado(s)."
            )
        return f"{self.record_label} se puede eliminar sin afectar otros registros."

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.record_id,
            "can_delete": self.can_delete,
            "message": self.message,
            "total_dependents": self.total_dependents,
            "blocking": [dep.to_dict() for dep in self.blocking],
            "cascading": [dep.to_dict() for dep in self.cascading],
            "dependencies": [dep.to_dict() for dep in self.dependencies],
        }


def _primary_key_column(model_class: type) -> str:
    columns = [column.name for column in model_class.__table__.primary_key.columns]
    return columns[0] if columns else "id"


def _count_query(link: DependencyLink, index: int, primary_key: str) -> str:
    conditions = soft_delete_filter(link.child_table)
    if link.self_reference:
        conditions += f" AND {quote_identifier(primary_key)} <> :record_id"
    return (
        f"SELECT {index} AS idx, COUNT(*) AS total "
        f"FROM {quote_identifier(link.child_table)} "
        f"WHERE {quote_identifier(link.child_column)} = :record_id{conditions}"
    )


def _count_dependents(
    links: tuple[DependencyLink, ...], record_id: int, primary_key: str
) -> dict[int, int]:
    """Cuenta las filas dependientes de cada vínculo en una sola consulta."""
    if not links:
        return {}

    queries = [_count_query(link, index, primary_key) for index, link in enumerate(links)]
    try:
        rows = db.session.execute(
            text(" UNION ALL ".join(queries)), {"record_id": record_id}
        ).fetchall()
        return {int(row.idx): int(row.total) for row in rows}
    except Exception as exc:
        logger.warning(
            "Conteo agrupado de dependencias falló (%s); se consulta tabla por tabla", exc
        )
        db.session.rollback()

    counts: dict[int, int] = {}
    for index, link in enumerate(links):
        try:
            counts[index] = int(
                db.session.execute(
                    text(_count_query(link, index, primary_key)), {"record_id": record_id}
                ).scalar_one()
            )
        except Exception as exc:
            logger.warning(
                "No se pudo contar %s.%s: %s", link.child_table, link.child_column, exc
            )
            db.session.rollback()
    return counts


def _describe(link: DependencyLink, count: int, resolution: str) -> str:
    if resolution == CASCADE:
        return cascade_message(link.child_table, count)
    if resolution in (KEEP, DETACH):
        return keep_message(link.child_table, count)
    return blocking_message(link.child_table, link.child_column, count, link.self_reference)


def _label_for(model_class: type, record_id: int, instance: object | None) -> str:
    """Nombre del registro tal como lo reconoce el operador."""
    entity = singular_label(model_class.__tablename__)
    for attribute in ("record", "name", "nombre", "title"):
        value = getattr(instance, attribute, None) if instance is not None else None
        if value:
            return f"{entity} «{value}»"
    return f"{entity} con ID {record_id}"


def build_deletion_report(
    model_class: type,
    record_id: int,
    *,
    hard_delete: bool = False,
    with_samples: bool = False,
    instance: object | None = None,
) -> DeletionReport:
    """Evalúa qué impide (o qué arrastra) eliminar un registro."""
    links = dependency_links(model_class)
    primary_key = _primary_key_column(model_class)
    counts = _count_dependents(links, record_id, primary_key)

    dependencies: list[Dependency] = []
    for index, link in enumerate(links):
        count = counts.get(index, 0)
        if count <= 0:
            continue
        resolution = link.resolution(hard_delete=hard_delete)
        dependency = Dependency(
            table=link.child_table,
            column=link.child_column,
            count=count,
            resolution=resolution,
            message=_describe(link, count, resolution),
            relationship=link.relationship,
            self_reference=link.self_reference,
        )
        if with_samples:
            dependency.samples = fetch_samples(
                link.child_table, link.child_column, record_id
            )
        dependencies.append(dependency)

    return DeletionReport(
        model_name=model_class.__name__,
        record_id=record_id,
        record_label=_label_for(model_class, record_id, instance),
        hard_delete=hard_delete,
        dependencies=dependencies,
    )
