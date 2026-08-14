from unittest.mock import patch

from app.models.alerts import (
    AlertPriority,
    AlertType,
    build_alert_dedupe_key,
)


def test_dedupe_key_ignores_dynamic_measurements_for_same_condition():
    first = build_alert_dedupe_key(
        finca_id=1,
        animal_id=7,
        alert_type=AlertType.REPRODUCTION,
        message="Celo probable para el 12/08/2026.",
    )
    next_day = build_alert_dedupe_key(
        finca_id=1,
        animal_id=7,
        alert_type=AlertType.REPRODUCTION,
        message="Celo probable para el 13/08/2026.",
    )
    other_condition = build_alert_dedupe_key(
        finca_id=1,
        animal_id=7,
        alert_type=AlertType.REPRODUCTION,
        message="Parto probable para el 13/08/2026.",
    )

    assert first == next_day
    assert first != other_condition
    assert len(first) == 64


def test_dedupe_key_keeps_farms_and_animals_isolated():
    common = {
        "alert_type": AlertType.HEALTH,
        "message": "Temperatura elevada: 40.2 °C",
    }

    assert build_alert_dedupe_key(finca_id=1, animal_id=7, **common) != (
        build_alert_dedupe_key(finca_id=2, animal_id=7, **common)
    )
    assert build_alert_dedupe_key(finca_id=1, animal_id=7, **common) != (
        build_alert_dedupe_key(finca_id=1, animal_id=8, **common)
    )


def test_manual_evaluation_is_queued_instead_of_blocking_request(client, auth_headers):
    queued = type("QueuedTask", (), {"id": "alert-task-123"})()

    with patch(
        "app.tasks.alert_tasks.evaluate_all_alerts.delay",
        return_value=queued,
    ) as delay:
        response = client.post("/api/v1/alerts/evaluate", headers=auth_headers)

    assert response.status_code == 202
    assert response.get_json()["data"]["task_id"] == "alert-task-123"
    delay.assert_called_once_with(1)


def test_alert_engine_assigns_stable_dedupe_key(db_session):
    from app.services.alert_engine import AlertEngine

    created = AlertEngine._trigger_if_not_exists(
        animal_id=9,
        finca_id=1,
        alert_type=AlertType.HEALTH,
        message="Peso crítico: 210.5 kg",
        priority=AlertPriority.MEDIUM,
    )
    alert = next(iter(db_session.session.new))

    assert created is True
    assert alert.dedupe_key == build_alert_dedupe_key(
        finca_id=1,
        animal_id=9,
        alert_type=AlertType.HEALTH,
        message="Peso crítico: 208.0 kg",
    )


def test_alert_list_hides_superseded_duplicate_conditions(
    client, auth_headers, db_session
):
    from app.models.alerts import AnimalAlert
    from app.models.finca import Finca

    finca = Finca.query.first()
    older = AnimalAlert(
        finca_id=finca.id,
        animal_id=None,
        alert_type=AlertType.HEALTH,
        message="Temperatura elevada: 40.1 °C",
        priority=AlertPriority.HIGH,
        superseded_by_id=999_999,
    )
    current = AnimalAlert(
        finca_id=finca.id,
        animal_id=None,
        alert_type=AlertType.HEALTH,
        message="Temperatura elevada: 40.3 °C",
        priority=AlertPriority.HIGH,
    )
    db_session.session.add_all([older, current])
    db_session.session.commit()

    response = client.get("/api/v1/alerts/", headers=auth_headers)

    assert response.status_code == 200
    body = response.get_json()
    assert body["meta"]["pagination"]["total_items"] == 1
    assert body["data"][0]["id"] == current.id
