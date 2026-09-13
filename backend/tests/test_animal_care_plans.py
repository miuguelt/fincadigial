"""Planes de manejo transversal por animal: modelo, etapas y CRUD API."""

from datetime import date
from datetime import timedelta

from flask_jwt_extended import decode_token

from app import db
from app.models.animal_care_plans import (
    AnimalCarePlan,
    AnimalCarePlanStage,
    CarePlanStatus,
    CarePlanType,
)
from app.models.animals import AnimalStatus, Sex
from app.models.animals import Animals as AnimalsModel
from app.models.base_model import ValidationError
from app.models.breeds import Breeds as BreedsModel
from app.models.species import Species as SpeciesModel


def _seed_animal(app, auth_headers):
    with app.app_context():
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        species = SpeciesModel(name="Bovino Test Planes")
        db.session.add(species)
        db.session.commit()
        breed = BreedsModel(name="Raza Test Planes", species_id=species.id)
        db.session.add(breed)
        db.session.commit()
        animal = AnimalsModel.create(
            record="BOV-PLAN-001",
            sex=Sex.Hembra,
            weight=340.0,
            birth_date=date.today() - timedelta(days=400),
            breeds_id=breed.id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()
        return finca_id, animal.id


def test_plan_with_stages_via_api(client, auth_headers, app):
    finca_id, animal_id = _seed_animal(app, auth_headers)

    resp = client.post(
        "/api/v1/animal-care-plans",
        json={
            "animal_id": animal_id,
            "plan_type": "Sanitario",
            "name": "Plan sanitario de reposición",
            "description": "Seguimiento preventivo del lote",
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + timedelta(days=90)).isoformat(),
            "status": "Borrador",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    plan = resp.get_json()["data"]
    plan_id = plan["id"]

    resp = client.post(
        "/api/v1/animal-care-plan-stages",
        json={
            "plan_id": plan_id,
            "stage_order": 1,
            "stage_name": "Examen de condición corporal",
            "due_date": (date.today() + timedelta(days=15)).isoformat(),
            "completed": False,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get(f"/api/v1/animal-care-plans/{plan_id}", headers=auth_headers)
    assert resp.status_code == 200
    detail = resp.get_json()["data"]
    assert detail["name"] == "Plan sanitario de reposición"
    assert detail["animal_id"] == animal_id


def test_stage_completion_requires_date(client, auth_headers, app):
    finca_id, animal_id = _seed_animal(app, auth_headers)

    with app.app_context():
        plan = AnimalCarePlan.create(
            animal_id=animal_id,
            finca_id=finca_id,
            plan_type=CarePlanType.Nutricional,
            status=CarePlanStatus.Activo,
            name="Plan de alimentación",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
        )
        db.session.commit()
        plan_id = plan.id

    resp = client.post(
        "/api/v1/animal-care-plan-stages",
        json={
            "plan_id": plan_id,
            "stage_order": 1,
            "stage_name": "Ajuste de ración",
            "completed": True,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422, resp.get_data(as_text=True)


def test_plan_rejects_inverted_dates(client, auth_headers, app):
    finca_id, animal_id = _seed_animal(app, auth_headers)

    resp = client.post(
        "/api/v1/animal-care-plans",
        json={
            "animal_id": animal_id,
            "plan_type": "Reproductivo",
            "name": "Plan inválido",
            "start_date": date.today().isoformat(),
            "end_date": (date.today() - timedelta(days=10)).isoformat(),
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422, resp.get_data(as_text=True)
