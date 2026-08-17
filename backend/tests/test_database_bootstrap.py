import json

import pytest

from app.models import Finca, Species
from app.models.animal_images import AnimalImages
from app.models.farm_entity_alerts import FarmEntityAlertConfig
from app.models.lactation_cycle import LactationCycle
from app.models.production_target import ProductionTarget
from app.models.route_administration import RouteAdministration
from app.models.seasonal_adjustments import SeasonalAdjustment
from app.models.user import Role, User
from app.models.user_finca import UserFinca
from app.services.bootstrap import run_database_bootstrap
from app.services.bootstrap.config import BootstrapConfigurationError, load_bootstrap_settings


@pytest.mark.unit
def test_bootstrap_requires_explicit_admin_credentials(monkeypatch):
    monkeypatch.setenv("VILLALUZ_BOOTSTRAP_ENABLED", "true")
    monkeypatch.delenv("VILLALUZ_ADMIN_IDENTIFICATION", raising=False)
    monkeypatch.delenv("VILLALUZ_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("VILLALUZ_ADMIN_PASSWORD", raising=False)

    with pytest.raises(BootstrapConfigurationError, match="VILLALUZ_ADMIN"):
        load_bootstrap_settings()


@pytest.mark.unit
def test_bootstrap_is_idempotent_and_applies_defaults_per_farm(app, db_session, monkeypatch):
    monkeypatch.setenv("VILLALUZ_BOOTSTRAP_ENABLED", "true")
    monkeypatch.setenv("VILLALUZ_ADMIN_IDENTIFICATION", "987654321")
    monkeypatch.setenv("VILLALUZ_ADMIN_EMAIL", "admin.bootstrap@villaluz.co")
    monkeypatch.setenv("VILLALUZ_ADMIN_PASSWORD", "Test-Only-Password-123!")
    monkeypatch.setenv("VILLALUZ_ADMIN_PHONE", "3209876543")
    monkeypatch.setenv(
        "VILLALUZ_BOOTSTRAP_FINCAS_JSON",
        json.dumps(
            [
                {"name": "Bootstrap Norte", "type": "Tradicional"},
                {"name": "Bootstrap Escuela", "type": "Educativa"},
            ]
        ),
    )

    with app.app_context():
        first = run_database_bootstrap()
        counts = (
            Finca.query.count(),
            User.query.count(),
            UserFinca.query.count(),
            RouteAdministration.query.count(),
            SeasonalAdjustment.query.count(),
            Species.query.count(),
        )
        second = run_database_bootstrap()
        assert first["status"] == "completed"
        assert second["status"] == "completed"
        assert counts == (
            Finca.query.count(),
            User.query.count(),
            UserFinca.query.count(),
            RouteAdministration.query.count(),
            SeasonalAdjustment.query.count(),
            Species.query.count(),
        )
        assert Finca.query.count() == 2
        assert User.query.filter_by(role=Role.Administrador).count() == 1
        assert UserFinca.query.count() == 2
        assert SeasonalAdjustment.query.count() == 24
        for finca in Finca.query.all():
            assert RouteAdministration.query.filter_by(finca_id=finca.id).count() > 0


@pytest.mark.unit
def test_demo_fixture_is_separate_and_tenant_scoped(app, db_session, monkeypatch):
    monkeypatch.setenv("VILLALUZ_BOOTSTRAP_ENABLED", "true")
    monkeypatch.setenv("VILLALUZ_ADMIN_IDENTIFICATION", "987654322")
    monkeypatch.setenv("VILLALUZ_ADMIN_EMAIL", "admin.demo.bootstrap@villaluz.co")
    monkeypatch.setenv("VILLALUZ_ADMIN_PASSWORD", "Test-Only-Password-123!")
    monkeypatch.setenv("VILLALUZ_ADMIN_PHONE", "3209876544")
    monkeypatch.setenv("VILLALUZ_DEMO_PASSWORD", "Demo-Only-Password-123!")
    monkeypatch.setenv("VILLALUZ_SEED_DEMO_DATA", "true")

    with app.app_context():
        run_database_bootstrap()
        assert Finca.query.filter(Finca.name.like("Demo - %")).count() == 2
        assert User.query.filter(User.email.like("demo.%")).count() == 7
        assert AnimalImages.query.count() == 2
        assert LactationCycle.query.count() == 2
        assert ProductionTarget.query.count() == 2
        assert FarmEntityAlertConfig.query.count() >= 2
        for finca in Finca.query.filter(Finca.name.like("Demo - %")).all():
            assert User.query.filter_by(finca_id=finca.id).count() > 0
            assert (
                UserFinca.query.join(User, User.id == UserFinca.user_id)
                .filter(UserFinca.finca_id == finca.id)
                .count()
                > 0
            )
        before = User.query.count()
        run_database_bootstrap()
        assert User.query.count() == before
