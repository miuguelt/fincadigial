"""Traslado de animales: el potrero afectado debe quedar al día.

Antes de este contrato, `/animal-fields/transfer` solo movía las asignaciones:
el potrero destino seguía figurando "Disponible" y "Listo para pastorear" con
el ganado adentro, y el potrero de origen nunca empezaba a contar su descanso.
Las tarjetas de potrero leen justamente esos campos.
"""

from datetime import date, timedelta

from flask_jwt_extended import decode_token

from app import db
from app.models import Animals, AnimalFields, Breeds, Fields, FoodTypes, Species
from app.models.animals import Sex
from app.models.fields import LandStatus


def _finca_id(auth_headers):
    return decode_token(auth_headers['Authorization'].split(' ')[1])['finca_id']


def _seed(finca_id, field_states=('Disponible', 'Disponible'), animal_records=('A001',)):
    """Crea dos potreros y los animales pedidos. Devuelve (field_ids, animal_ids)."""
    food = FoodTypes(
        food_type='Pasto de Prueba', sowing_date=date.today(), area=10,
        handlings='Manejo', gauges='G', finca_id=finca_id,
    )
    species = Species(name='Bovino Test')
    db.session.add_all([food, species])
    db.session.commit()

    breed = Breeds(name='Raza Test', species_id=species.id)
    db.session.add(breed)
    db.session.commit()

    fields = [
        Fields(
            name=f'Potrero {index}', ubication=f'Lote {index}', capacity='10',
            state=LandStatus(state), area='1', gauges='G', handlings='H',
            food_type_id=food.id, finca_id=finca_id,
        )
        for index, state in enumerate(field_states, start=1)
    ]
    animals = [
        Animals(
            record=record, sex=Sex.Hembra, weight=350, birth_date=date.today(),
            breeds_id=breed.id, finca_id=finca_id,
        )
        for record in animal_records
    ]
    db.session.add_all(fields + animals)
    db.session.commit()

    return [f.id for f in fields], [a.id for a in animals]


def _assign(animal_id, field_id, finca_id, assignment_date):
    db.session.add(AnimalFields(
        animal_id=animal_id, field_id=field_id,
        assignment_date=assignment_date, finca_id=finca_id,
    ))
    db.session.commit()


def test_transfer_marks_destination_occupied_and_grazed(client, auth_headers, app):
    """El potrero que recibe ganado queda Ocupado y con la fecha de pastoreo de hoy."""
    today = date.today()
    with app.app_context():
        finca_id = _finca_id(auth_headers)
        (origin_id, target_id), (animal_id,) = _seed(finca_id)
        _assign(animal_id, origin_id, finca_id, today - timedelta(days=5))

    response = client.post(
        '/api/v1/animal-fields/transfer',
        json={'animal_ids': [animal_id], 'field_id': target_id, 'date': today.isoformat()},
        headers=auth_headers,
    )
    assert response.status_code == 200

    with app.app_context():
        target = db.session.get(Fields, target_id)
        origin = db.session.get(Fields, origin_id)

        assert target.state == LandStatus.Ocupado
        assert target.last_grazing_date == today
        assert target.is_grazing_ready is False

        # El origen quedó vacío: disponible y empezando a descansar desde hoy.
        assert origin.state == LandStatus.Disponible
        assert origin.last_grazing_date == today


def test_transfer_reports_updated_fields_in_meta(client, auth_headers, app):
    """La respuesta trae el estado nuevo de cada potrero tocado, para pintar la tarjeta."""
    today = date.today()
    with app.app_context():
        finca_id = _finca_id(auth_headers)
        (origin_id, target_id), (animal_id,) = _seed(finca_id)
        _assign(animal_id, origin_id, finca_id, today - timedelta(days=5))

    response = client.post(
        '/api/v1/animal-fields/transfer',
        json={'animal_ids': [animal_id], 'field_id': target_id, 'date': today.isoformat()},
        headers=auth_headers,
    )

    meta = response.get_json()['meta']
    by_id = {int(field['id']): field for field in meta['fields']}

    assert set(by_id) == {origin_id, target_id}
    assert by_id[target_id]['animal_count'] == 1
    assert by_id[target_id]['state'] == 'Ocupado'
    assert by_id[target_id]['is_grazing_ready'] is False
    assert by_id[origin_id]['animal_count'] == 0
    assert by_id[origin_id]['state'] == 'Disponible'


def test_transfer_respects_manual_field_state(client, auth_headers, app):
    """Un potrero en Mantenimiento no pasa a Ocupado solo, ese estado lo pone una persona."""
    today = date.today()
    with app.app_context():
        finca_id = _finca_id(auth_headers)
        (_, target_id), (animal_id,) = _seed(
            finca_id, field_states=('Disponible', 'Mantenimiento'),
        )

    client.post(
        '/api/v1/animal-fields/transfer',
        json={'animal_ids': [animal_id], 'field_id': target_id, 'date': today.isoformat()},
        headers=auth_headers,
    )

    with app.app_context():
        target = db.session.get(Fields, target_id)
        assert target.state == LandStatus.Mantenimiento
        # El pastoreo sí se registra: el ganado entró aunque el potrero esté marcado.
        assert target.last_grazing_date == today


def test_bulk_remove_reports_breakdown_and_frees_field(client, auth_headers, app):
    """Retirar ganado deja el potrero disponible y explica qué pasó con cada animal."""
    today = date.today()
    with app.app_context():
        finca_id = _finca_id(auth_headers)
        (field_id, _), (assigned_id, loose_id) = _seed(
            finca_id, animal_records=('A001', 'A002'),
        )
        _assign(assigned_id, field_id, finca_id, today - timedelta(days=2))

    response = client.post(
        '/api/v1/animal-fields/bulk-remove',
        json={'animal_ids': [assigned_id, loose_id], 'date': today.isoformat()},
        headers=auth_headers,
    )
    assert response.status_code == 200

    body = response.get_json()
    meta = body['meta']
    assert meta['total_requested'] == 2
    assert meta['removed_count'] == 1
    assert meta['skipped_count'] == 1
    assert loose_id in meta['skipped_animal_ids']
    assert 'ya estaban sin potrero' in body['message']

    by_id = {int(field['id']): field for field in meta['fields']}
    assert by_id[field_id]['animal_count'] == 0
    assert by_id[field_id]['state'] == 'Disponible'

    with app.app_context():
        field = db.session.get(Fields, field_id)
        assert field.state == LandStatus.Disponible
        assert field.last_grazing_date == today


def test_bulk_remove_rejects_animals_from_another_finca(client, auth_headers, app):
    """Pedir el retiro de un animal ajeno falla en vez de reportar un retiro a medias."""
    with app.app_context():
        finca_id = _finca_id(auth_headers)
        (field_id, _), (animal_id,) = _seed(finca_id)
        _assign(animal_id, field_id, finca_id, date.today())

    response = client.post(
        '/api/v1/animal-fields/bulk-remove',
        json={'animal_ids': [animal_id, 999_999]},
        headers=auth_headers,
    )

    assert response.status_code >= 400
    assert 'no pertenecen a esta finca' in response.get_json()['message'].lower()
