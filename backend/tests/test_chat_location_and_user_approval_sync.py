from flask_jwt_extended import create_access_token

from app import db
from app.models import FarmType, Finca
from app.models.chat_message import ChatMessage
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.user import ApprovalStatus, Role, User
from app.models.user_finca import UserFinca
from app.models.user_location import UserLocation


def _create_finca(name: str) -> Finca:
    finca = Finca.create(name=name, type=FarmType.Tradicional, is_active=True)
    db.session.commit()
    return finca


def _create_user(
    index: int,
    name: str,
    finca: Finca,
    *,
    role: Role = Role.Operario,
    approval_status: ApprovalStatus = ApprovalStatus.Approved,
    status: bool = True,
) -> User:
    from tests.conftest import get_test_password

    user = User.create(
        identification=9_200_000 + index,
        fullname=name,
        email=f"loc-sync-{index}@test.villaluz",
        phone=f"3119{index:06d}",
        password=get_test_password(),
        role=role,
        finca_id=finca.id,
        approval_status=approval_status,
        status=status,
    )
    db.session.commit()
    return user


def _headers(user: User, finca: Finca) -> dict[str, str]:
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "role": user.role.value,
            "fullname": user.fullname,
            "finca_id": finca.id,
            "finca_type": finca.type.value,
        },
    )
    return {"Authorization": f"Bearer {token}"}


def test_chat_send_location_and_live_location(app, client):
    """Verifica que el envío de ubicación GPS fija y en vivo guarde el mensaje y UserLocation."""
    with app.app_context():
        finca = _create_finca("Finca GPS")
        sender = _create_user(10, "Vaquero GPS", finca)
        recipient = _create_user(11, "Capataz GPS", finca)

        UserFinca.assign(user_id=sender.id, finca_id=finca.id, role=Role.Operario.value, is_active=True)
        UserFinca.assign(user_id=recipient.id, finca_id=finca.id, role=Role.Operario.value, is_active=True)
        db.session.commit()

        headers = _headers(sender, finca)

        # 1. Enviar ubicación estática
        res1 = client.post(
            "/api/v1/chat/send",
            headers=headers,
            json={
                "recipient_id": recipient.id,
                "message": "",
                "attachment_type": "location",
                "latitude": 4.60971,
                "longitude": -74.08175,
                "accuracy": 5.2,
            },
        )
        assert res1.status_code == 200, res1.data
        data1 = res1.get_json()["data"]
        assert data1["attachment_type"] == "location"
        assert "4.60971" in data1["attachment_url"]
        assert "-74.08175" in data1["attachment_url"]

        # Verificar que se creó UserLocation breadcrumb
        loc1 = UserLocation.query.filter_by(user_id=sender.id, detection_method="GPS").first()
        assert loc1 is not None
        assert abs(loc1.latitude - 4.60971) < 1e-4
        assert abs(loc1.longitude - -74.08175) < 1e-4

        # 2. Enviar ubicación en tiempo real
        res2 = client.post(
            "/api/v1/chat/send",
            headers=headers,
            json={
                "recipient_id": recipient.id,
                "message": "Mi posición en el potrero 3",
                "attachment_type": "live_location",
                "latitude": 4.61050,
                "longitude": -74.08200,
                "accuracy": 3.0,
            },
        )
        assert res2.status_code == 200, res2.data
        data2 = res2.get_json()["data"]
        assert data2["attachment_type"] == "live_location"
        assert "Mi posición en el potrero 3" in data2["message"]

        loc2 = UserLocation.query.filter_by(user_id=sender.id, detection_method="GPS_Live").first()
        assert loc2 is not None
        assert abs(loc2.latitude - 4.61050) < 1e-4


