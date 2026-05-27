from app import db
from app.models.base_model import BaseModel
from datetime import datetime, UTC

class LivestockSummary(BaseModel):
    """
    Tabla de resumen (Materialized View manual) para estadísticas rápidas.
    Evita conteos pesados en tablas transaccionales durante la carga del Dashboard.
    """
    __tablename__ = "livestock_summary"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), unique=True, nullable=False)

    # Conteos rápidos
    total_animals = db.Column(db.Integer, default=0)
    active_animals = db.Column(db.Integer, default=0)
    sold_animals = db.Column(db.Integer, default=0)
    dead_animals = db.Column(db.Integer, default=0)

    # Distribución por sexo
    male_count = db.Column(db.Integer, default=0)
    female_count = db.Column(db.Integer, default=0)

    # Salud
    sick_animals = db.Column(db.Integer, default=0) # Animales con tratamientos activos

    # Metadatos de actualización
    last_recalculation = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

    @classmethod
    def get_for_finca(cls, finca_id):
        """Obtiene o crea el resumen para una finca. Si finca_id es None, retorna agregado global."""
        if finca_id is None:
            # Calcular agregados de todas las fincas
            from sqlalchemy import func
            res = db.session.query(
                func.sum(cls.total_animals),
                func.sum(cls.active_animals),
                func.sum(cls.sold_animals),
                func.sum(cls.dead_animals),
                func.sum(cls.male_count),
                func.sum(cls.female_count),
                func.sum(cls.sick_animals)
            ).first()

            # Retornar una instancia "fantasma" (sin persistir) con los totales
            return cls(
                finca_id=None,
                total_animals=int(res[0] or 0),
                active_animals=int(res[1] or 0),
                sold_animals=int(res[2] or 0),
                dead_animals=int(res[3] or 0),
                male_count=int(res[4] or 0),
                female_count=int(res[5] or 0),
                sick_animals=int(res[6] or 0),
                last_recalculation=datetime.now(UTC)
            )

        summary = cls.query.filter_by(finca_id=finca_id).first()
        if not summary:
            summary = cls(finca_id=finca_id)
            db.session.add(summary)
            db.session.commit()
            summary.recalculate()
        return summary

    def recalculate(self):
        """Recalcula todos los valores desde las tablas transaccionales."""
        from app.models.animals import Animals, AnimalStatus, Sex
        from app.models.treatments import Treatments
        from datetime import datetime, timedelta

        # Conteos básicos (excluyendo animales eliminados lógicamente)
        self.total_animals = Animals.query.filter_by(finca_id=self.finca_id, is_deleted=False).count()
        self.active_animals = Animals.query.filter_by(finca_id=self.finca_id, status=AnimalStatus.Vivo, is_deleted=False).count()
        self.sold_animals = Animals.query.filter_by(finca_id=self.finca_id, status=AnimalStatus.Vendido, is_deleted=False).count()
        self.dead_animals = Animals.query.filter_by(finca_id=self.finca_id, status=AnimalStatus.Muerto, is_deleted=False).count()

        self.male_count = Animals.query.filter_by(finca_id=self.finca_id, sex=Sex.Macho, is_deleted=False).count()
        self.female_count = Animals.query.filter_by(finca_id=self.finca_id, sex=Sex.Hembra, is_deleted=False).count()

        # Animales enfermos (con tratamientos activos en los últimos 30 días, excluyendo borrados y animales borrados)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        self.sick_animals = db.session.query(db.func.count(db.func.distinct(Treatments.animal_id)))\
            .join(Animals, Animals.id == Treatments.animal_id)\
            .filter(
                Treatments.finca_id == self.finca_id,
                Treatments.treatment_date >= thirty_days_ago,
                Treatments.is_deleted == False,
                Animals.is_deleted == False
            ).scalar() or 0

        self.last_recalculation = datetime.now(UTC)
        db.session.commit()

    def update_counter(self, field, delta):
        """Actualiza un contador de forma atómica (O(1))."""
        if hasattr(self, field):
            current_val = getattr(self, field) or 0
            setattr(self, field, current_val + delta)
            self.last_recalculation = datetime.now(UTC)
            # Nota: El commit lo debe manejar quien llama para asegurar atomicidad en la transacción

    def handle_animal_event(self, event_type, animal_data=None, old_data=None):
        """
        Maneja eventos de animales de forma incremental.
        event_type: 'create', 'update', 'delete'
        """
        from app.models.animals import Sex, AnimalStatus

        # Asegurar que los datos no sean None para evitar AttributeError
        animal_data = animal_data or {}
        old_data = old_data or {}

        if event_type == 'create':
            self.total_animals += 1
            if animal_data.get('status') == AnimalStatus.Vivo: self.active_animals += 1
            if animal_data.get('sex') == Sex.Macho: self.male_count += 1
            if animal_data.get('sex') == Sex.Hembra: self.female_count += 1

        elif event_type == 'delete':
            self.total_animals -= 1
            if animal_data.get('status') == AnimalStatus.Vivo: self.active_animals -= 1
            if animal_data.get('sex') == Sex.Macho: self.male_count -= 1
            if animal_data.get('sex') == Sex.Hembra: self.female_count -= 1

        elif event_type == 'update':
            # Solo actualizar si el status o sexo cambió
            if animal_data.get('status') != old_data.get('status'):
                if old_data.get('status') == AnimalStatus.Vivo: self.active_animals -= 1
                if animal_data.get('status') == AnimalStatus.Vivo: self.active_animals += 1

                if animal_data.get('status') == AnimalStatus.Vendido: self.sold_animals += 1
                if old_data.get('status') == AnimalStatus.Vendido: self.sold_animals -= 1

                if animal_data.get('status') == AnimalStatus.Muerto: self.dead_animals += 1
                if old_data.get('status') == AnimalStatus.Muerto: self.dead_animals -= 1

            if animal_data.get('sex') != old_data.get('sex'):
                if old_data.get('sex') == Sex.Macho: self.male_count -= 1
                if animal_data.get('sex') == Sex.Macho: self.male_count += 1
                if old_data.get('sex') == Sex.Hembra: self.female_count -= 1
                if animal_data.get('sex') == Sex.Hembra: self.female_count += 1

        self.last_recalculation = datetime.now(UTC)

    _namespace_fields = [
        "finca_id", "total_animals", "active_animals", "male_count", "female_count", "sick_animals", "last_recalculation"
    ]

