"""End-to-end API tests for farmer-to-veterinarian technical assistance."""

import base64
import json

from app.api.sse import _event_visible_to_user
from app.services.push_notification_service import PushNotificationService


BASE = "/api/v1/technical-assistance"


def _user_id(headers: dict) -> int:
    token = headers["Authorization"].split(" ", 1)[1]
    encoded_payload = token.split(".")[1]
    padded = encoded_payload + "=" * (-len(encoded_payload) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    return int(payload["sub"])


def test_request_is_notified_claimed_and_answered(client, token_for):
    farmer_headers = token_for("Operario", finca_type="Tradicional")
    veterinarian_headers = token_for("Veterinario", finca_type="Tradicional")
    farmer_id = _user_id(farmer_headers)
    veterinarian_id = _user_id(veterinarian_headers)

    network_response = client.get(f"{BASE}/network", headers=farmer_headers)
    assert network_response.status_code == 200
    network = network_response.get_json()["data"]
    assert network["total"] >= 1
    assert veterinarian_id in [item["id"] for item in network["veterinarians"]]

    create_response = client.post(
        f"{BASE}/request",
        headers=farmer_headers,
        json={
            "title": "Ternera con poco apetito",
            "category": "pecuario",
            "description": "La ternera no come desde ayer y se ve decaída.",
            "priority": "high",
            # These values must be ignored in favor of the JWT context.
            "requester_user_id": veterinarian_id,
            "assigned_user_id": veterinarian_id,
        },
    )
    assert create_response.status_code == 201, create_response.get_data(as_text=True)
    created_payload = create_response.get_json()["data"]
    request_item = created_payload["request"]
    request_id = request_item["id"]
    assert request_item["requester_user_id"] == farmer_id
    assert request_item["assigned_user_id"] is None
    assert created_payload["notification"]["recipients"] >= 1

    forbidden_inbox = client.get(f"{BASE}/inbox", headers=farmer_headers)
    assert forbidden_inbox.status_code == 403

    inbox_response = client.get(f"{BASE}/inbox", headers=veterinarian_headers)
    assert inbox_response.status_code == 200
    inbox = inbox_response.get_json()["data"]
    assert request_id in [item["id"] for item in inbox["items"]]
    assert inbox["counts"]["waiting"] >= 1

    claim_response = client.post(
        f"{BASE}/{request_id}/claim",
        headers=veterinarian_headers,
        json={},
    )
    assert claim_response.status_code == 200, claim_response.get_data(as_text=True)
    claimed = claim_response.get_json()["data"]
    assert claimed["assigned_user_id"] == veterinarian_id
    assert claimed["status"] == "in_progress"

    response = client.post(
        f"{BASE}/{request_id}/respond",
        headers=veterinarian_headers,
        json={
            "notes": "Toma la temperatura, ofrece agua limpia y revisa las mucosas. Si supera 39,5 °C, solicita valoración presencial.",
            "resolved": True,
        },
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    answered = response.get_json()["data"]
    assert answered["status"] == "resolved"
    assert answered["resolved_at"]
    assert "Toma la temperatura" in answered["resolution_notes"]
    assert answered["assignee"]["fullname"]

    mine_response = client.get(f"{BASE}/mine", headers=farmer_headers)
    assert mine_response.status_code == 200
    mine = mine_response.get_json()["data"]
    farmer_copy = next(item for item in mine["items"] if item["id"] == request_id)
    assert farmer_copy["status"] == "resolved"
    assert farmer_copy["resolution_notes"] == answered["resolution_notes"]


def test_targeted_sse_event_is_private_to_recipient():
    payload = json.dumps({
        "endpoint": "user_notification",
        "recipient_id": 42,
        "data": {"type": "technical_assistance_request"},
    })

    assert _event_visible_to_user(payload, "42") is True
    assert _event_visible_to_user(payload, "7") is False
    assert _event_visible_to_user(json.dumps({"endpoint": "technical-assistance"}), "7") is True


def test_non_urgent_request_uses_in_app_channel_without_push(client, token_for, monkeypatch):
    farmer_headers = token_for("Operario", finca_type="Tradicional")
    push_calls = []

    monkeypatch.setattr(
        PushNotificationService,
        "send_to_users",
        lambda **kwargs: push_calls.append(kwargs) or {},
    )

    response = client.post(
        f"{BASE}/request",
        headers=farmer_headers,
        json={
            "title": "Revisión de alimentación",
            "category": "alimentacion",
            "description": "Necesito orientación para ajustar la ración de la semana.",
            "priority": "medium",
        },
    )

    assert response.status_code == 201, response.get_data(as_text=True)
    assert response.get_json()["data"]["notification"]["push_policy"] == "urgent_only"
    assert push_calls == []
