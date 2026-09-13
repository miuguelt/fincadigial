"""Opciones de caso clínico para el selector de tratamientos.

Verifica que el endpoint ``GET /animal-diseases/case-options`` etiquete
cada episodio con los tipos de registros vinculados: Tratamiento, Vacuna y
Recomendación profesional; que un episodio sin registros llegue con la lista
vacía y que la respuesta respete el aislamiento por finca (tenant).
"""

from datetime import date, timedelta

from flask_jwt_extended import decode_token

from app import db
from app.models import (
    Animals,
    Breeds,
    Diseases,
    RouteAdministration,
    Species,
    Vaccines,
)
from app.models.animals import AnimalStatus, Sex
from app.models.user import User


def _d(offset: int) -> str:
    """Fecha ISO de hace ``offset`` días relativa a hoy (evita fechas futuras)."""
    return (date.today() + timedelta(days=offset)).isoformat()


def _seed_farm(app, auth_headers):
    """Crea especie, raza, animal y enfermedad; devuelve ids+finca."""
    with app.app_context():
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        species = Species(name="Bovino Test CaseOptions")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test CaseOptions", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = Animals.create(
            record="BOV-OPC-001",
            sex=Sex.Hembra,
            weight=340.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()

        disease = Diseases.create(
            name="Fiebre de leche Test CaseOptions",
            symptoms="mandíbula hinchada",
            details="caso de prueba",
            finca_id=finca_id,
        )
        db.session.commit()

        return finca_id, animal.id, disease.id


def _instructor_id(app):
    with app.app_context():
        return User.query.filter_by(email="admin@villaluz.com").first().id


def _create_episode(client, auth_headers, animal_id, disease_id, instructor_id):
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-9),
            "status": "Activo",
            "severity": "Moderada",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return resp.get_json()["data"]["id"]


def test_case_options_types_by_linked_records(client, auth_headers, app):
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app)
    episode_id = _create_episode(
        client, auth_headers, animal_id, disease_id, instructor_id
    )

    # 1. Sin registros vinculados: lista vacía de tipos.
    resp = client.get("/api/v1/animal-diseases/case-options", headers=auth_headers)
    assert resp.status_code == 200, resp.get_data(as_text=True)
    options = resp.get_json()["data"]
    entry = next(o for o in options if o["id"] == episode_id)
    assert entry["case_types"] == []
    assert entry["animal_id"] == animal_id
    assert entry["status"] == "Activo"
    assert entry["severity"] == "Moderada"

    # 2. Vincular un tratamiento: el episodio pasa a "Tratamiento".
    resp = client.post(
        "/api/v1/treatments",
        json={
            "treatment_date": _d(-7),
            "description": "Calcio intravenoso por fiebre de leche",
            "frequency": "Dosis única",
            "dosis": "500 ml IV",
            "animal_id": animal_id,
            "animal_disease_id": episode_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get("/api/v1/animal-diseases/case-options", headers=auth_headers)
    entry = next(o for o in resp.get_json()["data"] if o["id"] == episode_id)
    assert "Tratamiento" in entry["case_types"]
    assert "Vacuna" not in entry["case_types"]

    # 3. Vincular una vacunación: el episodio ahora tiene dos tipos.
    with app.app_context():
        route = RouteAdministration(
            name="Subcutánea Test CaseOptions",
            description="test",
            status=True,
            finca_id=finca_id,
        )
        db.session.add(route)
        db.session.commit()
        vaccine = Vaccines.create(
            name="Vacuna Fiebre Test CaseOptions",
            dosis="2 ml",
            route_administration_id=route.id,
            vaccination_interval="12 meses",
            type="Inactivada",
            national_plan="Plan Nacional",
            target_disease_id=disease_id,
            finca_id=finca_id,
        )
        db.session.commit()
        vaccine_id = vaccine.id

    resp = client.post(
        "/api/v1/vaccinations",
        json={
            "animal_id": animal_id,
            "vaccine_id": vaccine_id,
            "vaccination_date": _d(-6),
            "dosis": "2 ml",
            "animal_disease_id": episode_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get("/api/v1/animal-diseases/case-options", headers=auth_headers)
    entry = next(o for o in resp.get_json()["data"] if o["id"] == episode_id)
    assert set(entry["case_types"]) == {"Tratamiento", "Vacuna"}

    # 4. Vincular una recomendación profesional: los tres tipos.
    resp = client.post(
        "/api/v1/treatment-recommendations",
        json={
            "animal_id": animal_id,
            "animal_disease_id": episode_id,
            "title": "Fase de transición",
            "recommendation": "Racionar calcio preparto y vigilar temperatura",
            "responsible": "Vet. de campo",
            "start_date": _d(-5),
            "estimated_end_date": _d(15),
            "duration_days": 21,
            "control_interval_days": 5,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get("/api/v1/animal-diseases/case-options", headers=auth_headers)
    entry = next(o for o in resp.get_json()["data"] if o["id"] == episode_id)
    assert set(entry["case_types"]) == {
        "Tratamiento",
        "Vacuna",
        "Recomendación profesional",
    }
    assert entry["animal_label"] == "BOV-OPC-001"
    assert entry["disease_label"] == "Fiebre de leche Test CaseOptions"
