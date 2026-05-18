import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class WeatherService:
    # URL de ejemplo (Open-Meteo no requiere API key para uso básico)
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    def get_forecast(lat: float, lon: float) -> Dict[str, Any]:
        """Obtiene el pronóstico del clima para las coordenadas de la finca."""
        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                "current_weather": "true",
                "hourly": "temperature_2m,relativehumidity_2m,precipitation_probability",
                "timezone": "auto"
            }
            # En entorno real llamaríamos a la API. Para el demo simulamos datos realistas de Santander.
            # response = requests.get(WeatherService.BASE_URL, params=params)
            # data = response.json()
            
            # Datos simulados para Santander (Vélez)
            mock_data = {
                "current": {
                    "temp": 18.5,
                    "condition": "Nublado",
                    "humidity": 75,
                    "wind": 12
                },
                "alerts": [],
                "recommendation": "Buen clima para el pastoreo. Sin alertas de lluvia fuerte en las próximas 6 horas."
            }
            
            # Lógica de alertas
            if mock_data["current"]["temp"] < 8:
                mock_data["alerts"].append({"type": "frost", "message": "Riesgo de Helada: Protege a los animales jóvenes."})
            if mock_data["current"]["humidity"] > 90:
                mock_data["alerts"].append({"type": "rain", "message": "Humedad alta: Riesgo de enfermedades respiratorias."})
                
            return mock_data
            
        except Exception as e:
            logger.error(f"Error obteniendo clima: {e}")
            return {"error": "Servicio de clima no disponible"}

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
