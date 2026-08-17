from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime

from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

alerts_analytics_ns = Namespace(
    "analytics/alerts", description="🚨 Analytics - Alertas del sistema"
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


@alerts_analytics_ns.route("/")
class SystemAlerts(Resource):
    @alerts_analytics_ns.doc(
        "get_system_alerts",
        params={
            "priority": {
                "description": "Prioridad (Alta, Media, Baja, Crítica)",
                "type": "string",
            },
            "animal_id": {"description": "ID del animal", "type": "integer"},
            "is_read": {"description": "¿Leída?", "type": "boolean"},
            "limit": {
                "description": "Máximo de alertas",
                "type": "integer",
                "default": 50,
            },
        },
        security=["Bearer", "Cookie"],
        responses={
            200: "Lista de alertas",
            401: "No autorizado",
            500: "Error del servidor",
        },
    )
    @jwt_required()
    def get(self):
        """Obtener alertas del sistema con filtros opcionales"""
        try:
            from app.models.alerts import AnimalAlert, AlertPriority

            priority_filter = flask.request.args.get("priority")
            animal_id = flask.request.args.get("animal_id")
            is_read = flask.request.args.get("is_read")
            limit = min(max(int(flask.request.args.get("limit", 50) or 50), 1), 200)

            from app.models.system_content import SystemContent

            priority_ui_entry = SystemContent.get_by_key("config.priority_ui")
            _PRIORITY_UI = (
                priority_ui_entry.extra
                if (priority_ui_entry and priority_ui_entry.extra)
                else {}
            )
            _ICON_MAP = _PRIORITY_UI.get(
                "icons", {"CRITICAL": "🚨", "HIGH": "🚨", "MEDIUM": "⚠️", "LOW": "ℹ️"}
            )
            _COLOR_MAP = _PRIORITY_UI.get(
                "colors",
                {"CRITICAL": "red", "HIGH": "red", "MEDIUM": "orange", "LOW": "blue"},
            )

            _PRIORITY_MAP = {
                "crítica": AlertPriority.CRITICAL,
                "critica": AlertPriority.CRITICAL,
                "alta": AlertPriority.HIGH,
                "media": AlertPriority.MEDIUM,
                "baja": AlertPriority.LOW,
            }

            # Scope query: tenant + priority + animal filters. Read state is NOT applied
            # here so `unread` always counts against the same universe as `total`.
            scope_query = _tf(
                AnimalAlert.query.filter(AnimalAlert.superseded_by_id.is_(None)),
                AnimalAlert,
            )
            if priority_filter:
                pf_lower = priority_filter.lower()
                if pf_lower == "urgente":
                    # Alias: Alta + Crítica juntas
                    scope_query = scope_query.filter(
                        AnimalAlert.priority.in_(
                            [AlertPriority.HIGH, AlertPriority.CRITICAL]
                        )
                    )
                elif pf_lower in _PRIORITY_MAP:
                    scope_query = scope_query.filter(
                        AnimalAlert.priority == _PRIORITY_MAP[pf_lower]
                    )
                # Si no coincide, no se filtra (devuelve todas)
            if animal_id:
                scope_query = scope_query.filter_by(animal_id=animal_id)

            page_query = scope_query
            if is_read is not None:
                page_query = page_query.filter_by(is_read=is_read.lower() == "true")

            db_alerts = (
                page_query.order_by(AnimalAlert.triggered_at.desc()).limit(limit).all()
            )

            formatted = [
                {
                    "id": f"alert_{a.id}",
                    "db_id": a.id,
                    "type": a.alert_type.value
                    if hasattr(a.alert_type, "value")
                    else str(a.alert_type),
                    "priority": a.priority.value.lower()
                    if hasattr(a.priority, "value")
                    else str(a.priority).lower(),
                    "title": f"{a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type)} - {a.animal.record if a.animal else 'Animal Desconocido'}",
                    "message": a.message,
                    "animal_id": a.animal_id,
                    "animal_record": a.animal.record if a.animal else "N/A",
                    "is_read": a.is_read,
                    "created_at": a.triggered_at.isoformat()
                    if a.triggered_at
                    else datetime.now().isoformat(),
                    "icon": _ICON_MAP.get(a.priority.name, "ℹ️"),
                    "color": _COLOR_MAP.get(a.priority.name, "blue"),
                }
                for a in db_alerts
            ]

            # Aggregates run over the whole scope, never over the truncated page:
            # `len(formatted)` would just echo back `limit`.
            from sqlalchemy import func

            total_count = scope_query.count()
            unread_count = scope_query.filter(AnimalAlert.is_read.is_(False)).count()

            def _enum_value(raw):
                return raw.value if hasattr(raw, "value") else str(raw)

            priority_counts = {}
            for raw_priority, count in (
                scope_query.with_entities(
                    AnimalAlert.priority, func.count(AnimalAlert.id)
                )
                .group_by(AnimalAlert.priority)
                .all()
            ):
                priority_counts[_enum_value(raw_priority).lower()] = int(count)

            unread_priority_counts = {}
            for raw_priority, count in (
                scope_query.filter(AnimalAlert.is_read.is_(False))
                .with_entities(AnimalAlert.priority, func.count(AnimalAlert.id))
                .group_by(AnimalAlert.priority)
                .all()
            ):
                unread_priority_counts[_enum_value(raw_priority).lower()] = int(count)

            by_type = {}
            for raw_type, count in (
                scope_query.with_entities(
                    AnimalAlert.alert_type, func.count(AnimalAlert.id)
                )
                .group_by(AnimalAlert.alert_type)
                .all()
            ):
                by_type[_enum_value(raw_type)] = int(count)

            critical = priority_counts.get("crítica", 0) or priority_counts.get(
                "critica", 0
            )
            high = priority_counts.get("alta", 0)
            medium = priority_counts.get("media", 0)
            low = priority_counts.get("baja", 0)
            critical_unread = unread_priority_counts.get(
                "crítica", 0
            ) or unread_priority_counts.get("critica", 0)

            stats = {
                "total": total_count,
                "unread": unread_count,
                "returned": len(formatted),
                "critical": critical,
                "critical_unread": critical_unread,
                "high": high,
                "medium": medium,
                "low": low,
                "by_type": by_type,
                "by_priority": {
                    "critica": critical,
                    # Alias acentuado: los clientes derivan la clave de la etiqueta 'Crítica'.
                    "crítica": critical,
                    "alta": high,
                    "media": medium,
                    "baja": low,
                    # Alias para compatibilidad con código legado (high = alta + crítica)
                    "high": high + critical,
                    "medium": medium,
                    "low": low,
                },
            }

            return APIResponse.success(
                data={
                    "alerts": formatted,
                    "statistics": stats,
                    "generated_at": datetime.now().isoformat(),
                },
                message=f"Se recuperaron {len(formatted)} de {total_count} alertas",
            )
        except Exception as e:
            return APIResponse.error(
                message="Error interno del servidor",
                status_code=500,
                details={"error": str(e)},
            )
