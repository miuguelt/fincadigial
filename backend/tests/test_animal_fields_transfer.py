from app.models import Animals, Fields, AnimalFields, Species, Breeds, FoodTypes
from app.models.fields import LandStatus
from app.models.animals import Sex
from datetime import date
from flask_jwt_extended import decode_token
from app import db


def test_animal_field_transfer_meta(client, auth_headers, app):
    """
    Test de integración para validar la lógica de traslado masivo de animales,
    asegurando que los animales que ya se encuentran en el potrero de destino
    sean omitidos y reportados correctamente en la metadata de la respuesta.
    """
    with app.app_context():
        # Obtener el finca_id del token JWT para asociar los registros de prueba
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        # 1. Crear alimento/pasto
        food = FoodTypes(
            food_type="Pasto de Prueba",
            sowing_date=date.today(),
            area=10,
            handlings="Manejo",
            gauges="G",
            finca_id=finca_id,
        )
        # 2. Crear especie
        species = Species(name="Bovino Test")
        db.session.add(food)
        db.session.add(species)
        db.session.commit()

        # 3. Crear raza
        breed = Breeds(name="Raza Test", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        # 4. Crear potreros (Field A y Field B)
        field_a = Fields(
            name="Potrero A",
            ubication="Lote A",
            capacity="10",
            state=LandStatus.Activo,
            area="1",
            gauges="G",
            handlings="H",
            food_type_id=food.id,
            finca_id=finca_id,
        )
        field_b = Fields(
            name="Potrero B",
            ubication="Lote B",
            capacity="10",
            state=LandStatus.Activo,
            area="1",
            gauges="G",
            handlings="H",
            food_type_id=food.id,
            finca_id=finca_id,
        )
        db.session.add_all([field_a, field_b])
        db.session.commit()

        # 5. Crear animales (A001 y A002)
        animal_1 = Animals(
            record="A001",
            sex=Sex.Hembra,
            weight=350,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_id,
        )
        animal_2 = Animals(
            record="A002",
            sex=Sex.Macho,
            weight=400,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_id,
        )
        db.session.add_all([animal_1, animal_2])
        db.session.commit()

        # 6. Asignar animal_1 al Potrero B inicialmente. animal_2 se queda sin asignar.
        af = AnimalFields(
            animal_id=animal_1.id,
            field_id=field_b.id,
            assignment_date=date.today(),
            finca_id=finca_id,
        )
        db.session.add(af)
        db.session.commit()

        animal_1_id = animal_1.id
        animal_2_id = animal_2.id
        field_a_id = field_a.id
        field_b_id = field_b.id

    # Realizar petición de traslado masivo al Potrero B
    # Solicitamos trasladar a A001 (que ya está allí) y A002 (que no está asignado)
    payload = {
        "animal_ids": [animal_1_id, animal_2_id],
        "field_id": field_b_id,
        "date": date.today().isoformat(),
        "notes": "Traslado masivo de prueba",
    }

    resp = client.post(
        "/api/v1/animal-fields/transfer", json=payload, headers=auth_headers
    )
    assert resp.status_code == 200

    body = resp.get_json()
    assert body["success"] is True
    assert "meta" in body

    meta = body["meta"]
    assert meta["total_requested"] == 2
    assert meta["transferred_count"] == 1  # Solo animal_2 fue trasladado
    assert meta["skipped_count"] == 1  # animal_1 fue omitido
    assert animal_1_id in meta["skipped_animal_ids"]

    # Validar que el mensaje es descriptivo
    assert "ya estaban en el potrero de destino" in body["message"]

    # Mover al segundo potrero y regresar el mismo día debe reactivar
    # la asignación histórica, no dejar al animal sin potrero.
    move_to_a = client.post(
        "/api/v1/animal-fields/transfer",
        json={
            "animal_ids": [animal_2_id],
            "field_id": field_a_id,
            "date": date.today().isoformat(),
        },
        headers=auth_headers,
    )
    assert move_to_a.status_code == 200
    assert move_to_a.get_json()["meta"]["transferred_count"] == 1

    return_to_b = client.post(
        "/api/v1/animal-fields/transfer",
        json={
            "animal_ids": [animal_2_id],
            "field_id": field_b_id,
            "date": date.today().isoformat(),
        },
        headers=auth_headers,
    )
    assert return_to_b.status_code == 200
    assert return_to_b.get_json()["meta"]["transferred_count"] == 1

    with app.app_context():
        active_assignment = AnimalFields.query.filter_by(
            animal_id=animal_2_id,
            removal_date=None,
        ).one()
        assert active_assignment.field_id == field_b_id
