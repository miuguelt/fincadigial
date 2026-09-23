"""Pruebas unitarias e integradas para análisis de fertilidad y desempeño de reproductores."""

from datetime import date, timedelta
import pytest
from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    Offspring,
    ReproductiveEvent,
)
from app.models.species import Species
from app.services.fertility_analytics_service import FertilityAnalyticsService
from app.services.sire_performance_service import SirePerformanceService, _grade

BASE = "/api/v1"
ADMIN = "Administrador"
TODAY = date.today()


def _d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


@pytest.fixture()
def herd_setup(app, db_session):
    """Finca con varias hembras y toros para probar métricas de fertilidad y sires."""
    with app.app_context():
        finca = Finca.query.first()
        if finca is None:
            finca = Finca(name="Finca Fertilidad Test", type=FarmType.Tradicional, is_active=True)
            db.session.add(finca)
            db.session.flush()

        species = Species(name="Bovino Fertilidad Test")
        db.session.add(species)
        db.session.flush()

        breed = Breeds(name="Raza Fertilidad Test", species_id=species.id)
        db.session.add(breed)
        db.session.flush()

        def _mk_animal(record, sex, weight=450):
            animal = Animals(
                record=record,
                sex=sex,
                birth_date=_d(1800),
                weight=weight,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id,
            )
            db.session.add(animal)
            db.session.flush()
            return animal

        cow1 = _mk_animal("COW-FERT-1", Sex.Hembra)
        cow2 = _mk_animal("COW-FERT-2", Sex.Hembra)
        sire_a = _mk_animal("BULL-ELITE-A", Sex.Macho, weight=750)
        sire_d = _mk_animal("BULL-POOR-D", Sex.Macho, weight=680)

        db.session.commit()
        yield {
            "finca": finca,
            "cow1": cow1,
            "cow2": cow2,
            "sire_a": sire_a,
            "sire_d": sire_d,
        }


class TestSireGradeLogic:
    """Valida los umbrales de calificación de reproductores (_grade)."""

    def test_grade_a(self):
        # ≥70% preñez y ≥5 servicios
        assert _grade(70.0, 5) == "A"
        assert _grade(85.0, 10) == "A"

    def test_grade_b(self):
        # ≥60% preñez y ≥3 servicios (pero <5 servicios si es ≥70%, o 60-69% con ≥3)
        assert _grade(65.0, 4) == "B"
        assert _grade(75.0, 3) == "B"

    def test_grade_c(self):
        # ≥50% preñez y ≥2 servicios
        assert _grade(50.0, 2) == "C"
        assert _grade(58.0, 5) == "C"

    def test_grade_d(self):
        # <50% preñez o menos de 2 servicios
        assert _grade(40.0, 10) == "D"
        assert _grade(100.0, 1) == "D"
        assert _grade(0.0, 0) == "D"


