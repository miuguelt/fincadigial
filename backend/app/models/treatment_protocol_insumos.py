"""Modelo de insumos recomendados por un protocolo de tratamiento.

Una fila indica que el protocolo recomienda aplicar un medicamento o una
vacuna (uno de los dos, nunca ambos) con una dosis/ cantidad sugerida. Es
conocimiento: al instanciar el protocolo sobre una res el operador decide si
aplicar realmente el insumo desde inventario.

Tenant por ``finca_id`` explícito, igual que el protocolo padre.
"""

from app import db
from app.models.base_model import BaseModel, ValidationError

INSUMO_KINDS = ("medicamento", "vacuna")


class TreatmentProtocolInsumo(BaseModel):
    """Insumo recomendado (medicamento o vacuna) dentro de un protocolo."""

    __tablename__ = "treatment_protocol_insumos"
    __table_args__ = (
        db.Index(
            "ix_tp_insumos_protocol_finca", "protocol_id", "finca_id"
        ),
        db.Index("ix_tp_insumos_updated_at", "updated_at"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    protocol_id = db.Column(
        db.Integer,
        db.ForeignKey("treatment_protocols.id"),
        nullable=False,
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    kind = db.Column(db.String(16), nullable=False)
    medication_id = db.Column(
        db.Integer, db.ForeignKey("medications.id"), nullable=True
    )
    vaccine_id = db.Column(
        db.Integer, db.ForeignKey("vaccines.id"), nullable=True
    )
    recommended_dosis = db.Column(db.String(120), nullable=True)
    recommended_quantity = db.Column(db.Numeric(12, 3), nullable=True)
    notes = db.Column(db.String(255), nullable=True)

    _namespace_fields = [
        "id",
        "protocol_id",
        "finca_id",
        "kind",
        "medication_id",
        "vaccine_id",
        "recommended_dosis",
        "recommended_quantity",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "medicamento": {"fields": ["id", "name"], "depth": 1},
        "vacuna": {"fields": ["id", "name"], "depth": 1},
    }
    _searchable_fields = ["notes"]
    _filterable_fields = ["finca_id", "protocol_id", "kind", "created_at"]
    _sortable_fields = ["id", "protocol_id", "kind", "created_at", "updated_at"]
    _required_fields = ["protocol_id", "kind"]
    _unique_fields = []

    protocolo = db.relationship(
        "TreatmentProtocol", back_populates="insumos", lazy="selectin"
    )
    medicamento = db.relationship(
        "Medications", foreign_keys=[medication_id], lazy="selectin"
    )
    vacuna = db.relationship(
        "Vaccines", foreign_keys=[vaccine_id], lazy="selectin"
    )

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        errors = []
        data = super()._validate_and_normalize(
            data, is_update=is_update, instance_id=instance_id
        )

        kind = data.get("kind")
        if kind is not None and kind not in INSUMO_KINDS:
            errors.append("El tipo de insumo debe ser 'medicamento' o 'vacuna'")

        medication_id = data.get("medication_id")
        vaccine_id = data.get("vaccine_id")
        if kind == "medicamento" and not medication_id:
            errors.append(
                "Debe indicar el 'medication_id' para un insumo de tipo medicamento"
            )
        if kind == "vacuna" and not vaccine_id:
            errors.append(
                "Debe indicar el 'vaccine_id' para un insumo de tipo vacuna"
            )
        if medication_id and vaccine_id:
            errors.append(
                "Un insumo no puede ser medicamento y vacuna a la vez"
            )

        finca_id = data.get("finca_id") or cls._context_finca_id()
        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")
        return data

    @staticmethod
    def _context_finca_id():
        from app.utils.tenant_context import get_current_finca_id

        return get_current_finca_id()

    def delete(self, commit=True, hard_delete=False):
        if self.is_deleted:
            return True
        return super().delete(commit=commit, hard_delete=hard_delete)

    def __repr__(self):
        target = self.medication_id or self.vaccine_id
        return f"<TreatmentProtocolInsumo {self.id}: {self.kind} {target}>"
