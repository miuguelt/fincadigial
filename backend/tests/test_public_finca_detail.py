from datetime import date, timedelta

from app import db
from app.models.animals import AnimalStatus, Animals, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.species import Species
from app.models.system_content import SystemContent


def _create_finca_with_breed() -> tuple[Finca, Breeds]:
    finca = Finca(
        name="Finca pública de prueba",
        type=FarmType.Tradicional,
        is_active=True,
    )
    species = Species(name="Bovino público")
    db.session.add_all([finca, species])
    db.session.flush()
    breed = Breeds(name="Raza pública", species_id=species.id)
    db.session.add(breed)
    db.session.flush()
    return finca, breed


def _create_animal(
    finca_id: int,
    breed_id: int,
    record: str,
    sex: Sex,
    status: AnimalStatus = AnimalStatus.Vivo,
) -> Animals:
    animal = Animals(
        record=record,
        sex=sex,
        birth_date=date.today() - timedelta(days=900),
        weight=420,
        status=status,
        finca_id=finca_id,
        breeds_id=breed_id,
    )
    db.session.add(animal)
    return animal


def test_public_detail_calculates_live_livestock_stats(client, app):
    with app.app_context():
        finca, breed = _create_finca_with_breed()
        _create_animal(finca.id, breed.id, "PUB-F-001", Sex.Hembra)
        _create_animal(finca.id, breed.id, "PUB-M-001", Sex.Macho)
        _create_animal(
            finca.id,
            breed.id,
            "PUB-S-001",
            Sex.Macho,
            AnimalStatus.Vendido,
        )
        db.session.add(
            SystemContent(
                key="finca.public_visibility",
                content="full",
                finca_id=finca.id,
            )
        )
        db.session.commit()
        finca_id = finca.id

    response = client.get(f"/api/v1/fincas/public/{finca_id}")

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()["data"]
    assert data["animals_count"] == 2
    assert data["livestock_summary"] == {
        "total_animals": 2,
        "active_animals": 2,
        "male_count": 1,
        "female_count": 1,
        "sick_animals": 0,
    }


def test_public_detail_hides_stats_when_visibility_is_minimal(client, app):
    with app.app_context():
        finca, breed = _create_finca_with_breed()
        _create_animal(finca.id, breed.id, "PUB-HIDDEN-001", Sex.Hembra)
        db.session.commit()
        finca_id = finca.id

    response = client.get(f"/api/v1/fincas/public/{finca_id}")

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()["data"]
    assert "animals_count" not in data
    assert "livestock_summary" not in data
