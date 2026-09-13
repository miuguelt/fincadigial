from app.models import Finca, User, UserConsent


CURRENT_PRIVACY_VERSION = "2026-09-10"
CURRENT_TERMS_VERSION = "2026-09-10"


def _consent_payload():
    return {
        "privacy_notice_version": CURRENT_PRIVACY_VERSION,
        "terms_version": CURRENT_TERMS_VERSION,
        "privacy_notice_accepted": True,
        "terms_accepted": True,
    }


def test_public_finca_registration_requires_explicit_consent(client):
    response = client.post(
        "/api/v1/public/register",
        json={
            "finca": {"name": "Finca sin consentimiento", "type": "Tradicional"},
            "owner": {
                "identification": 700000001,
                "fullname": "Titular de prueba",
                "email": "sin-consentimiento@test.villaluz",
                "phone": "3007000001",
                "password": "PruebaSegura1",
            },
        },
    )

    assert response.status_code in (400, 422)
    assert "consent" in str(response.get_json()).lower()
    assert Finca.query.filter_by(name="Finca sin consentimiento").count() == 0
    assert User.query.filter_by(email="sin-consentimiento@test.villaluz").count() == 0


def test_public_finca_registration_persists_consent_evidence(client):
    response = client.post(
        "/api/v1/public/register",
        json={
            "finca": {"name": "Finca con consentimiento", "type": "Tradicional"},
            "owner": {
                "identification": 700000002,
                "fullname": "Titular de prueba",
                "email": "con-consentimiento@test.villaluz",
                "phone": "3007000002",
                "password": "PruebaSegura1",
            },
            "consent": _consent_payload(),
        },
    )

    assert response.status_code == 201
    user = User.query.filter_by(email="con-consentimiento@test.villaluz").one()
    consents = UserConsent.query.filter_by(user_id=user.id).all()
    assert {(item.purpose, item.version) for item in consents} == {
        ("privacy_notice", CURRENT_PRIVACY_VERSION),
        ("terms_of_use", CURRENT_TERMS_VERSION),
    }


def test_public_user_registration_requires_and_persists_consent(client):
    rejected = client.post(
        "/api/v1/users/public",
        json={
            "identification": 700000003,
            "fullname": "Aprendiz de prueba",
            "email": "aprendiz-sin-consentimiento@test.villaluz",
            "phone": "3007000003",
            "password": "PruebaSegura1",
            "password_confirmation": "PruebaSegura1",
            "role": "Aprendiz",
        },
    )
    assert rejected.status_code in (400, 422)

    accepted = client.post(
        "/api/v1/users/public",
        json={
            "identification": 700000004,
            "fullname": "Aprendiz de prueba",
            "email": "aprendiz-con-consentimiento@test.villaluz",
            "phone": "3007000004",
            "password": "PruebaSegura1",
            "password_confirmation": "PruebaSegura1",
            "role": "Aprendiz",
            "consent": _consent_payload(),
        },
    )
    assert accepted.status_code in (200, 201)
    user = User.query.filter_by(email="aprendiz-con-consentimiento@test.villaluz").one()
    assert UserConsent.query.filter_by(user_id=user.id).count() == 2
