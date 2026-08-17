import os
import pytest
from unittest.mock import MagicMock, patch
from app.utils.db_protector import init_db_protector


@pytest.mark.unit
class TestDbProtector:
    @patch.dict(
        os.environ, {"FLASK_ENV": "production", "ALLOW_DATABASE_DESTRUCTION": "false"}
    )
    def test_drop_all_blocked_in_production(self):
        app_mock = MagicMock()
        db_mock = MagicMock()
        original_drop = MagicMock()
        db_mock.drop_all = original_drop

        init_db_protector(app_mock, db_mock)

        # Al llamar a drop_all en producción, debería lanzar RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            db_mock.drop_all()

        assert "BLOQUEO DE SEGURIDAD" in str(exc_info.value)
        original_drop.assert_not_called()

    @patch.dict(
        os.environ, {"FLASK_ENV": "production", "ALLOW_DATABASE_DESTRUCTION": "true"}
    )
    def test_drop_all_allowed_in_production_with_bypass(self):
        app_mock = MagicMock()
        db_mock = MagicMock()
        original_drop = MagicMock()
        db_mock.drop_all = original_drop

        init_db_protector(app_mock, db_mock)

        # Debería permitir drop_all si la variable de bypass está establecida
        db_mock.drop_all()
        original_drop.assert_called_once()

    @patch.dict(
        os.environ, {"FLASK_ENV": "development", "ALLOW_DATABASE_DESTRUCTION": "false"}
    )
    def test_drop_all_warning_in_development(self):
        app_mock = MagicMock()
        db_mock = MagicMock()
        original_drop = MagicMock()
        db_mock.drop_all = original_drop

        with patch("app.utils.db_protector.logger") as mock_logger:
            init_db_protector(app_mock, db_mock)
            db_mock.drop_all()

            mock_logger.warning.assert_called_once_with(
                "Protector interceptó drop_all en modo seguro (no-producción)."
            )
            original_drop.assert_called_once()

    @patch.dict(os.environ, {"FLASK_ENV": "production", "FORCE_DB_CREATE": "false"})
    def test_create_all_skipped_in_production(self):
        app_mock = MagicMock()
        db_mock = MagicMock()
        original_create = MagicMock()
        db_mock.create_all = original_create

        with patch("app.utils.db_protector.logger") as mock_logger:
            init_db_protector(app_mock, db_mock)
            db_mock.create_all()

            mock_logger.info.assert_called_with(
                "Protector: db.create_all() omitido en producción (use migraciones)."
            )
            original_create.assert_not_called()

    @patch.dict(os.environ, {"FLASK_ENV": "production", "FORCE_DB_CREATE": "true"})
    def test_create_all_forced_in_production(self):
        app_mock = MagicMock()
        db_mock = MagicMock()
        original_create = MagicMock()
        db_mock.create_all = original_create

        init_db_protector(app_mock, db_mock)
        db_mock.create_all()
        original_create.assert_called_once()
