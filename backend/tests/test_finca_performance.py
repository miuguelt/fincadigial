from datetime import date, timedelta

from app import db
from app.models.animals import AnimalStatus, Animals, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.species import Species


def test_finca_performance_returns_kpis_for_authorized_user(client, app, auth_headers):
    with app.app_context():
        finca = Finca(
            name="Finca de rendimiento test",
            type=FarmType.Tradicional,
            is_active=True,
        )
        species = Species(name="Bovino rendimiento test")
        db.session.add_all([finca, species])
        db.session.flush()
        breed = Breeds(name="Raza rendimiento test", species_id=species.id)
        db.session.add(breed)
        db.session.flush()
        db.session.add(
            Animals(
                record="PERF-001",
                sex=Sex.Hembra,
                birth_date=date.today() - timedelta(days=700),
                weight=410,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id,
            )
        )
        db.session.commit()
        finca_id = finca.id

    response = client.get("/api/v1/fincas/performance", headers=auth_headers)

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()["data"]
    row = next(item for item in data if item["finca_id"] == finca_id)
    assert row["kpis"]["total_animals"] == 1
    assert row["kpis"]["total_animals_females"] == 1
    assert row["kpis"]["total_fields"] == 0
