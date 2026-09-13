"""Pruebas unitarias para modelos de clima y reglas de conocimiento (weather_alerts, kb_reglas)."""

from datetime import date, datetime, timedelta, UTC
from uuid import uuid4
import pytest

from app.extensions import db
from app.models.finca import FarmType, Finca
from app.models.knowledge_base import (
    KBCategoria,
    KBOperador,
    KBRecomendacion,
    KBRegla,
    KBSexo,
    KBUrgencia,
)
from app.models.user import User
from app.models.weather import (
    WeatherAlert,
    WeatherAlertSeverity,
    WeatherAlertType,
    WeatherCondition,
    WeatherRecord,
)


@pytest.fixture
def base_weather_context(app, db_session):
    """Crea una finca y usuario para pruebas de alertas climáticas."""
    with app.app_context():
        import random
        n = random.randint(10000000, 99999999)
        finca = Finca.create(
            name=f"Hacienda El Clima {n}",
            type=FarmType.Tradicional,
            is_active=True,
            latitude=4.14,
            longitude=-73.6,
        )
        user = User.create(
            email=f"clima_user_{n}@villaluz.co",
            password="ClimaPassword123!",
            fullname="Operador Meteorológico",
            identification=str(n),
            phone=f"311{n}",
            role="Operario",
            finca_id=finca.id,
            status=True,
        )
        db_session.session.commit()
        return finca, user


class TestWeatherAlertModel:
    """Valida la tabla y ciclo de vida de weather_alerts."""

    def test_create_weather_alert_with_enums(self, base_weather_context):
        finca, _ = base_weather_context
        alert = WeatherAlert.create(
            finca_id=finca.id,
            title="Ola de calor extrema",
            alert_type=WeatherAlertType.HEAT,
            severity=WeatherAlertSeverity.HIGH,
            description="Temperatura supera los 36°C en horas del mediodía.",
            recommendation="Asegurar sombrío y agua fresca en todos los potreros.",
            current_temperature=36.5,
            current_humidity=45.0,
            valid_from=datetime.now(UTC),
            valid_until=datetime.now(UTC) + timedelta(days=2),
            is_active=True,
        )
        assert alert.id is not None
        assert alert.alert_type == WeatherAlertType.HEAT
        assert alert.severity == WeatherAlertSeverity.HIGH
        assert alert.is_active is True
        assert alert.is_dismissed is False

    def test_dismiss_weather_alert(self, base_weather_context):
        finca, user = base_weather_context
        alert = WeatherAlert.create(
            finca_id=finca.id,
            title="Alerta de helada en potreros altos",
            alert_type=WeatherAlertType.FROST,
            severity=WeatherAlertSeverity.CRITICAL,
            is_active=True,
            is_dismissed=False,
        )
        # Descarte de la alerta por parte del usuario
        alert.is_dismissed = True
        alert.dismissed_by = user.id
        alert.dismissed_at = datetime.now(UTC)
        db.session.commit()
        db.session.expire_all()

        updated = db.session.get(WeatherAlert, alert.id)
        assert updated.is_dismissed is True
        assert updated.dismissed_by == user.id
        assert updated.dismissed_user.id == user.id

    def test_weather_record_relation_and_conditions(self, base_weather_context):
        finca, _ = base_weather_context
        record = WeatherRecord.create(
            finca_id=finca.id,
            recorded_at=datetime.now(UTC),
            temperature_celsius=24.5,
            weather_condition=WeatherCondition.RAIN,
            precipitation_mm=12.4,
            humidity_percent=88.0,
            source="open-meteo-test",
        )
        assert record.id is not None
        assert record.weather_condition == WeatherCondition.RAIN
        assert record.precipitation_mm == 12.4
        assert record.finca.id == finca.id


class TestKBReglaModel:
    """Valida la tabla kb_reglas y su vinculación en cascada con kb_recomendaciones."""

    def test_create_recomendacion_with_reglas(self, app, db_session):
        with app.app_context():
            uid = uuid4().hex[:6]
            rec = KBRecomendacion(
                codigo=f"TEST-{uid}",
                categoria=KBCategoria.SANIDAD,
                titulo="Control de Endoparásitos en Época de Lluvias",
                descripcion="El incremento de humedad favorece la carga parasitaria.",
                accion="Pesar animales y aplicar desparasitante según dosis técnica.",
                cuando="Primeros 5 días del mes",
                profesional=True,
                urgencia=KBUrgencia.ALTA,
                sexo=KBSexo.AMBOS,
                edad_min_dias=90,
                fuente="FEDEGAN / ICA",
                activo=True,
            )
            db.session.add(rec)
            db.session.commit()

            # Crear reglas asociadas con operador y descripcion_corta
            regla1 = KBRegla(
                recomendacion_id=rec.id,
                campo_condicion="dias_desde_desparasitacion",
                operador=KBOperador.GT,
                valor="90",
                descripcion_corta="Más de 90 días desde la última purga",
            )
            regla2 = KBRegla(
                recomendacion_id=rec.id,
                campo_condicion="age_in_days",
                operador=KBOperador.BETWEEN,
                valor="90",
                valor_max="720",
                descripcion_corta="Animales entre 3 y 24 meses",
            )
            db.session.add_all([regla1, regla2])
            db.session.commit()

            assert len(rec.reglas) == 2
            assert regla1.operador == KBOperador.GT
            assert regla2.operador == KBOperador.BETWEEN
            assert regla2.valor_max == "720"
            assert "dias_desde_desparasitacion" in repr(regla1)

            # Validar eliminación en cascada
            rec_id = rec.id
            db.session.delete(rec)
            db.session.commit()

            remaining_rules = KBRegla.query.filter_by(recomendacion_id=rec_id).all()
            assert len(remaining_rules) == 0


class TestTreatmentRecommendationControlsModel:
    """Valida la tabla treatment_recommendation_controls."""

    def test_create_control_and_completion(self, app, db_session):
        with app.app_context():
            from app.models.treatment_recommendations import TreatmentRecommendations
            from app.models.treatment_recommendation_controls import (
                TreatmentRecommendationControls,
            )
            from app.models.animals import Animals, AnimalStatus, Sex
            from app.models.breeds import Breeds
            from app.models.species import Species
            from app.models.finca import Finca, FarmType

            finca = Finca.create(name="Finca Controles", type=FarmType.Tradicional, is_active=True)
            sp = Species.create(name="Bovino Controles")
            br = Breeds.create(name="Raza Controles", species_id=sp.id)
            an = Animals.create(
                record="CTRL-001",
                sex=Sex.Hembra,
                weight=300.0,
                birth_date=date.today(),
                breeds_id=br.id,
                finca_id=finca.id,
                status=AnimalStatus.Vivo,
            )
            rec = TreatmentRecommendations.create(
                animal_id=an.id,
                finca_id=finca.id,
                title="Plan de recuperación podal",
                recommendation="Revisar pezuñas cada 5 días",
                start_date=date.today(),
                duration_days=15,
                estimated_end_date=date.today() + timedelta(days=15),
                control_interval_days=5,
            )
            ctrl = TreatmentRecommendationControls.create(
                treatment_recommendation_id=rec.id,
                scheduled_date=date.today() + timedelta(days=5),
                observation="Seguimiento programado",
                completed=False,
            )
            assert ctrl.id is not None
            assert ctrl.completed is False
            assert ctrl.treatment_recommendation_id == rec.id
