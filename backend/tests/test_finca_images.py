from flask_jwt_extended import create_access_token

from app import db
from app.models.finca import FarmType, Finca
from app.models.finca_images import FincaImages
from app.models.user import ApprovalStatus, Role, User


def _create_finca(name: str) -> Finca:
    finca = Finca(name=name, type=FarmType.Tradicional, is_active=True)
    db.session.add(finca)
    db.session.flush()
    return finca


def _auth_headers(user_id: int) -> dict[str, str]:
    token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_image_list_is_public_and_returns_real_image_data(client, app):
    with app.app_context():
        finca = _create_finca("Finca con galería")
        db.session.add(
            FincaImages(
                finca_id=finca.id,
                filename="paisaje.webp",
                filepath="static/uploads/fincas/1/paisaje.webp",
                file_size=1024,
                mime_type="image/webp",
                is_primary=True,
            )
        )
        db.session.commit()
        finca_id = finca.id

    response = client.get(f"/api/v1/finca-images/{finca_id}")

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["total"] == 1
    assert data["images"][0]["url"].endswith("paisaje.webp")


def test_image_upload_is_forbidden_without_finca_membership(client, app):
    with app.app_context():
        from tests.conftest import get_test_password

        finca = _create_finca("Finca protegida")
        user = User.create(
            identification=90909090,
            fullname="Usuario sin acceso",
            password=get_test_password(),
            email="sin-acceso@tests.villaluz",
            phone="3009090909",
            role=Role.Operario,
            approval_status=ApprovalStatus.Approved,
            finca_id=None,
        )
        db.session.commit()
        headers = _auth_headers(user.id)
        finca_id = finca.id

    response = client.post(
        "/api/v1/finca-images/upload",
        data={"finca_id": str(finca_id)},
        headers=headers,
        content_type="multipart/form-data",
    )

    assert response.status_code == 403
