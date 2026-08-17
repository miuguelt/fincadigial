"""User service — extracted helpers and query logic from users_namespace."""

from datetime import datetime, UTC
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app import db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.models.user_finca import UserFinca


def _parse_activity_datetime(value):
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


def _serialize_activity_datetime(value):
    """flask-restx serializa con json.dumps estándar: los datetime crudos rompen
    la respuesta con 'Object of type datetime is not JSON serializable'."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()
    return value


def _format_activity_item(item):
    actor = None
    if item.actor:
        actor = {
            "id": item.actor.id,
            "fullname": item.actor.fullname,
        }
    return {
        "id": item.id,
        "action": item.action,
        "entity": item.entity,
        "entity_id": item.entity_id,
        "title": item.title,
        "description": item.description,
        "severity": item.severity,
        "created_at": _serialize_activity_datetime(item.created_at),
        "updated_at": _serialize_activity_datetime(item.updated_at),
        "actor": actor,
        "relations": item.relations or {},
        "animal_id": item.animal_id,
    }


def get_user_statistics() -> dict:
    role_stats = (
        db.session.query(User.role, func.count(User.id)).group_by(User.role).all()
    )
    status_stats = (
        db.session.query(User.status, func.count(User.id)).group_by(User.status).all()
    )
    role_dict = {role.value: count for role, count in role_stats}
    status_dict = {status: count for status, count in status_stats}
    total_users = sum(role_dict.values())
    return {
        "total_users": total_users,
        "role_distribution": {
            r: {
                "count": role_dict.get(r, 0),
                "percentage": round(
                    (role_dict.get(r, 0) / total_users * 100) if total_users else 0, 2
                ),
            }
            for r in ["Aprendiz", "Instructor", "Administrador"]
        },
        "status_distribution": {
            "active": status_dict.get(True, 0),
            "inactive": status_dict.get(False, 0),
            "active_percentage": round(
                (status_dict.get(True, 0) / total_users * 100) if total_users else 0, 2
            ),
        },
    }


def get_user_status_stats() -> dict:
    active_count = User.query.filter_by(status=True).count()
    inactive_count = User.query.filter_by(status=False).count()
    total = active_count + inactive_count
    return {
        "active_users": active_count,
        "inactive_users": inactive_count,
        "total_users": total,
        "active_percentage": round((active_count / total * 100) if total else 0, 2),
    }


def get_user_roles_stats() -> dict:
    role_counts = (
        db.session.query(User.role, func.count(User.id)).group_by(User.role).all()
    )
    total = sum(count for _, count in role_counts)
    roles_payload = {
        role.value: {
            "count": count,
            "percentage": round((count / total * 100) if total else 0, 2),
        }
        for role, count in role_counts
    }
    return {"roles": roles_payload, "total_users": total}


def build_user_activity_query(user_id: int, args: dict):
    """Build filtered ActivityLog query for a user. Args is flask.request.args-like dict."""
    query = ActivityLog.query.filter(ActivityLog.actor_id == user_id)

    entity = args.get("entity")
    action = args.get("action")
    severity = args.get("severity")
    entity_id = (
        args.get("entity_id", type=int)
        if hasattr(args, "get")
        else args.get("entity_id")
    )
    animal_id = (
        args.get("animal_id", type=int)
        if hasattr(args, "get")
        else args.get("animal_id")
    )
    from_value = args.get("from")
    to_value = args.get("to")

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

    from_dt = _parse_activity_datetime(from_value)
    to_dt = _parse_activity_datetime(to_value)
    if from_dt:
        if from_dt.tzinfo is None:
            from_dt = from_dt.replace(tzinfo=UTC)
        query = query.filter(ActivityLog.created_at >= from_dt)
    if to_dt:
        if to_dt.tzinfo is None:
            to_dt = to_dt.replace(tzinfo=UTC)
        query = query.filter(ActivityLog.created_at <= to_dt)

    return query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())


def get_global_users() -> list[dict]:
    """Return the system directory using a constant number of database queries."""
    users = db.session.query(User).options(joinedload(User.finca)).all()
    if not users:
        return []

    user_ids = [user.id for user in users]
    memberships = (
        db.session.query(UserFinca)
        .options(joinedload(UserFinca.finca))
        .filter(UserFinca.user_id.in_(user_ids))
        .all()
    )
    memberships_by_user: dict[int, list[UserFinca]] = {}
    for membership in memberships:
        memberships_by_user.setdefault(membership.user_id, []).append(membership)

    result = []
    serialized_fields = [
        field
        for field in User._namespace_fields
        if field not in {"fincas", "is_multi_finca"}
    ] + ["version_id"]

    for user in users:
        user_data = user.to_namespace_dict(fields=serialized_fields)
        user_memberships = memberships_by_user.get(user.id, [])
        finca_ids = set()
        fincas = []
        for membership in user_memberships:
            if not membership.finca:
                continue
            finca_ids.add(membership.finca.id)
            fincas.append(
                {
                    "id": membership.finca.id,
                    "name": membership.finca.name,
                    "type": membership.finca.type.value if membership.finca.type else None,
                    "role": membership.role,
                    "is_active": membership.is_active,
                    "is_primary": membership.is_primary,
                }
            )

        if user.finca and user.finca.id not in finca_ids:
            fincas.append(
                {
                    "id": user.finca.id,
                    "name": user.finca.name,
                    "type": user.finca.type.value if user.finca.type else None,
                    "role": getattr(user.role, "value", str(user.role)),
                    "is_active": bool(user.status),
                    "is_primary": True,
                }
            )

        user_data["fincas"] = fincas
        user_data["is_multi_finca"] = sum(
            bool(membership.is_active) for membership in user_memberships
        ) > 1
        result.append(user_data)

    return result
