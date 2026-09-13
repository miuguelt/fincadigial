"""Trazabilidad del seguimiento: FK de avances con CASCADE y limpieza.

El avance clínico es un hijo directo del episodio: si el episodio se borra
físicamente, los avances deben salir con él (CASCADE). Los enlaces
tratamientos/vacunaciones/recomendaciones/controles se conservan sin regla
ON DELETE para proteger la historia clínica ante un borrado físico del
episodio (el verificador de dependencias explica el bloqueo).

Nota de compatibilidad: el nombre del FK creado en ``sani001`` puede variar
según el motor/historial del esquema, así que se resuelve por inspección.

Revision ID: sani002_followup_fk_integrity
Revises: sani001_disease_followup
"""

from alembic import op
import sqlalchemy as sa


revision = "sani002_followup_fk_integrity"
down_revision = "sani001_disease_followup"
branch_labels = None
depends_on = None

_FK_NAMADA = "fk_progress_animal_disease"
_FK_DEFAULT = "animal_disease_progress_animal_disease_id_fkey"


def _episode_fk_names() -> list[str]:
    """Nombres de las restricciones FK de la columna animal_disease_id."""
    inspector = sa.inspect(op.get_bind())
    names = []
    for constraint in inspector.get_foreign_keys("animal_disease_progress"):
        if constraint["constrained_columns"] == ["animal_disease_id"] and constraint.get("name"):
            names.append(constraint["name"])
    return names


def upgrade() -> None:
    # Reemplaza la FK por defecto (NO ACTION) por una con ON DELETE CASCADE.
    for fk_name in _episode_fk_names():
        op.drop_constraint(fk_name, "animal_disease_progress", type_="foreignkey")
    op.create_foreign_key(
        _FK_NAMADA,
        "animal_disease_progress",
        "animal_diseases",
        ["animal_disease_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    for fk_name in _episode_fk_names():
        op.drop_constraint(fk_name, "animal_disease_progress", type_="foreignkey")
    op.create_foreign_key(
        _FK_DEFAULT,
        "animal_disease_progress",
        "animal_diseases",
        ["animal_disease_id"],
        ["id"],
    )
