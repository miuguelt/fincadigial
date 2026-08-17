"""Serialize users without leaking memberships outside the active farm."""

from sqlalchemy.orm import joinedload

from app.models.user_finca import UserFinca


def serialize_scoped_user_response(
    model_class,
    query_result,
    include_relations=False,
    depth=1,
    finca_id=None,
):
    """Build the tenant-scoped user response for a paginated or list result."""
    users = query_result.items if hasattr(query_result, "items") else query_result
    user_ids = [user.id for user in users if user.id is not None]
    memberships = _load_memberships(user_ids, finca_id)
    memberships_by_user = _group_memberships(memberships)
    serialized_fields = _get_serialized_fields(model_class)

    items = [
        _serialize_user(
            model_class,
            user,
            memberships_by_user.get(user.id, []),
            finca_id,
            include_relations,
            depth,
            serialized_fields,
        )
        for user in users
    ]
    return _build_response(query_result, items)


def _load_memberships(user_ids, finca_id):
    if not user_ids:
        return []
    return (
        UserFinca.query.options(joinedload(UserFinca.finca))
        .filter(
            UserFinca.user_id.in_(user_ids),
            UserFinca.finca_id == finca_id,
            UserFinca.is_active.is_(True),
        )
        .all()
    )


def _group_memberships(memberships):
    grouped = {}
    for membership in memberships:
        grouped.setdefault(membership.user_id, []).append(membership)
    return grouped


def _get_serialized_fields(model_class):
    fields = [
        field
        for field in model_class._namespace_fields
        if field not in {"fincas", "is_multi_finca"}
    ]
    if "version_id" in model_class.__table__.columns and "version_id" not in fields:
        fields.append("version_id")
    return fields


def _serialize_user(
    model_class,
    user,
    memberships,
    finca_id,
    include_relations,
    depth,
    serialized_fields,
):
    scoped_fincas = [
        serialized
        for serialized in (_serialize_membership(membership) for membership in memberships)
        if serialized
    ]
    if not scoped_fincas and user.finca_id == finca_id and user.finca:
        scoped_fincas.append(_serialize_legacy_finca(user))

    item = user.to_namespace_dict(
        include_relations=include_relations,
        depth=depth,
        fields=serialized_fields,
    )
    item["fincas"] = scoped_fincas
    item["is_multi_finca"] = len(scoped_fincas) > 1
    item["global_role"] = item.get("role")
    if memberships:
        item["role"] = memberships[0].role
    return item


def _serialize_membership(membership):
    if not membership.finca:
        return None
    return {
        "id": membership.id,
        "finca_id": membership.finca_id,
        "finca_name": membership.finca.name,
        "finca_type": getattr(membership.finca.type, "value", str(membership.finca.type))
        if membership.finca.type
        else None,
        "finca_is_active": bool(membership.finca.is_active),
        "role": membership.role,
        "is_active": membership.is_active,
        "is_primary": membership.is_primary,
        "created_at": membership.created_at.isoformat() if membership.created_at else None,
    }


def _serialize_legacy_finca(user):
    return {
        "id": user.finca_id,
        "finca_id": user.finca_id,
        "finca_name": user.finca.name,
        "finca_type": getattr(user.finca.type, "value", str(user.finca.type))
        if user.finca.type
        else None,
        "finca_is_active": bool(user.finca.is_active),
        "role": getattr(user.role, "value", str(user.role)),
        "is_active": bool(user.status),
        "is_primary": True,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _build_response(query_result, items):
    if hasattr(query_result, "items"):
        return {
            "items": items,
            "total_items": query_result.total,
            "limit": query_result.per_page,
            "per_page": query_result.per_page,
            "page": query_result.page,
            "total_pages": query_result.pages,
            "has_next_page": query_result.has_next,
            "has_previous_page": query_result.has_prev,
        }
    return {
        "items": items,
        "total_items": len(items),
        "limit": len(items),
        "per_page": len(items),
        "page": 1,
        "total_pages": 1,
        "has_next_page": False,
        "has_previous_page": False,
    }
