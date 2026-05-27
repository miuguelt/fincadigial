import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.production_finance import FarmExpenses
from app.models.user_finca import UserFinca
from app import db
from sqlalchemy import func

ns = Namespace('economy', description='Finanzas simples para el pequeño productor')

@ns.route('/wallet')
class FarmWallet(Resource):
    @jwt_required()
    def get(self):
        """Lista ingresos y gastos del "Monedero"."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca: return {"message": "Finca no activa"}, 400

        finca_id = user_finca.finca_id

        # Agregaciones a nivel DB (evita cargar todo en memoria)
        income = float(db.session.query(func.coalesce(func.sum(FarmExpenses.amount), 0)).filter_by(finca_id=finca_id, is_income=True).scalar() or 0)
        expenses = float(db.session.query(func.coalesce(func.sum(FarmExpenses.amount), 0)).filter_by(finca_id=finca_id, is_income=False).scalar() or 0)

        page = flask.request.args.get('page', default=1, type=int) or 1
        limit = flask.request.args.get('limit', default=50, type=int) or 50

        query = FarmExpenses.query.filter_by(finca_id=finca_id).order_by(FarmExpenses.expense_date.desc())
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)

        return {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "history": [i.to_namespace_dict() for i in pagination.items],
            "page": page,
            "limit": int(limit),
            "total_items": pagination.total,
        }, 200

    @jwt_required()
    def post(self):
        """Registra un gasto o ingreso."""
        data = ns.payload
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        data['finca_id'] = user_finca.finca_id

        item = FarmExpenses.create(**data)
        return item.to_namespace_dict(), 201
