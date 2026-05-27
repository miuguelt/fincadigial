import logging
from typing import Any

logger = logging.getLogger(__name__)

class WeatherService:
    # URL de ejemplo (Open-Meteo no requiere API key para uso básico)
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    def get_forecast(lat: float, lon: float) -> dict[str, Any]:
        """Obtiene el pronóstico del clima para las coordenadas de la finca consultando Open-Meteo."""
        def decode_wmo_code(code: int) -> str:
            if code == 0:
                return "Despejado"
            elif code in [1, 2, 3]:
                return "Nublado"
            elif code in [45, 48]:
                return "Niebla"
            elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
                return "Lluvia"
            elif code in [95, 96, 99]:
                return "Tormenta"
            return "Nublado"

        try:
            import requests
            params = {
                "latitude": lat,
                "longitude": lon,
                "current_weather": "true",
                "timezone": "auto"
            }
            
            response = requests.get(WeatherService.BASE_URL, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()

            current = data.get("current_weather")
            if not current:
                logger.warning("Open-Meteo response sin current_weather")
                return None

            temp = current.get("temperature")
            wind = current.get("windspeed")
            code = current.get("weathercode")
            if temp is None or wind is None or code is None:
                logger.warning("Open-Meteo response incompleta: temp=%s, wind=%s, code=%s", temp, wind, code)
                return None

            condition = decode_wmo_code(code)
            alerts = []
            if temp < 10:
                alerts.append({"type": "cold", "message": "Temperatura baja: Riesgo de hipotermia en terneros jóvenes."})
            elif temp > 32:
                alerts.append({"type": "heat", "message": "Calor extremo: Provea suficiente agua y sombra."})
            if condition in ("Lluvia", "Tormenta"):
                alerts.append({"type": condition.lower(), "message": f"Condiciones de {condition} activas."})

            return {
                "current": {
                    "temp": temp,
                    "condition": condition,
                    "wind": wind
                },
                "alerts": alerts,
            }

        except Exception as e:
            logger.error(f"Error obteniendo clima de Open-Meteo: {e}")
            return None

    @staticmethod
    def check_for_extreme_weather(lat: float, lon: float, finca_id: int):
        """Verifica clima extremo y envía notificaciones push si es necesario."""
        forecast = WeatherService.get_forecast(lat, lon)
        if forecast.get("alerts"):
            from app.services.push_notification_service import PushNotificationService
            for alert in forecast["alerts"]:
                PushNotificationService.send_to_finca(
                    finca_id=finca_id,
                    title=f"⚠️ Alerta Climática: {alert['type'].capitalize()}",
                    body=alert['message'],
                    tag=f"weather-alert-{finca_id}",
                    data={"url": "/dashboard/peasant", "type": "weather_alert"}
                )
