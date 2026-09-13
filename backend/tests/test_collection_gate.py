"""La instancia provisional no debe captar datos reales por accidente."""


def test_public_finca_registration_is_blocked_when_collection_disabled(client, app):
    previous = app.config.get("DATA_COLLECTION_ENABLED")
    app.config["DATA_COLLECTION_ENABLED"] = False
    try:
        response = client.post("/api/v1/public/register", json={})
        assert response.status_code == 503
        assert response.get_json()["error"]["code"] == "DATA_COLLECTION_DISABLED"
    finally:
        app.config["DATA_COLLECTION_ENABLED"] = previous


def test_public_user_registration_is_blocked_when_collection_disabled(client, app):
    previous_collection = app.config.get("DATA_COLLECTION_ENABLED")
    previous_public = app.config.get("PUBLIC_USER_CREATION_ENABLED")
    app.config["DATA_COLLECTION_ENABLED"] = False
    app.config["PUBLIC_USER_CREATION_ENABLED"] = True
    try:
        response = client.post("/api/v1/users/public", json={})
        assert response.status_code == 503
        assert response.get_json()["error"]["code"] == "DATA_COLLECTION_DISABLED"
    finally:
        app.config["DATA_COLLECTION_ENABLED"] = previous_collection
        app.config["PUBLIC_USER_CREATION_ENABLED"] = previous_public


def test_provisional_runtime_cannot_enable_collection_by_accident(client, app):
    previous = {
        key: app.config.get(key)
        for key in (
            "CONFIG_NAME",
            "DATA_COLLECTION_ENABLED",
            "SENA_INSTITUTIONAL_MODE",
            "LEGAL_RELEASE_APPROVED",
        )
    }
    app.config.update(
        CONFIG_NAME="production",
        DATA_COLLECTION_ENABLED=True,
        SENA_INSTITUTIONAL_MODE="provisional_not_authorized",
        LEGAL_RELEASE_APPROVED=False,
    )
    try:
        response = client.post("/api/v1/public/register", json={})
        assert response.status_code == 503
        assert response.get_json()["error"]["code"] == "DATA_COLLECTION_DISABLED"
    finally:
        app.config.update(previous)
