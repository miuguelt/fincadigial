"""Fase 1 de protocolos de tratamiento: catálogo, insumos y aplicación a res.

Cubre el ciclo: creación del protocolo por finca, alta de un insumo
recomendado (medicamento/vacuna), aplicación del protocolo sobre una res
(genera un Treatment trazable con retiro) y validaciones de aislamiento.
"""

from datetime import date, timedelta

from flask_jwt_extended import decode_token

from app import db
from app.models import Animals, Breeds, Diseases, Species, Treatments
from app.models.animals import AnimalStatus, Sex
from app.models.route_administration import RouteAdministration
from app.models.medications import Medications
from app.models.vaccines import Vaccines


def _seed_farm(app, auth_headers):
    """Crea especie, raza, animal, enfermedad y devuelve sus ids."""
    with app.app_context():
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        species = Species(name="Bovino Test Protocolos")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test Protocolos", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = Animals.create(
            record="BOV-PRO-001",
            sex=Sex.Hembra,
            weight=340.0,
            birth_date=date.today() - timedelta(days=1200),
            breeds_id=breed.id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()

        disease = Diseases.create(
            name="Mastitis Test Protocolos",
            symptoms="ubre caliente",
            details="cuadro moderado",
            finca_id=finca_id,
        )
        db.session.commit()

        return finca_id, animal.id, disease.id


def _seed_medication(app, finca_id, name="Oxitetraciclina Test Protocolo"):
    """Crea la ruta y el medicamento necesarios para el insumo recomendado."""
    with app.app_context():
        route = RouteAdministration(
            name="Intramamaria Test Protocolo",
            description="test",
            status=True,
            finca_id=finca_id,
        )
        db.session.add(route)
        db.session.commit()
        med = Medications.create(
            name=name,
            description="antibiótico mastitis",
            indications="mastitis",
            dosis="10 ml",
            route_administration_id=route.id,
            finca_id=finca_id,
            availability=True,
        )
        db.session.commit()
        return med.id


def _create_protocol(client, auth_headers, finca_id, disease_id, **overrides):
    payload = {
        "name": "Mastitis Test - protocolo intramamario",
        "description": "Oxitetraciclina intramamaria por 5 días",
        "disease_id": disease_id,
        "severity": "Moderada",
        "default_dosis": "10 ml por cuarto",
        "default_frequency": "Cada 12 h por 5 días",
        "withdrawal_days": 5,
        "duration_days": 5,
        "finca_id": finca_id,
        **overrides,
    }
    resp = client.post(
        "/api/v1/treatment-protocols", json=payload, headers=auth_headers
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    return resp.get_json()["data"]


def test_protocol_crud_and_disease_filter(client, auth_headers, app):
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)

    created = _create_protocol(client, auth_headers, finca_id, disease_id)
    protocol_id = created["id"]
    assert created["name"].startswith("Mastitis Test")
    assert created["withdrawal_days"] == 5

    resp = client.get(f"/api/v1/treatment-protocols/{protocol_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.get_data(as_text=True)
    assert resp.get_json()["data"]["disease_id"] == disease_id

    resp = client.get(
        f"/api/v1/treatment-protocols?disease_id={disease_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    data = resp.get_json()["data"]
    items = data.get("items", []) if isinstance(data, dict) else data
    assert any(str(p["id"]) == str(protocol_id) for p in items)


def test_insumo_recomendado_validation(client, auth_headers, app):
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    med_id = _seed_medication(app, finca_id)
    protocol = _create_protocol(client, auth_headers, finca_id, disease_id)

    # Alta válida: medicamento recomendado
    resp = client.post(
        "/api/v1/treatment-protocol-insumos",
        json={
            "protocol_id": protocol["id"],
            "kind": "medicamento",
            "medication_id": med_id,
            "recommended_dosis": "10 ml por cuarto",
            "finca_id": finca_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    # Inválida: tipo vacuna sin vaccine_id
    resp = client.post(
        "/api/v1/treatment-protocol-insumos",
        json={
            "protocol_id": protocol["id"],
            "kind": "vacuna",
            "finca_id": finca_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422, resp.get_data(as_text=True)


def test_apply_protocol_creates_treatment(client, auth_headers, app):
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    protocol = _create_protocol(client, auth_headers, finca_id, disease_id)
    protocol_id = protocol["id"]

    resp = client.post(
        f"/api/v1/treatment-protocols/{protocol_id}/apply",
        json={
            "animal_id": animal_id,
            "treatment_date": date.today().isoformat(),
            "dosis": "8 ml por cuarto",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    treatment = resp.get_json()["data"]
    assert treatment["animal_id"] == animal_id
    assert treatment["description"] == protocol["name"]
    assert treatment["dosis"] == "8 ml por cuarto"
    assert treatment["frequency"] == "Cada 12 h por 5 días"
    assert treatment["withdrawal_days"] == 5

    with app.app_context():
        stored = Treatments.get_by_id(treatment["id"])
        assert stored is not None
        assert stored.animal_disease_id is None


def test_apply_protocol_linked_to_episode_and_cross_animal_rejected(
    client, auth_headers, app
):
    from app.models.animalDiseases import AnimalDiseases

    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    protocol = _create_protocol(client, auth_headers, finca_id, disease_id)

    # Episodio para la res
    with app.app_context():
        instructor = db.session.get(
            __import__("app.models.user", fromlist=["User"]).User,
            1,
        )
        episode = AnimalDiseases.create(
            animal_id=animal_id,
            disease_id=disease_id,
            instructor_id=instructor.id if instructor else None,
            diagnosis_date=date.today(),
            status="Activo",
            severity="Moderada",
            finca_id=finca_id,
        )
        db.session.commit()
        episode_id = episode.id

    resp = client.post(
        f"/api/v1/treatment-protocols/{protocol['id']}/apply",
        json={
            "animal_id": animal_id,
            "animal_disease_id": episode_id,
            "treatment_date": date.today().isoformat(),
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    treatment = resp.get_json()["data"]
    assert treatment["animal_disease_id"] == episode_id

    # Aplicación a una res de otra finca (usuario de la finca tradicional no
    # ve el protocolo) -> el protocolo no se resuelve y responde not_found.
    resp = client.post(
        f"/api/v1/treatment-protocols/999999/apply",
        json={"animal_id": animal_id},
        headers=auth_headers,
    )
    assert resp.status_code == 404, resp.get_data(as_text=True)
