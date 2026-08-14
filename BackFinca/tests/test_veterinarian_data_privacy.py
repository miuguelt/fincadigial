"""
Pruebas de Verificación Veterinaria, Cumplimiento de Habeas Data y Derechos ARCO
"""

import pytest
from app import db
from app.models.user import User, Role


from flask_jwt_extended import create_access_token
from app.models import Finca, FarmType

def test_veterinarian_verification_flow(app, client):
    with app.app_context():
        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(name="Finca Vet Test", type=FarmType.Tradicional)

        vet = User.create(
            identification=99887766,
            fullname="Dr. Roberto Carlos",
            email="vet_roberto@example.com",
            phone="3119998877",
            password="Password123!",
            role=Role.Veterinario,
            finca_id=finca.id,
            habeas_data_accepted=True,
            terms_accepted=True,
        )
        token = create_access_token(identity=str(vet.id), additional_claims={'id': vet.id, 'role': 'Veterinario', 'fullname': vet.fullname})
        headers = {'Authorization': f'Bearer {token}'}

    # 2. Registrar tarjeta profesional
    res_req = client.post('/api/v1/veterinarians/request-verification', json={
        'professional_card': 'COMVEZCOL-98765',
        'professional_specialty': 'Cirugía y Reproducción Bovino',
    }, headers=headers)

    assert res_req.status_code == 200
    assert res_req.json['data']['professional_card'] == 'COMVEZCOL-98765'
    assert res_req.json['data']['is_verified_professional'] is False

    # 3. Consulta pública de verificación (Garantía Habeas Data / Resguardo de PII)
    res_verify = client.get('/api/v1/veterinarians/verify/COMVEZCOL-98765')
    assert res_verify.status_code == 200
    data = res_verify.json['data']
    assert data['fullname'] == 'Dr. Roberto Carlos'
    assert data['professional_card'] == 'COMVEZCOL-98765'
    assert data['professional_specialty'] == 'Cirugía y Reproducción Bovino'
    assert data['is_verified_professional'] is False

    # Verificar que PII confidencial NO esté presente en la respuesta pública
    assert 'identification' not in data
    assert 'phone' not in data
    assert 'address' not in data
    assert 'email' not in data


def test_arco_rights_export_and_deletion(app, client):
    with app.app_context():
        user = User.create(
            identification=88776655,
            fullname="Usuario Prueba Arco",
            email="arco_user@example.com",
            phone="3008877665",
            password="Password123!",
            role=Role.Propietario,
            habeas_data_accepted=True,
            terms_accepted=True,
        )
        token = create_access_token(identity=str(user.id), additional_claims={'id': user.id, 'role': 'Propietario', 'fullname': user.fullname})
        headers = {'Authorization': f'Bearer {token}'}

    # 1. Exportar datos (Portabilidad)
    res_export = client.get('/api/v1/users/me/export-data', headers=headers)
    assert res_export.status_code == 200
    assert res_export.json['data']['user_profile']['email'] == 'arco_user@example.com'
    assert res_export.json['data']['habeas_data_status']['accepted'] is True

    # 2. Solicitar supresión de datos (Supresión / Cancelación)
    res_del = client.post('/api/v1/users/me/request-deletion', headers=headers)
    assert res_del.status_code == 200
    assert res_del.json['data']['status'] == 'Solicitud registrada'
