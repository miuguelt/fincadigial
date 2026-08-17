import logging
from datetime import datetime, timedelta
from typing import Any

from app import db
from app.models.finca import Finca
from app.models.system_content import SystemContent
from app.models.weather import (
    WeatherRecord,
    WeatherAlert,
    WeatherCondition,
    WeatherAlertSeverity,
    WeatherAlertType,
)

logger = logging.getLogger(__name__)


def _get_weather_param(key: str) -> float | None:
    """Lee un parámetro de clima desde system_contents. Retorna None si no existe."""
    entry = SystemContent.get_by_key(f"param.weather.{key}")
    if entry:
        try:
            return float(entry.content)
        except (ValueError, TypeError):
            pass
    return None


def _get_weather_text(key: str) -> str | None:
    """Lee texto de recomendación desde system_contents."""
    entry = SystemContent.get_by_key(f"recommendation.weather.{key}")
    if entry:
        return entry.content
    return None


class WeatherDataService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    def decode_wmo_code(code: int) -> tuple[str, WeatherCondition]:
        if code == 0:
            return "Despejado", WeatherCondition.CLEAR
        elif code in [1, 2, 3]:
            return "Nublado", WeatherCondition.CLOUDY
        elif code in [45, 48]:
            return "Niebla", WeatherCondition.FOG
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
            return "Lluvia", WeatherCondition.RAIN
        elif code in [95, 96, 99]:
            return "Tormenta", WeatherCondition.STORM
        elif code in [71, 73, 75, 77, 85, 86]:
            return "Nieve", WeatherCondition.SNOW
        elif code in [56, 57, 66, 67]:
            return "Granizo", WeatherCondition.HAIL
        return "Nublado", WeatherCondition.CLOUDY

    @staticmethod
    def fetch_weather_data(lat: float, lon: float) -> dict[str, Any]:
        try:
            import requests

            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,dew_point_2m,visibility",
                "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,visibility,uv_index,soil_moisture_0_to_1cm,soil_temperature_0cm,et0_fao_evapotranspiration",
                "daily": "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,rain_sum,showers_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_mean,uv_index_max,sunrise,sunset,sunshine_duration,et0_fao_evapotranspiration,weather_code",
                "timezone": "auto",
                "forecast_days": 7,
            }

            response = requests.get(
                WeatherDataService.BASE_URL, params=params, timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching weather data from Open-Meteo: {e}")
            return None

    @staticmethod
    def serialize_forecast(data: dict[str, Any] | None) -> dict[str, Any]:
        """Reduce la respuesta de Open-Meteo a datos útiles para decisiones de campo."""
        if not data:
            return {"timezone": None, "daily": [], "hourly": []}

        daily = data.get("daily") or {}
        hourly = data.get("hourly") or {}

        def value(block: dict[str, Any], key: str, index: int) -> Any:
            values = block.get(key) or []
            return values[index] if index < len(values) else None

        daily_keys = {
            "date": "time",
            "temp_max": "temperature_2m_max",
            "temp_min": "temperature_2m_min",
            "apparent_temp_max": "apparent_temperature_max",
            "precipitation_mm": "precipitation_sum",
            "rain_mm": "rain_sum",
            "showers_mm": "showers_sum",
            "precipitation_probability_max": "precipitation_probability_max",
            "wind_max": "wind_speed_10m_max",
            "wind_gusts_max": "wind_gusts_10m_max",
            "humidity_avg": "relative_humidity_2m_mean",
            "uv_index": "uv_index_max",
            "sunshine_duration_seconds": "sunshine_duration",
            "et0_mm": "et0_fao_evapotranspiration",
            "sunrise": "sunrise",
            "sunset": "sunset",
            "weather_code": "weather_code",
        }
        daily_rows = []
        for index in range(len(daily.get("time") or [])):
            daily_rows.append(
                {
                    key: value(daily, source_key, index)
                    for key, source_key in daily_keys.items()
                }
            )

        hourly_keys = {
            "time": "time",
            "temperature": "temperature_2m",
            "feels_like": "apparent_temperature",
            "humidity": "relative_humidity_2m",
            "dew_point": "dew_point_2m",
            "precipitation_mm": "precipitation",
            "precipitation_probability": "precipitation_probability",
            "weather_code": "weather_code",
            "wind_speed": "wind_speed_10m",
            "wind_gusts": "wind_gusts_10m",
            "wind_direction": "wind_direction_10m",
            "cloud_cover": "cloud_cover",
            "visibility_m": "visibility",
            "uv_index": "uv_index",
            "soil_moisture": "soil_moisture_0_to_1cm",
            "soil_temperature": "soil_temperature_0cm",
            "et0_mm": "et0_fao_evapotranspiration",
        }
        hourly_rows = []
        for index in range(min(len(hourly.get("time") or []), 48)):
            hourly_rows.append(
                {
                    key: value(hourly, source_key, index)
                    for key, source_key in hourly_keys.items()
                }
            )

        return {
            "timezone": data.get("timezone"),
            "timezone_abbreviation": data.get("timezone_abbreviation"),
            "daily": daily_rows,
            "hourly": hourly_rows,
        }

    @staticmethod
    def save_weather_record(
        finca_id: int, lat: float, lon: float, data: dict[str, Any]
    ) -> WeatherRecord | None:
        try:
            current = data.get("current", {})
            daily = data.get("daily", {})

            # Open-Meteo returns "weather_code" for the current block; older
            # responses (and the hourly block) use "weathercode".
            weather_code = current.get("weather_code")
            if weather_code is None:
                weather_code = current.get("weathercode")
            if weather_code is None:
                logger.warning("Open-Meteo response sin weathercode")
                return None
            condition_str, condition_enum = WeatherDataService.decode_wmo_code(
                weather_code
            )

            sunrise_str = (
                daily.get("sunrise", [None])[0] if daily.get("sunrise") else None
            )
            sunset_str = daily.get("sunset", [None])[0] if daily.get("sunset") else None

            sunrise_time = None
            sunset_time = None
            if sunrise_str:
                try:
                    sunrise_time = datetime.fromisoformat(sunrise_str).time()
                except (ValueError, TypeError):
                    pass
            if sunset_str:
                try:
                    sunset_time = datetime.fromisoformat(sunset_str).time()
                except (ValueError, TypeError):
                    pass

            record = WeatherRecord(
                finca_id=finca_id,
                recorded_at=datetime.utcnow(),
                temperature_celsius=current.get("temperature_2m"),
                feels_like_celsius=current.get("apparent_temperature"),
                humidity_percent=current.get("relative_humidity_2m"),
                wind_speed_kmh=current.get("wind_speed_10m"),
                wind_direction_degrees=current.get("wind_direction_10m"),
                precipitation_mm=current.get("precipitation"),
                pressure_hpa=current.get("surface_pressure"),
                uv_index=daily.get("uv_index_max", [None])[0]
                if daily.get("uv_index_max")
                else None,
                cloud_cover_percent=current.get("cloud_cover"),
                weather_code=weather_code,
                weather_condition=condition_enum,
                sunrise_time=sunrise_time,
                sunset_time=sunset_time,
                latitude=lat,
                longitude=lon,
                source="open-meteo",
            )
            db.session.add(record)
            db.session.commit()
            return record
        except Exception as e:
            logger.error(f"Error saving weather record for finca {finca_id}: {e}")
            db.session.rollback()
            return None

    @staticmethod
    def generate_alerts(finca_id: int, record: WeatherRecord) -> list[WeatherAlert]:
        alerts = []
        temp = record.temperature_celsius
        humidity = record.humidity_percent
        wind = record.wind_speed_kmh
        precipitation = record.precipitation_mm
        condition = record.weather_condition

        heat_warn = _get_weather_param("heat_warn")
        heat_crit = _get_weather_param("heat_critical")
        heat_extreme = _get_weather_param("heat_extreme")

        if (
            heat_warn is not None
            and heat_crit is not None
            and heat_extreme is not None
            and temp is not None
            and temp > heat_warn
        ):
            severity = (
                WeatherAlertSeverity.CRITICAL
                if temp > heat_extreme
                else WeatherAlertSeverity.HIGH
                if temp > heat_crit
                else WeatherAlertSeverity.MEDIUM
            )
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title=f"Alerta de calor extremo: {temp:.1f}°C",
                    alert_type=WeatherAlertType.HEAT,
                    severity=severity,
                    description=f"Temperatura actual de {temp:.1f}°C. Riesgo de estrés térmico en el ganado.",
                    recommendation=_get_weather_text("heat")
                    or "Proporcione sombra adicional y agua fresca.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=6),
                    source="open-meteo-auto",
                )
            )

        cold_warn = _get_weather_param("cold_warn")
        cold_crit = _get_weather_param("cold_critical")
        cold_extreme = _get_weather_param("cold_extreme")

        if (
            cold_warn is not None
            and cold_crit is not None
            and cold_extreme is not None
            and temp is not None
            and temp < cold_warn
        ):
            severity = (
                WeatherAlertSeverity.CRITICAL
                if temp < cold_extreme
                else WeatherAlertSeverity.HIGH
                if temp < cold_crit
                else WeatherAlertSeverity.MEDIUM
            )
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title=f"Alerta de frío extremo: {temp:.1f}°C",
                    alert_type=WeatherAlertType.COLD,
                    severity=severity,
                    description=f"Temperatura actual de {temp:.1f}°C. Riesgo de hipotermia en terneros y animales jóvenes.",
                    recommendation=_get_weather_text("cold")
                    or "Proporcione refugio y alimento adicional.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=12),
                    source="open-meteo-auto",
                )
            )

        if condition == WeatherCondition.STORM:
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title="Alerta de tormenta eléctrica",
                    alert_type=WeatherAlertType.STORM,
                    severity=WeatherAlertSeverity.HIGH,
                    description="Tormenta eléctrica detectada en la zona.",
                    recommendation=_get_weather_text("storm")
                    or "Refugie al ganado en zonas seguras.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=4),
                    source="open-meteo-auto",
                )
            )

        rain_warn = _get_weather_param("rain_warn")
        rain_crit = _get_weather_param("rain_critical")

        if (
            rain_warn is not None
            and rain_crit is not None
            and condition == WeatherCondition.RAIN
            and precipitation is not None
            and precipitation > rain_warn
        ):
            severity = (
                WeatherAlertSeverity.HIGH
                if precipitation > rain_crit
                else WeatherAlertSeverity.MEDIUM
            )
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title=f"Lluvias intensas: {precipitation:.1f}mm",
                    alert_type=WeatherAlertType.RAIN,
                    severity=severity,
                    description=f"Precipitación actual de {precipitation:.1f}mm. Riesgo de encharcamiento y deslizamientos.",
                    recommendation=_get_weather_text("rain")
                    or "Vigile zonas de drenaje.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=8),
                    source="open-meteo-auto",
                )
            )

        wind_warn = _get_weather_param("wind_warn")
        wind_crit = _get_weather_param("wind_critical")
        wind_extreme = _get_weather_param("wind_extreme")

        if (
            wind_warn is not None
            and wind_crit is not None
            and wind_extreme is not None
            and wind is not None
            and wind > wind_warn
        ):
            severity = (
                WeatherAlertSeverity.CRITICAL
                if wind > wind_extreme
                else WeatherAlertSeverity.HIGH
                if wind > wind_crit
                else WeatherAlertSeverity.MEDIUM
            )
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title=f"Vientos fuertes: {wind:.1f} km/h",
                    alert_type=WeatherAlertType.WIND,
                    severity=severity,
                    description=f"Velocidad del viento de {wind:.1f} km/h. Riesgo de daños en infraestructura.",
                    recommendation=_get_weather_text("wind")
                    or "Asegure estructuras ligeras.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=6),
                    source="open-meteo-auto",
                )
            )

        if condition == WeatherCondition.HAIL:
            alerts.append(
                WeatherAlert(
                    finca_id=finca_id,
                    title="Alerta de granizo",
                    alert_type=WeatherAlertType.HAIL,
                    severity=WeatherAlertSeverity.HIGH,
                    description="Granizo detectado en la zona. Riesgo de daños a cultivos y animales.",
                    recommendation=_get_weather_text("hail")
                    or "Refugie al ganado inmediatamente.",
                    current_temperature=temp,
                    current_humidity=humidity,
                    current_wind_speed=wind,
                    valid_from=datetime.utcnow(),
                    valid_until=datetime.utcnow() + timedelta(hours=3),
                    source="open-meteo-auto",
                )
            )

        return alerts

    @staticmethod
    def update_finca_weather(finca_id: int) -> dict[str, Any]:
        finca = Finca.query.get(finca_id)
        if not finca or finca.latitude is None or finca.longitude is None:
            logger.warning(f"Finca {finca_id} no tiene coordenadas configuradas")
            return {"success": False, "error": "Finca sin coordenadas"}

        data = WeatherDataService.fetch_weather_data(finca.latitude, finca.longitude)
        if not data:
            return {"success": False, "error": "Error obteniendo datos climáticos"}

        record = WeatherDataService.save_weather_record(
            finca_id, finca.latitude, finca.longitude, data
        )
        if not record:
            return {"success": False, "error": "Error guardando registro climático"}

        new_alerts = WeatherDataService.generate_alerts(finca_id, record)
        for alert in new_alerts:
            db.session.add(alert)

        WeatherAlert.query.filter(
            WeatherAlert.finca_id == finca_id,
            WeatherAlert.is_active == True,
            WeatherAlert.valid_until < datetime.utcnow(),
        ).update({"is_active": False}, synchronize_session=False)

        db.session.commit()

        return {
            "success": True,
            "record_id": record.id,
            "alerts_generated": len(new_alerts),
            "alert_ids": [a.id for a in new_alerts],
            "forecast": WeatherDataService.serialize_forecast(data),
        }

    @staticmethod
    def update_all_fincas() -> dict[str, Any]:
        fincas = Finca.query.filter(
            Finca.is_active == True,
            Finca.latitude.isnot(None),
            Finca.longitude.isnot(None),
        ).all()

        results = {"total": len(fincas), "success": 0, "failed": 0, "details": []}

        for finca in fincas:
            result = WeatherDataService.update_finca_weather(finca.id)
            results["details"].append(
                {"finca_id": finca.id, "finca_name": finca.name, **result}
            )
            if result.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1

        logger.info(
            f"Weather update completed: {results['success']}/{results['total']} fincas updated"
        )
        return results

    @staticmethod
    def get_weather_history(finca_id: int, days: int = 7) -> list[dict[str, Any]]:
        start_date = datetime.utcnow() - timedelta(days=days)
        records = (
            WeatherRecord.query.filter(
                WeatherRecord.finca_id == finca_id,
                WeatherRecord.recorded_at >= start_date,
            )
            .order_by(WeatherRecord.recorded_at.asc())
            .all()
        )

        return [WeatherDataService.serialize_record(r) for r in records]

    @staticmethod
    def serialize_record(record: WeatherRecord) -> dict[str, Any]:
        """Serializa un registro completo: la UI muestra presión, UV, viento y orto/ocaso."""
        return {
            "id": record.id,
            "finca_id": record.finca_id,
            "recorded_at": record.recorded_at.isoformat()
            if record.recorded_at
            else None,
            "temperature_celsius": record.temperature_celsius,
            "feels_like_celsius": record.feels_like_celsius,
            "humidity_percent": record.humidity_percent,
            "wind_speed_kmh": record.wind_speed_kmh,
            "wind_direction_degrees": record.wind_direction_degrees,
            "precipitation_mm": record.precipitation_mm,
            "pressure_hpa": record.pressure_hpa,
            "uv_index": record.uv_index,
            "cloud_cover_percent": record.cloud_cover_percent,
            "weather_code": record.weather_code,
            "weather_condition": record.weather_condition.value
            if record.weather_condition
            else None,
            "sunrise_time": record.sunrise_time.isoformat()
            if record.sunrise_time
            else None,
            "sunset_time": record.sunset_time.isoformat()
            if record.sunset_time
            else None,
            "latitude": record.latitude,
            "longitude": record.longitude,
            "source": record.source,
        }

    @staticmethod
    def get_active_alerts(finca_id: int) -> list[dict[str, Any]]:
        alerts = (
            WeatherAlert.query.filter(
                WeatherAlert.finca_id == finca_id,
                WeatherAlert.is_active == True,
                WeatherAlert.is_dismissed == False,
            )
            .order_by(
                WeatherAlert.severity.desc(),
                WeatherAlert.valid_until.asc(),
            )
            .all()
        )

        return [
            {
                "id": a.id,
                "title": a.title,
                "alert_type": a.alert_type.value if a.alert_type else None,
                "severity": a.severity.value if a.severity else None,
                "description": a.description,
                "recommendation": a.recommendation,
                "current_temperature": a.current_temperature,
                "valid_from": a.valid_from.isoformat() if a.valid_from else None,
                "valid_until": a.valid_until.isoformat() if a.valid_until else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ]

    @staticmethod
    def dismiss_alert(alert_id: int, user_id: int) -> bool:
        alert = WeatherAlert.query.get(alert_id)
        if not alert:
            return False

        alert.is_dismissed = True
        alert.dismissed_by = user_id
        alert.dismissed_at = datetime.utcnow()
        db.session.commit()
        return True
