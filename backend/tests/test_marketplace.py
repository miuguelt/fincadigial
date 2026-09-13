"""Behavioral contract for private, participant-owned market exchanges."""
from uuid import uuid4

BASE = "/api/v1/market-offers"


def publish(client, headers, **changes):
    payload = dict(product_name="Café pergamino", offer_type="sale", quantity=20,
                   unit="kg", price=15000, delivery_location="Vélez, vereda Centro",
                   category="produce", community_visible=True)
    payload.update(changes)
    response = client.post(BASE, json=payload,
                           headers={**headers, "Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def send(client, headers, path, **payload):
    return client.post(f"{BASE}/{path}", json=payload,
                       headers={**headers, "Idempotency-Key": str(uuid4())})


def test_market_requires_consent_and_valid_numbers(client, token_for):
    headers = token_for("Operario")
    for changes in ({"community_visible": False}, {"quantity": -1},
                    {"price": float("inf")}, {"offer_type": "exchange"}):
        payload = dict(product_name="Café", offer_type="sale", quantity=1,
                       unit="kg", delivery_location="Vélez", community_visible=True)
        payload.update(changes)
        response = client.post(BASE, headers={**headers, "Idempotency-Key": str(uuid4())}, json=payload)
        assert response.status_code == 400
        assert response.get_json()["status"] == 400


def test_public_projection_and_owner_enforcement(client, token_for):
    owner, other = token_for("Operario"), token_for("Operario", "Educativa")
    offer = publish(client, owner, contact_phone="3001234567", share_phone=True)
    assert isinstance(offer["id"], str) and len(offer["id"]) == 36
    public = client.get(BASE, headers=other).get_json()["data"]["items"][0]
    assert public["product_name"] == offer["product_name"]
    assert "contact_phone" not in public
    assert "finca_id" not in public and "created_by" not in public
    assert public["is_owner"] is False
    response = client.patch(f"{BASE}/{offer['id']}", headers=other,
                            json={"status": "closed", "version": offer["version"]})
    assert response.status_code == 403
    assert client.get(BASE).status_code == 401


def test_conversation_idempotency_privacy_and_two_party_completion(client, token_for):
    owner, buyer, stranger = [token_for("Operario") for _ in range(3)]
    offer = publish(client, owner)
    first = send(client, buyer, f"{offer['id']}/conversations", message="¿Tiene disponible?")
    assert first.status_code == 201, first.get_json()
    thread = first.get_json()["data"]
    again = send(client, buyer, f"{offer['id']}/conversations", message="¿Tiene disponible?")
    assert again.get_json()["data"]["id"] == thread["id"]
    path = f"conversations/{thread['id']}"
    assert client.get(f"{BASE}/{path}", headers=stranger).status_code == 404
    proposal = send(client, owner, f"{path}/events", kind="proposal", version=thread["version"],
                    body="20 kg por $300.000. Entrega el sábado en el parque de Vélez.")
    assert proposal.status_code == 200, proposal.get_json()
    thread = proposal.get_json()["data"]
    assert send(client, owner, f"{path}/events", kind="accept", version=thread["version"]).status_code == 409
    accepted = send(client, buyer, f"{path}/events", kind="accept", version=thread["version"])
    assert accepted.status_code == 200, accepted.get_json()
    thread = accepted.get_json()["data"]
    key = str(uuid4())
    payload = dict(kind="complete", version=thread["version"])
    one = client.post(f"{BASE}/{path}/events", headers={**buyer, "Idempotency-Key": key}, json=payload)
    repeat = client.post(f"{BASE}/{path}/events", headers={**buyer, "Idempotency-Key": key}, json=payload)
    assert one.get_json()["data"]["status"] == "agreed"
    assert len(one.get_json()["data"]["events"]) == len(repeat.get_json()["data"]["events"])
    finished = send(client, owner, f"{path}/events", kind="complete", version=one.get_json()["data"]["version"])
    assert finished.get_json()["data"]["status"] == "completed"
    assert send(client, buyer, f"{path}/events", kind="message", body="nuevo").status_code == 409


def test_paused_offer_rejects_new_contact(client, token_for):
    owner, other = token_for("Operario"), token_for("Operario")
    offer = publish(client, owner)
    response = client.patch(f"{BASE}/{offer['id']}", headers=owner,
                            json={"status": "paused", "version": offer["version"]})
    assert response.status_code == 200
    assert send(client, other, f"{offer['id']}/conversations", message="Hola").status_code in (404, 409)


def test_block_preserves_history_and_stops_contact(client, token_for):
    owner, other = token_for("Operario"), token_for("Operario")
    offer = publish(client, owner)
    thread = send(client, other, f"{offer['id']}/conversations", message="Hola").get_json()["data"]
    path = f"conversations/{thread['id']}/events"
    blocked = send(client, owner, path, kind="block", version=thread["version"])
    assert blocked.status_code == 200
    assert blocked.get_json()["data"]["status"] == "blocked"
    assert send(client, other, path, kind="message", body="Otra vez").status_code == 409
    assert len(blocked.get_json()["data"]["events"]) == 2


def test_history_preserves_original_product_after_author_edits(client, token_for):
    owner, buyer = token_for("Operario"), token_for("Operario")
    offer = publish(client, owner)
    thread = send(client, buyer, f"{offer['id']}/conversations", message="Me interesa el café").get_json()["data"]
    changed = dict(product_name="Maíz", offer_type="sale", quantity=5, unit="kg", category="produce",
                   delivery_location="Vélez", community_visible=True, version=offer["version"])
    assert client.patch(f"{BASE}/{offer['id']}", headers=owner, json=changed).status_code == 200
    history = client.get(f"{BASE}/conversations/{thread['id']}", headers=buyer).get_json()["data"]
    assert history["offer"]["product_name"] == "Café pergamino"


def test_revoked_membership_and_inactive_account_are_rejected(client, token_for, db_session):
    from flask_jwt_extended import decode_token
    from app.models.user import User
    from app.models.user_finca import UserFinca
    headers = token_for("Operario")
    user_id = int(decode_token(headers["Authorization"].split()[1])["sub"])
    user = db_session.session.get(User, user_id)
    membership = UserFinca.query.filter_by(user_id=user_id, finca_id=user.finca_id).first()
    if not membership:
        membership = UserFinca(user_id=user_id, finca_id=user.finca_id, is_active=False)
        db_session.session.add(membership)
    membership.is_active = False
    db_session.session.commit()
    assert client.get(BASE, headers=headers).status_code == 403
    membership.is_active = True
    user.status = False
    db_session.session.commit()
    assert client.get(BASE, headers=headers).status_code == 403


def test_reports_are_private_and_nonadmin_cannot_moderate(client, token_for):
    owner, reporter, admin = token_for("Operario"), token_for("Operario"), token_for("Administrador")
    offer = publish(client, owner)
    report = send(client, reporter, f"{offer['id']}/report", reason="La publicación parece engañosa")
    assert report.status_code == 201
    assert client.get(f"{BASE}/reports", headers=reporter).status_code == 403
    reports = client.get(f"{BASE}/reports", headers=admin).get_json()["data"]
    assert len(reports) == 1
    assert client.patch(f"{BASE}/reports/{reports[0]['id']}", headers=admin, json={"action": "remove"}).status_code == 200
    assert send(client, reporter, f"{offer['id']}/conversations", message="Hola").status_code == 409
    assert client.patch(f"{BASE}/{offer['id']}", headers=owner, json={"status": "active", "version": offer["version"] + 1}).status_code == 403
