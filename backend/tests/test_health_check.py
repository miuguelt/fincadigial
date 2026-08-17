from types import SimpleNamespace

from app.utils.health_check import HealthChecker


def test_basic_health_reports_the_active_flask_environment(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json()["data"]["environment"] == "testing"


class _Inspector:
    def __init__(self, stats_result):
        self.stats_result = stats_result
        self.stats_calls = 0

    def stats(self):
        self.stats_calls += 1
        return self.stats_result

    def ping(self):
        raise AssertionError("ping no debe ejecutarse cuando stats ya responde")


class _Control:
    def __init__(self, inspector):
        self.inspector = inspector
        self.inspect_calls = 0

    def inspect(self, **_kwargs):
        self.inspect_calls += 1
        return self.inspector


def test_probe_celery_uses_the_configured_villaluz_app(monkeypatch):
    inspector = _Inspector({"villaluz-worker": {"pool": {"max-concurrency": 1}}})
    configured_app = SimpleNamespace(control=_Control(inspector))
    default_app = SimpleNamespace(control=_Control(_Inspector({})))

    monkeypatch.setattr("celery.current_app", default_app)
    monkeypatch.setattr("app.celery_ext.celery", configured_app)

    result = HealthChecker()._probe_celery()

    assert result["status"] == "healthy"
    assert result["workers_active"] == 1
    assert configured_app.control.inspect_calls == 1
    assert default_app.control.inspect_calls == 0
