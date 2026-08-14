"""Regresiones para el marcado masivo de alertas."""

from flask_jwt_extended import decode_token

from app import db
from app.models import FarmType, Finca
from app.models.alerts import AnimalAlert, AlertPriority, AlertType


BASE = "/api/v1/alerts"


def _new_alert(finca_id: int) -> AnimalAlert:
    alert = AnimalAlert(
        finca_id=finca_id,
        alert_type=AlertType.CUSTOM,
        message="Alerta pendiente",
        priority=AlertPriority.HIGH,
        is_read=False,
    )
    db.session.add(alert)
    return alert


def test_read_all_is_bulk_and_tenant_scoped(client, token_for):
    headers = token_for("Administrador")
    token_str = headers["Authorization"].split(" ")[1]
    current_finca_id = decode_token(token_str)["finca_id"]
    other_finca = Finca.create(
        name="Finca aislada para alertas",
        type=FarmType.Educativa,
        is_active=True,
    )
    own_alerts = [_new_alert(current_finca_id) for _ in range(3)]
    foreign_alert = _new_alert(other_finca.id)
    db.session.commit()

    response = client.post(f"{BASE}/read-all", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["updated"] == 3
    db.session.expire_all()
    for alert in own_alerts:
        assert db.session.get(AnimalAlert, alert.id).is_read is True
    assert db.session.get(AnimalAlert, foreign_alert.id).is_read is False
