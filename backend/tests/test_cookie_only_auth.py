"""Pruebas del modo institucional de autenticación por cookie HttpOnly."""


def test_cookie_only_login_no_expone_jwt_en_json(client, app, test_user):
    previous = app.config.get("AUTH_COOKIE_ONLY")
    app.config["AUTH_COOKIE_ONLY"] = True
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": test_user["identification"],
                "password": test_user["password"],
            },
        )

        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "access_token" not in data
        assert "refresh_token" not in data
        assert any(
            header.startswith("access_token_cookie=")
            for header in response.headers.getlist("Set-Cookie")
        )
    finally:
        app.config["AUTH_COOKIE_ONLY"] = previous
