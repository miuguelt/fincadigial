from app import db
from datetime import date
from app.models.base_model import BaseModel, ValidationError


class BodyConditionScore(BaseModel):
    """Registro periódico de Condición Corporal (BCS) por animal.

    Escala 1-9 (estándar internacional para bovinos):
    1-2: Emaciado (alerta crítica)
    3-4: Delgado (alerta)
    5: Ideal
    6-7: Gordo
    8-9: Obeso (alerta)
    """

    __tablename__ = "body_condition_scores"
    __table_args__ = (
        db.Index("ix_bcs_animal_date", "animal_id", "score_date"),
        db.Index("ix_bcs_finca_date", "finca_id", "score_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    score_date = db.Column(db.Date, nullable=False, default=date.today)
    score = db.Column(db.Float, nullable=False)  # 1.0-9.0, permite medios puntos
    evaluator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    # Relaciones
    animal = db.relationship(
        "Animals", backref="body_condition_scores", lazy="selectin"
    )
    finca = db.relationship("Finca", backref="bcs_records", lazy="selectin")
    evaluator = db.relationship("User", backref="bcs_evaluated", lazy="selectin")

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_id",
        "score_date",
        "score",
        "evaluator_id",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "evaluator": {"fields": ["id", "name", "email"], "depth": 1},
    }
    _filterable_fields = ["animal_id", "finca_id", "score_date", "evaluator_id"]
    _sortable_fields = ["id", "score_date", "score", "created_at"]
    _required_fields = ["animal_id", "finca_id", "score_date", "score"]

    @property
    def category(self):
        """Categoría descriptiva del BCS."""
        if self.score <= 2:
            return "Emaciado"
        elif self.score <= 4:
            return "Delgado"
        elif self.score <= 5:
            return "Ideal"
        elif self.score <= 7:
            return "Gordo"
        else:
            return "Obeso"

    @property
    def is_alert_worthy(self):
        """Determina si el BCS merece una alerta."""
        return self.score <= 3 or self.score >= 8

    @classmethod
    def get_latest(cls, animal_id):
        """Obtiene el último BCS registrado para un animal."""
        return (
            cls.query.filter_by(animal_id=animal_id)
            .order_by(cls.score_date.desc())
            .first()
        )

    @classmethod
    def get_trend(cls, animal_id, days=90):
        """Obtiene la tendencia de BCS en los últimos N días."""
        from datetime import timedelta

        cutoff = date.today() - timedelta(days=days)
        return (
            cls.query.filter(cls.animal_id == animal_id, cls.score_date >= cutoff)
            .order_by(cls.score_date)
            .all()
        )

    @classmethod
    def get_herd_average(cls, finca_id, days=30):
        """Calcula el BCS promedio del ganado en los últimos N días."""
        from datetime import timedelta
        from sqlalchemy import func

        cutoff = date.today() - timedelta(days=days)
        result = (
            db.session.query(func.avg(cls.score))
            .filter(cls.finca_id == finca_id, cls.score_date >= cutoff)
            .scalar()
        )
        return round(result, 2) if result else None

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = super()._validate_and_normalize(data, is_update, instance_id)
        if "score" in data:
            score = data["score"]
            if not isinstance(score, (int, float)) or score < 1 or score > 9:
                raise ValidationError("El BCS debe estar entre 1.0 y 9.0")
        if "score_date" in data and data["score_date"]:
            sc_date = data["score_date"]
            if isinstance(sc_date, str):
                try:
                    sc_date = date.fromisoformat(sc_date)
                except (ValueError, TypeError):
                    pass
            if isinstance(sc_date, date) and sc_date > date.today():
                raise ValidationError("La fecha de evaluación no puede ser futura")
        return data

    def __repr__(self):
        return f"<BCS animal={self.animal_id} score={self.score} ({self.category}) on {self.score_date}>"
