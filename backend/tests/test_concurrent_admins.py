"""
Tests de uso simultáneo: varios administradores trabajando a la vez.

Cubre los tres mecanismos que hacen seguro el trabajo concurrente:
  1. Visibilidad — lo que escribe un usuario lo ven de inmediato los demás
     (la caché por usuario se invalida para todos, no sólo para el autor).
  2. Bloqueo optimista — si dos usuarios editan el mismo registro, el segundo
     recibe 409 en lugar de pisar silenciosamente el cambio del primero.
  3. Aislamiento por finca — la concurrencia no debe filtrar datos entre fincas.

Además se verifica la propagación entre workers de gunicorn (invalidación de
caché vía bus de eventos) y el cupo de conexiones SSE por usuario.
"""

import json

import pytest

BASE = "/api/v1"
ADMIN = "Administrador"


def _create_field(client, headers, finca_id, name):
    resp = client.post(
        f"{BASE}/fields",
        json={"name": name, "state": "Disponible", "area": 3.0, "finca_id": finca_id},
        headers=headers,
    )
    assert resp.status_code in (200, 201), (
        f"POST /fields: {resp.status_code} {resp.get_json()}"
    )
    return resp.get_json()["data"]["id"]


@pytest.fixture
def finca_id(app, db_session):
    from app.models.finca import Finca
    from app.models import FarmType

    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Finca Concurrencia", type=FarmType.Tradicional, is_active=True
            )
        return finca.id


# ---------------------------------------------------------------------------
# 1. Visibilidad entre administradores
# ---------------------------------------------------------------------------


class TestVisibilidadEntreAdministradores:
    def test_lo_que_crea_un_admin_lo_ve_el_otro_de_inmediato(
        self, client, token_for, finca_id
    ):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)

        # B consulta primero: su respuesta queda cacheada bajo su propia clave.
        antes = client.get(f"{BASE}/fields", headers=admin_b)
        assert antes.status_code == 200
        nombres_antes = [f["name"] for f in antes.get_json()["data"]]
        assert "Potrero de A" not in nombres_antes

        _create_field(client, admin_a, finca_id, "Potrero de A")

        despues = client.get(f"{BASE}/fields", headers=admin_b)
        assert despues.status_code == 200
        nombres_despues = [f["name"] for f in despues.get_json()["data"]]
        assert "Potrero de A" in nombres_despues, (
            "B siguió viendo su lista cacheada tras la escritura de A"
        )

    def test_edicion_de_un_admin_visible_en_el_detalle_del_otro(
        self, client, token_for, finca_id
    ):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero Compartido")

        assert (
            client.get(f"{BASE}/fields/{field_id}", headers=admin_b).status_code == 200
        )

        resp = client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Potrero Renombrado"},
            headers=admin_a,
        )
        assert resp.status_code == 200

        detalle = client.get(f"{BASE}/fields/{field_id}", headers=admin_b)
        assert detalle.get_json()["data"]["name"] == "Potrero Renombrado"

    def test_borrado_de_un_admin_visible_para_el_otro(
        self, client, token_for, finca_id
    ):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero Efímero")

        assert (
            client.get(f"{BASE}/fields/{field_id}", headers=admin_b).status_code == 200
        )
        assert (
            client.delete(f"{BASE}/fields/{field_id}", headers=admin_a).status_code
            == 200
        )
        assert (
            client.get(f"{BASE}/fields/{field_id}", headers=admin_b).status_code == 404
        )


# ---------------------------------------------------------------------------
# 2. Bloqueo optimista (edición simultánea del mismo registro)
# ---------------------------------------------------------------------------