def test_user_approval_synchronizes_pending_requests_and_finca(app, client):
    """Verifica que aprobar un usuario globalmente cierre sus solicitudes pendientes y active UserFinca."""
    with app.app_context():
        finca = _create_finca("Finca Sincronizada")
        admin = _create_user(20, "Administrador Sistema", finca, role=Role.Administrador)
        UserFinca.assign(user_id=admin.id, finca_id=finca.id, role=Role.Administrador.value, is_active=True)

        pending_user = _create_user(
            21,
            "Solicitante Pendiente",
            finca,
            role=Role.Operario,
            approval_status=ApprovalStatus.Pending,
            status=False,
        )

        # Crear dos solicitudes pendientes (ej. reintento o doble clic)
        req1 = JoinRequest(
            finca_id=finca.id,
            user_id=pending_user.id,
            request_type=JoinRequestType.REQUEST,
            status=JoinRequestStatus.PENDING,
            requested_role="Operario",
        )
        req2 = JoinRequest(
            finca_id=finca.id,
            user_id=pending_user.id,
            request_type=JoinRequestType.REQUEST,
            status=JoinRequestStatus.PENDING,
            requested_role="Operario",
        )
        db.session.add_all([req1, req2])
        db.session.commit()

        headers = _headers(admin, finca)

        # Aprobar usuario desde endpoint global
        res = client.patch(
            f"/api/v1/users/{pending_user.id}/approval-status",
            headers=headers,
            json={"approval_status": "Approved"},
        )
        assert res.status_code == 200, res.data

        # Verificar que el usuario está aprobado y activo
        db.session.refresh(pending_user)
        assert pending_user.approval_status == ApprovalStatus.Approved
        assert pending_user.status is True

        # Verificar que AMBAS solicitudes se marcaron APPROVED
        db.session.refresh(req1)
        db.session.refresh(req2)
        assert req1.status == JoinRequestStatus.APPROVED
        assert req2.status == JoinRequestStatus.APPROVED

        # Verificar que UserFinca se creó y está activo
        uf = UserFinca.query.filter_by(user_id=pending_user.id, finca_id=finca.id).first()
        assert uf is not None
        assert uf.is_active is True


def test_membership_respond_closes_duplicates(app, client):
    """Verifica que aprobar una solicitud en membership_namespace cierre duplicados y active al usuario."""
    with app.app_context():
        finca = _create_finca("Finca Duplicados")
        propietario = _create_user(30, "Propietario Finca", finca, role=Role.Propietario)
        UserFinca.assign(user_id=propietario.id, finca_id=finca.id, role=Role.Propietario.value, is_active=True)

        applicant = _create_user(
            31,
            "Aspirante Nuevo",
            finca,
            role=Role.Operario,
            approval_status=ApprovalStatus.Pending,
            status=False,
        )

        req_primary = JoinRequest(
            finca_id=finca.id,
            user_id=applicant.id,
            request_type=JoinRequestType.REQUEST,
            status=JoinRequestStatus.PENDING,
            requested_role="Operario",
        )
        req_dup = JoinRequest(
            finca_id=finca.id,
            user_id=applicant.id,
            request_type=JoinRequestType.REQUEST,
            status=JoinRequestStatus.PENDING,
            requested_role="Operario",
        )
        db.session.add_all([req_primary, req_dup])
        db.session.commit()

        headers = _headers(propietario, finca)

        # Responder usando POST con action='accept'
        res = client.post(
            f"/api/v1/membership/requests/{req_primary.id}/respond",
            headers=headers,
            json={"action": "accept"},
        )
        assert res.status_code == 200, res.data

        db.session.refresh(req_primary)
        db.session.refresh(req_dup)
        db.session.refresh(applicant)

        assert req_primary.status == JoinRequestStatus.APPROVED
        assert req_dup.status == JoinRequestStatus.APPROVED
        assert applicant.approval_status == ApprovalStatus.Approved
        assert applicant.status is True

        # Verificar que no quedan solicitudes pendientes para el aspirante
        pending_count = JoinRequest.query.filter_by(
            user_id=applicant.id, status=JoinRequestStatus.PENDING
        ).count()
        assert pending_count == 0
