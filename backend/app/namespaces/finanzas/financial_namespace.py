from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
import logging
from sqlalchemy import func

from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.models.financial import Transaction, TransactionType, TransactionCategory
from app.models.animals import Animals
from app import db

logger = logging.getLogger(__name__)

financial_ns = Namespace(
    'financial',
    description='💰 Módulo Financiero Básico - Ingresos, Gastos y ROI',
    path='/financial'
)

# Modelos Swagger
transaction_model = financial_ns.model('Transaction', {
    'animal_id': fields.Integer(description='ID del animal (opcional)'),
    'transaction_type': fields.String(description='Tipo (Ingreso/Gasto)', required=True),
    'category': fields.String(description='Categoría', required=True),
    'amount': fields.Float(description='Monto', required=True),
    'date': fields.String(description='Fecha (YYYY-MM-DD)', required=True),
    'description': fields.String(description='Descripción adicional')
})


@financial_ns.route('/transactions')
class TransactionListResource(Resource):
    @jwt_required()
    @financial_ns.doc('list_transactions', security='jwt')
    def get(self):
        """Listar transacciones financieras de la finca actual"""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("Finca no seleccionada", status_code=400)

            transactions = Transaction.query.filter_by(finca_id=finca_id).order_by(Transaction.date.desc()).all()
            
            return APIResponse.success(
                data=[t.to_namespace_dict(include_relations=True) for t in transactions],
                message=f"Se recuperaron {len(transactions)} transacciones"
            )
        except Exception as e:
            logger.error(f"Error listando transacciones: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500, details={'error': str(e)})

    @jwt_required()
    @financial_ns.doc('create_transaction', security='jwt')
    @financial_ns.expect(transaction_model)
    def post(self):
        """Registrar una nueva transacción"""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("Finca no seleccionada", status_code=400)

            data = flask.request.get_json()
            data['finca_id'] = finca_id
            
            validated_data = Transaction._validate_and_normalize(data)
            new_tx = Transaction(**validated_data)
            
            db.session.add(new_tx)
            db.session.commit()
            
            return APIResponse.success(
                data=new_tx.to_namespace_dict(include_relations=True),
                message="Transacción registrada exitosamente",
                status_code=201
            )
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creando transacción: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500, details={'error': str(e)})


@financial_ns.route('/transactions/<int:id>')
class TransactionResource(Resource):
    @jwt_required()
    @financial_ns.doc('delete_transaction', security='jwt')
    def delete(self, id):
        """Eliminar una transacción"""
        try:
            finca_id = get_current_finca_id()
            tx = Transaction.query.filter_by(id=id, finca_id=finca_id).first()
            
            if not tx:
                return APIResponse.error("Transacción no encontrada", status_code=404)
                
            db.session.delete(tx)
            db.session.commit()
            
            return APIResponse.success(message="Transacción eliminada exitosamente")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error eliminando transacción: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500, details={'error': str(e)})


@financial_ns.route('/transactions/summary')
class FinancialSummaryResource(Resource):
    @jwt_required()
    @financial_ns.doc('financial_summary', security='jwt')
    def get(self):
        """Obtener resumen financiero (Ingresos, Gastos, ROI global)"""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("Finca no seleccionada", status_code=400)

            # Sumatoria de Ingresos
            total_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.finca_id == finca_id,
                Transaction.transaction_type == TransactionType.Income
            ).scalar() or 0.0

            # Sumatoria de Gastos
            total_expense = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.finca_id == finca_id,
                Transaction.transaction_type == TransactionType.Expense
            ).scalar() or 0.0

            # ROI Global
            roi = 0.0
            if total_expense > 0:
                roi = ((float(total_income) - float(total_expense)) / float(total_expense)) * 100

            summary = {
                'total_income': float(total_income),
                'total_expense': float(total_expense),
                'balance': float(total_income) - float(total_expense),
                'roi_percentage': round(roi, 2)
            }

            return APIResponse.success(data=summary, message="Resumen financiero generado")
        except Exception as e:
            logger.error(f"Error generando resumen financiero: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500, details={'error': str(e)})


@financial_ns.route('/animal-roi/<int:animal_id>')
class AnimalROIResource(Resource):
    @jwt_required()
    @financial_ns.doc('animal_roi', security='jwt')
    def get(self, animal_id):
        """Obtener el ROI específico de un animal"""
        try:
            finca_id = get_current_finca_id()
            animal = Animals.query.filter_by(id=animal_id, finca_id=finca_id).first()
            if not animal:
                return APIResponse.error("Animal no encontrado", status_code=404)

            total_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.animal_id == animal_id,
                Transaction.transaction_type == TransactionType.Income
            ).scalar() or 0.0

            total_expense = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.animal_id == animal_id,
                Transaction.transaction_type == TransactionType.Expense
            ).scalar() or 0.0

            roi = 0.0
            if total_expense > 0:
                roi = ((float(total_income) - float(total_expense)) / float(total_expense)) * 100

            data = {
                'animal': animal.to_namespace_dict(),
                'financials': {
                    'income': float(total_income),
                    'expense': float(total_expense),
                    'profit': float(total_income) - float(total_expense),
                    'roi_percentage': round(roi, 2)
                }
            }

            return APIResponse.success(data=data, message="ROI del animal calculado")
        except Exception as e:
            logger.error(f"Error calculando ROI de animal: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500, details={'error': str(e)})
