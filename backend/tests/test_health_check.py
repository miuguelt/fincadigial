from types import SimpleNamespace

from app.utils.health_check import HealthChecker


def test_basic_health_reports_the_active_flask_environment(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json()["data"]["environment"] == "testing"


def test_liveness_health_does_not_require_external_dependencies(client):
    response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.get_json() == {
        "status": "ok",
        "service": "villaluz-backend",
    }


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


def test_probe_celery_handles_unreachable_broker(monkeypatch):
    class _FailingConnection:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def ensure_connection(self, **kwargs):
            raise ConnectionError("Host inalcanzable")

    configured_app = SimpleNamespace(
        connection_for_read=lambda: _FailingConnection(),
        control=_Control(_Inspector({})),
    )

    monkeypatch.setattr("app.celery_ext.celery", configured_app)

    result = HealthChecker()._probe_celery()

    assert result["status"] == "warning"
    assert result["workers_active"] == 0
    assert "Host inalcanzable" in result["detail"]
    assert configured_app.control.inspect_calls == 0


def test_probe_celery_skips_ping_on_stats_error(monkeypatch):
    class _ErrorInspector:
        def __init__(self):
            self.ping_called = False

        def stats(self):
            raise RuntimeError("Error de broker al consultar stats")

        def ping(self):
            self.ping_called = True
            return {}

    inspector = _ErrorInspector()
    configured_app = SimpleNamespace(control=_Control(inspector))

    monkeypatch.setattr("app.celery_ext.celery", configured_app)

    result = HealthChecker()._probe_celery()

    assert result["status"] == "warning"
    assert result["workers_active"] == 0
    assert not inspector.ping_called
