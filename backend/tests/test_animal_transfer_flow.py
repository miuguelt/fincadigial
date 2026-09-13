"""Pruebas de venta consentida y asociación de historial animal."""

from datetime import date

from flask_jwt_extended import create_access_token

from app import db
from app.models import Animals, Breeds, Finca, FarmType, Species, User, UserFinca
from app.models.animals import AnimalStatus
from app.models.user import ApprovalStatus, Role


def _headers(app, user, finca):
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "identification": user.identification,
            "role": user.role.value,
            "fullname": user.fullname,
            "finca_id": finca.id,
            "finca_type": finca.type.value,
        },
    )
    return {"Authorization": f"Bearer {token}"}


def _destination_user(app):
    finca = Finca(
        name="Finca Destino Transferencia",
        type=FarmType.Tradicional,
        is_active=True,
    )
    db.session.add(finca)
    db.session.flush()
    user = User(
        identification=667788990,
        fullname="Comprador Transferencia",
        email="comprador.transferencia@test.villaluz",
        phone="3006677889",
        role=Role.Administrador,
        finca_id=finca.id,
        approval_status=ApprovalStatus.Approved,
        status=True,
    )
    user.set_password("Test_transfer_123!")
    db.session.add(user)
    db.session.flush()
    UserFinca.assign(
        user_id=user.id,
        finca_id=finca.id,
        role=Role.Administrador.value,
        is_active=True,
        is_primary=True,
        commit=False,
    )
    db.session.commit()
    return finca, user


def _breed():
    breed = Breeds.query.first()
    if breed:
        return breed
    species = Species.query.first()
    if not species:
        species = Species(name="Bovino")
        db.session.add(species)
        db.session.flush()
    breed = Breeds(name="Criollo", species_id=species.id, is_active=True)
    db.session.add(breed)
    db.session.flush()
    return breed


def test_sale_claim_requires_owner_and_keeps_same_animal_history(client, app, auth_headers, db_session):
    with app.app_context():
        origin = Finca.query.first()
        seller = User.query.filter_by(email="admin@villaluz.com").first()
        breed = _breed()
        animal = Animals(
            record="TRANSFER-001",
            sex="Macho",
            birth_date=date(2024, 1, 15),
            weight=320,
            status=AnimalStatus.Vivo,
            finca_id=origin.id,
            breeds_id=breed.id,
        )
        animal.qr_code = Animals.generate_qr_code()
        db.session.add(animal)
        db.session.commit()
        destination, buyer = _destination_user(app)

        sold = client.post(
            "/api/v1/animals/transfers/sell",
            json={"animal_id": animal.id, "sale_date": "2026-09-12", "buyer_name": "Comprador"},
            headers=auth_headers,
        )
        assert sold.status_code == 201
        claim_code = sold.json["data"]["claim_code"]
        assert claim_code.startswith("VL-")

        registration = client.post(
            "/api/v1/animals/transfers/register",
            json={
                # La finca destino puede asignar su registro local; el código
                # privado y los atributos estables siguen identificando el
                # mismo animal.
                "record": "DEST-TRANSFER-001",
                "birth_date": "2024-01-15",
                "sex": "Macho",
                "weight": 325,
                "breeds_id": breed.id,
                "claim_code": claim_code,
                "request_history": True,
            },
            headers=_headers(app, buyer, destination),
        )
        assert registration.status_code == 202
        assert registration.json["data"]["registration_status"] == "TRANSFER_PENDING"

        notifications = client.get(
            "/api/v1/users/me/notifications?status=pending", headers=auth_headers
        )
        transfer_notification = next(
            item for item in notifications.json["data"] if item["type"] == "ANIMAL_TRANSFER_REQUEST"
        )
        unauthorized = client.patch(
            f"/api/v1/notifications/{transfer_notification['id']}",
            json={"action": "approve"},
            headers=_headers(app, buyer, destination),
        )
        assert unauthorized.status_code == 404
        decision = client.patch(
            f"/api/v1/notifications/{transfer_notification['id']}",
            json={"action": "approve"},
            headers=auth_headers,
        )
        assert decision.status_code == 200

        db.session.expire_all()
        persisted = db.session.get(Animals, animal.id)
        assert persisted.finca_id == destination.id
        assert persisted.status == AnimalStatus.Vivo
        assert persisted.record == "DEST-TRANSFER-001"

        history = client.get(
            f"/api/v1/animals/transfers/{animal.id}/portable-history",
            headers=_headers(app, buyer, destination),
        )
        assert history.status_code == 200
        assert history.json["data"]["animal_id"] == animal.id
        assert history.json["data"]["history_shared"] is True


def test_registration_without_match_creates_local_animal(client, app, token_for, db_session):
    headers = token_for("Administrador")
    with app.app_context():
        breed = _breed()
        response = client.post(
            "/api/v1/animals/transfers/register",
            json={
                "record": "LOCAL-REGISTER-001",
                "birth_date": "2025-02-01",
                "sex": "Hembra",
                "weight": 180,
                "breeds_id": breed.id,
                "request_history": True,
                "official_code": "ICA-PENDING-LOCAL-001",
            },
            headers=headers,
        )
        assert response.status_code == 201
        assert response.json["data"]["registration_status"] == "CREATED_LOCAL"
        assert response.json["data"]["animal"]["id"]
        assert response.json["data"]["identity"]["status"] == "UNVERIFIED"
