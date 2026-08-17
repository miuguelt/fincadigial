"""Read-only inventory summary and alert resources."""

from datetime import date, timedelta

import flask
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource
from sqlalchemy import and_, func

from app import db
from app.models.inventory import InventoryLot, InventoryMovement, ProductType
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter


inventory_insights_ns = Namespace(
    "inventory-insights",
    path="/inventory",
    description="📊 Consultas de resumen y alertas de inventario",
)


@inventory_insights_ns.route("/summary")
class InventorySummary(Resource):
    @jwt_required()
    def get(self):
        """Resumen de stock actual: total de lotes, por tipo, alertas."""
        today = date.today()
        expiry_threshold = today + timedelta(days=30)

        lot_q = apply_tenant_filter(InventoryLot.query, InventoryLot)

        total_lots = lot_q.count()
        med_lots = lot_q.filter_by(product_type=ProductType.Medicamento).count()
        vac_lots = lot_q.filter_by(product_type=ProductType.Vacuna).count()

        expired = lot_q.filter(InventoryLot.expiry_date < today).count()
        expiring_soon = lot_q.filter(
            and_(
                InventoryLot.expiry_date >= today,
                InventoryLot.expiry_date <= expiry_threshold,
            )
        ).count()

        low_stock_lots = [
            lot for lot in lot_q.all() if lot.is_low_stock and not lot.is_expired
        ]

        total_value_q = apply_tenant_filter(
            db.session.query(
                func.sum(InventoryLot.current_quantity * InventoryLot.unit_cost)
            ),
            InventoryLot,
        )

        total_value = (
            total_value_q.filter(InventoryLot.unit_cost.isnot(None)).scalar() or 0
        )
        usable_value = (
            total_value_q.filter(
                InventoryLot.unit_cost.isnot(None), InventoryLot.expiry_date >= today
            ).scalar()
            or 0
        )

        # Parte de ese valor que ya está inmovilizada en lotes vencidos.
        expired_value_q = apply_tenant_filter(
            db.session.query(
                func.sum(InventoryLot.current_quantity * InventoryLot.unit_cost)
            ),
            InventoryLot,
        )
        expired_value = (
            expired_value_q.filter(
                InventoryLot.unit_cost.isnot(None),
                InventoryLot.expiry_date < today,
            ).scalar()
            or 0
        )

        movement_q = apply_tenant_filter(InventoryMovement.query, InventoryMovement)
        recent_movements = (
            movement_q.order_by(InventoryMovement.created_at.desc()).limit(5).all()
        )

        return APIResponse.success(
            data={
                "total_lots": total_lots,
                "medication_lots": med_lots,
                "vaccine_lots": vac_lots,
                "expired_lots": expired,
                "expiring_soon_lots": expiring_soon,
                "low_stock_lots": len(low_stock_lots),
                "total_estimated_value": round(float(total_value), 2),
                "usable_estimated_value": round(float(usable_value), 2),
                "expired_value": round(float(expired_value), 2),
                "recent_movements": [
                    m.to_namespace_dict(include_relations=True)
                    for m in recent_movements
                ],
            },
            message="Resumen de inventario",
        )


@inventory_insights_ns.route("/alerts")
class InventoryAlerts(Resource):
    @jwt_required()
    @inventory_insights_ns.doc(
        "inventory_alerts",
        params={
            "expiry_days": "Días para alerta de vencimiento (default: 30)",
            "limit": "Máximo de lotes por grupo; los contadores siguen siendo totales",
        },
    )
    def get(self):
        """Lotes con vencimiento próximo o stock bajo."""
        today = date.today()
        expiry_days = flask.request.args.get("expiry_days", default=30, type=int)
        limit = flask.request.args.get("limit", type=int)
        expiry_threshold = today + timedelta(days=max(1, expiry_days))

        lot_q = apply_tenant_filter(InventoryLot.query, InventoryLot)

        expired = (
            lot_q.filter(InventoryLot.expiry_date < today)
            .order_by(InventoryLot.expiry_date)
            .all()
        )

        expiring = (
            lot_q.filter(
                and_(
                    InventoryLot.expiry_date >= today,
                    InventoryLot.expiry_date <= expiry_threshold,
                )
            )
            .order_by(InventoryLot.expiry_date)
            .all()
        )

        low_stock = [
            lot for lot in lot_q.all() if lot.is_low_stock and not lot.is_expired
        ]

        # El recorte es sólo de presentación: los contadores de summary siguen
        # reflejando el total real de lotes afectados.
        def _shown(lots):
            return lots[:limit] if limit and limit > 0 else lots

        return APIResponse.success(
            data={
                "expired": [
                    lot.to_namespace_dict(include_relations=True)
                    for lot in _shown(expired)
                ],
                "expiring_soon": [
                    lot.to_namespace_dict(include_relations=True)
                    for lot in _shown(expiring)
                ],
                "low_stock": [
                    lot.to_namespace_dict(include_relations=True)
                    for lot in _shown(low_stock)
                ],
                "summary": {
                    "expired_count": len(expired),
                    "expiring_soon_count": len(expiring),
                    "low_stock_count": len(low_stock),
                },
            },
            message="Alertas de inventario",
        )
