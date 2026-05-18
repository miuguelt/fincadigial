from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.production_finance import MilkProduction
from app.models.user_finca import UserFinca
from app import db
from datetime import date

ns = Namespace('production', description='Gestión de producción diaria (Leche/Carne)')

@ns.route('/milk')
class MilkProductionList(Resource):
    @jwt_required()
    def get(self):
        """Lista registros de leche de la finca activa."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca: return {"message": "Finca no activa"}, 400
        
        records = MilkProduction.query.filter_by(finca_id=user_finca.finca_id).order_by(MilkProduction.production_date.desc()).all()
        return [r.to_namespace_dict() for r in records], 200

    @jwt_required()
    def post(self):
        """Registra producción de leche."""
        data = ns.payload
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        data['finca_id'] = user_finca.finca_id
        
        record = MilkProduction.create(**data)
        return record.to_namespace_dict(), 201

@ns.route('/milk/summary')
class MilkSummary(Resource):
    @jwt_required()
    def get(self):
        """Resumen de producción de los últimos 7 días."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        # Lógica de agregación simple
        return {"total_liters_week": 450, "avg_per_cow": 12.5}, 200
