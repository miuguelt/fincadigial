"""
Tests para la configuración de verificación de nuevos usuarios y auto-activación.
"""

import random
from app.legal.consent import CURRENT_PRIVACY_NOTICE_VERSION, CURRENT_TERMS_VERSION
from app.models.user import User, Role, ApprovalStatus
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.finca import Finca
from app.services.user_verification_service import (
    is_user_verification_required,
    set_user_verification_required,
)

BASE = "/api/v1"


def _consent_payload():
    return {
        "privacy_notice_version": CURRENT_PRIVACY_NOTICE_VERSION,
        "privacy_notice_accepted": True,
        "terms_version": CURRENT_TERMS_VERSION,
        "terms_accepted": True,
    }


def test_verification_config_default_is_false(app, client, token_for):
    """Verifica que por defecto la verificación previa esté desactivada (fase de inicio)."""
    with app.app_context():
        set_user_verification_required(False)
        assert is_user_verification_required() is False

    admin_headers = token_for("Administrador")
    resp = client.get(
        f"{BASE}/users/verification-config",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.get_json().get("data", {})
    assert data.get("require_user_verification") is False


def test_verification_config_update_permissions(app, client, token_for):
    """Solo administradores / instructores / propietarios pueden cambiar la configuración."""
    operario_headers = token_for("Operario")
    admin_headers = token_for("Administrador")

    # Operario debe recibir 403
    resp = client.put(
        f"{BASE}/users/verification-config",
        headers=operario_headers,
        json={"require_user_verification": True},
    )
    assert resp.status_code == 403

    # Administrador puede actualizarlo
    resp = client.put(
        f"{BASE}/users/verification-config",
        headers=admin_headers,
        json={"require_user_verification": True},
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["require_user_verification"] is True

    # Restaurar a False
    resp = client.put(
        f"{BASE}/users/verification-config",
        headers=admin_headers,
        json={"require_user_verification": False},
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["require_user_verification"] is False


def test_public_registration_auto_approved_when_verification_disabled(app, client):
    """Cuando la verificación está desactivada, el usuario queda inmediatamente activo (Approved)."""
    with app.app_context():
        set_user_verification_required(False)

    rand = random.randint(100_000, 999_999)
    payload = {
        "identification": rand,
        "fullname": "Usuario Auto Aprobado",
        "email": f"auto_{rand}@villaluz.test",
        "phone": f"300{rand:06d}",
        "password": "Password123!",
        "password_confirmation": "Password123!",
        "role": "Operario",
        "consent": _consent_payload(),
    }

    resp = client.post(
        f"{BASE}/users/public",
        json=payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code in (200, 201)
    data = resp.get_json().get("data", {})
    assert data.get("approval_status") == "Approved"
    assert data.get("status") is True


def test_public_registration_pending_when_verification_enabled(app, client, token_for):
    """Cuando la verificación está activada y ya existe un admin, el usuario queda en estado Pending."""
    # Crear un admin para que existan usuarios en la plataforma
    _ = token_for("Administrador")

    with app.app_context():
        set_user_verification_required(True)

    rand = random.randint(100_000, 999_999)
    payload = {
        "identification": rand,
        "fullname": "Usuario Pendiente",
        "email": f"pending_{rand}@villaluz.test",
        "phone": f"301{rand:06d}",
        "password": "Password123!",
        "password_confirmation": "Password123!",
        "role": "Operario",
        "consent": _consent_payload(),
    }

    try:
        resp = client.post(
            f"{BASE}/users/public",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code in (200, 201)
        data = resp.get_json().get("data", {})
        assert data.get("approval_status") == "Pending"
    finally:
        with app.app_context():
            set_user_verification_required(False)


def test_membership_approval_idempotency_and_user_activation(app, client, token_for):
    """Aprobar una membresía debe activar al usuario y ser idempotente ante dobles envíos."""
    admin_headers = token_for("Administrador")
    rand = random.randint(100_000, 999_999)

    with app.app_context():
        from app import db
        finca = Finca.query.first()
        finca_id = finca.id if finca else 1

        user = User.create(
            identification=rand,
            fullname="Operario Para Membresia",
            email=f"mem_{rand}@villaluz.test",
            phone=f"302{rand:06d}",
            password="Password123!",
            role=Role.Operario,
            finca_id=None,
            approval_status=ApprovalStatus.Pending,
            status=True,
        )
        req = JoinRequest(
            user_id=user.id,
            finca_id=finca_id,
            request_type=JoinRequestType.REQUEST,
            requested_role="Operario",
            status=JoinRequestStatus.PENDING,
        )
        db.session.add(req)
        db.session.commit()
        req_id = req.id
        user_id = user.id

    # 1. Primera aprobación -> 200 OK
    resp = client.post(
        f"{BASE}/membership/{req_id}/approve",
        headers=admin_headers,
        json={"role": "Operario"},
    )
    assert resp.status_code == 200

    # Verificar que el usuario quedó activo en la BD y asociado a la finca
    with app.app_context():
        u = db.session.get(User, user_id)
        assert u.approval_status == ApprovalStatus.Approved
        assert u.status is True
        assert u.finca_id == finca_id

    # 2. Segunda aprobación (simulación de doble clic en frontend) -> 200 OK (idempotente)
    resp2 = client.post(
        f"{BASE}/membership/{req_id}/approve",
        headers=admin_headers,
        json={"role": "Operario"},
    )
    assert resp2.status_code == 200
    assert "ya ha sido aprobada" in resp2.get_json().get("message", "").lower()
