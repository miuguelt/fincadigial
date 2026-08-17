from unittest.mock import patch
from uuid import uuid4

import pytest
from flask_jwt_extended import create_access_token

from app import create_app, db
from app.models.user import User, Role

UNIT_OLD_PASSWORD = "UnitOld9!"
UNIT_NEW_PASSWORD = "UnitNew9!"
UNIT_WRONG_PASSWORD = "UnitWrong9!"
UNIT_RESET_PASSWORD = "UnitReset9!"


@pytest.fixture
def app():
    app = create_app("testing")
    app.config["JWT_SECRET_KEY"] = "testing_secret_key_for_jwt_32_chars"
    app.config["EMAIL_ENABLED"] = (
        False  # Para que send_email no falle por falta de SMTP
    )
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def user(app):
    with app.app_context():
        unique_id = uuid4().int % 900000000 + 100000000
        user = User(
            identification=unique_id,
            fullname="Test User",
            email=f"user-{unique_id}@example.com",
            phone=str(uuid4().int % 10000000000).zfill(10),
            role=Role.Aprendiz,
            status=True,
            finca_id=1,
        )
        user.set_password(UNIT_OLD_PASSWORD)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture
def auth_headers(app, user):
    with app.app_context():
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                "finca_id": user.finca_id,
                "role": user.role.value,
                "identification": str(user.identification),
            },
        )
    return {"Authorization": f"Bearer {access_token}"}


def test_change_password_success(client, app, user, auth_headers):
    payload = {
        "current_password": UNIT_OLD_PASSWORD,
        "new_password": UNIT_NEW_PASSWORD,
    }
    response = client.post(
        "/api/v1/auth/change-password", json=payload, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["should_clear_auth"] is True

    with app.app_context():
        refreshed = db.session.get(User, user.id)
        assert refreshed.check_password(UNIT_NEW_PASSWORD)
        assert not refreshed.check_password(UNIT_OLD_PASSWORD)


def test_change_password_rejects_wrong_current(client, app, user, auth_headers):
    payload = {
        "current_password": UNIT_WRONG_PASSWORD,
        "new_password": UNIT_NEW_PASSWORD,
    }
    response = client.post(
        "/api/v1/auth/change-password", json=payload, headers=auth_headers
    )

    assert response.status_code == 401
    data = response.get_json()
    assert data["success"] is False
    assert "Contrasena actual incorrecta" in data["message"]

    with app.app_context():
        refreshed = db.session.get(User, user.id)
        assert refreshed.check_password(UNIT_OLD_PASSWORD)


def test_recover_and_reset_password_flow(client, app, user, auth_headers):
    with patch("app.namespaces.users.auth_namespace.send_email") as mocked_send:
        mocked_send.return_value = (True, None)
        recover_resp = client.post(
            "/api/v1/auth/recover",
            json={"email": user.email},
            headers=auth_headers,
        )

        assert recover_resp.status_code == 200
        recover_data = recover_resp.get_json()
        assert recover_data["success"] is True
        reset_token = recover_data["data"]["reset_token"]
        assert reset_token

        reset_resp = client.post(
            "/api/v1/auth/reset-password",
            json={"reset_token": reset_token, "new_password": UNIT_RESET_PASSWORD},
            headers=auth_headers,
        )

        assert reset_resp.status_code == 200
        reset_data = reset_resp.get_json()
        assert reset_data["success"] is True
        assert reset_data["data"]["should_clear_auth"] is True

    with app.app_context():
        refreshed = db.session.get(User, user.id)
        assert refreshed.check_password(UNIT_RESET_PASSWORD)
