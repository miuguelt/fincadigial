"""Pruebas de la acreditación profesional del veterinario.

Cubren las tres garantías que sostienen la credibilidad de la insignia:
nadie se autoverifica, la matrícula completa no se filtra a terceros, y una
verificación vencida deja de decir "Verificado".
"""

import pytest
from datetime import UTC, date, datetime, timedelta

from flask_jwt_extended import create_access_token

from app import db
from app.models import FarmType, Finca
from app.models.professional_credentials import (
    CONSENT_VERSION,
    CredentialStatus,
    CredentialTitle,
    ProfessionalCredential,
)
from app.models.user import ApprovalStatus, Role, User

BASE = "/api/v1/professional-credentials"


def _finca():
    finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
    if not finca:
        finca = Finca.create(
            name="Finca Test Acreditación", type=FarmType.Tradicional, is_active=True
        )
        db.session.commit()
    return finca


def _user(role: Role, seed: int, finca):
    from tests.conftest import get_test_password

    user = User.create(
        identification=900_000 + seed,
        fullname=f"Usuario {role.value} {seed}",
        email=f"cred_{role.value.lower()}_{seed}@test.villaluz",
        phone=f"31{900_000 + seed}",
        password=get_test_password(),
        role=role,
        finca_id=finca.id,
        approval_status=ApprovalStatus.Approved,
        status=True,
    )
    db.session.commit()
    return user


def _headers(user, finca):
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "identification": user.identification,
            "role": user.role.value,
            "fullname": user.fullname,
            "finca_id": user.finca_id,
            "finca_type": finca.type.value,
        },
    )
    return {"Authorization": f"Bearer {token}"}


VALID_PAYLOAD = {
    "title": "Médico Veterinario",
    "professional_card_number": "mv 12345",
    "university": "Universidad Nacional de Colombia",
    "graduation_year": 2015,
    "specialization": "Reproducción bovina",
    "consent_accepted": True,
}


@pytest.fixture
def vet(app, db_session):
    with app.app_context():
        finca = _finca()
        user = _user(Role.Veterinario, 1, finca)
        return {
            "user_id": user.id,
            "headers": _headers(user, finca),
            "finca_id": finca.id,
        }


@pytest.fixture
def admin(app, db_session):
    with app.app_context():
        finca = _finca()
        user = _user(Role.Administrador, 2, finca)
        return {
            "user_id": user.id,
            "headers": _headers(user, finca),
            "finca_id": finca.id,
        }


@pytest.fixture
def operario(app, db_session):
    with app.app_context():
        finca = _finca()
        user = _user(Role.Operario, 3, finca)
        return {
            "user_id": user.id,
            "headers": _headers(user, finca),
            "finca_id": finca.id,
        }


class TestSelfService:
    def test_sin_credencial_devuelve_none(self, client, vet):
        response = client.get(f"{BASE}/me", headers=vet["headers"])
        assert response.status_code == 200
        assert response.get_json()["data"] is None

    def test_upsert_normaliza_matricula_y_queda_en_revision(self, client, vet):
        response = client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        assert response.status_code == 200

        data = response.get_json()["data"]
        # 'mv 12345' se normaliza: sin espacios y en mayúsculas.
        assert data["professional_card_number"] == "MV12345"
        assert data["status"] == CredentialStatus.EnRevision.value
        assert data["consent_version"] == CONSENT_VERSION

    def test_sin_consentimiento_rechaza(self, client, vet):
        payload = {**VALID_PAYLOAD, "consent_accepted": False}
        response = client.put(f"{BASE}/me", headers=vet["headers"], json=payload)
        assert response.status_code in (400, 422)

    def test_rol_no_veterinario_no_puede_acreditarse(self, client, operario):
        response = client.put(
            f"{BASE}/me", headers=operario["headers"], json=VALID_PAYLOAD
        )
        assert response.status_code == 403

    def test_supresion_elimina_la_credencial(self, client, vet):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)

        response = client.delete(f"{BASE}/me", headers=vet["headers"])
        assert response.status_code == 200

        assert (
            client.get(f"{BASE}/me", headers=vet["headers"]).get_json()["data"] is None
        )

    def test_ano_de_grado_futuro_rechaza(self, client, vet):
        payload = {**VALID_PAYLOAD, "graduation_year": date.today().year + 5}
        response = client.put(f"{BASE}/me", headers=vet["headers"], json=payload)
        assert response.status_code in (400, 422)


