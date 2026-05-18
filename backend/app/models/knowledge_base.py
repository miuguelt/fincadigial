"""
Motor de Conocimiento Agropecuario — Base de datos de recomendaciones precomputadas.

Tablas:
  - kb_categorias        : Taxonomía de categorías
  - kb_recomendaciones   : Recomendaciones con metadatos y condiciones de aplicación
  - kb_calendario        : Calendario sanitario oficial (ICA/FEDEGAN Colombia)
  - kb_consultas_log     : Log anónimo de consultas (mejora futura)

Fuentes:
  - ICA Colombia  — resoluciones de vacunación obligatoria
  - FEDEGAN       — estándares productivos bovinos Colombia
  - SENA          — Guías TG Ganadería Bovina / ECAES Zootecnia
  - FAO / OIE     — bienestar animal y enfermedades transfronterizas
  - MADR Colombia — asistencia técnica rural
"""

from app import db
import enum
from datetime import datetime, timezone
from app.models.base_model import BaseModel


# ──────────────────────────────────────────────────────────────────────────────
# Enumeraciones
# ──────────────────────────────────────────────────────────────────────────────

class KBCategoria(enum.Enum):
    SANIDAD         = 'Sanidad Animal'
    REPRODUCCION    = 'Reproducción'
    NUTRICION       = 'Nutrición y Alimentación'
    PRODUCCION      = 'Producción de Leche'
    BIOSEGURIDAD    = 'Bioseguridad'
    BIENESTAR       = 'Bienestar Animal'
    EMERGENCIA      = 'Emergencia'
    MANEJO          = 'Manejo General'
    NORMATIVA       = 'Normativa ICA'
    GENETICA        = 'Genética'

class KBUrgencia(enum.Enum):
    INMEDIATA = 'Inmediata'   # < 24 horas
    ALTA      = 'Alta'        # < 3 días
    MEDIA     = 'Media'       # esta semana
    BAJA      = 'Baja'        # este mes / preventiva

class KBSexo(enum.Enum):
    HEMBRA  = 'Hembra'
    MACHO   = 'Macho'
    AMBOS   = 'Ambos'

class KBOperador(enum.Enum):
    GT       = 'gt'        # mayor que
    GTE      = 'gte'       # mayor o igual que
    LT       = 'lt'        # menor que
    LTE      = 'lte'       # menor o igual que
    EQ       = 'eq'        # igual a
    NEQ      = 'neq'       # diferente de
    IS_NULL  = 'is_null'   # es nulo / no registrado
    NOT_NULL = 'not_null'  # existe valor
    BETWEEN  = 'between'   # entre valor_min y valor_max


# ──────────────────────────────────────────────────────────────────────────────
# Modelo: Recomendacion
# ──────────────────────────────────────────────────────────────────────────────

class KBRecomendacion(db.Model):
    """
    Recomendación agropecuaria precomputada.

    Cada fila contiene UNA recomendación completa, lista para mostrarse al usuario.
    El motor de reglas (`KBRegla`) determina cuándo se activa.
    """
    __tablename__ = 'kb_recomendaciones'
    __table_args__ = (
        db.Index('ix_kb_rec_categoria', 'categoria'),
        db.Index('ix_kb_rec_urgencia', 'urgencia'),
    )

    id          = db.Column(db.Integer, primary_key=True)
    codigo      = db.Column(db.String(20), unique=True, nullable=False)   # Ej: "SAN-001"
    categoria   = db.Column(db.Enum(KBCategoria), nullable=False)
    titulo      = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.Text, nullable=False)          # ¿Qué está pasando y por qué?
    accion      = db.Column(db.Text, nullable=False)          # ¿Qué debe hacer el usuario HOY?
    cuando      = db.Column(db.String(255), nullable=True)    # ¿Cuándo actuar? (Ej: "antes de 48h")
    profesional = db.Column(db.Boolean, default=False)        # ¿Requiere veterinario?
    urgencia    = db.Column(db.Enum(KBUrgencia), nullable=False, default=KBUrgencia.MEDIA)
    sexo        = db.Column(db.Enum(KBSexo), default=KBSexo.AMBOS)
    edad_min_dias = db.Column(db.Integer, nullable=True)      # Edad mínima del animal
    edad_max_dias = db.Column(db.Integer, nullable=True)      # Edad máxima del animal
    fuente      = db.Column(db.String(120), nullable=True)    # ICA, FEDEGAN, FAO, etc.
    activo      = db.Column(db.Boolean, default=True)
    creado_en   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    reglas = db.relationship('KBRegla', back_populates='recomendacion',
                              cascade='all, delete-orphan', lazy='select')

    def to_dict(self):
        return {
            'id':           self.id,
            'codigo':       self.codigo,
            'categoria':    self.categoria.value,
            'titulo':       self.titulo,
            'descripcion':  self.descripcion,
            'accion':       self.accion,
            'cuando':       self.cuando,
            'profesional':  self.profesional,
            'urgencia':     self.urgencia.value,
            'sexo':         self.sexo.value,
            'edad_min_dias':self.edad_min_dias,
            'edad_max_dias':self.edad_max_dias,
            'fuente':       self.fuente,
        }

    def __repr__(self):
        return f'<KBRec {self.codigo}: {self.titulo}>'


