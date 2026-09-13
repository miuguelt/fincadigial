"""Modelo de protocolos de tratamiento (base de conocimiento reutilizable).

A diferencia de ``Treatments`` (una aplicación concreta a una res en una
fecha), un protocolo es conocimiento reutilizable: define un esquema de
tratamiento (dosis, frecuencia, días de retiro, duración) y opcionalmente la
enfermedad a la que aplica. Al usar un protocolo sobre una res se copian sus
valores por defecto a un nuevo ``Treatments`` (instancia), de modo que el
registro aplicado sigue siendo trazable por animal.

Los protocolos viven por finca (tenant), igual que Diseases/Medications.
"""

from app import db
from app.models.base_model import BaseModel, ValidationError

SEVERITY_LEVELS = ("Leve", "Moderada", "Severa", "Crítica")


class TreatmentProtocol(BaseModel):
    """Protocolo de tratamiento reutilizable dentro de una finca."""

    __tablename__ = "treatment_protocols"
    __table_args__ = (
        db.UniqueConstraint(
            "name", "finca_id", name="uq_treatment_protocols_name_finca"
        ),
        db.Index(
            "ix_treatment_protocols_finca_disease", "finca_id", "disease_id"
        ),
        db.Index("ix_treatment_protocols_updated_at", "updated_at"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    disease_id = db.Column(
        db.Integer, db.ForeignKey("diseases.id"), nullable=True
    )
    severity = db.Column(db.String(20), nullable=True)
    default_dosis = db.Column(db.String(120), nullable=False, default="")
    default_frequency = db.Column(db.String(120), nullable=False, default="")
    withdrawal_days = db.Column(db.Integer, nullable=False, default=0)
    duration_days = db.Column(db.Integer, nullable=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id",
        "name",
        "description",
        "disease_id",
        "severity",
        "default_dosis",
        "default_frequency",
        "withdrawal_days",
        "duration_days",
        "is_default",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "disease": {"fields": ["id", "name"], "depth": 1},
        "insumos": {
            "fields": [
                "id",
                "protocol_id",
                "kind",
                "medication_id",
                "vaccine_id",
                "recommended_dosis",
                "recommended_quantity",
                "notes",
            ],
            "depth": 1,
        },
    }
    _searchable_fields = ["name", "description"]
    _filterable_fields = ["finca_id", "disease_id", "severity", "created_at"]
    _sortable_fields = ["id", "name", "created_at", "updated_at"]
    _required_fields = ["name", "description"]
    _unique_fields = ["name"]

    _cache_config = {
        "ttl": 300,
        "type": "private",
        "strategy": "cache-first",
        "max_age": 300,
        "stale_while_revalidate": 60,
    }

    disease = db.relationship("Diseases", lazy="selectin")
    insumos = db.relationship(
        "TreatmentProtocolInsumo",
        back_populates="protocolo",
        lazy="selectin",
        passive_deletes=True,
    )

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        errors = []
        if "name" in data and data.get("name") is not None:
            name = str(data["name"]).strip()
            if len(name) < 3:
                errors.append("El nombre del protocolo debe tener al menos 3 caracteres")
        if "description" in data and data.get("description") is not None:
            if len(str(data["description"]).strip()) < 3:
                errors.append(
                    "La descripción del protocolo debe tener al menos 3 caracteres"
                )
        if "severity" in data and data.get("severity") not in (None, ""):
            if data["severity"] not in SEVERITY_LEVELS:
                errors.append(
                    "La gravedad debe ser una de: " + ", ".join(SEVERITY_LEVELS)
                )
        if "withdrawal_days" in data and data.get("withdrawal_days") is not None:
            try:
                data["withdrawal_days"] = int(data["withdrawal_days"])
                if data["withdrawal_days"] < 0:
                    errors.append("Los días de retiro no pueden ser negativos")
            except (TypeError, ValueError):
                errors.append("El campo 'withdrawal_days' debe ser un número entero")
        if "duration_days" in data and data.get("duration_days") is not None:
            try:
                data["duration_days"] = int(data["duration_days"])
                if data["duration_days"] <= 0:
                    errors.append("La duración en días debe ser mayor que cero")
            except (TypeError, ValueError):
                errors.append("El campo 'duration_days' debe ser un número entero")
        data = super()._validate_and_normalize(
            data, is_update=is_update, instance_id=instance_id
        )
        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")
        return data

    def delete(self, commit=True, hard_delete=False):
        """Retira primero sus insumos recomendados y luego el protocolo."""
        from app.models.treatment_protocol_insumos import TreatmentProtocolInsumo

        for insumo in TreatmentProtocolInsumo.query.filter_by(
            protocol_id=self.id
        ).all():
            insumo.delete(commit=False, hard_delete=hard_delete)
        return super().delete(commit=commit, hard_delete=hard_delete)

    def __repr__(self):
        return f"<TreatmentProtocol {self.id}: {self.name[:40]}>"
