from app import db
import enum
from app.models.base_model import BaseModel

class VaccineType(enum.Enum):
    """Tipos de vacunas disponibles"""
    Atenuada = "Atenuada"
    Inactivada = "Inactivada"
    Toxoide = "Toxoide"
    Subunidad = "Subunidad"
    Conjugada = "Conjugada"
    Recombinante = "Recombinante"
    Adn = "Adn"
    Arn = "Arn"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        """Devuelve el valor como string para facilitar la conversión"""
        return str(self.value)

    def __repr__(self):
        """Representación detallada para debug"""
        return f"{self.__class__.__name__}.{self.name}"

class Vaccines(BaseModel):
    """Modelo para vacunas utilizadas en el sistema optimizado para namespaces"""
    __tablename__ = 'vaccines'
    __table_args__ = (
        db.UniqueConstraint('name', 'finca_id', name='uq_vaccines_name_finca'),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    dosis = db.Column(db.String(255), nullable=False)
    route_administration_id = db.Column(db.Integer, db.ForeignKey('route_administrations.id'), nullable=False)
    vaccination_interval = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum(VaccineType), nullable=False)  # Simplificado
    national_plan = db.Column(db.String(255), nullable=False)
    target_disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    # Configuración específica para namespaces
    _namespace_fields = ['id', 'name', 'dosis', 'route_administration_id', 'vaccination_interval', 'type', 'national_plan', 'target_disease_id', 'finca_id', 'created_at']
    # Reducir carga automática de relaciones pesadas para listados por defecto
    _namespace_relations = {
        'diseases': {'fields': ['id', 'name'], 'depth': 1},
        'route_administration_rel': {'fields': ['id', 'name'], 'depth': 1},
    }
    _searchable_fields = ['name', 'national_plan']
    _filterable_fields = ['target_disease_id', 'type', 'route_administration_id', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'name', 'created_at', 'updated_at']
    _required_fields = ['name', 'dosis', 'route_administration_id', 'vaccination_interval', 'type', 'national_plan', 'target_disease_id']
    _unique_fields = ['name']
    _enum_fields = {'type': VaccineType}

    # Relaciones optimizadas
    diseases = db.relationship('Diseases', back_populates='vaccines', lazy='selectin')
    treatments = db.relationship('TreatmentVaccines', back_populates='vaccines', lazy='dynamic')
    vaccinations = db.relationship('Vaccinations', back_populates='vaccines', lazy='dynamic')
    # OPTIMIZED: Changed from lazy='select' to lazy='selectin' to prevent N+1 queries
    route_administration_rel = db.relationship('RouteAdministration', back_populates='vaccines', lazy='selectin')

    def __repr__(self):
        return f'<Vaccine {self.id}: {self.name}>'
