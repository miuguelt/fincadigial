"""
Activity service — query helpers and formatters for activity_namespace.
Extracted to reduce namespace file size; behavior unchanged.
"""

import base64
import json
from datetime import date, datetime, timedelta, UTC

import flask
from sqlalchemy import func

from app import db
from app.models.activity_daily_agg import ActivityDailyAgg
from app.models.activity_log import ActivityLog
from app.utils.cache_utils import cached_json_with_etag


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        text = str(value).strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except Exception:
        try:
            return datetime.strptime(text, "%Y-%m-%d")
        except Exception:
            return None


def _safe_int(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    try:
        return int(str(value))
    except Exception:
        return None


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    try:
        if getattr(dt, "tzinfo", None) is None:
            return dt.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")
        return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")
    except Exception:
        return None


def _parse_csv(value: str | None) -> set[str]:
    if not value:
        return set()
    parts = [p.strip() for p in str(value).split(",")]
    return {p for p in parts if p}


def _normalize_dt_for_db(dt: datetime | None) -> datetime | None:
    if not dt:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


def _format_activity(
    item,
    *,
    include_actor=True,
    include_relations=True,
    fields_set: set[str] | None = None,
):
    actor = None
    if include_actor and getattr(item, "actor", None):
        actor = {
            "id": item.actor.id,
            "fullname": item.actor.fullname,
        }
    payload = {
        "id": item.id,
        "action": item.action,
        "entity": item.entity,
        "entity_id": item.entity_id,
        "title": item.title,
        "description": item.description,
        "severity": item.severity,
        "created_at": _iso(item.created_at),
        "actor": actor if include_actor else None,
        "relations": (item.relations or {}) if include_relations else None,
        "animal_id": item.animal_id,
    }
    if not include_actor:
        payload.pop("actor", None)
    if not include_relations:
        payload.pop("relations", None)
    if fields_set:
        payload = {k: payload.get(k) for k in fields_set if k in payload}
    return payload


def _encode_cursor(created_at: datetime, row_id: int) -> str:
    raw = json.dumps(
        {"created_at": _iso(created_at), "id": int(row_id)},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str | None) -> tuple[datetime | None, int | None]:
    if not cursor:
        return None, None
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        data = json.loads(decoded)
        dt = _parse_datetime(data.get("created_at"))
        return _normalize_dt_for_db(dt), _safe_int(data.get("id"))
    except Exception:
        return None, None


def _activity_load_only(
    fields_set: set[str] | None, *, include_actor: bool, include_relations: bool
):
    wanted = {"id", "created_at"}
    if fields_set:
        wanted |= set(fields_set)
    else:
        wanted |= {
            "action",
            "entity",
            "entity_id",
            "title",
            "description",
            "severity",
            "animal_id",
            "relations",
            "actor",
        }

    cols = [ActivityLog.id, ActivityLog.created_at]
    if "action" in wanted:
        cols.append(ActivityLog.action)
    if "entity" in wanted:
        cols.append(ActivityLog.entity)
    if "entity_id" in wanted:
        cols.append(ActivityLog.entity_id)
    if "title" in wanted:
        cols.append(ActivityLog.title)
    if "description" in wanted:
        cols.append(ActivityLog.description)
    if "severity" in wanted:
        cols.append(ActivityLog.severity)
    if "animal_id" in wanted:
        cols.append(ActivityLog.animal_id)
    if include_relations or ("relations" in wanted):
        cols.append(ActivityLog.relations)
    if include_actor:
        cols.append(ActivityLog.actor_id)
    return cols


def _build_query(user_id=None):
    from app.utils.tenant_context import apply_tenant_filter

    query = apply_tenant_filter(ActivityLog.query, ActivityLog)

    entity = flask.request.args.get("entity")
    action = flask.request.args.get("action")
    severity = flask.request.args.get("severity")
    entity_id = flask.request.args.get("entity_id", type=int)
    actor_id = flask.request.args.get("user_id", type=int)
    animal_id = flask.request.args.get("animal_id", type=int)
    from_value = flask.request.args.get("from")
    to_value = flask.request.args.get("to")

    if user_id is not None:
        query = query.filter(ActivityLog.actor_id == user_id)
    elif actor_id is not None:
        query = query.filter(ActivityLog.actor_id == actor_id)

    if entity:
        query = query.filter(ActivityLog.entity == entity)
    if action:
        query = query.filter(ActivityLog.action == action)
    if severity:
        query = query.filter(ActivityLog.severity == severity)
    if entity_id is not None:
        query = query.filter(ActivityLog.entity_id == entity_id)
    if animal_id is not None:
        query = query.filter(ActivityLog.animal_id == animal_id)

    from_dt = _normalize_dt_for_db(_parse_datetime(from_value))
    to_dt = _normalize_dt_for_db(_parse_datetime(to_value))
    if from_dt:
        query = query.filter(ActivityLog.created_at >= from_dt)
    if to_dt:
        query = query.filter(ActivityLog.created_at <= to_dt)

    return query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())


