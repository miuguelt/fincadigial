import enum
from datetime import datetime

from app import db
from app.models.base_model import BaseModel


class WeatherCondition(enum.Enum):
    CLEAR = "clear"
    CLOUDY = "cloudy"
    FOG = "fog"
    RAIN = "rain"
    STORM = "storm"
    SNOW = "snow"
    HAIL = "hail"
    WINDY = "windy"


class WeatherAlertSeverity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WeatherAlertType(enum.Enum):
    HEAT = "heat"
    COLD = "cold"
    RAIN = "rain"
    STORM = "storm"
    FROST = "frost"
    DROUGHT = "drought"
    WIND = "wind"
    HAIL = "hail"


class WeatherRecord(BaseModel):
    """Registro histórico de datos climáticos por finca."""

    __tablename__ = "weather_records"
    __table_args__ = (
        db.Index("ix_weather_records_finca_recorded_at", "finca_id", "recorded_at"),
        db.Index("ix_weather_records_recorded_at", "recorded_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )

    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    temperature_celsius = db.Column(db.Float, nullable=True)
    feels_like_celsius = db.Column(db.Float, nullable=True)
    humidity_percent = db.Column(db.Float, nullable=True)
    wind_speed_kmh = db.Column(db.Float, nullable=True)
    wind_direction_degrees = db.Column(db.Float, nullable=True)
    precipitation_mm = db.Column(db.Float, nullable=True)
    pressure_hpa = db.Column(db.Float, nullable=True)
    uv_index = db.Column(db.Float, nullable=True)
    cloud_cover_percent = db.Column(db.Float, nullable=True)
    weather_code = db.Column(db.Integer, nullable=True)
    weather_condition = db.Column(db.Enum(WeatherCondition), nullable=True)

    sunrise_time = db.Column(db.Time, nullable=True)
    sunset_time = db.Column(db.Time, nullable=True)

    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    source = db.Column(db.String(100), nullable=True, default="open-meteo")

    finca = db.relationship("Finca", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "recorded_at",
        "temperature_celsius",
        "feels_like_celsius",
        "humidity_percent",
        "wind_speed_kmh",
        "wind_direction_degrees",
        "precipitation_mm",
        "pressure_hpa",
        "uv_index",
        "cloud_cover_percent",
        "weather_code",
        "weather_condition",
        "sunrise_time",
        "sunset_time",
        "latitude",
        "longitude",
        "source",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {"finca": {"fields": ["id", "name"]}}
    _searchable_fields = ["source", "weather_condition"]
    _filterable_fields = ["finca_id", "recorded_at", "weather_condition"]
    _sortable_fields = ["id", "recorded_at", "temperature_celsius", "created_at"]
    _required_fields = ["finca_id", "recorded_at"]
    _enum_fields = {"weather_condition": WeatherCondition}


class WeatherAlert(BaseModel):
    """Alerta climática automática generada a partir de datos de Open-Meteo."""

    __tablename__ = "weather_alerts"
    __table_args__ = (
        db.Index("ix_weather_alerts_finca_severity", "finca_id", "severity"),
        db.Index("ix_weather_alerts_valid_until", "valid_until"),
        db.Index("ix_weather_alerts_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )

    title = db.Column(db.String(200), nullable=False)
    alert_type = db.Column(db.Enum(WeatherAlertType), nullable=False)
    severity = db.Column(
        db.Enum(WeatherAlertSeverity),
        nullable=False,
        default=WeatherAlertSeverity.MEDIUM,
    )

    description = db.Column(db.Text, nullable=True)
    recommendation = db.Column(db.Text, nullable=True)

    current_temperature = db.Column(db.Float, nullable=True)
    current_humidity = db.Column(db.Float, nullable=True)
    current_wind_speed = db.Column(db.Float, nullable=True)

    valid_from = db.Column(db.DateTime, nullable=True, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime, nullable=True)

    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_dismissed = db.Column(db.Boolean, nullable=False, default=False)
    dismissed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    source = db.Column(db.String(100), nullable=True, default="open-meteo-auto")

    finca = db.relationship("Finca", lazy="selectin")
    dismissed_user = db.relationship(
        "User", foreign_keys=[dismissed_by], lazy="selectin"
    )

    _namespace_fields = [
        "id",
        "finca_id",
        "title",
        "alert_type",
        "severity",
        "description",
        "recommendation",
        "current_temperature",
        "current_humidity",
        "current_wind_speed",
        "valid_from",
        "valid_until",
        "is_active",
        "is_dismissed",
        "dismissed_by",
        "dismissed_at",
        "source",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "finca": {"fields": ["id", "name"]},
        "dismissed_user": {"fields": ["id", "fullname"]},
    }
    _searchable_fields = ["title", "description", "recommendation", "alert_type"]
    _filterable_fields = [
        "finca_id",
        "alert_type",
        "severity",
        "is_active",
        "is_dismissed",
    ]
    _sortable_fields = ["id", "severity", "valid_until", "created_at"]
    _required_fields = ["finca_id", "title", "alert_type"]
    _enum_fields = {"alert_type": WeatherAlertType, "severity": WeatherAlertSeverity}