class TestEdicionSimultanea:
    def test_la_respuesta_expone_version_id(self, client, token_for, finca_id):
        headers = token_for(ADMIN)
        field_id = _create_field(client, headers, finca_id, "Potrero Versionado")
        data = client.get(f"{BASE}/fields/{field_id}", headers=headers).get_json()[
            "data"
        ]
        assert "version_id" in data, (
            "sin version_id el cliente no puede detectar conflictos"
        )

    def test_segunda_escritura_con_version_vieja_da_409(
        self, client, token_for, finca_id
    ):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero Disputado")

        # Ambos abren el formulario con la misma versión.
        version_inicial = client.get(
            f"{BASE}/fields/{field_id}", headers=admin_a
        ).get_json()["data"]["version_id"]

        # A guarda primero.
        resp_a = client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Nombre de A", "version_id": version_inicial},
            headers=admin_a,
        )
        assert resp_a.status_code == 200

        # B guarda con la versión que leyó antes: debe rechazarse.
        resp_b = client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Nombre de B", "version_id": version_inicial},
            headers=admin_b,
        )
        assert resp_b.status_code == 409
        body = resp_b.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "EDIT_CONFLICT"
        assert body["error"]["details"]["conflict_type"] == "optimistic_locking"
        assert body["error"]["details"]["current_version"] != version_inicial

        # El cambio de A sigue intacto.
        actual = client.get(f"{BASE}/fields/{field_id}", headers=admin_b).get_json()[
            "data"
        ]
        assert actual["name"] == "Nombre de A"

    def test_patch_tambien_detecta_el_conflicto(self, client, token_for, finca_id):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero Patch")
        version_inicial = client.get(
            f"{BASE}/fields/{field_id}", headers=admin_a
        ).get_json()["data"]["version_id"]

        assert (
            client.patch(
                f"{BASE}/fields/{field_id}", json={"area": 9.0}, headers=admin_a
            ).status_code
            == 200
        )

        conflicto = client.patch(
            f"{BASE}/fields/{field_id}",
            json={"area": 1.0, "version_id": version_inicial},
            headers=admin_b,
        )
        assert conflicto.status_code == 409

    def test_tras_recargar_la_version_el_guardado_procede(
        self, client, token_for, finca_id
    ):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero Reintento")

        version = client.get(f"{BASE}/fields/{field_id}", headers=admin_a).get_json()[
            "data"
        ]["version_id"]
        client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Primero", "version_id": version},
            headers=admin_a,
        )

        # B recarga y reintenta con la versión vigente.
        version_actual = client.get(
            f"{BASE}/fields/{field_id}", headers=admin_b
        ).get_json()["data"]["version_id"]
        resp = client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Segundo", "version_id": version_actual},
            headers=admin_b,
        )
        assert resp.status_code == 200
        assert (
            client.get(f"{BASE}/fields/{field_id}", headers=admin_a).get_json()["data"][
                "name"
            ]
            == "Segundo"
        )

    def test_sin_version_id_se_conserva_el_comportamiento_previo(
        self, client, token_for, finca_id
    ):
        """Clientes antiguos (sin version_id en el payload) siguen guardando."""
        headers = token_for(ADMIN)
        field_id = _create_field(client, headers, finca_id, "Potrero Legacy")
        resp = client.put(
            f"{BASE}/fields/{field_id}", json={"name": "Sin versión"}, headers=headers
        )
        assert resp.status_code == 200

    def test_if_match_tambien_sirve_como_version(self, client, token_for, finca_id):
        admin_a = token_for(ADMIN)
        admin_b = token_for(ADMIN)
        field_id = _create_field(client, admin_a, finca_id, "Potrero IfMatch")
        version = client.get(f"{BASE}/fields/{field_id}", headers=admin_a).get_json()[
            "data"
        ]["version_id"]

        client.put(
            f"{BASE}/fields/{field_id}", json={"name": "Cambio A"}, headers=admin_a
        )

        conflicto = client.put(
            f"{BASE}/fields/{field_id}",
            json={"name": "Cambio B"},
            headers={**admin_b, "If-Match": f'"{version}"'},
        )
        assert conflicto.status_code == 409


# ---------------------------------------------------------------------------
# 3. Aislamiento por finca bajo uso concurrente
# ---------------------------------------------------------------------------


class TestAislamientoConcurrente:
    def test_admins_de_fincas_distintas_no_comparten_cache(
        self, client, token_for, finca_id
    ):
        admin_tradicional = token_for(ADMIN, finca_type="Tradicional")
        admin_educativa = token_for(ADMIN, finca_type="Educativa")

        _create_field(client, admin_tradicional, finca_id, "Potrero Tradicional")

        propios = client.get(f"{BASE}/fields", headers=admin_tradicional).get_json()[
            "data"
        ]
        assert any(f["name"] == "Potrero Tradicional" for f in propios)

        ajenos = client.get(f"{BASE}/fields", headers=admin_educativa).get_json()[
            "data"
        ]
        assert not any(f["name"] == "Potrero Tradicional" for f in ajenos)


# ---------------------------------------------------------------------------
# 4. Invalidación de caché entre workers de gunicorn
# ---------------------------------------------------------------------------