def _window_bounds(days: int | None = None):
    from_value = flask.request.args.get("from")
    to_value = flask.request.args.get("to")

    from_dt = _parse_datetime(from_value)
    to_dt = _parse_datetime(to_value)
    if days and not from_dt and not to_dt:
        to_dt = datetime.now(UTC)
        from_dt = to_dt - timedelta(days=int(days))

    if from_dt and from_dt.tzinfo is None:
        from_dt = from_dt.replace(tzinfo=UTC)
    if to_dt and to_dt.tzinfo is None:
        to_dt = to_dt.replace(tzinfo=UTC)
    return from_dt, to_dt


def _apply_bounds(query, from_dt, to_dt):
    if from_dt:
        if getattr(from_dt, "tzinfo", None) is not None:
            from_dt = from_dt.astimezone(UTC).replace(tzinfo=None)
        query = query.filter(ActivityLog.created_at >= from_dt)
    if to_dt:
        if getattr(to_dt, "tzinfo", None) is not None:
            to_dt = to_dt.astimezone(UTC).replace(tzinfo=None)
        query = query.filter(ActivityLog.created_at <= to_dt)
    return query


def _stats_payload(base_query, *, from_dt, to_dt, window_days: int | None = None):
    totals = base_query.with_entities(
        func.count(ActivityLog.id),
        func.count(func.distinct(ActivityLog.entity)),
        func.count(func.distinct(ActivityLog.animal_id)),
    ).first()

    by_entity = (
        base_query.with_entities(
            ActivityLog.entity.label("key"), func.count(ActivityLog.id).label("count")
        )
        .group_by(ActivityLog.entity)
        .order_by(func.count(ActivityLog.id).desc(), ActivityLog.entity.asc())
        .all()
    )
    by_action = (
        base_query.with_entities(
            ActivityLog.action.label("key"), func.count(ActivityLog.id).label("count")
        )
        .group_by(ActivityLog.action)
        .order_by(func.count(ActivityLog.id).desc(), ActivityLog.action.asc())
        .all()
    )
    by_severity = (
        base_query.with_entities(
            ActivityLog.severity.label("key"), func.count(ActivityLog.id).label("count")
        )
        .group_by(ActivityLog.severity)
        .order_by(func.count(ActivityLog.id).desc(), ActivityLog.severity.asc())
        .all()
    )
    daily = (
        base_query.with_entities(
            func.date(ActivityLog.created_at).label("day"),
            func.count(ActivityLog.id).label("count"),
        )
        .group_by(func.date(ActivityLog.created_at))
        .order_by(func.date(ActivityLog.created_at).asc())
        .all()
    )

    window = {
        "days": int(window_days) if window_days else None,
        "from": from_dt.isoformat().replace("+00:00", "Z") if from_dt else None,
        "to": to_dt.isoformat().replace("+00:00", "Z") if to_dt else None,
    }

    return {
        "window": window,
        "totals": {
            "events": int(totals[0] or 0),
            "distinct_entities": int(totals[1] or 0),
            "distinct_animals": int(totals[2] or 0),
        },
        "by_entity": [
            {"entity": row.key, "count": int(row.count)} for row in by_entity
        ],
        "by_action": [
            {"action": row.key, "count": int(row.count)} for row in by_action
        ],
        "by_severity": [
            {"severity": row.key, "count": int(row.count)} for row in by_severity
        ],
        "daily": [
            {
                "date": (row.day.isoformat() if row.day else None),
                "count": int(row.count),
            }
            for row in daily
        ],
    }


def _window_date_bounds(days: int | None):
    from_dt, to_dt = _window_bounds(days)
    from_dt = _normalize_dt_for_db(from_dt)
    to_dt = _normalize_dt_for_db(to_dt)

    now = datetime.now(UTC)
    if not to_dt:
        to_dt = now
    if not from_dt and days:
        from_dt = to_dt - timedelta(days=int(days))

    start_date = (from_dt or (to_dt - timedelta(days=int(days or 30)))).date()
    end_date = (to_dt or now).date()
    return start_date, end_date, from_dt, to_dt


