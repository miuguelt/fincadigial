"""Reglas de veracidad para los indicadores visibles en los dashboards."""

from datetime import date

from app.services.analytics.dashboard import herd_kpis
from app.services.alert_rules_health import _evaluate_control_alert
from app.namespaces.analytics.alerts import _display_alert_message
from app.namespaces.analytics.ai_insights import _display_insight_content


def test_health_trend_marks_weeks_without_controls_as_unknown(monkeypatch):
    """Una semana sin controles no prueba que la salud sea del 100 %."""

    class EmptyQuery:
        def filter(self, *args, **kwargs):
            return self

        def one(self):
            return (0, 0, 0, 0, 0, 0, 0, 0)

    class EmptySession:
        def query(self, *args, **kwargs):
            return EmptyQuery()

    monkeypatch.setattr(herd_kpis.db, "session", EmptySession())

    trend = herd_kpis.health_trend(finca_id=1, has_animals=True)

    assert len(trend) == 4
    assert all(point["value"] is None for point in trend)


def test_complete_dashboard_does_not_claim_zero_change_without_comparison(
    client, token_for
):
    response = client.get(
        "/api/v1/analytics/dashboard/complete",
        headers=token_for("Administrador"),
    )

    assert response.status_code == 200
    cards = response.get_json()["data"]["kpi_resumen"]["cards"]
    assert cards
    assert all("cambio" not in card for card in cards)


def test_complete_dashboard_preserves_unavailable_private_metrics(client, token_for):
    response = client.get(
        "/api/v1/analytics/dashboard/complete",
        headers=token_for("Aprendiz"),
    )

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["tareas_pendientes"]["valor"] is None
    assert data["tareas_pendientes"]["cambio_porcentual"] is None
    assert data["usuarios_activos"]["valor"] is None


def test_missing_control_alert_does_not_expose_sentinel_days(monkeypatch):
    messages = []

    monkeypatch.setattr(
        "app.services.alert_rules_health.AlertEngine._get_param_int",
        lambda name: {"control_days_critical": 90, "control_days_high": 60, "control_days_medium": 30}[name],
    )

    _evaluate_control_alert(
        last_ctrl=None,
        today=date(2026, 9, 14),
        age_months=12,
        trig=lambda _type, message, _priority: messages.append(message),
    )

    assert len(messages) == 1
    assert "9999" not in messages[0]
    assert "Sin historia clínica" in messages[0]


def test_alert_payload_sanitizes_historical_sentinel_messages():
    assert _display_alert_message("Control sanitario CRÍTICO: 9999 días sin revisión.") == (
        "Control sanitario CRÍTICO: sin historia clínica registrada."
    )


def test_insight_payload_does_not_expose_internal_storage_marker():
    assert _display_insight_content("Revisa los registros de la finca. db") == (
        "Revisa los registros de la finca."
    )
