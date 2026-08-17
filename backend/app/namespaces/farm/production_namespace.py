import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.production_finance import MilkProduction
from app.models.user_finca import UserFinca
from sqlalchemy import func
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

ns = Namespace("production", description="Gestión de producción diaria (Leche/Carne)")


@ns.route("/milk")
class MilkProductionList(Resource):
    @jwt_required()
    def get(self):
        """Lista registros de leche de la finca activa."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "Finca no activa"}, 400

        page = flask.request.args.get("page", default=1, type=int) or 1
        limit = flask.request.args.get("limit", default=50, type=int) or 50

        query = MilkProduction.query.filter_by(finca_id=user_finca.finca_id).order_by(
            MilkProduction.production_date.desc()
        )
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        items = [r.to_namespace_dict() for r in pagination.items]

        return {
            "items": items,
            "page": page,
            "limit": int(limit),
            "total_items": pagination.total,
            "total_pages": pagination.pages,
        }, 200

    @jwt_required()
    def post(self):
        """Registra producción de leche."""
        data = ns.payload
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        data["finca_id"] = user_finca.finca_id

        record = MilkProduction.create(**data)
        return record.to_namespace_dict(), 201


@ns.route("/milk/summary")
class MilkSummary(Resource):
    @jwt_required()
    def get(self):
        """Resumen de producción de los últimos 7 días."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "Finca no activa"}, 400

        finca_id = user_finca.finca_id
        today = date.today()
        week_ago = today - timedelta(days=7)

        try:
            stats = (
                db.session.query(
                    func.sum(MilkProduction.liters).label("total_liters"),
                    func.count(func.distinct(MilkProduction.animal_id)).label(
                        "cows_milked"
                    ),
                    func.avg(MilkProduction.liters).label("avg_per_cow"),
                    func.count(MilkProduction.id).label("total_records"),
                )
                .filter(
                    MilkProduction.finca_id == finca_id,
                    MilkProduction.production_date >= week_ago,
                    MilkProduction.production_date <= today,
                )
                .first()
            )

            total_liters = (
                float(stats.total_liters) if stats and stats.total_liters else 0
            )
            cows_milked = int(stats.cows_milked) if stats and stats.cows_milked else 0
            avg_per_cow = float(stats.avg_per_cow) if stats and stats.avg_per_cow else 0
            total_records = (
                int(stats.total_records) if stats and stats.total_records else 0
            )

            return {
                "total_liters_week": round(total_liters, 1),
                "avg_per_cow": round(avg_per_cow, 2),
                "cows_milked": cows_milked,
                "total_records": total_records,
                "period": {
                    "start": week_ago.isoformat(),
                    "end": today.isoformat(),
                },
            }, 200
        except Exception as e:
            logger.error(f"Error en resumen de producción: {e}")
            return {"total_liters_week": 0, "avg_per_cow": 0, "error": str(e)}, 500
