from app import db
from app.models.base_model import BaseModel

class TreatmentVaccines(BaseModel):
    """Modelo de relación entre tratamientos y vacunas"""
    __tablename__ = 'treatment_vaccines'
    __table_args__ = (
        db.UniqueConstraint('treatment_id', 'vaccine_id', name='uq_treatment_vaccines_treatment_vaccine'),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    treatment_id = db.Column(db.Integer, db.ForeignKey('treatments.id'), nullable=False)
    vaccine_id = db.Column(db.Integer, db.ForeignKey('vaccines.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('inventory_lots.id'), nullable=True) # Vínculo opcional al lote
    quantity = db.Column(db.Float, default=0.0) # Cantidad exacta consumida

    # Relaciones
    treatments = db.relationship('Treatments', back_populates='vaccines_treatments', lazy='selectin')
    vaccines = db.relationship('Vaccines', back_populates='treatments', lazy='selectin')
    lot = db.relationship('InventoryLot', backref=db.backref('vaccine_treatments', lazy='dynamic'))

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
                    reference_type='TreatmentVaccine',
                    reference_id=instance.id,
                    notes=f"Consumo en tratamiento ID {instance.treatment_id}",
                    finca_id=lot.finca_id
                )
        return instance

    # Campos / relaciones para namespaces
    _namespace_fields = ['id', 'treatment_id', 'vaccine_id', 'created_at', 'updated_at']
    _namespace_relations = {
        'treatments': {'fields': ['id', 'treatment_date', 'animal_id'], 'depth': 1},
        'vaccines': {'fields': ['id', 'name', 'type'], 'depth': 1}
    }
    # Configuraciones del modelo base
    _filterable_fields = ['treatment_id', 'vaccine_id']
    _sortable_fields = ['id']
    _required_fields = ['treatment_id', 'vaccine_id']

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if 'treatment_id' in data and not data['treatment_id']:
            errors.append("El tratamiento es obligatorio")
        if 'vaccine_id' in data and not data['vaccine_id']:
            errors.append("La vacuna es obligatoria")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="validation_error")

    def __repr__(self):
        return f'<TreatmentVaccine {self.id}: Treatment {self.treatment_id} - Vaccine {self.vaccine_id}>'
