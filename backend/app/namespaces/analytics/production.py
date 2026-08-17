from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Any, cast
import decimal
import logging

from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.animalFields import AnimalFields
from app.models.control import Control
from app.models.breeds import Breeds
from app.models.fields import Fields
from app.models.financial import Transaction, TransactionType
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter
from app.utils.financial_filters import exclude_simulated_transactions
from app.namespaces.analytics._helpers import _round

logger = logging.getLogger(__name__)

production_ns = Namespace(
    "analytics/production", description="📈 Analytics - Producción y rendimiento"
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


@production_ns.route("/statistics")
class ProductionStatistics(Resource):
    @production_ns.doc(
        "get_production_statistics",
        params={
            "period": {
                "description": "Período (6m, 1y, 2y)",
                "type": "string",
                "default": "1y",
            },
            "group_by": {
                "description": "Agrupar por (breed, sex, age_group)",
                "type": "string",
            },
        },
        security=["Bearer", "Cookie"],
        responses={
            200: "Estadísticas de producción",
            401: "No autorizado",
            500: "Error del servidor",
        },
    )
    @jwt_required()
    def get(self):
        """Estadísticas de producción y rendimiento del hato"""
        try:
            period = flask.request.args.get("period", "1y")
            group_by = flask.request.args.get("group_by")

            period_days = {"6m": 180, "1y": 365, "2y": 730}
            start_date = datetime.now() - timedelta(days=period_days.get(period, 365))

            weight_trends = (
                _tf(
                    db.session.query(
                        extract("year", Control.checkup_date).label("year"),
                        extract("month", Control.checkup_date).label("month"),
                        func.avg(Control.weight).label("avg_weight"),
                        func.count(Control.id).label("count"),
                    ),
                    Control,
                )
                .join(Animals, Animals.id == Control.animal_id)
                .filter(
                    Control.checkup_date >= start_date,
                    Animals.status == AnimalStatus.Vivo,
                    Animals.is_deleted == False,
                    Control.is_deleted == False,
                )
                .group_by(
                    extract("year", Control.checkup_date),
                    extract("month", Control.checkup_date),
                )
                .order_by("year", "month")
                .all()
            )

            growth_analysis = (
                _tf(
                    db.session.query(
                        Animals.id,
                        Animals.record,
                        Animals.birth_date,
                        func.min(Animals.weight).label("initial_weight"),
                        func.max(Animals.weight).label("current_weight"),
                        func.min(Control.checkup_date).label("first_control"),
                        func.max(Control.checkup_date).label("last_control"),
                    ),
                    Animals,
                )
                .join(Control)
                .filter(
                    Control.checkup_date >= start_date,
                    Animals.status == AnimalStatus.Vivo,
                    Animals.is_deleted == False,
                    Control.is_deleted == False,
                )
                .group_by(Animals.id, Animals.record, Animals.birth_date)
                .having(func.count(Control.id) >= 2)
                .all()
            )

            growth_rates: list[dict[str, Any]] = []
            for animal in growth_analysis:
                first_date = cast(Any, animal.first_control)
                last_date = cast(Any, animal.last_control)
                days_diff = (last_date - first_date).days
                if days_diff > 0:
                    weight_gain = animal.current_weight - animal.initial_weight
                    daily_gain = weight_gain / days_diff
                    birth_date_val = cast(Any, animal.birth_date)
                    age_days = (
                        (datetime.now().date() - birth_date_val).days
                        if birth_date_val
                        else 0
                    )
                    growth_rates.append(
                        {
                            "animal_id": animal.id,
                            "record": animal.record,
                            "initial_weight": animal.initial_weight,
                            "current_weight": animal.current_weight,
                            "weight_gain": weight_gain,
                            "daily_gain": _round(daily_gain, 3),
                            "period_days": days_diff,
                            "age_months": _round(age_days / 30.44, 1),
                        }
                    )

            group_stats: Any = {}
            if group_by == "breed":
                rows = (
                    _tf(
                        db.session.query(
                            Breeds.name,
                            func.avg(Animals.weight).label("avg_weight"),
                            func.count(func.distinct(Animals.id)).label("animal_count"),
                        ),
                        Breeds,
                    )
                    .join(Animals)
                    .join(Control)
                    .filter(
                        Control.checkup_date >= start_date,
                        Animals.status == AnimalStatus.Vivo,
                        Animals.is_deleted == False,
                        Control.is_deleted == False,
                        Breeds.is_deleted == False,
                    )
                    .group_by(Breeds.name)
                    .all()
                )
                group_stats = {
                    breed: {"avg_weight": _round(avg_w, 2), "animal_count": cnt}
                    for breed, avg_w, cnt in rows
                }
            elif group_by == "sex":
                rows = (
                    _tf(
                        db.session.query(
                            Animals.sex,
                            func.avg(Animals.weight).label("avg_weight"),
                            func.count(func.distinct(Animals.id)).label("animal_count"),
                        ),
                        Animals,
                    )
                    .join(Control)
                    .filter(
                        Control.checkup_date >= start_date,
                        Animals.status == AnimalStatus.Vivo,
                        Animals.is_deleted == False,
                        Control.is_deleted == False,
                    )
                    .group_by(Animals.sex)
                    .all()
                )
                group_stats = {
                    sex.value: {"avg_weight": _round(avg_w, 2), "animal_count": cnt}
                    for sex, avg_w, cnt in rows
                }

            total = len(growth_rates)
            avg_daily = (
                sum(gr["daily_gain"] for gr in growth_rates) / total if total else 0
            )
            best = max((gr["daily_gain"] for gr in growth_rates), default=0)
            worst = min((gr["daily_gain"] for gr in growth_rates), default=0)
            if isinstance(best, decimal.Decimal):
                best = float(best)
            if isinstance(worst, decimal.Decimal):
                worst = float(worst)

            best_performers: list[Any] = []
            for i, item in enumerate(
                sorted(growth_rates, key=lambda x: x["daily_gain"], reverse=True)
            ):
                if i >= 5:
                    break
                best_performers.append(item)

            processed_trends = []
            for item in cast(list[Any], weight_trends):
                year, month, avg_w, cnt = item
                if isinstance(avg_w, decimal.Decimal):
                    avg_w = float(avg_w)
                processed_trends.append(
                    {
                        "year": int(year),
                        "month": int(month),
                        "avg_weight": _round(avg_w, 2),
                        "sample_size": cnt,
                        "period": f"{int(year)}-{int(month):02d}",
                    }
                )

            field_rows = (
                _tf(
                    db.session.query(Fields),
                    Fields,
                )
                .filter(Fields.is_deleted == False)
                .all()
            )
            field_ids = [field.id for field in field_rows]
            assignment_rows = []
            if field_ids:
                assignment_rows = (
                    _tf(
                        db.session.query(
                            AnimalFields.field_id,
                            func.count(func.distinct(AnimalFields.animal_id)).label(
                                "animal_count"
                            ),
                        ),
                        AnimalFields,
                    )
                    .join(Animals, Animals.id == AnimalFields.animal_id)
                    .filter(
                        AnimalFields.field_id.in_(field_ids),
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted == False,
                        Animals.status == AnimalStatus.Vivo,
                        Animals.is_deleted == False,
                    )
                    .group_by(AnimalFields.field_id)
                    .all()
                )

            assigned_animals = sum(int(count or 0) for _, count in assignment_rows)
            total_capacity = sum(field.capacity_num for field in field_rows)
            field_utilization = (
                round(min((assigned_animals / total_capacity) * 100, 100), 1)
                if total_capacity > 0
                else None
            )
            animals_per_field = (
                round(assigned_animals / len(field_rows), 1) if field_rows else None
            )

            month_start = datetime.now().date().replace(day=1)
            expense_query = _tf(
                db.session.query(func.sum(Transaction.amount)),
                Transaction,
            ).filter(
                Transaction.transaction_type == TransactionType.Expense,
                Transaction.date >= month_start,
                Transaction.date <= datetime.now().date(),
                Transaction.is_deleted == False,
            )
            monthly_expenses = exclude_simulated_transactions(
                expense_query, Transaction
            ).scalar()

            return APIResponse.success(
                data={
                    "weight_trends": processed_trends,
                    "growth_rates": growth_rates,
                    "productivity_metrics": {
                        "total_animals_analyzed": total,
                        "average_daily_gain_kg": _round(avg_daily, 3),
                        "best_daily_gain_kg": best,
                        "worst_daily_gain_kg": worst,
                        "period_analyzed": period,
                    },
                    "field_metrics": {
                        "total_fields": len(field_rows),
                        "occupied_fields": sum(
                            1 for _, count in assignment_rows if count
                        ),
                        "assigned_animals": assigned_animals,
                        "total_capacity": total_capacity,
                        "utilization_percent": field_utilization,
                        "animals_per_field": animals_per_field,
                    },
                    "financial_metrics": {
                        "month": month_start.isoformat(),
                        "monthly_expenses": float(monthly_expenses or 0),
                    },
                    "best_performers": best_performers,
                    "group_statistics": group_stats if group_by else {},
                    "summary": {
                        "period": period,
                        "start_date": start_date.isoformat(),
                        "total_controls": sum(cnt for _, _, _, cnt in weight_trends),
                        "animals_with_growth_data": total,
                    },
                },
                message="Estadísticas de producción obtenidas exitosamente",
            )
        except Exception as e:
            logger.error("Error en production/statistics: %s", e, exc_info=True)
            return APIResponse.error(
                message="Error interno del servidor",
                status_code=500,
                details={"error": str(e)},
            )
