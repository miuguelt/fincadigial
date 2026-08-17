"""Los endpoints de clima resuelven la identidad desde el JWT.

Regresión: usaban `g.user`, que nadie asigna en la aplicación, por lo que
cualquier petición autenticada recibía 403 "Sin acceso a esta finca".
"""

from flask_jwt_extended import decode_token

from app import db
from app.models.finca import Finca
from app.models.user_finca import UserFinca


def _user_id_from(auth_headers):
    token = auth_headers["Authorization"].split(" ", 1)[1]
    return int(decode_token(token)["sub"])


def _grant_access(app, auth_headers):
    """Vincula al usuario del token con una finca y devuelve el finca_id."""
    with app.app_context():
        user_id = _user_id_from(auth_headers)
        finca = Finca.query.first()
        link = UserFinca.query.filter_by(user_id=user_id, finca_id=finca.id).first()
        if link is None:
            db.session.add(
                UserFinca(
                    user_id=user_id,
                    finca_id=finca.id,
                    role="Administrador",
                    is_active=True,
                )
            )
        else:
            link.is_active = True
        db.session.commit()
        return finca.id


def test_dashboard_requiere_jwt(client, app, auth_headers):
    finca_id = _grant_access(app, auth_headers)
    response = client.get(f"/api/v1/weather/dashboard/{finca_id}")
    assert response.status_code == 401


def test_dashboard_responde_con_membresia_en_la_finca(client, app, auth_headers):
    finca_id = _grant_access(app, auth_headers)

    response = client.get(
        f"/api/v1/weather/dashboard/{finca_id}?days=1",
        headers=auth_headers,
    )

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["finca_id"] == finca_id
    assert data["alerts"] == []
    assert data["history"] == []


def test_dashboard_rechaza_finca_ajena(client, app, auth_headers):
    finca_id = _grant_access(app, auth_headers)

    response = client.get(
        f"/api/v1/weather/dashboard/{finca_id + 999}",
        headers=auth_headers,
    )

    assert response.status_code == 403
