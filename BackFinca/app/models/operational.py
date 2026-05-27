from app import db
import enum
from app.models.base_model import BaseModel

# --- IDEA 1: LOTES DINÁMICOS ---
class AnimalGroup(BaseModel):
    """Grupos de animales para manejo masivo (ej: Lote de Ceba, Vacas Secas)"""
    __tablename__ = 'animal_groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False, index=True)

    # Relación muchos a muchos con animales
    animals = db.relationship('Animals', secondary='animal_group_membership', backref=db.backref('groups', lazy='dynamic'))

class AnimalGroupMembership(db.Model):
    __tablename__ = 'animal_group_membership'
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('animal_groups.id'), primary_key=True)

# --- IDEA 3: SEMÁFORO DE PASTURAS (AFORO) ---
class PastureAforo(BaseModel):
    """Registro de altura y calidad del pasto por potrero"""
    __tablename__ = 'pasture_aforos'
    id = db.Column(db.Integer, primary_key=True)
    field_id = db.Column(db.Integer, db.ForeignKey('fields.id'), nullable=False)
    entry_height = db.Column(db.Float, nullable=True) # cm al entrar
    exit_height = db.Column(db.Float, nullable=True)  # cm al salir
    pasture_quality = db.Column(db.Integer, default=3) # 1-5
    notes = db.Column(db.String(255), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False, index=True)

# --- IDEA EXTRAS: MANTENIMIENTO DE INFRAESTRUCTURA ---
class InfrastructureType(enum.Enum):
    TANQUE = "Tanque de Leche"
    CERCA = "Cerca Eléctrica"
    MAQUINARIA = "Maquinaria"
    CORRAL = "Corral/Instalaciones"
    BEBEDERO = "Bebedero/Acueducto"

class Infrastructure(BaseModel):
    """Activos de la finca que requieren mantenimiento"""
    __tablename__ = 'infrastructure'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.Enum(InfrastructureType), nullable=False)
    last_maintenance = db.Column(db.Date, nullable=True)
    next_maintenance = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), default='Operativo') # Operativo, Requiere Arreglo, Crítico
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False, index=True)
