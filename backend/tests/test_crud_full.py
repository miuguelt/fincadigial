"""
Tests CRUD completos (INSERT, UPDATE, DELETE) para todas las tablas de Villaluz.

Verifica el ciclo completo: POST -> GET by ID -> PUT -> GET (verify update) -> DELETE -> GET (verify 404).
Cada test es independiente y crea sus propias dependencias.
"""

import pytest

BASE = "/api/v1"
ADMIN = "Administrador"
PROPIETARIO = "Propietario"


def _post(client, path, json_data, headers):
    return client.post(f"{BASE}{path}", json=json_data, headers=headers)


def _put(client, path, json_data, headers):
    return client.put(f"{BASE}{path}", json=json_data, headers=headers)


def _patch(client, path, json_data, headers):
    return client.patch(f"{BASE}{path}", json=json_data, headers=headers)


def _delete(client, path, headers):
    return client.delete(f"{BASE}{path}", headers=headers)


def _get(client, path, headers):
    return client.get(f"{BASE}{path}", headers=headers)


def _create_id(client, path, json_data, headers):
    resp = _post(client, path, json_data, headers)
    assert resp.status_code in (200, 201), (
        f"POST {path} failed: {resp.status_code} {resp.get_json()}"
    )
    body = resp.get_json()
    data = body.get("data", body)
    if isinstance(data, dict):
        return data.get("id")
    if isinstance(data, list) and data:
        return data[0].get("id")
    return body.get("id")


@pytest.fixture
def finca_id(app, db_session, token_for):
    from app.models.finca import Finca
    from app.models import FarmType

    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Finca CRUD Test", type=FarmType.Tradicional, is_active=True
            )
        return finca.id


@pytest.fixture
def species_id(client, token_for, finca_id):
    return _create_id(client, "/species", {"name": "Bovino CRUD"}, token_for(ADMIN))


@pytest.fixture
def breed_id(client, token_for, species_id, finca_id):
    return _create_id(
        client,
        "/breeds",
        {"name": "Holstein CRUD", "species_id": species_id, "purpose": "Milk"},
        token_for(ADMIN),
    )


@pytest.fixture
def route_admin_id(client, token_for, finca_id):
    return _create_id(
        client,
        "/route-administrations",
        {"name": "Subcutánea CRUD", "finca_id": finca_id},
        token_for(ADMIN),
    )


