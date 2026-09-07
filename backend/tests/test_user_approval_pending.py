"""
Tests de la bandeja de aprobación de usuarios a nivel plataforma.

El registro público (/register/user) crea cuentas pendientes SIN finca ni
membresía. La bandeja "Solicitudes de ingreso" debe mostrarlas sin aplicar el
filtro multi-finca (que las ocultaría para siempre).
"""

import random

BASE = "/api/v1"


def _get(client, path, headers):
    return client.get(f"{BASE}{path}", headers=headers)


def _create_pending_user_without_finca(app):
    """Crea una cuenta pendiente sin finca ni membresía (como /register/user)."""
    rand = random.randint(100_000, 999_999)
    with app.app_context():
        from app import db as _db
        from app.models.user import User, Role, ApprovalStatus

        user = User.create(
            identification=rand,
            fullname="Aprendiz Nuevo Sin Finca",
            email=f"pendiente_nofinca_{rand}@test.villaluz",
            phone=f"335{rand:06d}",
            password="TestPass123!",
            role=Role.Aprendiz,
            finca_id=None,
            approval_status=ApprovalStatus.Pending,
            status=True,
        )
        _db.session.commit()
        return user.id, user.email


class TestPendingApprovalList:
    def test_bandeja_plataforma_incluye_pendientes_sin_finca(
        self, app, client, token_for
    ):
        _, email = _create_pending_user_without_finca(app)

        resp = _get(client, "/users/pending-approval", token_for("Administrador"))

        assert resp.status_code == 200
        body = resp.get_json()
        users = body.get("data", [])
        assert any(u.get("email") == email for u in users)

    def test_listado_por_finca_excluye_pendientes_sin_finca(
        self, app, client, token_for
    ):
        _, email = _create_pending_user_without_finca(app)

        # Reproduce el bug original: GET /users está filtrado por finca activa
        # y nunca muestra cuentas pendientes sin finca.
        resp = _get(
            client, "/users?approval_status=Pending", token_for("Administrador")
        )

        assert resp.status_code == 200
        assert email not in resp.get_data(as_text=True)

    def test_bandeja_requiere_rol_administrador_o_equivalente(
        self, app, client, token_for
    ):
        resp = _get(client, "/users/pending-approval", token_for("Operario"))
        assert resp.status_code == 403

    def test_bandeja_visible_para_instructor_y_propietario(
        self, app, client, token_for
    ):
        for role in ("Instructor", "Propietario"):
            resp = _get(client, "/users/pending-approval", token_for(role))
            assert resp.status_code == 200
