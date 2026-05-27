from app import db
from app.models.base_model import BaseModel


class ActivityDailyAgg(BaseModel):
    """
    Agregados diarios de actividad para acelerar stats/summary/filters.

    Nota: usamos actor_id/animal_id como enteros no-nulos; 0 representa "sin actor/animal".
    """

    __tablename__ = "activity_daily_agg"
    __table_args__ = (
        db.UniqueConstraint(
            "date",
            "actor_id",
            "entity",
            "action",
            "severity",
            "animal_id",
            name="uq_activity_daily_agg_key",
        ),
        db.Index("ix_activity_daily_agg_date", "date"),
        db.Index("ix_activity_daily_agg_actor_date", "actor_id", "date"),
        db.Index("ix_activity_daily_agg_actor_date_entity", "actor_id", "date", "entity"),
        db.Index("ix_activity_daily_agg_finca_id", "finca_id"),
    )

    id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    date      = db.Column(db.Date, nullable=False)
    actor_id  = db.Column(db.Integer, nullable=False, default=0)
    entity    = db.Column(db.String(50), nullable=False)
    action    = db.Column(db.String(20), nullable=False)
    severity  = db.Column(db.String(20), nullable=False, default="info")
    animal_id = db.Column(db.Integer, nullable=False, default=0)
    count     = db.Column(db.Integer, nullable=False, default=0)
    finca_id  = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=True)

    _namespace_fields = [
        "id", "date", "actor_id", "entity", "action", "severity",
        "animal_id", "count", "finca_id", "created_at", "updated_at",
    ]
    _filterable_fields = ["date", "actor_id", "entity", "action", "severity", "animal_id", "finca_id"]

