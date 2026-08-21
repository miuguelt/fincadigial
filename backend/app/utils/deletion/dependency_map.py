"""Mapa de dependencias de un modelo: quién apunta a él y cómo se resuelve.

La clasificación combina dos fuentes que antes se miraban por separado y se
contradecían: las cascadas declaradas en las relaciones de SQLAlchemy y las
reglas ``ON DELETE`` de la base de datos.
"""

from dataclasses import dataclass
from functools import lru_cache

from app import db

# Resoluciones posibles de una dependencia al eliminar el registro padre.
CASCADE = "cascade"  # el hijo se elimina junto con el padre
KEEP = "keep"  # vínculo de tabla puente: no bloquea ni se elimina
DETACH = "detach"  # la base de datos deja la referencia en NULL
BLOCK = "block"  # nada la resuelve: hay que explicarla al operador

_DETACHING_RULES = {"SET NULL", "SET DEFAULT"}


@dataclass(frozen=True)
class DependencyLink:
    """Una columna que referencia la tabla del modelo evaluado."""

    child_table: str
    child_column: str
    relationship: str | None
    orm_cascade: bool
    db_ondelete: str | None
    association: bool
    self_reference: bool

    def resolution(self, hard_delete: bool = False) -> str:
        """Cómo se resuelve esta dependencia al eliminar el padre.

        El borrado lógico solo puede apoyarse en las cascadas del ORM: las
        reglas ``ON DELETE`` de la base de datos únicamente se disparan cuando
        la fila desaparece físicamente.
        """
        if self.orm_cascade:
            return CASCADE
        if self.association:
            return KEEP
        if hard_delete:
            rule = (self.db_ondelete or "").upper()
            if rule == "CASCADE":
                return CASCADE
            if rule in _DETACHING_RULES:
                return DETACH
        return BLOCK


def _foreign_key_rule(child_table: str, child_column: str) -> str | None:
    """Regla ``ON DELETE`` declarada para una columna hija, si existe."""
    table = db.metadata.tables.get(child_table)
    if table is None or child_column not in table.columns:
        return None
    for fk in table.columns[child_column].foreign_keys:
        if fk.ondelete:
            return fk.ondelete
    return None


def _links_from_relationships(model_class: type) -> dict[tuple[str, str], DependencyLink]:
    """Dependencias declaradas como relaciones del modelo."""
    table_name = model_class.__tablename__
    links: dict[tuple[str, str], DependencyLink] = {}

    for rel in model_class.__mapper__.relationships:
        if rel.secondary is not None:
            for column in rel.secondary.columns:
                for fk in column.foreign_keys:
                    if fk.column.table.name != table_name:
                        continue
                    key = (rel.secondary.name, column.name)
                    links[key] = DependencyLink(
                        child_table=rel.secondary.name,
                        child_column=column.name,
                        relationship=rel.key,
                        orm_cascade=False,
                        db_ondelete=fk.ondelete,
                        association=True,
                        self_reference=False,
                    )
            continue

        if rel.direction.name != "ONETOMANY":
            continue

        cascade = "delete" in rel.cascade
        for _local, remote in rel.local_remote_pairs:
            key = (remote.table.name, remote.name)
            previous = links.get(key)
            links[key] = DependencyLink(
                child_table=remote.table.name,
                child_column=remote.name,
                relationship=rel.key,
                orm_cascade=cascade or bool(previous and previous.orm_cascade),
                db_ondelete=_foreign_key_rule(remote.table.name, remote.name),
                association=False,
                self_reference=remote.table.name == table_name,
            )

    return links


def _links_from_metadata(
    model_class: type, known: dict[tuple[str, str], DependencyLink]
) -> dict[tuple[str, str], DependencyLink]:
    """Dependencias que solo existen a nivel de esquema, sin relación declarada."""
    table_name = model_class.__tablename__
    links = dict(known)

    for table in db.metadata.tables.values():
        for column in table.columns:
            for fk in column.foreign_keys:
                if fk.column.table.name != table_name:
                    continue
                key = (table.name, column.name)
                if key in links:
                    continue
                links[key] = DependencyLink(
                    child_table=table.name,
                    child_column=column.name,
                    relationship=None,
                    orm_cascade=False,
                    db_ondelete=fk.ondelete,
                    association=False,
                    self_reference=table.name == table_name,
                )

    return links


@lru_cache(maxsize=128)
def dependency_links(model_class: type) -> tuple[DependencyLink, ...]:
    """Todas las columnas que apuntan al modelo, ya clasificadas.

    El resultado depende solo de los metadatos, así que se memoriza por modelo.
    """
    links = _links_from_relationships(model_class)
    links = _links_from_metadata(model_class, links)
    return tuple(
        sorted(links.values(), key=lambda link: (link.child_table, link.child_column))
    )


def cascading_relationships(model_class: type) -> tuple[str, ...]:
    """Relaciones cuyo borrado debe propagarse al eliminar el padre."""
    return tuple(
        rel.key
        for rel in model_class.__mapper__.relationships
        if rel.secondary is None
        and rel.direction.name == "ONETOMANY"
        and "delete" in rel.cascade
    )
