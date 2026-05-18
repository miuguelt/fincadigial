# reports.py - Generación de informes personalizados
from flask import request
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.utils.response_handler import APIResponse
from . import analytics_ns
from ._helpers import _round

@analytics_ns.route('/reports/custom')
class CustomReports(Resource):
    @jwt_required()
    def post(self):
        """Generar informe personalizado"""
        try:
            data = request.get_json() or {}
            report_type = data.get('report_type')
            start_date_str = data.get('start_date')
            end_date_str = data.get('end_date')

            if not all([report_type, start_date_str, end_date_str]):
                return APIResponse.error('Parámetros requeridos faltantes')

            # Lógica simplificada de generación (se puede expandir)
            return APIResponse.success({
                'report': {'type': report_type, 'summary': f'Informe de {report_type} generado'},
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'user': get_jwt_identity().get('fullname')
                }
            })
        except Exception as e:
            return APIResponse.error(str(e))