class TestVerification:
    def test_admin_verifica_y_deja_rastro(self, client, app, vet, admin):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)

        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        response = client.post(
            f"{BASE}/{credential_id}/verify",
            headers=admin["headers"],
            json={"reference": "Consulta COMVEZCOL 2026-08-03"},
        )
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["status"] == CredentialStatus.Verificado.value
        assert data["verified_by_id"] == admin["user_id"]
        assert data["verification_reference"] == "Consulta COMVEZCOL 2026-08-03"
        # La insignia caduca: sin fecha de vencimiento mentiría con el tiempo.
        assert data["verification_expires_at"] is not None

    def test_verificar_sin_referencia_rechaza(self, client, app, vet, admin):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        response = client.post(
            f"{BASE}/{credential_id}/verify", headers=admin["headers"], json={}
        )
        assert response.status_code in (400, 422)

    def test_veterinario_no_puede_autoverificarse(self, client, app, vet):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        response = client.post(
            f"{BASE}/{credential_id}/verify",
            headers=vet["headers"],
            json={"reference": "me verifico solo"},
        )
        assert response.status_code == 403

    def test_operario_no_puede_verificar(self, client, app, vet, operario):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        response = client.post(
            f"{BASE}/{credential_id}/verify",
            headers=operario["headers"],
            json={"reference": "x"},
        )
        assert response.status_code == 403

    def test_rechazo_exige_motivo_y_lo_conserva(self, client, app, vet, admin):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        assert client.post(
            f"{BASE}/{credential_id}/reject", headers=admin["headers"], json={}
        ).status_code in (400, 422)

        response = client.post(
            f"{BASE}/{credential_id}/reject",
            headers=admin["headers"],
            json={"reason": "No aparece en el registro público"},
        )
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["status"] == CredentialStatus.Rechazado.value
        assert data["rejection_reason"] == "No aparece en el registro público"

    def test_editar_un_campo_clave_reinicia_la_revision(self, client, app, vet, admin):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        client.post(
            f"{BASE}/{credential_id}/verify",
            headers=admin["headers"],
            json={"reference": "ok"},
        )

        # Cambiar la matrícula después de verificada no puede conservar la insignia.
        response = client.put(
            f"{BASE}/me",
            headers=vet["headers"],
            json={**VALID_PAYLOAD, "professional_card_number": "MV99999"},
        )
        assert response.status_code == 200
        assert (
            response.get_json()["data"]["status"] == CredentialStatus.EnRevision.value
        )

    def test_editar_un_campo_accesorio_conserva_la_verificacion(
        self, client, app, vet, admin
    ):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)
        with app.app_context():
            credential_id = (
                ProfessionalCredential.query.filter_by(user_id=vet["user_id"])
                .first()
                .id
            )

        client.post(
            f"{BASE}/{credential_id}/verify",
            headers=admin["headers"],
            json={"reference": "ok"},
        )

        response = client.put(
            f"{BASE}/me",
            headers=vet["headers"],
            json={**VALID_PAYLOAD, "liability_insurer": "Seguros Bolívar"},
        )
        assert response.status_code == 200
        assert (
            response.get_json()["data"]["status"] == CredentialStatus.Verificado.value
        )


class TestExposicionDeDatos:
    def test_badge_enmascara_la_matricula(self, client, vet, operario):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)

        response = client.get(
            f"{BASE}/user/{vet['user_id']}/badge", headers=operario["headers"]
        )
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["card_number_masked"] == "••••2345"
        assert "professional_card_number" not in data
        assert "rejection_reason" not in data

    def test_listado_generico_cerrado_a_roles_sin_permiso(self, client, vet, operario):
        client.put(f"{BASE}/me", headers=vet["headers"], json=VALID_PAYLOAD)

        response = client.get(f"{BASE}/", headers=operario["headers"])
        assert response.status_code == 403

    def test_pending_cerrado_a_roles_sin_permiso(self, client, operario):
        assert (
            client.get(f"{BASE}/pending", headers=operario["headers"]).status_code
            == 403
        )


class TestCaducidad:
    def test_verificacion_vencida_degrada_a_por_revalidar(self, app, db_session, vet):
        with app.app_context():
            credential = ProfessionalCredential.create(
                user_id=vet["user_id"],
                title=CredentialTitle.MedicoVeterinario,
                professional_card_number="MV12345",
                university="Universidad Nacional de Colombia",
                consent_version=CONSENT_VERSION,
                consent_accepted_at=datetime.now(UTC),
                status=CredentialStatus.Verificado,
                verified_at=datetime.now(UTC) - timedelta(days=400),
                verification_expires_at=date.today() - timedelta(days=35),
            )
            db.session.commit()

            assert credential.status == CredentialStatus.Verificado
            assert credential.effective_status == CredentialStatus.PorRevalidar
            assert credential.to_namespace_dict()["effective_status"] == (
                CredentialStatus.PorRevalidar.value
            )

    def test_verificacion_vigente_sigue_verificada(self, app, db_session, vet):
        with app.app_context():
            credential = ProfessionalCredential.create(
                user_id=vet["user_id"],
                title=CredentialTitle.MedicoVeterinario,
                professional_card_number="MV12345",
                university="Universidad Nacional de Colombia",
                consent_version=CONSENT_VERSION,
                consent_accepted_at=datetime.now(UTC),
                status=CredentialStatus.Verificado,
                verified_at=datetime.now(UTC),
                verification_expires_at=date.today() + timedelta(days=200),
            )
            db.session.commit()

            assert credential.effective_status == CredentialStatus.Verificado
