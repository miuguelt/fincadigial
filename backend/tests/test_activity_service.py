import pytest
from datetime import datetime, date, timezone, timedelta, UTC
from werkzeug.datastructures import MultiDict
import flask
from app.models.activity_log import ActivityLog
from app.services.activity_service import (
    _parse_datetime,
    _safe_int,
    _iso,
    _parse_csv,
    _normalize_dt_for_db,
    _format_activity,
    _encode_cursor,
    _decode_cursor,
    _activity_load_only,
    _build_query,
    _window_bounds,
    _apply_bounds,
    _window_date_bounds,
    _can_use_daily_agg,
)


@pytest.mark.critical
def test_parse_datetime():
    # Caso None
    assert _parse_datetime(None) is None
    # Caso datetime
    now = datetime.now()
    assert _parse_datetime(now) == now
    # String vacío
    assert _parse_datetime("   ") is None
    # Con 'Z' al final
    dt_z = _parse_datetime("2026-05-21T15:00:00Z")
    assert dt_z.tzinfo == UTC
    assert dt_z.hour == 15
    # ISO simple
    dt_iso = _parse_datetime("2026-05-21T15:00:00+00:00")
    assert dt_iso.tzinfo == UTC
    # Formato fecha simple
    dt_date = _parse_datetime("2026-05-21")
    assert dt_date == datetime(2026, 5, 21)
    # Formato inválido
    assert _parse_datetime("formato-incorrecto") is None


@pytest.mark.critical
def test_safe_int():
    assert _safe_int(None) is None
    assert _safe_int(42) == 42
    assert _safe_int("42") == 42
    assert _safe_int("abc") is None


@pytest.mark.critical
def test_iso():
    assert _iso(None) is None
    assert _iso("2026-05-21T15:00:00Z") == "2026-05-21T15:00:00Z"

    dt_naive = datetime(2026, 5, 21, 15, 0, 0)
    assert _iso(dt_naive) == "2026-05-21T15:00:00Z"

    dt_tz = datetime(2026, 5, 21, 15, 0, 0, tzinfo=timezone(timedelta(hours=-5)))
    assert _iso(dt_tz) == "2026-05-21T20:00:00Z"  # Convertido a UTC

    assert _iso(object()) is None


@pytest.mark.critical
def test_parse_csv():
    assert _parse_csv(None) == set()
    assert _parse_csv("") == set()
    assert _parse_csv("a,b,,c ") == {"a", "b", "c"}


@pytest.mark.critical
def test_normalize_dt_for_db():
    assert _normalize_dt_for_db(None) is None

    dt_naive = datetime(2026, 5, 21, 15, 0, 0)
    assert _normalize_dt_for_db(dt_naive) == dt_naive

    dt_tz = datetime(2026, 5, 21, 15, 0, 0, tzinfo=UTC)
    normalized = _normalize_dt_for_db(dt_tz)
    assert normalized.tzinfo is None
    assert normalized == datetime(2026, 5, 21, 15, 0, 0)


@pytest.mark.critical
def test_encode_decode_cursor():
    dt = datetime(2026, 5, 21, 15, 0, 0)
    row_id = 123

    cursor = _encode_cursor(dt, row_id)
    assert isinstance(cursor, str)

    decoded_dt, decoded_id = _decode_cursor(cursor)
    assert decoded_dt == dt
    assert decoded_id == row_id

    # Cursor inválido
    assert _decode_cursor("invalid-base64") == (None, None)
    assert _decode_cursor(None) == (None, None)


@pytest.mark.critical
def test_format_activity():
    class MockActor:
        id = 10
        fullname = "Juan Perez"

    class MockItem:
        id = 1
        action = "create"
        entity = "animal"
        entity_id = 42
        title = "Animal Creado"
        description = "Se creó un nuevo animal"
        severity = "info"
        created_at = datetime(2026, 5, 21, 15, 0, 0)
        actor = MockActor()
        relations = {"finca_id": 2}
        animal_id = 42

    item = MockItem()

    # Caso completo
    res = _format_activity(item)
    assert res["id"] == 1
    assert res["actor"] == {"id": 10, "fullname": "Juan Perez"}
    assert res["relations"] == {"finca_id": 2}

    # Excluyendo actor y relaciones
    res_min = _format_activity(item, include_actor=False, include_relations=False)
    assert "actor" not in res_min
    assert "relations" not in res_min

    # Filtrando campos específicos
    res_filtered = _format_activity(item, fields_set={"id", "action", "entity"})
    assert res_filtered == {"id": 1, "action": "create", "entity": "animal"}


