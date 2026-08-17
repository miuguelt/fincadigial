import pytest
from app import create_app, db
from app.models.fields import Fields, LandStatus
from app.models.foodTypes import FoodTypes
from app.models.animals import Animals, Sex
from app.models.breeds import Breeds
from app.models.species import Species
from app.models.animalFields import AnimalFields
from datetime import date
from flask_jwt_extended import create_access_token


@pytest.fixture
def app():
    app = create_app("testing")
    app.config["JWT_SECRET_KEY"] = "testing_secret"
    app.config["CACHE_WARMUP_ASYNC"] = False
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(app):
    with app.app_context():
        access_token = create_access_token(identity="1")
    return {"Authorization": f"Bearer {access_token}"}


def create_setup_data():
    food_type = FoodTypes(
        food_type="Pasto",
        sowing_date=date.today(),
        area=100,
        handlings="Ninguno",
        gauges="10",
    )
    db.session.add(food_type)
    db.session.commit()

    species = Species(name="Bovino")
    db.session.add(species)
    db.session.commit()

    breed = Breeds(name="Brahman", species_id=species.id)
    db.session.add(breed)
    db.session.commit()

    return food_type, species, breed


def test_add_animal_to_field_success(client, auth_headers):
    # Setup
    food_type, species, breed = create_setup_data()

    field = Fields(
        name="Field A",
        ubication="Sector Norte",
        capacity="50",
        state=LandStatus.Activo,
        handlings="Rotativo",
        gauges="5",
        area="10",
        food_type_id=food_type.id,
    )
    db.session.add(field)
    db.session.commit()
    animal = Animals(
        record="A001",
        sex=Sex.Hembra,
        weight=300,
        birth_date=date.today(),
        breeds_id=breed.id,
    )
    db.session.add(animal)
    db.session.commit()

    # Test
    payload = {
        "field_id": field.id,
        "animal_id": animal.id,
        "assignment_date": date.today().isoformat(),
        "notes": "Initial assignment",
    }
    response = client.post("/api/v1/animal-fields", json=payload, headers=auth_headers)

    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert "AnimalFields creado exitosamente" in data["message"]


def test_add_animal_to_field_conflict(client, auth_headers):
    # Setup
    food_type, species, breed = create_setup_data()

    field_a = Fields(
        name="Field A",
        ubication="Sector Norte",
        capacity="50",
        state=LandStatus.Activo,
        handlings="Rotativo",
        gauges="5",
        area="10",
        food_type_id=food_type.id,
    )
    field_b = Fields(
        name="Field B",
        ubication="Sector Sur",
        capacity="50",
        state=LandStatus.Activo,
        handlings="Rotativo",
        gauges="5",
        area="10",
        food_type_id=food_type.id,
    )
    db.session.add_all([field_a, field_b])
    db.session.commit()
    animal = Animals(
        record="A001",
        sex=Sex.Hembra,
        weight=300,
        birth_date=date.today(),
        breeds_id=breed.id,
    )
    db.session.add(animal)
    db.session.commit()

    # Initial Assignment (directly to DB for setup)
    af = AnimalFields(
        animal_id=animal.id, field_id=field_a.id, assignment_date=date.today()
    )
    db.session.add(af)
    db.session.commit()

    # Test Conflict
    payload = {
        "field_id": field_b.id,
        "animal_id": animal.id,
        "assignment_date": date.today().isoformat(),
        "notes": "Try valid assignment",
    }
    response = client.post("/api/v1/animal-fields", json=payload, headers=auth_headers)

    assert response.status_code == 409
    data = response.get_json()
    assert data["success"] is False
    assert "Violación de unicidad" in data["error"]["message"]


def test_add_animal_to_field_not_found(client, auth_headers):
    payload = {
        "field_id": 999,
        "animal_id": 999,
        "assignment_date": date.today().isoformat(),
    }
    response = client.post("/api/v1/animal-fields", json=payload, headers=auth_headers)
    assert response.status_code == 422
