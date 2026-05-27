"""
Endpoints de exportación: Excel y PDF para reportes ganaderos.
Rutas: /api/v1/exports/...
"""
import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from app.services.export_service import ExportService
from app.utils.response_handler import APIResponse

exports_ns = Namespace('exports', description='📊 Exportación de reportes en Excel y PDF')

@exports_ns.route('/animals.xlsx')
class ExportAnimals(Resource):
    @jwt_required()
    def get(self):
        """Exportar lista de animales a Excel."""
        return ExportService.export_animals_excel(flask.request.args)

@exports_ns.route('/vaccinations.xlsx')
class ExportVaccinations(Resource):
    @jwt_required()
    def get(self):
        """Exportar historial de vacunaciones a Excel."""
        return ExportService.export_vaccinations_excel(flask.request.args)

@exports_ns.route('/inventory.xlsx')
class ExportInventory(Resource):
    @jwt_required()
    def get(self):
        """Exportar inventario a Excel."""
        return ExportService.export_inventory_excel()

@exports_ns.route('/reproduction.xlsx')
class ExportReproduction(Resource):
    @jwt_required()
    def get(self):
        """Exportar eventos reproductivos a Excel."""
        return ExportService.export_reproduction_excel(flask.request.args)

@exports_ns.route('/animal/<int:animal_id>/health-report.pdf')
class ExportAnimalHealthPDF(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Exportar historial sanitario a PDF."""
        buf, fname = ExportService.export_animal_health_pdf(animal_id)
        if not buf: return APIResponse.error(fname, status_code=404)
        return flask.send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=fname)

@exports_ns.route('/bulk-health-report.pdf')
class ExportBulkAnimalHealthPDF(Resource):
    @jwt_required()
    def get(self):
        """Exportar historial consolidado a PDF."""
        ids_str = flask.request.args.get('animal_ids', '')
        if not ids_str: return {"message": "Debe proporcionar animal_ids"}, 400
        buf, fname = ExportService.export_bulk_health_pdf(ids_str)
        if not buf: return {"message": fname}, 400
        return flask.send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=fname)

@exports_ns.route('/milk_production.xlsx')
class ExportMilkProduction(Resource):
    @jwt_required()
    def get(self):
        """Exportar producción de leche a Excel."""
        return ExportService.export_milk_production_excel(flask.request.args)

@exports_ns.route('/financials.xlsx')
class ExportFinancials(Resource):
    @jwt_required()
    def get(self):
        """Exportar transacciones financieras a Excel."""
        return ExportService.export_financials_excel(flask.request.args)

@exports_ns.route('/financial-report.pdf')
class ExportFinancialPDF(Resource):
    @jwt_required()
    def get(self):
        """Generar reporte financiero PDF."""
        buf, fname = ExportService.export_financial_pdf()
        return flask.send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=fname)

@exports_ns.route('/multi-finca-general.pdf')
class ExportMultiFincaGeneralPDF(Resource):
    @jwt_required()
    def get(self):
        """Generar reporte general consolidado multi-finca en PDF."""
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return {"message": "ID de usuario inválido"}, 400

        buf, fname = ExportService.export_multi_finca_general_pdf(user_id)
        if not buf:
            return {"message": fname}, 400
        return flask.send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=fname)

@exports_ns.route('/finca/<int:finca_id>/report.pdf')
class ExportFincaDetailPDF(Resource):
    @jwt_required()
    def get(self, finca_id):
        """Generar reporte detallado de una finca en PDF."""
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return {"message": "ID de usuario inválido"}, 400

        buf, fname = ExportService.export_finca_detail_pdf(user_id, finca_id)
        if not buf:
            return {"message": fname}, 404
        return flask.send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=fname)
