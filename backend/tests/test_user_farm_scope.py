from flask_jwt_extended import create_access_token
from sqlalchemy import event

from app import db
from app.models import FarmType, Finca
from app.models.user import ApprovalStatus, Role, User
from app.models.user_finca import UserFinca


def _farm(name: str) -> Finca:
    return Finca.create(name=name, type=FarmType.Tradicional, is_active=True)


def _user(seed: int, name: str, farm: Finca, role: Role = Role.Operario) -> User:
    from tests.conftest import get_test_password

    return User.create(
        identification=8_300_000 + seed,
        fullname=name,
        email=f"scope-{seed}@test.villaluz",
        phone=f"3158{seed:06d}",
        password=get_test_password(),
        role=role,
        finca_id=farm.id,
        approval_status=ApprovalStatus.Approved,
        status=True,
    )


def _headers(user: User, farm: Finca) -> dict[str, str]:
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "identification": user.identification,
            "role": user.role.value,
            "finca_id": farm.id,
            "finca_type": farm.type.value,
        },
    )
    return {"Authorization": f"Bearer {token}"}


def test_users_list_is_always_scoped_to_active_farm(app, client, monkeypatch):
    with app.app_context():
        farm_a = _farm("Usuarios scope A")
        farm_b = _farm("Usuarios scope B")
        master = _user(1, "Administrador maestro", farm_a, Role.Administrador)
        local = _user(2, "Usuario local", farm_a)
        remote = _user(3, "Usuario remoto", farm_b)
        multi_farm = _user(4, "Usuario multi finca", farm_b)
        UserFinca.assign(
            user_id=multi_farm.id,
            finca_id=farm_a.id,
            role=Role.Veterinario.value,
            is_active=True,
            is_primary=False,
        )
        monkeypatch.setenv("SYSTEM_ADMIN_IDENTIFICATION", str(master.identification))
        headers = _headers(master, farm_a)
        expected = {master.id, local.id, multi_farm.id}
        multi_farm_id = multi_farm.id
        remote_id = remote.id

    response = client.get("/api/v1/users?limit=100&cache_bust=1", headers=headers)

    assert response.status_code == 200
    ids = {item["id"] for item in response.get_json()["data"]}
    items_by_id = {item["id"]: item for item in response.get_json()["data"]}
    assert expected <= ids
    assert remote_id not in ids
    assert items_by_id[multi_farm_id]["role"] == Role.Veterinario.value
    assert {
        finca["finca_id"]
        for finca in items_by_id[multi_farm_id]["fincas"]
    } == {farm_a.id}


def test_global_users_requires_master_administrator(app, client, monkeypatch):
    with app.app_context():
        farm_a = _farm("Global users A")
        farm_b = _farm("Global users B")
        master = _user(11, "Administrador maestro global", farm_a, Role.Administrador)
        farm_admin = _user(12, "Administrador de finca", farm_a, Role.Administrador)
        remote = _user(13, "Usuario global remoto", farm_b)
        UserFinca.query.filter_by(user_id=remote.id, finca_id=farm_b.id).delete()
        db.session.commit()
        monkeypatch.setenv("SYSTEM_ADMIN_IDENTIFICATION", str(master.identification))
        master_headers = _headers(master, farm_a)
        farm_admin_headers = _headers(farm_admin, farm_a)
        remote_id = remote.id
        farm_b_id = farm_b.id

    denied = client.get("/api/v1/users/global", headers=farm_admin_headers)
    allowed = client.get("/api/v1/users/global", headers=master_headers)

    assert denied.status_code == 403
    assert allowed.status_code == 200
    items_by_id = {item["id"]: item for item in allowed.get_json()["data"]}
    assert remote_id in items_by_id
    assert items_by_id[remote_id]["fincas"][0]["id"] == farm_b_id


def test_global_users_does_not_query_once_per_user(app, client, monkeypatch):
    with app.app_context():
        farm = _farm("Global users performance")
        master = _user(31, "Administrador maestro rendimiento", farm, Role.Administrador)
        for seed in range(32, 62):
            _user(seed, f"Usuario global {seed}", farm)

        monkeypatch.setenv("SYSTEM_ADMIN_IDENTIFICATION", str(master.identification))
        headers = _headers(master, farm)

    queries: list[str] = []

    def collect_queries(_conn, _cursor, statement, _parameters, _context, _executemany):
        queries.append(statement)

    event.listen(db.engine, "before_cursor_execute", collect_queries)
    try:
        response = client.get("/api/v1/users/global", headers=headers)
    finally:
        event.remove(db.engine, "before_cursor_execute", collect_queries)

    assert response.status_code == 200
    assert len(response.get_json()["data"]) >= 31
    assert len(queries) <= 8


def test_users_list_does_not_query_once_per_user(app, client, monkeypatch):
    with app.app_context():
        farm = _farm("Local users performance")
        master = _user(71, "Administrador maestro local rendimiento", farm, Role.Administrador)
        for seed in range(72, 102):
            _user(seed, f"Usuario local {seed}", farm)

        monkeypatch.setenv("SYSTEM_ADMIN_IDENTIFICATION", str(master.identification))
        headers = _headers(master, farm)

    queries: list[str] = []

    def collect_queries(_conn, _cursor, statement, _parameters, _context, _executemany):
        queries.append(statement)

    event.listen(db.engine, "before_cursor_execute", collect_queries)
    try:
        response = client.get(
            "/api/v1/users?limit=100&cache_bust=1", headers=headers
        )
    finally:
        event.remove(db.engine, "before_cursor_execute", collect_queries)

    assert response.status_code == 200
    assert len(response.get_json()["data"]) >= 31
    assert len(queries) <= 8


def test_farm_catalog_is_global_only_for_master_administrator(app, client, monkeypatch):
    with app.app_context():
        farm_a = _farm("Catalogo finca A")
        farm_b = _farm("Catalogo finca B")
        master = _user(21, "Administrador maestro fincas", farm_a, Role.Administrador)
        farm_admin = _user(22, "Administrador local fincas", farm_a, Role.Administrador)
        monkeypatch.setenv("SYSTEM_ADMIN_IDENTIFICATION", str(master.identification))
        master_headers = _headers(master, farm_a)
        farm_admin_headers = _headers(farm_admin, farm_a)
        farm_a_id = farm_a.id
        farm_b_id = farm_b.id

    local_response = client.get(
        "/api/v1/fincas?limit=100&cache_bust=1", headers=farm_admin_headers
    )
    global_response = client.get(
        "/api/v1/fincas?limit=100&cache_bust=1", headers=master_headers
    )

    assert local_response.status_code == 200
    assert {item["id"] for item in local_response.get_json()["data"]} == {farm_a_id}
    assert global_response.status_code == 200
    assert {farm_a_id, farm_b_id} <= {
        item["id"] for item in global_response.get_json()["data"]
    }