class TestInvalidacionEntreWorkers:
    def test_evento_del_bus_limpia_la_cache_local(self):
        from app.utils import cache_helpers

        cache_helpers.register_cache_endpoint("fields", "Fields")
        cache_helpers._LIST_CACHE["Fields"] = cache_helpers.LRUCache(max_size=10)
        cache_helpers._LIST_CACHE["Fields"].set(
            "user:1:key", {"value": "viejo", "ts": 0}
        )

        aplicado = cache_helpers.invalidate_from_event(
            json.dumps({"endpoint": "fields", "action": "update", "id": 1})
        )

        assert aplicado is True
        assert cache_helpers._LIST_CACHE["Fields"].size() == 0

    def test_evento_de_otro_modelo_no_borra_cache_ajena(self):
        from app.utils import cache_helpers

        cache_helpers.register_cache_endpoint("fields", "Fields")
        cache_helpers._LIST_CACHE["Fields"] = cache_helpers.LRUCache(max_size=10)
        cache_helpers._LIST_CACHE["Fields"].set(
            "user:1:key", {"value": "vigente", "ts": 0}
        )

        cache_helpers.invalidate_from_event(
            json.dumps({"endpoint": "animals", "action": "update", "id": 7})
        )

        assert cache_helpers._LIST_CACHE["Fields"].size() == 1

    def test_escritura_publica_invalidacion_en_el_bus(
        self, app, client, token_for, finca_id
    ):
        """El worker que escribe avisa al resto por el bus de eventos."""
        publicados = []

        class _BusEspia:
            def publish(self, endpoint, action, record_id=None):
                publicados.append({"endpoint": endpoint, "action": action})

            def publish_payload(self, payload):
                publicados.append(payload)

        app.extensions["event_bus"] = _BusEspia()
        try:
            _create_field(client, token_for(ADMIN), finca_id, "Potrero Difundido")
        finally:
            app.extensions.pop("event_bus", None)

        acciones = {p.get("action") for p in publicados}
        assert "create" in acciones or "cache_invalidate" in acciones
        assert any(
            p.get("action") == "cache_invalidate" and p.get("model") == "Fields"
            for p in publicados
        ), f"no se difundió la invalidación de Fields: {publicados}"

    def test_los_eventos_internos_no_llegan_al_navegador(self):
        from app.api.sse import _is_internal_event

        assert (
            _is_internal_event(
                json.dumps({"action": "cache_invalidate", "model": "Fields"})
            )
            is True
        )
        assert (
            _is_internal_event(json.dumps({"endpoint": "fields", "action": "update"}))
            is False
        )


# ---------------------------------------------------------------------------
# 5. Cupos SSE: varios usuarios detrás de la misma IP
# ---------------------------------------------------------------------------


class TestCuposSSE:
    def test_el_cupo_es_por_usuario_no_por_ip(self, app):
        from app.api import sse

        max_conn = app.config.get("SSE_MAX_CONN_PER_IP", 3)
        if app.debug:
            max_conn = max(max_conn, 15)

        app.extensions["sse_ip_counts"] = {}
        app.extensions["sse_ip_cooldowns"] = {}

        # El usuario 1 agota su cupo desde la IP de la finca.
        for _ in range(max_conn):
            ok, _motivo = sse._acquire_sse_slot(app, sse._sse_slot_key(1, "190.0.0.1"))
            assert ok is True
        ok, _motivo = sse._acquire_sse_slot(app, sse._sse_slot_key(1, "190.0.0.1"))
        assert ok is False

        # El usuario 2, en la misma IP, conserva el suyo.
        ok, motivo = sse._acquire_sse_slot(app, sse._sse_slot_key(2, "190.0.0.1"))
        assert ok is True, (
            f"segundo administrador bloqueado por la IP compartida: {motivo}"
        )

    def test_el_cupo_se_libera_al_desconectar(self, app):
        from app.api import sse

        app.extensions["sse_ip_counts"] = {}
        app.extensions["sse_ip_cooldowns"] = {}
        key = sse._sse_slot_key(9, "190.0.0.2")

        assert sse._acquire_sse_slot(app, key)[0] is True
        sse._release_sse_slot(app, key)
        assert app.extensions["sse_ip_counts"][key] == 0

    def test_sin_usuario_autenticado_se_cuenta_por_ip(self, app):
        from app.api import sse

        assert sse._sse_slot_key(None, "10.0.0.5") == "ip:10.0.0.5"
        assert sse._sse_slot_key(7, "10.0.0.5") == "user:7"
