from flask_jwt_extended import create_access_token

from app import db
from app.models import FarmType, Finca
from app.models.chat_message import ChatMessage
from app.models.user import ApprovalStatus, Role, User
from app.models.user_finca import UserFinca


def _create_finca(name: str) -> Finca:
    finca = Finca.create(name=name, type=FarmType.Tradicional, is_active=True)
    db.session.commit()
    return finca


def _create_user(index: int, name: str, finca: Finca, *, status: bool = True) -> User:
    from tests.conftest import get_test_password

    user = User.create(
        identification=9_100_000 + index,
        fullname=name,
        email=f"chat-{index}@test.villaluz",
        phone=f"3109{index:06d}",
        password=get_test_password(),
        role=Role.Operario,
        finca_id=finca.id,
        approval_status=ApprovalStatus.Approved,
        status=status,
    )
    db.session.commit()
    return user


def _headers(user: User, finca: Finca) -> dict[str, str]:
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "role": user.role.value,
            "finca_id": finca.id,
            "finca_type": finca.type.value,
        },
    )
    return {"Authorization": f"Bearer {token}"}


def test_contacts_use_active_multi_finca_membership(app, client):
    with app.app_context():
        shared_finca = _create_finca("Chat compartido")
        other_finca = _create_finca("Chat secundaria")
        sender = _create_user(1, "Remitente", shared_finca)
        multi_finca = _create_user(2, "Personal multi finca", other_finca)
        inactive = _create_user(3, "Personal inactivo", shared_finca, status=False)
        UserFinca.assign(
            user_id=multi_finca.id,
            finca_id=shared_finca.id,
            role=Role.Veterinario.value,
            is_active=True,
            is_primary=False,
        )
        headers = _headers(sender, shared_finca)
        multi_finca_id = multi_finca.id
        inactive_id = inactive.id

    response = client.get("/api/v1/chat/contacts", headers=headers)

    assert response.status_code == 200
    contacts = {item["id"]: item for item in response.get_json()["data"]}
    contact_ids = set(contacts)
    assert multi_finca_id in contact_ids
    assert inactive_id not in contact_ids
    assert contacts[multi_finca_id]["role"] == Role.Veterinario.value


def test_send_rejects_recipient_without_shared_finca(app, client):
    with app.app_context():
        sender_finca = _create_finca("Chat origen")
        remote_finca = _create_finca("Chat aislado")
        sender = _create_user(11, "Remitente aislado", sender_finca)
        recipient = _create_user(12, "Destinatario aislado", remote_finca)
        headers = _headers(sender, sender_finca)
        recipient_id = recipient.id

    response = client.post(
        "/api/v1/chat/send",
        headers=headers,
        json={"recipient_id": recipient_id, "message": "No debe cruzar fincas"},
    )

    assert response.status_code == 403
    with app.app_context():
        assert ChatMessage.query.count() == 0


def test_send_is_idempotent_for_client_message_id(app, client):
    with app.app_context():
        finca = _create_finca("Chat idempotente")
        sender = _create_user(21, "Remitente idempotente", finca)
        recipient = _create_user(22, "Destinatario idempotente", finca)
        headers = _headers(sender, finca)
        recipient_id = recipient.id

    body = {
        "recipient_id": recipient_id,
        "message": "Una sola vez",
        "client_message_id": "test-client-message-0001",
    }
    first = client.post("/api/v1/chat/send", headers=headers, json=body)
    second = client.post("/api/v1/chat/send", headers=headers, json=body)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.get_json()["data"]["id"] == second.get_json()["data"]["id"]
    assert second.get_json()["data"]["client_message_id"] == body["client_message_id"]
    with app.app_context():
        assert ChatMessage.query.count() == 1


def test_opening_history_marks_read_and_emits_receipt(app, client, monkeypatch):
    emitted_receipts: list[dict] = []

    with app.app_context():
        finca = _create_finca("Chat lectura")
        sender = _create_user(31, "Remitente lectura", finca)
        recipient = _create_user(32, "Destinatario lectura", finca)
        sender_headers = _headers(sender, finca)
        recipient_headers = _headers(recipient, finca)
        sender_id = sender.id
        recipient_id = recipient.id

    monkeypatch.setattr(
        "app.namespaces.core.chat_namespace.EventService.emit_chat_read",
        lambda **payload: emitted_receipts.append(payload),
    )

    sent = client.post(
        "/api/v1/chat/send",
        headers=sender_headers,
        json={
            "recipient_id": recipient_id,
            "message": "Confirma lectura",
            "client_message_id": "test-read-receipt-0001",
        },
    )
    message_id = sent.get_json()["data"]["id"]

    history = client.get(
        f"/api/v1/chat/history/{sender_id}",
        headers=recipient_headers,
    )

    assert history.status_code == 200
    item = next(row for row in history.get_json()["data"] if row["id"] == message_id)
    assert item["is_read"] is True
    assert item["read_at"] is not None
    assert emitted_receipts == [
        {
            "message_ids": [message_id],
            "sender_id": sender_id,
            "reader_id": recipient_id,
            "finca_id": finca.id,
        }
    ]
