from datetime import date, timedelta

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    ReproductiveEvent,
)
from app.models.species import Species


def _animal(record: str, finca_id: int, breed_id: int) -> Animals:
    animal = Animals(
        record=record,
        sex=Sex.Hembra,
        birth_date=date.today() - timedelta(days=900),
        weight=420,
        status=AnimalStatus.Vivo,
        finca_id=finca_id,
        breeds_id=breed_id,
    )
    db.session.add(animal)
    db.session.flush()
    return animal


def _sire(record: str, finca_id: int, breed_id: int) -> Animals:
    animal = _animal(record, finca_id, breed_id)
    animal.sex = Sex.Macho
    return animal


def _event(animal: Animals, event_type: EventType, days_ago: int, **kwargs) -> None:
    db.session.add(ReproductiveEvent(
        animal_id=animal.id,
        finca_id=animal.finca_id,
        event_type=event_type,
        event_date=date.today() - timedelta(days=days_ago),
        **kwargs,
    ))


def test_fertility_dashboard_uses_database_and_isolates_finca(
    app, client, token_for
):
    headers = token_for("Administrador", finca_type="Tradicional")
    with app.app_context():
        own_finca = Finca.query.one()
        other_finca = Finca(
            name="Finca externa fertilidad",
            type=FarmType.Tradicional,
            is_active=True,
        )
        species = Species(name="Bovino fertilidad")
        db.session.add_all([other_finca, species])
        db.session.flush()
        breed = Breeds(name="Raza fertilidad", species_id=species.id)
        db.session.add(breed)
        db.session.flush()

        own_animal = _animal("FERT-PROPIA", own_finca.id, breed.id)
        other_animal = _animal("FERT-EXTERNA", other_finca.id, breed.id)
        _event(
            own_animal,
            EventType.Inseminacion,
            20,
            technique=InseminationTechnique.Natural,
        )
        _event(
            own_animal,
            EventType.Diagnostico,
            10,
            diagnosis_result=DiagnosisResult.Positivo,
        )
        _event(
            own_animal,
            EventType.Parto,
            5,
            alive_count=1,
            dead_count=1,
        )
        _event(
            other_animal,
            EventType.Inseminacion,
            20,
            technique=InseminationTechnique.Artificial,
        )
        db.session.commit()

    response = client.get(
        "/api/v1/reproduction/fertility-dashboard?months=6",
        headers=headers,
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()["data"]
    assert data["total_inseminations"] == 1
    assert data["conception_rate_pct"] == 100.0
    assert data["conception_by_technique"] == {
        "natural": 100.0,
        "artificial": 0.0,
    }
    assert data["perinatal_mortality_rate_pct"] == 50.0
    assert data["top_females"][0]["record"] == "FERT-PROPIA"
    assert "FERT-EXTERNA" not in str(data)


def test_sire_performance_only_returns_activity_from_current_finca(
    app, client, token_for
):
    headers = token_for("Administrador", finca_type="Tradicional")
    with app.app_context():
        own_finca = Finca.query.one()
        other_finca = Finca(
            name="Finca externa toros",
            type=FarmType.Tradicional,
            is_active=True,
        )
        species = Species(name="Bovino toros")
        db.session.add_all([other_finca, species])
        db.session.flush()
        breed = Breeds(name="Raza toros", species_id=species.id)
        db.session.add(breed)
        db.session.flush()
        own_female = _animal("HEMBRA-TORO", own_finca.id, breed.id)
        own_sire = _sire("TORO-PROPIO", own_finca.id, breed.id)
        other_sire = _sire("TORO-EXTERNO", other_finca.id, breed.id)
        _event(
            own_female,
            EventType.Inseminacion,
            20,
            technique=InseminationTechnique.Natural,
            sire_id=own_sire.id,
        )
        _event(
            own_female,
            EventType.Diagnostico,
            10,
            diagnosis_result=DiagnosisResult.Positivo,
        )
        other_female = _animal("HEMBRA-EXTERNA", other_finca.id, breed.id)
        _event(
            other_female,
            EventType.Inseminacion,
            20,
            sire_id=other_sire.id,
        )
        db.session.commit()

    response = client.get(
        "/api/v1/reproduction/sire-performance?months=12",
        headers=headers,
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    sires = response.get_json()["data"]["sires"]
    assert len(sires) == 1
    assert sires[0]["record"] == "TORO-PROPIO"
    assert sires[0]["conception_rate_pct"] == 100.0
    assert "TORO-EXTERNO" not in str(sires)
