"""Regresiones de consistencia para el listado de controles."""

from datetime import date

from app import db
from app.models import Animals, Breeds, Finca, FarmType, Species
from app.models.animals import Sex
from app.models.animal_health_history import AnimalHealthHistory
from app.models.control import Control


BASE = "/api/v1"
ADMIN = "Administrador"


def test_control_create_is_persisted_and_visible_after_cache_bust(client, token_for, app):
    headers = token_for(ADMIN)
    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        species = Species.create(name="Bovino persistencia")
        breed = Breeds.create(name="Raza persistencia", species_id=species.id)
        animal = Animals.create(
            sex=Sex.Hembra,
            birth_date=date(2022, 1, 1),
            weight=280,
            record="PERSIST-001",
            breeds_id=breed.id,
            finca_id=finca.id,
        )
        animal_id, finca_id = animal.id, finca.id

    list_url = f"{BASE}/control?page=1&limit=50"

    # Calentar la caché antes de escribir: reproduce la carrera de la pantalla.
    warm = client.get(list_url, headers=headers)
    assert warm.status_code == 200

    created = client.post(
        f"{BASE}/control",
        json={
            "animal_id": animal_id,
            "finca_id": finca_id,
            "checkup_date": "2024-08-15",
            "health_status": "Bueno",
            "weight": 301.5,
            "description": "Persistencia de prueba",
        },
        headers=headers,
    )
    assert created.status_code == 201, created.get_data(as_text=True)
    control_id = created.get_json()["data"]["id"]

    # La transacción debe haber terminado antes de devolver 201, no sólo haber
    # actualizado un estado en memoria del proceso web.
    with app.app_context():
        persisted = Control.query.get(control_id)
        assert persisted is not None
        assert persisted.description == "Persistencia de prueba"

    refreshed = client.get(
        f"{list_url}&cache_bust=1725667890123", headers=headers
    )
    assert refreshed.status_code == 200
    rows = refreshed.get_json().get("data", [])
    assert any(row.get("id") == control_id for row in rows)

    updated = client.patch(
        f"{BASE}/control/{control_id}",
        json={"description": "Persistencia actualizada", "weight": 302.0},
        headers=headers,
    )
    assert updated.status_code == 200, updated.get_data(as_text=True)
    with app.app_context():
        persisted = Control.query.get(control_id)
        assert persisted.description == "Persistencia actualizada"
        assert persisted.weight == 302.0

    after_update = client.get(
        f"{list_url}&cache_bust=1725667890999", headers=headers
    )
    updated_row = next(
        row for row in after_update.get_json().get("data", []) if row.get("id") == control_id
    )
    assert updated_row["description"] == "Persistencia actualizada"

    deleted = client.delete(f"{BASE}/control/{control_id}", headers=headers)
    assert deleted.status_code == 200, deleted.get_data(as_text=True)
    with app.app_context():
        persisted = Control.query.get(control_id)
        assert persisted.is_deleted is True

    after_delete = client.get(
        f"{list_url}&cache_bust=1725667890998", headers=headers
    )
    assert all(row.get("id") != control_id for row in after_delete.get_json().get("data", []))


def test_control_bulk_keeps_related_weight_and_health_history(client, token_for, app):
    headers = token_for(ADMIN)
    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        species = Species.create(name="Bovino bulk persistencia")
        breed = Breeds.create(name="Raza bulk persistencia", species_id=species.id)
        animal = Animals.create(
            sex=Sex.Hembra,
            birth_date=date(2022, 1, 1),
            weight=280,
            record="PERSIST-BULK-001",
            breeds_id=breed.id,
            finca_id=finca.id,
        )
        animal_id, finca_id = animal.id, finca.id

    created = client.post(
        f"{BASE}/control/bulk",
        json=[
            {
                "animal_id": animal_id,
                "finca_id": finca_id,
                "checkup_date": date.today().isoformat(),
                "health_status": "Bueno",
                "weight": 320.0,
                "description": "Control masivo persistido",
            }
        ],
        headers=headers,
    )
    assert created.status_code == 201, created.get_data(as_text=True)
    control_id = created.get_json()["data"][0]["id"]

    with app.app_context():
        persisted_animal = Animals.query.get(animal_id)
        assert persisted_animal.weight == 320.0
        history = AnimalHealthHistory.query.filter_by(
            reference_kind="control", reference_id=control_id
        ).one()
        assert history.description == "Control masivo persistido"

    updated = client.put(
        f"{BASE}/control/bulk",
        json=[
            {
                "id": control_id,
                "weight": 325.0,
                "description": "Control masivo actualizado",
            }
        ],
        headers=headers,
    )
    assert updated.status_code == 200, updated.get_data(as_text=True)

    with app.app_context():
        persisted_animal = Animals.query.get(animal_id)
        assert persisted_animal.weight == 325.0
        history = AnimalHealthHistory.query.filter_by(
            reference_kind="control", reference_id=control_id
        ).one()
        assert history.weight == 325.0
        assert history.description == "Control masivo actualizado"

    deleted = client.delete(
        f"{BASE}/control/bulk",
        json={"ids": [control_id]},
        headers=headers,
    )
    assert deleted.status_code == 200, deleted.get_data(as_text=True)

    with app.app_context():
        assert not AnimalHealthHistory.query.filter_by(
            reference_kind="control", reference_id=control_id
        ).first()