@pytest.mark.critical
def test_activity_load_only():
    # Sin campos específicos
    cols = _activity_load_only(None, include_actor=True, include_relations=True)
    assert len(cols) > 2

    # Con campos específicos
    cols_filtered = _activity_load_only(
        {"action", "title"}, include_actor=False, include_relations=False
    )
    # Debe contener al menos id, created_at, action y title
    col_names = [getattr(col, "name", "") for col in cols_filtered]
    assert "id" in col_names
    assert "created_at" in col_names
    assert "action" in col_names
    assert "title" in col_names
    assert "severity" not in col_names


@pytest.mark.critical
def test_build_query(app):
    with app.test_request_context():
        # Inicializar flask.request.args como un MultiDict vacío
        flask.request.args = MultiDict()

        # Caso base sin filtros
        q = _build_query()
        assert q is not None

        # Filtros con args
        flask.request.args = MultiDict(
            {
                "entity": "animal",
                "action": "create",
                "severity": "info",
                "entity_id": "42",
                "user_id": "10",
                "animal_id": "42",
                "from": "2026-05-21T00:00:00Z",
                "to": "2026-05-21T23:59:59Z",
            }
        )

        q_filtered = _build_query()
        # Verificar que la query se haya construido con filtros
        sql = str(q_filtered)
        assert "entity =" in sql
        assert "action =" in sql
        assert "severity =" in sql
        assert "entity_id =" in sql
        assert "actor_id =" in sql
        assert "animal_id =" in sql
        assert "created_at >=" in sql
        assert "created_at <=" in sql


@pytest.mark.critical
def test_window_bounds_and_apply_bounds(app):
    with app.test_request_context():
        # Vacío
        flask.request.args = MultiDict()
        from_dt, to_dt = _window_bounds()
        assert from_dt is None
        assert to_dt is None

        # Por días
        from_dt, to_dt = _window_bounds(days=7)
        assert from_dt is not None
        assert to_dt is not None
        assert (to_dt - from_dt).days == 7

        # Con parámetros de consulta
        flask.request.args = MultiDict(
            {"from": "2026-05-20T10:00:00Z", "to": "2026-05-21T10:00:00Z"}
        )
        from_dt, to_dt = _window_bounds()
        assert from_dt.day == 20
        assert to_dt.day == 21

        # Aplicar bounds a una query
        q = ActivityLog.query
        q_bounded = _apply_bounds(q, from_dt, to_dt)
        sql = str(q_bounded)
        assert "created_at >=" in sql
        assert "created_at <=" in sql


@pytest.mark.critical
def test_can_use_daily_agg(app):
    with app.test_request_context():
        flask.request.args = MultiDict()
        # Si no hay entity_id y las fechas son a medianoche o None, se puede usar daily agg
        assert _can_use_daily_agg(None, None) is True

        # Con entity_id -> Falso
        flask.request.args = MultiDict({"entity_id": "10"})
        assert _can_use_daily_agg(None, None) is False

        # Fechas no a medianoche -> Falso
        flask.request.args = MultiDict()
        dt_not_midnight = datetime(2026, 5, 21, 12, 0, 0)
        assert _can_use_daily_agg(dt_not_midnight, None) is False


@pytest.mark.critical
def test_window_date_bounds(app):
    with app.test_request_context():
        flask.request.args = MultiDict({"from": "2026-05-20", "to": "2026-05-22"})
        start, end, from_dt, to_dt = _window_date_bounds(days=3)
        assert start == date(2026, 5, 20)
        assert end == date(2026, 5, 22)
