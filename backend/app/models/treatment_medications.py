from app import db
from app.models.base_model import BaseModel

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