@pytest.fixture
def disease_id(client, token_for, finca_id):
    return _create_id(
        client,
        "/diseases",
        {
            "name": "Fiebre Aftosa CRUD",
            "symptoms": "Fiebre, vesículas",
            "details": "Enfermedad viral altamente contagiosa",
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


@pytest.fixture
def field_id(client, token_for, finca_id):
    return _create_id(
        client,
        "/fields",
        {
            "name": "Potrero CRUD",
            "state": "Disponible",
            "area": 5.5,
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


@pytest.fixture
def animal_id(client, token_for, breed_id, field_id, finca_id):
    return _create_id(
        client,
        "/animals",
        {
            "sex": "Hembra",
            "birth_date": "2023-01-15",
            "weight": 350.5,
            "record": "CRUD-001",
            "breeds_id": breed_id,
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


@pytest.fixture
def vaccine_id(client, token_for, route_admin_id, disease_id, finca_id):
    return _create_id(
        client,
        "/vaccines",
        {
            "name": "Vacuna Aftosa CRUD",
            "dosis": "5ml",
            "route_administration_id": route_admin_id,
            "vaccination_interval": "6 meses",
            "type": "Inactivada",
            "national_plan": True,
            "target_disease_id": disease_id,
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


@pytest.fixture
def medication_id(client, token_for, route_admin_id, finca_id):
    return _create_id(
        client,
        "/medications",
        {
            "name": "Ivermectina CRUD",
            "description": "Antiparasitario de amplio espectro",
            "route_administration_id": route_admin_id,
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


@pytest.fixture
def treatment_id(client, token_for, animal_id, finca_id):
    return _create_id(
        client,
        "/treatments",
        {
            "treatment_date": "2024-06-01",
            "description": "Tratamiento antiparasitario CRUD",
            "frequency": "Cada 8 horas",
            "dosis": "10ml",
            "animal_id": animal_id,
            "finca_id": finca_id,
        },
        token_for(ADMIN),
    )


# ---------------------------------------------------------------------------
# 1. Species
# ---------------------------------------------------------------------------


class TestSpeciesCRUD:
    def test_create(self, client, token_for):
        rid = _create_id(
            client, "/species", {"name": "Bovino Test CRUD"}, token_for(ADMIN)
        )
        assert rid is not None

    def test_read(self, client, token_for, species_id):
        resp = _get(client, f"/species/{species_id}", token_for(ADMIN))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Bovino CRUD"

    def test_update(self, client, token_for, species_id):
        resp = _put(
            client,
            f"/species/{species_id}",
            {"name": "Bovino CRUD Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200
        resp2 = _get(client, f"/species/{species_id}", token_for(ADMIN))
        assert resp2.get_json()["data"]["name"] == "Bovino CRUD Updated"

    def test_delete(self, client, token_for):
        rid = _create_id(
            client, "/species", {"name": "Bovino Delete"}, token_for(ADMIN)
        )
        resp = _delete(client, f"/species/{rid}", token_for(ADMIN))
        assert resp.status_code == 200
        resp2 = _get(client, f"/species/{rid}", token_for(ADMIN))
        assert resp2.status_code == 404


# ---------------------------------------------------------------------------
# 2. Breeds
# ---------------------------------------------------------------------------


class TestBreedsCRUD:
    def test_create(self, client, token_for, species_id):
        rid = _create_id(
            client,
            "/breeds",
            {"name": "Jersey Test", "species_id": species_id, "purpose": "Milk"},
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, breed_id):
        resp = _get(client, f"/breeds/{breed_id}", token_for(ADMIN))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Holstein CRUD"

    def test_update(self, client, token_for, breed_id):
        resp = _put(
            client,
            f"/breeds/{breed_id}",
            {"name": "Holstein Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, species_id):
        rid = _create_id(
            client,
            "/breeds",
            {"name": "Breed Del", "species_id": species_id},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/breeds/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 3. Fields
# ---------------------------------------------------------------------------


class TestFieldsCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/fields",
            {
                "name": "Potrero Nuevo CRUD",
                "state": "Activo",
                "area": 10.0,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, field_id):
        resp = _get(client, f"/fields/{field_id}", token_for(ADMIN))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Potrero CRUD"

    def test_update(self, client, token_for, field_id):
        resp = _put(
            client,
            f"/fields/{field_id}",
            {"name": "Potrero CRUD Updated", "area": 8.0},
            token_for(ADMIN),
        )
        assert resp.status_code == 200
        resp2 = _get(client, f"/fields/{field_id}", token_for(ADMIN))
        assert float(resp2.get_json()["data"]["area"]) == 8.0

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/fields",
            {
                "name": "Potrero Del",
                "state": "Disponible",
                "area": 1.0,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/fields/{rid}", token_for(ADMIN))
        assert resp.status_code == 200
        resp2 = _get(client, f"/fields/{rid}", token_for(ADMIN))
        assert resp2.status_code == 404


# ---------------------------------------------------------------------------
# 4. Animals
# ---------------------------------------------------------------------------


class TestAnimalsCRUD:
    def test_create(self, client, token_for, breed_id, finca_id):
        rid = _create_id(
            client,
            "/animals",
            {
                "sex": "Macho",
                "birth_date": "2024-03-01",
                "weight": 400,
                "record": "CRUD-M-001",
                "breeds_id": breed_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, animal_id):
        resp = _get(client, f"/animals/{animal_id}", token_for(ADMIN))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["record"] == "CRUD-001"

    def test_update(self, client, token_for, animal_id):
        resp = _put(
            client, f"/animals/{animal_id}", {"weight": 380.0}, token_for(ADMIN)
        )
        assert resp.status_code == 200
        resp2 = _get(client, f"/animals/{animal_id}", token_for(ADMIN))
        assert float(resp2.get_json()["data"]["weight"]) == 380.0

    def test_patch(self, client, token_for, animal_id):
        resp = _patch(
            client, f"/animals/{animal_id}", {"status": "Vendido"}, token_for(ADMIN)
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, breed_id, finca_id):
        rid = _create_id(
            client,
            "/animals",
            {
                "sex": "Hembra",
                "birth_date": "2024-06-01",
                "weight": 300,
                "record": "CRUD-DEL",
                "breeds_id": breed_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/animals/{rid}", token_for(ADMIN))
        assert resp.status_code == 200
        resp2 = _get(client, f"/animals/{rid}", token_for(ADMIN))
        assert resp2.status_code == 404


# ---------------------------------------------------------------------------
# 5. Diseases
# ---------------------------------------------------------------------------


class TestDiseasesCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/diseases",
            {
                "name": "Mastitis CRUD",
                "symptoms": "Inflamación ubre",
                "details": "Infección bacteriana",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, disease_id):
        resp = _get(client, f"/diseases/{disease_id}", token_for(ADMIN))
        assert resp.status_code == 200

    def test_update(self, client, token_for, disease_id):
        resp = _put(
            client,
            f"/diseases/{disease_id}",
            {"name": "Fiebre Aftosa Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/diseases",
            {
                "name": "Del Disease",
                "symptoms": "x",
                "details": "y",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/diseases/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 6. Route Administration
# ---------------------------------------------------------------------------


class TestRouteAdministrationCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/route-administrations",
            {"name": "Intramuscular CRUD", "finca_id": finca_id},
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, route_admin_id):
        resp = _put(
            client,
            f"/route-administrations/{route_admin_id}",
            {"name": "Subcutánea Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/route-administrations",
            {"name": "Route Del", "finca_id": finca_id},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/route-administrations/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 7. Vaccines
# ---------------------------------------------------------------------------


class TestVaccinesCRUD:
    def test_create(self, client, token_for, route_admin_id, disease_id, finca_id):
        rid = _create_id(
            client,
            "/vaccines",
            {
                "name": "Brucelosis CRUD",
                "dosis": "2ml",
                "route_administration_id": route_admin_id,
                "vaccination_interval": "Anual",
                "type": "Atenuada",
                "national_plan": False,
                "target_disease_id": disease_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, vaccine_id):
        resp = _get(client, f"/vaccines/{vaccine_id}", token_for(ADMIN))
        assert resp.status_code == 200

    def test_update(self, client, token_for, vaccine_id):
        resp = _put(
            client, f"/vaccines/{vaccine_id}", {"dosis": "10ml"}, token_for(ADMIN)
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, route_admin_id, disease_id, finca_id):
        rid = _create_id(
            client,
            "/vaccines",
            {
                "name": "Vac Del",
                "dosis": "1ml",
                "route_administration_id": route_admin_id,
                "vaccination_interval": "1 mes",
                "type": "Inactivada",
                "national_plan": False,
                "target_disease_id": disease_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/vaccines/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 8. Medications
# ---------------------------------------------------------------------------


class TestMedicationsCRUD:
    def test_create(self, client, token_for, route_admin_id, finca_id):
        rid = _create_id(
            client,
            "/medications",
            {
                "name": "Penicilina CRUD",
                "description": "Antibiótico",
                "route_administration_id": route_admin_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, medication_id):
        resp = _put(
            client,
            f"/medications/{medication_id}",
            {"description": "Updated desc"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, route_admin_id, finca_id):
        rid = _create_id(
            client,
            "/medications",
            {
                "name": "Med Del",
                "description": "x",
                "route_administration_id": route_admin_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/medications/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 9. Treatments
# ---------------------------------------------------------------------------


class TestTreatmentsCRUD:
    def test_create(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/treatments",
            {
                "treatment_date": "2024-07-01",
                "description": "Nuevo CRUD",
                "frequency": "Diaria",
                "dosis": "5ml",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_read(self, client, token_for, treatment_id):
        resp = _get(client, f"/treatments/{treatment_id}", token_for(ADMIN))
        assert resp.status_code == 200

    def test_update(self, client, token_for, treatment_id):
        resp = _put(
            client,
            f"/treatments/{treatment_id}",
            {"description": "Updated CRUD"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/treatments",
            {
                "treatment_date": "2024-08-01",
                "description": "Del",
                "frequency": "1x",
                "dosis": "1ml",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/treatments/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 10. Controls
# ---------------------------------------------------------------------------


class TestControlsCRUD:
    def test_create(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/control",
            {
                "checkup_date": "2024-06-15",
                "health_status": "Bueno",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, animal_id, finca_id):
        ctrl_id = _create_id(
            client,
            "/control",
            {
                "checkup_date": "2024-06-20",
                "health_status": "Sano",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/control/{ctrl_id}",
            {"health_status": "Excelente"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/control",
            {
                "checkup_date": "2024-07-01",
                "health_status": "Regular",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/control/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 11. Vaccinations
# ---------------------------------------------------------------------------


class TestVaccinationsCRUD:
    def test_create(self, client, token_for, animal_id, vaccine_id, finca_id):
        rid = _create_id(
            client,
            "/vaccinations",
            {
                "animal_id": animal_id,
                "vaccine_id": vaccine_id,
                "vaccination_date": "2024-06-01",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, animal_id, vaccine_id, finca_id):
        vac_id = _create_id(
            client,
            "/vaccinations",
            {
                "animal_id": animal_id,
                "vaccine_id": vaccine_id,
                "vaccination_date": "2024-07-01",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/vaccinations/{vac_id}",
            {"vaccination_date": "2024-08-01"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, vaccine_id, finca_id):
        rid = _create_id(
            client,
            "/vaccinations",
            {
                "animal_id": animal_id,
                "vaccine_id": vaccine_id,
                "vaccination_date": "2024-09-01",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/vaccinations/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 12. Milk Production
# ---------------------------------------------------------------------------


class TestMilkProductionCRUD:
    def test_date_range_and_animal_search_filters(
        self, client, token_for, animal_id, finca_id
    ):
        for record_date, session in (
            ("2024-01-01", "AM"),
            ("2024-01-02", "PM"),
            ("2024-01-03", "AM"),
        ):
            _create_id(
                client,
                "/milk-production",
                {
                    "animal_id": animal_id,
                    "date": record_date,
                    "liters": 12.5,
                    "milking_session": session,
                    "finca_id": finca_id,
                },
                token_for(ADMIN),
            )

        response = _get(
            client,
            "/milk-production?date_from=2024-01-02&date_to=2024-01-03&limit=100",
            token_for(ADMIN),
        )
        assert response.status_code == 200
        rows = response.get_json()["data"]
        assert {row["date"] for row in rows} == {"2024-01-02", "2024-01-03"}

        search_response = _get(
            client,
            "/milk-production?search=CRUD-001&limit=100",
            token_for(ADMIN),
        )
        assert search_response.status_code == 200
        assert len(search_response.get_json()["data"]) == 3

        daily = _get(
            client,
            "/milk-production/summary/daily?date=2024-01-02",
            token_for(ADMIN),
        )
        assert daily.status_code == 200
        daily_data = daily.get_json()["data"]
        assert daily_data["total_liters"] == 12.5
        assert daily_data["record_count"] == 1
        assert daily_data["animal_count"] == 1

        weekly = _get(
            client,
            "/milk-production/summary/weekly?start_date=2024-01-01",
            token_for(ADMIN),
        )
        assert weekly.status_code == 200
        weekly_data = weekly.get_json()["data"]
        assert weekly_data["total_liters"] == 37.5
        assert weekly_data["record_count"] == 3
        assert weekly_data["animal_count"] == 1

        monthly = _get(
            client,
            "/milk-production/summary/monthly?year=2024&month=1",
            token_for(ADMIN),
        )
        assert monthly.status_code == 200
        monthly_data = monthly.get_json()["data"]
        assert monthly_data["record_count"] == 3
        assert monthly_data["animal_count"] == 1

    def test_create(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/milk-production",
            {
                "animal_id": animal_id,
                "liters": 15.5,
                "milking_session": "AM",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, animal_id, finca_id):
        mid = _create_id(
            client,
            "/milk-production",
            {
                "animal_id": animal_id,
                "liters": 12.0,
                "milking_session": "PM",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client, f"/milk-production/{mid}", {"liters": 18.0}, token_for(ADMIN)
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/milk-production",
            {
                "animal_id": animal_id,
                "liters": 10.0,
                "milking_session": "AM",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/milk-production/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 13. Lactation Cycles
# ---------------------------------------------------------------------------


class TestLactationCyclesCRUD:
    def test_create(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/lactation-cycles",
            {
                "animal_id": animal_id,
                "calving_date": "2024-01-10",
                "lactation_number": 1,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, animal_id, finca_id):
        lid = _create_id(
            client,
            "/lactation-cycles",
            {
                "animal_id": animal_id,
                "calving_date": "2024-02-15",
                "lactation_number": 2,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/lactation-cycles/{lid}",
            {"lactation_number": 3},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/lactation-cycles",
            {
                "animal_id": animal_id,
                "calving_date": "2024-03-20",
                "lactation_number": 1,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/lactation-cycles/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 14. Food Types
# ---------------------------------------------------------------------------


class TestFoodTypesCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/food_types",
            {
                "food_type": "Ensilaje CRUD",
                "sowing_date": "2024-03-01",
                "area": 2.5,
                "handlings": "Corte cada 45 días",
                "gauges": "15 tons/ha",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        fid = _create_id(
            client,
            "/food_types",
            {
                "food_type": "Heno CRUD",
                "sowing_date": "2024-04-01",
                "area": 3.0,
                "handlings": "x",
                "gauges": "y",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/food_types/{fid}",
            {"food_type": "Heno Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/food_types",
            {
                "food_type": "Del Food",
                "sowing_date": "2024-05-01",
                "area": 1.0,
                "handlings": "x",
                "gauges": "y",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/food_types/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 15. Tasks
# ---------------------------------------------------------------------------


class TestTasksCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/tasks",
            {
                "title": "Revisar ganado CRUD",
                "status": "Pendiente",
                "priority": "Alta",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        tid = _create_id(
            client,
            "/tasks",
            {"title": "Tarea CRUD", "status": "Pendiente", "finca_id": finca_id},
            token_for(ADMIN),
        )
        resp = _put(client, f"/tasks/{tid}", {"status": "Completada"}, token_for(ADMIN))
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/tasks",
            {"title": "Tarea Del", "finca_id": finca_id},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/tasks/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 16. Operational Costs
# ---------------------------------------------------------------------------


class TestOperationalCostsCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/operational",
            {
                "concept": "Alimento concentrado CRUD",
                "amount": 500000,
                "date": "2024-06-01",
                "category": "Alimentación",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        cid = _create_id(
            client,
            "/operational",
            {
                "concept": "Costo CRUD",
                "amount": 100000,
                "date": "2024-07-01",
                "category": "Salud",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(client, f"/operational/{cid}", {"amount": 200000}, token_for(ADMIN))
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/operational",
            {
                "concept": "Costo Del",
                "amount": 50000,
                "date": "2024-08-01",
                "category": "Otros",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/operational/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 17. Financial Transactions
# ---------------------------------------------------------------------------


class TestTransactionsCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/financial/transactions",
            {
                "finca_id": finca_id,
                "transaction_type": "Ingreso",
                "category": "Venta de Leche",
                "amount": 1500000,
                "date": "2024-06-01",
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/financial/transactions",
            {
                "finca_id": finca_id,
                "transaction_type": "Ingreso",
                "category": "Venta de Animal",
                "amount": 2000000,
                "date": "2024-08-01",
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/financial/transactions/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 18. Inventory
# ---------------------------------------------------------------------------


class TestInventoryCRUD:
    def test_create_lot(self, client, token_for, finca_id, medication_id):
        rid = _create_id(
            client,
            "/inventory/lots",
            {
                "product_type": "Medicamento",
                "medication_id": medication_id,
                "lot_number": "LOTE-CRUD-001",
                "quantity": 100,
                "current_quantity": 100,
                "unit": "ml",
                "expiry_date": "2026-12-31",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update_lot(self, client, token_for, finca_id, vaccine_id):
        lid = _create_id(
            client,
            "/inventory/lots",
            {
                "product_type": "Vacuna",
                "vaccine_id": vaccine_id,
                "lot_number": "LOTE-CRUD-002",
                "quantity": 50,
                "current_quantity": 50,
                "unit": "dosis",
                "expiry_date": "2025-06-30",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client, f"/inventory/lots/{lid}", {"current_quantity": 40}, token_for(ADMIN)
        )
        assert resp.status_code == 200

    def test_delete_lot(self, client, token_for, finca_id, medication_id):
        rid = _create_id(
            client,
            "/inventory/lots",
            {
                "product_type": "Medicamento",
                "medication_id": medication_id,
                "lot_number": "LOTE-DEL",
                "quantity": 10,
                "current_quantity": 10,
                "unit": "tab",
                "expiry_date": "2025-12-31",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/inventory/lots/{rid}", token_for(ADMIN))
        assert resp.status_code == 200

    def test_create_lot_without_product_is_rejected(self, client, token_for, finca_id):
        """Regresion: seed_100.py creaba lotes sin FK y product_name quedaba None."""
        resp = client.post(
            f"{BASE}/inventory/lots",
            json={
                "product_type": "Medicamento",
                "lot_number": "LOTE-SIN-PRODUCTO",
                "quantity": 10,
                "current_quantity": 10,
                "unit": "ml",
                "expiry_date": "2026-12-31",
                "finca_id": finca_id,
            },
            headers=token_for(ADMIN),
        )
        assert resp.status_code == 400
        assert "medication_id" in resp.get_json().get("message", "")

    def test_create_lot_with_mismatched_product_is_rejected(
        self, client, token_for, finca_id, vaccine_id
    ):
        resp = client.post(
            f"{BASE}/inventory/lots",
            json={
                "product_type": "Medicamento",
                "vaccine_id": vaccine_id,
                "lot_number": "LOTE-CRUZADO",
                "quantity": 10,
                "current_quantity": 10,
                "unit": "ml",
                "expiry_date": "2026-12-31",
                "finca_id": finca_id,
            },
            headers=token_for(ADMIN),
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 19. Animal Movements
# ---------------------------------------------------------------------------


class TestAnimalMovementsCRUD:
    def _make_movement(self, client, token_for, animal_id, finca_id, fecha, finca2_id):
        return _create_id(
            client,
            "/animals/movements",
            {
                "animal_id": animal_id,
                "tipo_movimiento": "Traslado_Interno",
                "fecha_movimiento": fecha,
                "finca_id": finca_id,
                "finca_destino_id": finca2_id,
                "guia_movilizacion": f"GSMI-{fecha.replace('-', '')}",
            },
            token_for(ADMIN),
        )

    def test_create(self, client, token_for, animal_id, finca_id):
        from app.models.finca import Finca
        from app.models import FarmType

        with client.application.app_context():
            finca2 = Finca.create(
                name="Finca Destino CRUD", type=FarmType.Educativa, is_active=True
            )
            finca2_id = finca2.id
        rid = self._make_movement(
            client, token_for, animal_id, finca_id, "2024-06-01", finca2_id
        )
        assert rid is not None

    def test_list_by_animal(self, client, token_for, animal_id, finca_id):
        from app.models.finca import Finca
        from app.models import FarmType

        with client.application.app_context():
            finca2 = Finca.create(
                name="Finca Destino CRUD L", type=FarmType.Educativa, is_active=True
            )
            finca2_id = finca2.id
        self._make_movement(
            client, token_for, animal_id, finca_id, "2024-07-01", finca2_id
        )
        resp = _get(client, f"/animals/movements/animal/{animal_id}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 20. Genetic Improvements
# ---------------------------------------------------------------------------


class TestGeneticImprovementsCRUD:
    def test_create(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/genetic-improvements",
            {
                "date": "2024-06-01",
                "details": "Inseminación artificial CRUD",
                "results": "Exitosa",
                "genetic_event_technique": "IA",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, animal_id, finca_id):
        gid = _create_id(
            client,
            "/genetic-improvements",
            {
                "date": "2024-07-01",
                "details": "Mejora CRUD",
                "results": "Pendiente",
                "genetic_event_technique": "Monta",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/genetic-improvements/{gid}",
            {"results": "Exitosa"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/genetic-improvements",
            {
                "date": "2024-08-01",
                "details": "Del",
                "results": "x",
                "genetic_event_technique": "IA",
                "animal_id": animal_id,
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/genetic-improvements/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 21. Management Plans
# ---------------------------------------------------------------------------


class TestManagementPlansCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/management-plans",
            {
                "finca_id": finca_id,
                "name": "Plan Sanitario CRUD",
                "plan_type": "Sanitario",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "created_by_user": 1,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        pid = _create_id(
            client,
            "/management-plans",
            {
                "finca_id": finca_id,
                "name": "Plan CRUD",
                "plan_type": "Nutricional",
                "start_date": "2024-06-01",
                "end_date": "2024-12-31",
                "created_by_user": 1,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/management-plans/{pid}",
            {"name": "Plan Updated"},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/management-plans",
            {
                "finca_id": finca_id,
                "name": "Plan Del",
                "plan_type": "Manejo General",
                "start_date": "2024-01-01",
                "end_date": "2024-06-30",
                "created_by_user": 1,
            },
            token_for(ADMIN),
        )
        resp = _delete(client, f"/management-plans/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 22. Production Targets
# ---------------------------------------------------------------------------


class TestProductionTargetsCRUD:
    def test_create(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/production-targets",
            {"finca_id": finca_id, "target_liters": 500, "period": "Monthly"},
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        tid = _create_id(
            client,
            "/production-targets",
            {"finca_id": finca_id, "target_liters": 600, "period": "Weekly"},
            token_for(ADMIN),
        )
        resp = _put(
            client,
            f"/production-targets/{tid}",
            {"target_liters": 700},
            token_for(ADMIN),
        )
        assert resp.status_code == 200

    def test_delete(self, client, token_for, finca_id):
        rid = _create_id(
            client,
            "/production-targets",
            {"finca_id": finca_id, "target_liters": 100, "period": "Daily"},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/production-targets/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 23. Users
# ---------------------------------------------------------------------------


class TestUsersCRUD:
    def test_create(self, client, token_for, finca_id):
        import random

        rand = random.randint(100_000, 999_999)
        rid = _create_id(
            client,
            "/users",
            {
                "identification": rand,
                "fullname": "Usuario CRUD Test",
                "email": f"crud_{rand}@test.villaluz",
                "phone": f"300{rand:06d}",
                "password": "TestPass123!",
                "role": "Operario",
                "approval_status": "Approved",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_update(self, client, token_for, finca_id):
        import random

        rand = random.randint(100_000, 999_999)
        uid = _create_id(
            client,
            "/users",
            {
                "identification": rand,
                "fullname": "Usuario CRUD Upd",
                "email": f"upd_{rand}@test.villaluz",
                "phone": f"310{rand:06d}",
                "password": "TestPass123!",
                "role": "Aprendiz",
                "approval_status": "Approved",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )
        resp = _put(
            client, f"/users/{uid}", {"fullname": "Usuario Updated"}, token_for(ADMIN)
        )
        assert resp.status_code == 200

    def test_approval_status_permissions(self, client, token_for, finca_id):
        import random

        rand = random.randint(100_000, 999_999)
        uid = _create_id(
            client,
            "/users",
            {
                "identification": rand,
                "fullname": "Usuario Pending Approval",
                "email": f"appr_{rand}@test.villaluz",
                "phone": f"320{rand:06d}",
                "password": "TestPass123!",
                "role": "Operario",
                "approval_status": "Pending",
                "finca_id": finca_id,
            },
            token_for(ADMIN),
        )

        # Propietario can approve
        resp_prop = _patch(
            client,
            f"/users/{uid}/approval-status",
            {"approval_status": "Approved"},
            token_for(PROPIETARIO),
        )
        assert resp_prop.status_code == 200

        # Admin can reject
        resp_admin = _patch(
            client,
            f"/users/{uid}/approval-status",
            {"approval_status": "Rejected"},
            token_for(ADMIN),
        )
        assert resp_admin.status_code == 200


# ---------------------------------------------------------------------------
# 24. Treatment-Medications (pivot)
# ---------------------------------------------------------------------------


class TestTreatmentMedicationsCRUD:
    def test_create(self, client, token_for, treatment_id, medication_id):
        rid = _create_id(
            client,
            "/treatment-medications",
            {"treatment_id": treatment_id, "medication_id": medication_id},
            token_for(ADMIN),
        )
        assert rid is not None

    def test_delete(self, client, token_for, treatment_id, medication_id):
        rid = _create_id(
            client,
            "/treatment-medications",
            {"treatment_id": treatment_id, "medication_id": medication_id},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/treatment-medications/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 25. Treatment-Vaccines (pivot)
# ---------------------------------------------------------------------------


class TestTreatmentVaccinesCRUD:
    def test_create(self, client, token_for, treatment_id, vaccine_id):
        rid = _create_id(
            client,
            "/treatment-vaccines",
            {"treatment_id": treatment_id, "vaccine_id": vaccine_id},
            token_for(ADMIN),
        )
        assert rid is not None

    def test_delete(self, client, token_for, treatment_id, vaccine_id):
        rid = _create_id(
            client,
            "/treatment-vaccines",
            {"treatment_id": treatment_id, "vaccine_id": vaccine_id},
            token_for(ADMIN),
        )
        resp = _delete(client, f"/treatment-vaccines/{rid}", token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 26. Alerts (con enums correctos en español)
# ---------------------------------------------------------------------------


class TestAlertsCRUD:
    def test_create_config(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/alerts/configs",
            {
                "alert_type": "Salud",
                "priority": "Alta",
                "animal_id": animal_id,
                "finca_id": finca_id,
                "dimension": "weight",
                "condition_value": "300",
                "message": "Config alerta CRUD test",
            },
            token_for(ADMIN),
        )
        assert rid is not None

    def test_create_alert(self, client, token_for, animal_id, finca_id):
        rid = _create_id(
            client,
            "/alerts",
            {
                "alert_type": "Salud",
                "priority": "Media",
                "animal_id": animal_id,
                "finca_id": finca_id,
                "message": "Alerta CRUD test",
            },
            token_for(ADMIN),
        )
        assert rid is not None
