from app import db
from app.models.base_model import BaseModel
from app.models.treatments import Treatments
from app.models.medications import Medications
from app.models.inventory import InventoryLot
from app.utils.tenant_context import get_current_finca_id

class TreatmentMedications(BaseModel):
    """Modelo de relación entre tratamientos y medicamentos"""
    __tablename__ = 'treatment_medications'
    __table_args__ = (
        db.UniqueConstraint('treatment_id', 'medication_id', name='uq_treatment_medications_treatment_medication'),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    treatment_id = db.Column(db.Integer, db.ForeignKey('treatments.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('inventory_lots.id'), nullable=True) # Vínculo opcional al lote
    quantity = db.Column(db.Float, default=0.0) # Cantidad exacta consumida

    # Relaciones
    treatments = db.relationship('Treatments', back_populates='medication_treatments', lazy='selectin')
    medications = db.relationship('Medications', back_populates='treatments', lazy='selectin')
    lot = db.relationship('InventoryLot', backref=db.backref('medication_treatments', lazy='dynamic'))

    @classmethod
    def create(cls, **kwargs):
        """Sobrescribe creación para descontar inventario automáticamente"""
        instance = super().create(**kwargs)
        if instance.lot_id and instance.quantity > 0:
            from app.models.inventory import InventoryLot, InventoryMovement, MovementType
            lot = InventoryLot.query.get(instance.lot_id)
            if lot:
                lot.current_quantity -= instance.quantity
                # Registrar movimiento de inventario
                InventoryMovement.create(
                    lot_id=lot.id,
                    movement_type=MovementType.Salida,
                    quantity=instance.quantity,
                    reference_type='TreatmentMedication',
                    reference_id=instance.id,
                    notes=f"Consumo en tratamiento ID {instance.treatment_id}",
                    finca_id=lot.finca_id
                )
        return instance

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """Reject links whose treatment, medication or lot belong to another finca."""
        normalized = super()._validate_and_normalize(
            data, is_update=is_update, instance_id=instance_id
        )
        current = cls.query.get(instance_id) if is_update and instance_id else None
        treatment_id = normalized.get('treatment_id') or getattr(current, 'treatment_id', None)
        medication_id = normalized.get('medication_id') or getattr(current, 'medication_id', None)
        lot_id = normalized.get('lot_id') if 'lot_id' in normalized else getattr(current, 'lot_id', None)

        treatment = Treatments.query.get(treatment_id) if treatment_id else None
        medication = Medications.query.get(medication_id) if medication_id else None
        lot = InventoryLot.query.get(lot_id) if lot_id else None
        context_finca_id = get_current_finca_id()
        finca_id = getattr(treatment, 'finca_id', None) or context_finca_id
        errors = []
        if not treatment:
            errors.append('El tratamiento no existe.')
        if not medication:
            errors.append('El medicamento no existe.')
        if treatment and context_finca_id is not None and treatment.finca_id != context_finca_id:
            errors.append('El tratamiento no pertenece a la finca activa.')
        if treatment and medication and treatment.finca_id != medication.finca_id:
            errors.append('El tratamiento y el medicamento deben pertenecer a la misma finca.')
        if lot_id and not lot:
            errors.append('El lote de inventario no existe.')
        if lot and finca_id is not None and lot.finca_id != finca_id:
            errors.append('El lote de inventario debe pertenecer a la misma finca.')
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code='tenant_scope_error', errors=errors)
        return normalized

    # Campos / relaciones para namespaces
    _namespace_fields = ['id', 'treatment_id', 'medication_id', 'created_at', 'updated_at']
    _namespace_relations = {
        'treatments': {'fields': ['id', 'treatment_date', 'animal_id'], 'depth': 1},
        'medications': {'fields': ['id', 'name', 'dosis'], 'depth': 1}
    }
    # Configuraciones del modelo base
    _filterable_fields = ['treatment_id', 'medication_id']
    _sortable_fields = ['id']
    _required_fields = ['treatment_id', 'medication_id']

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if 'treatment_id' in data and not data['treatment_id']:
            errors.append("El tratamiento es obligatorio")
        if 'medication_id' in data and not data['medication_id']:
            errors.append("El medicamento es obligatorio")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="validation_error")

    def __repr__(self):
        return f'<TreatmentMedication {self.id}: Treatment {self.treatment_id} - Medication {self.medication_id}>'
