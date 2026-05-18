from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.production_finance import FarmExpenses
from app.models.user_finca import UserFinca
from app import db

ns = Namespace('economy', description='Finanzas simples para el pequeño productor')

@ns.route('/wallet')
class FarmWallet(Resource):
    @jwt_required()
    def get(self):
        """Lista ingresos y gastos del "Monedero"."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca: return {"message": "Finca no activa"}, 400
        
        items = FarmExpenses.query.filter_by(finca_id=user_finca.finca_id).order_by(FarmExpenses.expense_date.desc()).all()
        
        income = sum(i.amount for i in items if i.is_income)
        expenses = sum(i.amount for i in items if not i.is_income)
        
        return {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "history": [i.to_namespace_dict() for i in items]
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
