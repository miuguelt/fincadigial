from app import db
import enum
from app.models.base_model import BaseModel


class FarmType(enum.Enum):
    Educativa   = 'Educativa'
    Tradicional = 'Tradicional'

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return f"{self.__class__.__name__}.{self.name}"


class Finca(BaseModel):
    __tablename__ = 'finca'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name         = db.Column(db.String(255), nullable=False)
    type         = db.Column(db.Enum(FarmType), nullable=False)
    nit          = db.Column(db.String(20),  nullable=True)
    department   = db.Column(db.String(100), nullable=True)
    municipality = db.Column(db.String(100), nullable=True)
    address      = db.Column(db.String(255), nullable=True)
    latitude     = db.Column(db.Float, nullable=True)
    longitude    = db.Column(db.Float, nullable=True)
    is_active    = db.Column(db.Boolean, default=True, nullable=False)
    logo_url     = db.Column(db.String(500), nullable=True)
    ica_registration = db.Column(db.String(50), nullable=True)
    territory_id = db.Column(db.Integer, db.ForeignKey('territories.id'), nullable=True)
    
    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields  = ['id', 'name', 'type', 'nit', 'department', 'municipality',
                          'address', 'latitude', 'longitude', 'is_active', 'logo_url', 'ica_registration', 'territory_id', 'created_at', 'updated_at']
    _namespace_relations = {'territory': {'fields': ['id', 'name', 'municipality']}}
    _required_fields   = ['name', 'type']
    _unique_fields     = ['name']
    _enum_fields       = {'type': FarmType}
    _searchable_fields = ['name', 'department', 'municipality']
    _filterable_fields = ['type', 'is_active']
    _sortable_fields   = ['id', 'name', 'created_at']

    def __repr__(self):
        return f'<Finca {self.id}: {self.name} ({getattr(self.type, "value", str(self.type)) if self.type else "?"})>'
