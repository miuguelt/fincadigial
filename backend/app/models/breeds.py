from app import db
import enum
from app.models.base_model import BaseModel, ValidationError


class BreedPurpose(enum.Enum):
    Milk = "Milk"
    Meat = "Meat"
    Dual = "Dual"
    Work = "Work"
    Ornamental = "Ornamental"


class Breeds(BaseModel):
    """Modelo para razas de animales optimizado para namespaces"""

    __tablename__ = "breeds"
    __table_args__ = (
        db.Index("ix_breeds_updated_at", "updated_at"),
        db.Index("ix_breeds_created_at", "created_at"),
        db.Index("ix_breeds_species_purpose", "species_id", "purpose"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    characteristics = db.Column(db.Text, nullable=True)
    species_id = db.Column(db.Integer, db.ForeignKey("species.id"), nullable=False)
    purpose = db.Column(db.Enum(BreedPurpose), nullable=True)
    origin = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "name",
        "description",
        "characteristics",
        "species_id",
        "purpose",
        "origin",
        "is_active",
        "created_at",
    ]
    _namespace_relations = {
        "species": {"fields": ["id", "name"], "depth": 1},
        "animals": {"fields": ["id", "record", "sex", "status"], "depth": 1},
    }
    _searchable_fields = ["name", "description", "characteristics", "origin"]
    _filterable_fields = ["species_id", "purpose", "is_active", "created_at"]
    _sortable_fields = ["id", "name", "created_at", "updated_at"]
    _required_fields = ["name", "species_id"]
    _unique_fields = []
    _enum_fields = {"purpose": BreedPurpose}

    # Configuración de caché: datos maestros, caché público largo
    _cache_config = {
        "ttl": 1800,  # 30 minutos
        "type": "public",
        "strategy": "cache-first",
        "max_age": 1800,
        "stale_while_revalidate": 600,
    }

    # Relaciones optimizadas
    animals = db.relationship("Animals", back_populates="breed", lazy="dynamic")
    species = db.relationship("Species", back_populates="breeds", lazy="selectin")

    @classmethod
    def find_by_species(cls, species_id, active_only=True):
        query = cls.query.filter_by(species_id=species_id)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.all()

    @classmethod
    def find_by_purpose(cls, purpose, active_only=True):
        query = cls.query.filter_by(purpose=purpose)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.all()

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "name" in data and not data["name"]:
            errors.append("El nombre de la raza no puede estar vacío")
        if "species_id" in data:
            if not isinstance(data["species_id"], int) or data["species_id"] <= 0:
                errors.append("El ID de especie debe ser un número entero positivo")
        super()._validate_namespace_data(data)
        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")

    def __repr__(self):
        return f"<Breed {self.id}: {self.name}>"
