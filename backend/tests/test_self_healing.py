import pytest
from unittest.mock import patch
from app.services.self_healing_service import SelfHealingManager


@pytest.mark.unit
@pytest.mark.critical
class TestSelfHealing:
    @patch("app.services.self_healing_service.cache")
    @patch("app.services.self_healing_service.SelfHealingManager._check_db_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_workers_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_redis_latency")
    @patch("app.services.self_healing_service.SelfHealingManager._log_healing_action")
    def test_run_checkup_healthy(
        self, mock_log, mock_redis, mock_workers, mock_db, mock_cache
    ):
        """Test run_checkup when all systems are healthy."""
        mock_db.return_value = True
        mock_workers.return_value = True
        mock_redis.return_value = True

        res = SelfHealingManager.run_checkup()

        assert res["status"] == "healthy"
        assert len(res["actions_taken"]) == 0
        mock_cache.set.assert_called_once()
        mock_log.assert_not_called()

    @patch("app.services.self_healing_service.cache")
    @patch("app.services.self_healing_service.SelfHealingManager._check_db_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_workers_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_redis_latency")
    @patch("app.services.self_healing_service.SelfHealingManager._log_healing_action")
    def test_run_checkup_db_unhealthy(
        self, mock_log, mock_redis, mock_workers, mock_db, mock_cache
    ):
        """Test run_checkup when DB is unhealthy."""
        mock_db.return_value = False
        mock_workers.return_value = True
        mock_redis.return_value = True

        res = SelfHealingManager.run_checkup()

        assert res["status"] == "repaired"
        assert "DATABASE_RECONNECT_ATTEMPTED" in res["actions_taken"]
        mock_log.assert_called_once_with(res)

    @patch("app.services.self_healing_service.cache")
    @patch("app.services.self_healing_service.SelfHealingManager._check_db_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_workers_health")
    @patch("app.services.self_healing_service.SelfHealingManager._check_redis_latency")
    @patch("app.services.self_healing_service.SelfHealingManager._log_healing_action")
    def test_run_checkup_workers_and_redis_unhealthy(
        self, mock_log, mock_redis, mock_workers, mock_db, mock_cache
    ):
        """Test run_checkup when workers and Redis cache are unhealthy."""
        mock_db.return_value = True
        mock_workers.return_value = False
        mock_redis.return_value = False

        res = SelfHealingManager.run_checkup()

        assert res["status"] == "warning"
        assert "WORKERS_WARNING_EMITTED" in res["actions_taken"]
        assert "REDIS_CACHE_PURGE_SUGGESTED" in res["actions_taken"]
        mock_log.assert_called_once_with(res)

    def test_check_db_health_success(self, app):
        """Test _check_db_health on successful query."""
        with app.app_context():
            res = SelfHealingManager._check_db_health()
            assert res is True

    @patch("app.services.self_healing_service.db")
    def test_check_db_health_failure(self, mock_db):
        """Test _check_db_health when DB query fails."""
        mock_db.session.execute.side_effect = Exception("Connection lost")
        res = SelfHealingManager._check_db_health()
        assert res is False
        mock_db.session.remove.assert_called_once()
        mock_db.engine.dispose.assert_called_once()

    @patch("app.services.self_healing_service.cache")
    def test_check_redis_latency_success(self, mock_cache):
        """Test _check_redis_latency under normal latency."""
        res = SelfHealingManager._check_redis_latency()
        assert res is True
        mock_cache.set.assert_called_once()

    @patch("app.services.self_healing_service.cache")
    def test_check_redis_latency_slow(self, mock_cache):
        """Test _check_redis_latency under high latency."""
        import time

        # Simulate delay in cache.set
        def slow_set(*args, **kwargs):
            time.sleep(0.25)

        mock_cache.set.side_effect = slow_set

        res = SelfHealingManager._check_redis_latency()
        assert res is False