def _can_use_daily_agg(from_dt, to_dt) -> bool:
    if flask.request.args.get("entity_id"):
        return False
    if from_dt and (
        from_dt.hour or from_dt.minute or from_dt.second or from_dt.microsecond
    ):
        return False
    if to_dt and (to_dt.hour or to_dt.minute or to_dt.second or to_dt.microsecond):
        return False
    return True


def _agg_stats_payload(
    *, actor_id: int | None, start_date: date, end_date: date, days: int | None
):
    from app.utils.tenant_context import apply_tenant_filter

    base = apply_tenant_filter(
        db.session.query(ActivityDailyAgg), ActivityDailyAgg
    ).filter(
        ActivityDailyAgg.date >= start_date,
        ActivityDailyAgg.date <= end_date,
    )
    if actor_id is not None:
        base = base.filter(ActivityDailyAgg.actor_id == int(actor_id))

    entity = flask.request.args.get("entity")
    action = flask.request.args.get("action")
    severity = flask.request.args.get("severity")
    animal_id = flask.request.args.get("animal_id", type=int)
    if entity:
        base = base.filter(ActivityDailyAgg.entity == entity)
    if action:
        base = base.filter(ActivityDailyAgg.action == action)
    if severity:
        base = base.filter(ActivityDailyAgg.severity == severity)
    if animal_id is not None:
        base = base.filter(ActivityDailyAgg.animal_id == int(animal_id))

    totals_events = (
        base.with_entities(func.coalesce(func.sum(ActivityDailyAgg.count), 0)).scalar()
        or 0
    )
    distinct_entities = (
        base.with_entities(func.count(func.distinct(ActivityDailyAgg.entity))).scalar()
        or 0
    )
    distinct_animals = (
        base.filter(ActivityDailyAgg.animal_id != 0)
        .with_entities(func.count(func.distinct(ActivityDailyAgg.animal_id)))
        .scalar()
        or 0
    )

    by_entity = (
        base.with_entities(
            ActivityDailyAgg.entity.label("key"),
            func.sum(ActivityDailyAgg.count).label("count"),
        )
        .group_by(ActivityDailyAgg.entity)
        .order_by(
            func.sum(ActivityDailyAgg.count).desc(), ActivityDailyAgg.entity.asc()
        )
        .all()
    )
    by_action = (
        base.with_entities(
            ActivityDailyAgg.action.label("key"),
            func.sum(ActivityDailyAgg.count).label("count"),
        )
        .group_by(ActivityDailyAgg.action)
        .order_by(
            func.sum(ActivityDailyAgg.count).desc(), ActivityDailyAgg.action.asc()
        )
        .all()
    )
    by_severity = (
        base.with_entities(
            ActivityDailyAgg.severity.label("key"),
            func.sum(ActivityDailyAgg.count).label("count"),
        )
        .group_by(ActivityDailyAgg.severity)
        .order_by(
            func.sum(ActivityDailyAgg.count).desc(), ActivityDailyAgg.severity.asc()
        )
        .all()
    )
    daily = (
        base.with_entities(
            ActivityDailyAgg.date.label("day"),
            func.sum(ActivityDailyAgg.count).label("count"),
        )
        .group_by(ActivityDailyAgg.date)
        .order_by(ActivityDailyAgg.date.asc())
        .all()
    )

    window = {
        "days": int(days) if days else None,
        "from": f"{start_date.isoformat()}T00:00:00Z" if start_date else None,
        "to": f"{end_date.isoformat()}T23:59:59Z" if end_date else None,
    }
    return {
        "window": window,
        "totals": {
            "events": int(totals_events),
            "distinct_entities": int(distinct_entities),
            "distinct_animals": int(distinct_animals),
        },
        "by_entity": [
            {"entity": row.key, "count": int(row.count)} for row in by_entity
        ],
        "by_action": [
            {"action": row.key, "count": int(row.count)} for row in by_action
        ],
        "by_severity": [
            {"severity": row.key, "count": int(row.count)} for row in by_severity
        ],
        "daily": [
            {
                "date": (row.day.isoformat() if row.day else None),
                "count": int(row.count),
            }
            for row in daily
        ],
    }


def _make_cached_response(
    cache_key: str, ttl_seconds: int, compute_fn, *, private=True
):
    payload, status, headers = cached_json_with_etag(
        cache_key=cache_key,
        ttl_seconds=int(ttl_seconds),
        compute=compute_fn,
        private=private,
    )
    resp = flask.make_response(flask.jsonify(payload) if status != 304 else "", status)
    for k, v in (headers or {}).items():
        resp.headers[k] = v
    return resp
