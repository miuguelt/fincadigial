from app import db
from app.models.base_model import BaseModel, ValidationError
from app.models.treatments import Treatments
from app.models.medications import Medications
from app.models.inventory import InventoryLot, ProductType
from app.services.inventory_service import InventoryService
from app.utils.tenant_context import get_current_finca_id


class TreatmentMedications(BaseModel):
    """Modelo de relación entre tratamientos y medicamentos"""

    __tablename__ = "treatment_medications"
    __table_args__ = (
        db.UniqueConstraint(
            "treatment_id",
            "medication_id",
            name="uq_treatment_medications_treatment_medication",
        ),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    treatment_id = db.Column(db.Integer, db.ForeignKey("treatments.id"), nullable=False)
    medication_id = db.Column(
        db.Integer, db.ForeignKey("medications.id"), nullable=False
    )
    lot_id = db.Column(
        db.Integer, db.ForeignKey("inventory_lots.id"), nullable=True
    )  # Vínculo opcional al lote
    quantity = db.Column(db.Numeric(12, 3), default=0.0)  # Cantidad exacta consumida

    # Relaciones
    treatments = db.relationship(
        "Treatments", back_populates="medication_treatments", lazy="selectin"
    )
    medications = db.relationship(
        "Medications", back_populates="treatments", lazy="selectin"
    )
    lot = db.relationship(
        "InventoryLot", backref=db.backref("medication_treatments", lazy="dynamic")
    )

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Create the application and its stock exit in one transaction."""
        instance = super().create(commit=False, **kwargs)
        try:
            InventoryService.reconcile_consumption(
                "TreatmentMedication",
                instance.id,
                new_lot_id=instance.lot_id,
                new_quantity=instance.quantity,
                commit=False,
            )
            if commit:
                db.session.commit()
                db.session.refresh(instance)
        except Exception:
            db.session.rollback()
            raise
        return instance

    def update(self, commit=True, **kwargs):
        old_lot_id, old_quantity = self.lot_id, self.quantity
        updated = super().update(commit=False, **kwargs)
        try:
            InventoryService.reconcile_consumption(
                "TreatmentMedication",
                self.id,
                old_lot_id=old_lot_id,
                old_quantity=old_quantity,
                new_lot_id=self.lot_id,
                new_quantity=self.quantity,
                commit=False,
            )
            if commit:
                db.session.commit()
                db.session.refresh(updated)
        except Exception:
            db.session.rollback()
            raise
        return updated

    def delete(self, commit=True, hard_delete=False):
        if self.is_deleted:
            return True
        try:
            result = super().delete(commit=False, hard_delete=hard_delete)
            InventoryService.reconcile_consumption(
                "TreatmentMedication",
                self.id,
                old_lot_id=self.lot_id,
                old_quantity=self.quantity,
                commit=False,
            )
            if commit:
                db.session.commit()
            return result
        except Exception:
            db.session.rollback()
            raise

    @classmethod
    def bulk_create(cls, items_data):
        try:
            instances = [cls.create(commit=False, **data) for data in items_data]
            db.session.commit()
            return instances
        except Exception:
            db.session.rollback()
            raise

    @classmethod
    def bulk_update(cls, updates_data):
        try:
            instances = []
            for data in updates_data:
                instance = cls.get_by_id(data.get("id"))
                if instance:
                    changes = {k: v for k, v in data.items() if k != "id"}
                    instances.append(instance.update(commit=False, **changes))
            db.session.commit()
            return instances
        except Exception:
            db.session.rollback()
            raise

    @classmethod
    def bulk_delete(cls, ids, hard_delete=False):
        count = 0
        try:
            for item_id in ids:
                instance = cls.get_by_id(item_id)
                if instance:
                    instance.delete(commit=False, hard_delete=hard_delete)
                    count += 1
            db.session.commit()
            return count
        except Exception:
            db.session.rollback()
            raise

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """Reject links whose treatment, medication or lot belong to another finca."""
        normalized = super()._validate_and_normalize(
            data, is_update=is_update, instance_id=instance_id
        )
        current = cls.query.get(instance_id) if is_update and instance_id else None
        treatment_id = normalized.get("treatment_id") or getattr(
            current, "treatment_id", None
        )
        medication_id = normalized.get("medication_id") or getattr(
            current, "medication_id", None
        )
        lot_id = (
            normalized.get("lot_id")
            if "lot_id" in normalized
            else getattr(current, "lot_id", None)
        )

        treatment = Treatments.query.get(treatment_id) if treatment_id else None
        medication = Medications.query.get(medication_id) if medication_id else None
        lot = InventoryLot.query.get(lot_id) if lot_id else None
        context_finca_id = get_current_finca_id()
        finca_id = getattr(treatment, "finca_id", None) or context_finca_id
        errors = []
        if not treatment:
            errors.append("El tratamiento no existe.")
        if not medication:
            errors.append("El medicamento no existe.")
        if (
            treatment
            and context_finca_id is not None
            and treatment.finca_id != context_finca_id
        ):
            errors.append("El tratamiento no pertenece a la finca activa.")
        if treatment and medication and treatment.finca_id != medication.finca_id:
            errors.append(
                "El tratamiento y el medicamento deben pertenecer a la misma finca."
            )
        if lot_id and not lot:
            errors.append("El lote de inventario no existe.")
        if lot and finca_id is not None and lot.finca_id != finca_id:
            errors.append("El lote de inventario debe pertenecer a la misma finca.")
        quantity = normalized.get("quantity", getattr(current, "quantity", 0) or 0)
        try:
            if float(quantity) < 0:
                errors.append("La cantidad consumida no puede ser negativa.")
            if float(quantity) > 0 and not lot_id:
                errors.append("Debe indicar el lote cuando registra un consumo.")
        except (TypeError, ValueError):
            errors.append("La cantidad consumida debe ser numérica.")
        if lot and medication and lot.product_type == ProductType.Medicamento and lot.medication_id != medication.id:
            errors.append("El lote no corresponde al medicamento seleccionado.")
        if errors:
            raise ValidationError(
                "; ".join(errors), code="tenant_scope_error", errors=errors
            )
        return normalized

    # Campos / relaciones para namespaces
    _namespace_fields = [
        "id",
        "treatment_id",
        "medication_id",
        "lot_id",
        "quantity",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "treatments": {"fields": ["id", "treatment_date", "animal_id"], "depth": 1},
        "medications": {"fields": ["id", "name", "dosis"], "depth": 1},
        "lot": {"fields": ["id", "lot_number", "current_quantity", "unit"], "depth": 1},
    }
    # Configuraciones del modelo base
    _filterable_fields = ["treatment_id", "medication_id"]
    _sortable_fields = ["id"]
    _required_fields = ["treatment_id", "medication_id"]

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "treatment_id" in data and not data["treatment_id"]:
            errors.append("El tratamiento es obligatorio")
        if "medication_id" in data and not data["medication_id"]:
            errors.append("El medicamento es obligatorio")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="validation_error")

    def __repr__(self):
        return f"<TreatmentMedication {self.id}: Treatment {self.treatment_id} - Medication {self.medication_id}>"