class TestFertilityDashboardEndpoints:
    """Verifica endpoints HTTP de fertilidad y desempeño de toros."""

    def test_fertility_dashboard_auth_required(self, client):
        resp = client.get(f"{BASE}/reproduction/fertility-dashboard")
        assert resp.status_code in (401, 422)

    def test_sire_performance_auth_required(self, client):
        resp = client.get(f"{BASE}/reproduction/sire-performance")
        assert resp.status_code in (401, 422)

    def test_fertility_dashboard_acota_meses(self, client, token_for):
        resp = client.get(
            f"{BASE}/reproduction/fertility-dashboard?months=999",
            headers=token_for(ADMIN),
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        # El servicio acota entre 1 y 24 meses
        assert body["data"]["period_months"] == 24

    def test_sire_performance_acota_meses(self, client, token_for):
        resp = client.get(
            f"{BASE}/reproduction/sire-performance?months=0",
            headers=token_for(ADMIN),
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["data"]["period_months"] == 1


class TestFertilityAnalyticsCalculation:
    """Verifica lógica de cálculo de tasas, técnicas y crías."""

    def test_empty_finca_fertility(self, app):
        with app.app_context():
            finca = Finca(name="Finca Sin Eventos", type=FarmType.Tradicional, is_active=True)
            db.session.add(finca)
            db.session.commit()
            result = FertilityAnalyticsService.get_dashboard(finca.id, months=12)
            assert result["total_inseminations"] == 0
            assert result["conception_rate_pct"] == 0.0
            assert result["conception_by_technique"]["natural"] == 0.0
            assert result["conception_by_technique"]["artificial"] == 0.0
            assert result["perinatal_mortality_rate_pct"] == 0.0
            assert result["top_females"] == []
            assert result["bottom_females"] == []

    def test_technique_breakdown_and_mortality(self, app, herd_setup):
        with app.app_context():
            finca_id = herd_setup["finca"].id
            cow1_id = herd_setup["cow1"].id
            cow2_id = herd_setup["cow2"].id

            # Vaca 1: Servicio Natural + Diagnóstico Positivo -> 100% natural
            ev1 = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow1_id,
                event_type=EventType.Inseminacion,
                technique=InseminationTechnique.Natural,
                event_date=_d(60),
            )
            ev2 = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow1_id,
                event_type=EventType.Diagnostico,
                diagnosis_result=DiagnosisResult.Positivo,
                event_date=_d(30),
            )

            # Vaca 2: Servicio Artificial + Parto con 1 viva y 1 muerta -> 50% mortalidad
            ev3 = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow2_id,
                event_type=EventType.Inseminacion,
                technique=InseminationTechnique.Artificial,
                event_date=_d(70),
            )
            ev4 = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow2_id,
                event_type=EventType.Parto,
                alive_count=1,
                dead_count=1,
                event_date=_d(5),
            )
            db.session.add_all([ev1, ev2, ev3, ev4])
            db.session.commit()

            data = FertilityAnalyticsService.get_dashboard(finca_id, months=6)
            assert data["total_inseminations"] == 2
            assert data["conception_by_technique"]["natural"] == 100.0
            assert data["conception_by_technique"]["artificial"] == 0.0
            assert data["perinatal_mortality_rate_pct"] == 50.0


class TestSirePerformanceCalculation:
    """Verifica el cálculo de desempeño, crías y peso promedio para toros."""

    def test_sire_performance_with_inferred_sire_and_weights(self, app, herd_setup):
        with app.app_context():
            finca_id = herd_setup["finca"].id
            cow1_id = herd_setup["cow1"].id
            sire_a_id = herd_setup["sire_a"].id

            # Servicio con sire_a
            insem = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow1_id,
                sire_id=sire_a_id,
                event_type=EventType.Inseminacion,
                event_date=_d(300),
            )
            # Diagnóstico positivo
            diag = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow1_id,
                event_type=EventType.Diagnostico,
                diagnosis_result=DiagnosisResult.Positivo,
                event_date=_d(260),
            )
            # Parto sin sire_id explícito (se infiere del servicio previo)
            calving = ReproductiveEvent(
                finca_id=finca_id,
                animal_id=cow1_id,
                event_type=EventType.Parto,
                alive_count=1,
                dead_count=0,
                event_date=_d(10),
            )
            db.session.add_all([insem, diag, calving])
            db.session.flush()

            # Cría con peso al nacer
            offspring = Offspring(
                finca_id=finca_id,
                birth_event_id=calving.id,
                birth_weight=36,
            )
            db.session.add(offspring)
            db.session.commit()

            result = SirePerformanceService.get_performance(finca_id, months=12)
            sires = {s["sire_id"]: s for s in result["sires"]}

            assert sire_a_id in sires
            sire_data = sires[sire_a_id]
            assert sire_data["inseminations"] == 1
            assert sire_data["positive_diagnoses"] == 1
            assert sire_data["conception_rate_pct"] == 100.0
            assert sire_data["total_offspring"] == 1
            assert sire_data["avg_birth_weight_kg"] == 36.0
            # 1 solo servicio -> aunque sea 100%, es Clase D porque se requieren ≥2 para C y ≥5 para A
            assert sire_data["grade"] == "D"
