from app.services.weather_data_service import WeatherDataService
from app.models.weather import WeatherCondition
from app.models.finca import Finca, FarmType


def test_weather_data_service_decodes_wmo():
    desc, cond = WeatherDataService.decode_wmo_code(0)
    assert cond == WeatherCondition.CLEAR
    assert desc == "Despejado"

    desc, cond = WeatherDataService.decode_wmo_code(61)
    assert cond == WeatherCondition.RAIN
    assert desc == "Lluvia"


def test_save_weather_record_supports_weather_code_with_underscore(app, db_session):
    data = {
        "current": {
            "weather_code": 61,
            "temperature_2m": 22.5,
            "relative_humidity_2m": 80.0,
            "apparent_temperature": 23.0,
            "wind_speed_10m": 12.0,
            "wind_direction_10m": 180.0,
            "precipitation": 1.5,
            "surface_pressure": 1012.0,
        },
        "daily": {
            "sunrise": ["2026-06-14T06:00:00"],
            "sunset": ["2026-06-14T18:00:00"],
            "uv_index_max": [4.5],
        },
    }

    with app.app_context():
        finca = Finca.create(
            name="Finca Test Weather",
            type=FarmType.Tradicional,
            is_active=True,
            latitude=4.14,
            longitude=-73.6,
        )
        db_session.session.commit()

        record = WeatherDataService.save_weather_record(finca.id, 4.14, -73.6, data)
        assert record is not None
        assert record.weather_code == 61
        assert record.weather_condition == WeatherCondition.RAIN
        assert record.precipitation_mm == 1.5


def test_save_weather_record_supports_weathercode_legacy(app, db_session):
    data = {
        "current": {
            "weathercode": 0,
            "temperature_2m": 25.0,
            "relative_humidity_2m": 60.0,
            "apparent_temperature": 26.0,
            "wind_speed_10m": 8.0,
            "wind_direction_10m": 90.0,
            "precipitation": 0.0,
            "surface_pressure": 1015.0,
        },
        "daily": {
            "sunrise": ["2026-06-14T06:00:00"],
            "sunset": ["2026-06-14T18:00:00"],
            "uv_index_max": [5.0],
        },
    }

    with app.app_context():
        finca = Finca.create(
            name="Finca Test Weather 2",
            type=FarmType.Tradicional,
            is_active=True,
            latitude=4.14,
            longitude=-73.6,
        )
        db_session.session.commit()

        record = WeatherDataService.save_weather_record(finca.id, 4.14, -73.6, data)
        assert record is not None
        assert record.weather_code == 0
        assert record.weather_condition == WeatherCondition.CLEAR
        assert record.precipitation_mm == 0.0


def test_update_finca_weather_without_coordinates(app, db_session):
    with app.app_context():
        finca = Finca.create(
            name="Finca No Coords",
            type=FarmType.Tradicional,
            is_active=True,
            latitude=None,
            longitude=None,
        )
        db_session.session.commit()

        res = WeatherDataService.update_finca_weather(finca.id)
        assert res["success"] is False
        assert res["error"] == "Finca sin coordenadas"