# ──────────────────────────────────────────────────────────────────────────────
# Modelo: Regla de activación
# ──────────────────────────────────────────────────────────────────────────────

class KBRegla(db.Model):
    """
    Regla de activación para una recomendación.

    Un animal satisface una recomendación cuando TODAS sus reglas son verdaderas.
    El campo `campo_condicion` debe coincidir con un atributo/propiedad del modelo Animals
    o un valor derivado calculado por el motor.

    Campos calculados soportados:
      - age_in_days           → Edad del animal en días
      - age_in_months         → Edad en meses
      - weight                → Peso actual (kg)
      - dias_desde_parto      → Días transcurridos desde último parto
      - dias_abiertos         → Días sin preñez después del parto
      - dias_desde_vacuna     → Días desde la última vacuna (por tipo)
      - dias_desde_control    → Días desde el último control de peso
      - is_pregnant           → Está preñada (boolean)
      - is_lactating          → Está en lactancia (boolean)
      - bcs_estimado          → Body Condition Score estimado por peso/raza
      - pending_alerts_count  → Número de alertas activas
      - leche_promedio_7d     → Litros/día promedio últimos 7 días
    """
    __tablename__ = 'kb_reglas'

    id                = db.Column(db.Integer, primary_key=True)
    recomendacion_id  = db.Column(db.Integer, db.ForeignKey('kb_recomendaciones.id'), nullable=False)
    campo_condicion   = db.Column(db.String(80), nullable=False)
    operador          = db.Column(db.Enum(KBOperador), nullable=False)
    valor             = db.Column(db.String(100), nullable=True)      # Valor principal
    valor_max         = db.Column(db.String(100), nullable=True)      # Solo para BETWEEN
    descripcion_corta = db.Column(db.String(120), nullable=True)      # "edad > 180 días"

    recomendacion = db.relationship('KBRecomendacion', back_populates='reglas')

    def __repr__(self):
        return f'<KBRegla {self.campo_condicion} {self.operador.value} {self.valor}>'


# ──────────────────────────────────────────────────────────────────────────────
# Modelo: Calendario Sanitario
# ──────────────────────────────────────────────────────────────────────────────

class KBCalendario(db.Model):
    """
    Calendario sanitario bovino para Colombia.

    Cubre vacunaciones obligatorias (ICA) y preventivas (FEDEGAN/SENA).
    El sistema usa esta tabla para generar alertas pro-activas basadas en
    la edad del animal y la última aplicación registrada.
    """
    __tablename__ = 'kb_calendario'

    id               = db.Column(db.Integer, primary_key=True)
    codigo           = db.Column(db.String(20), unique=True, nullable=False)
    nombre           = db.Column(db.String(120), nullable=False)
    descripcion      = db.Column(db.Text, nullable=False)
    tipo             = db.Column(db.String(50), nullable=False)          # vacunacion, desparasitacion, revision
    obligatorio_ica  = db.Column(db.Boolean, default=False)             # Exigido por ICA
    sexo             = db.Column(db.Enum(KBSexo), default=KBSexo.AMBOS)
    edad_inicio_dias = db.Column(db.Integer, nullable=True)              # Aplica desde (días)
    edad_fin_dias    = db.Column(db.Integer, nullable=True)              # Aplica hasta (días)
    frecuencia_dias  = db.Column(db.Integer, nullable=True)              # Cada X días (0 = única vez)
    producto_sugerido = db.Column(db.String(200), nullable=True)         # Nombre comercial común
    dosis_referencia = db.Column(db.String(100), nullable=True)          # "2ml IM"
    fuente           = db.Column(db.String(120), nullable=True)
    activo           = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id':               self.id,
            'codigo':           self.codigo,
            'nombre':           self.nombre,
            'descripcion':      self.descripcion,
            'tipo':             self.tipo,
            'obligatorio_ica':  self.obligatorio_ica,
            'sexo':             self.sexo.value,
            'edad_inicio_dias': self.edad_inicio_dias,
            'edad_fin_dias':    self.edad_fin_dias,
            'frecuencia_dias':  self.frecuencia_dias,
            'producto_sugerido':self.producto_sugerido,
            'dosis_referencia': self.dosis_referencia,
            'fuente':           self.fuente,
        }

    def __repr__(self):
        return f'<KBCalendario {self.codigo}: {self.nombre}>'
