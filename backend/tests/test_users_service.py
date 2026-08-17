import pytest
from datetime import datetime
from app.services.users_service import (
    _parse_activity_datetime,
    _format_activity_item,
    get_user_statistics,
    get_user_status_stats,
    get_user_roles_stats,
    build_user_activity_query,
)
from app.models.user import User
from app.models.activity_log import ActivityLog


@pytest.mark.unit
@pytest.mark.critical
def test_parse_activity_datetime():
    # Test empty values
    assert _parse_activity_datetime(None) is None
    assert _parse_activity_datetime("") is None
    assert _parse_activity_datetime("   ") is None

    # Test datetime objects
    dt = datetime.now()
    assert _parse_activity_datetime(dt) == dt

    # Test ISO format strings (with and without Z)
    assert _parse_activity_datetime("2026-05-21T10:00:00Z") == datetime.fromisoformat(
        "2026-05-21T10:00:00+00:00"
    )
    assert _parse_activity_datetime("2026-05-21T10:00:00") == datetime.fromisoformat(
        "2026-05-21T10:00:00"
    )

    # Test standard date strings
    assert _parse_activity_datetime("2026-05-21") == datetime(2026, 5, 21)

    # Test invalid values
    assert _parse_activity_datetime("invalid-date") is None


@pytest.mark.critical
def test_user_statistics(app, db_session, token_for):
    # Seed users with different roles using token_for helper
    token_for("Administrador")
    token_for("Aprendiz")
    token_for("Instructor")

    with app.app_context():
        stats = get_user_statistics()
        assert stats["total_users"] >= 3
        assert "role_distribution" in stats
        assert "status_distribution" in stats
        assert stats["status_distribution"]["active"] >= 3


@pytest.mark.critical
def test_user_status_stats(app, db_session, token_for):
    token_for("Administrador")

    with app.app_context():
        stats = get_user_status_stats()
        assert stats["total_users"] >= 1
        assert stats["active_users"] >= 1
        assert stats["inactive_users"] == 0


@pytest.mark.critical
def test_user_roles_stats(app, db_session, token_for):
    token_for("Instructor")

    with app.app_context():
        stats = get_user_roles_stats()
        assert stats["total_users"] >= 1
        assert "Instructor" in stats["roles"]


@pytest.mark.critical
def test_build_user_activity_query(app, db_session, test_user):
    with app.app_context():
        db_user = User.query.get(test_user["id"])
        # Create an ActivityLog item
        log = ActivityLog.create(
            action="LOGIN_SUCCESS",
            entity="User",
            entity_id=test_user["id"],
            actor_id=test_user["id"],
            finca_id=db_user.finca_id,
            title="Test Title",
            description="Test Description",
            severity="info",
        )

        from werkzeug.datastructures import MultiDict

        args = MultiDict(
            {
                "entity": "User",
                "action": "LOGIN_SUCCESS",
                "severity": "info",
                "entity_id": str(test_user["id"]),
                "from": "2026-01-01",
                "to": "2026-12-31",
            }
        )

        query = build_user_activity_query(test_user["id"], args)
        results = query.all()
        assert len(results) >= 1

        # Verify formatting
        formatted = _format_activity_item(results[0])
        assert formatted["action"] == "LOGIN_SUCCESS"
        assert formatted["actor"]["id"] == test_user["id"]
