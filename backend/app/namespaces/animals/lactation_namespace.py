"""Namespace API para ciclos de lactancia"""
import flask
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.milk_production import MilkProduction
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app import db
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

lactation_ns = create_optimized_namespace(
    name='lactation-cycles',
    description='Gestión de ciclos de lactancia',
    model_class=LactationCycle,
    path='/lactation-cycles'
)


@lactation_ns.route('/animal/<int:animal_id>/active')
class ActiveLactationCycle(Resource):
    @lactation_ns.doc('get_active_lactation', description='Obtener ciclo de lactancia activo de un animal')
    @jwt_required()
    def get(self, animal_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        cycle = LactationCycle.get_active_for_animal(animal_id, finca_id)
        if not cycle:
            return APIResponse.success(data=None, message='No hay ciclo de lactancia activo')

        return APIResponse.success(data=cycle.to_namespace_dict())


@lactation_ns.route('/animal/<int:animal_id>/history')
class LactationHistory(Resource):
    @lactation_ns.doc('get_lactation_history', description='Obtener historial de lactancias de un animal')
    @jwt_required()
    def get(self, animal_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        cycles = LactationCycle.get_cycles_for_animal(animal_id, finca_id)
        return APIResponse.success(
            data=[c.to_namespace_dict() for c in cycles],
            message='Historial de lactancias obtenido'
        )


@lactation_ns.route('/<int:cycle_id>/update-production')
class UpdateLactationProduction(Resource):
    @lactation_ns.doc('update_lactation_production', description='Actualizar métricas de producción del ciclo')
    @jwt_required()
    def post(self, cycle_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        cycle = LactationCycle.query.filter_by(id=cycle_id, finca_id=finca_id).first()
        if not cycle:
            return APIResponse.error('Ciclo de lactancia no encontrado', code=404)

        if cycle.status != LactationStatus.Active:
            return APIResponse.error('Solo se pueden actualizar ciclos activos', code=400)

        total_liters = db.session.query(
            db.func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.animal_id == cycle.animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= cycle.calving_date,
        ).scalar() or 0

        peak_record = db.session.query(
            MilkProduction.date,
            MilkProduction.liters
        ).filter(
            MilkProduction.animal_id == cycle.animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= cycle.calving_date,
        ).order_by(MilkProduction.liters.desc()).first()

        cycle.total_liters_lactation = float(total_liters)
        if peak_record:
            cycle.peak_liters = float(peak_record.liters)
            cycle.peak_date = peak_record.date

        cycle.save()

        return APIResponse.success(
            data=cycle.to_namespace_dict(),
            message='Métricas de producción actualizadas'
        )


@lactation_ns.route('/<int:cycle_id>/dry-off')
class DryOffCycle(Resource):
    @lactation_ns.doc('dry_off_cycle', description='Registrar secado de un ciclo de lactancia')
    @jwt_required()
    def post(self, cycle_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        cycle = LactationCycle.query.filter_by(id=cycle_id, finca_id=finca_id).first()
        if not cycle:
            return APIResponse.error('Ciclo de lactancia no encontrado', code=404)

        if cycle.status != LactationStatus.Active:
            return APIResponse.error('Solo se pueden secar ciclos activos', code=400)

        data = flask.request.get_json() or {}
        dry_off_date_str = data.get('dry_off_date', date.today().isoformat())

        try:
            dry_off_date = datetime.strptime(dry_off_date_str, '%Y-%m-%d').date()
        except ValueError:
            return APIResponse.error('Formato de fecha inválido. Use YYYY-MM-DD', code=400)

        if dry_off_date < cycle.calving_date:
            return APIResponse.error('Fecha de secado no puede ser anterior al parto', code=400)

        cycle.dry_off_date = dry_off_date
        cycle.status = LactationStatus.Dry

        total_liters = db.session.query(
            db.func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.animal_id == cycle.animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= cycle.calving_date,
            MilkProduction.date <= dry_off_date,
        ).scalar() or 0

        peak_record = db.session.query(
            MilkProduction.date,
            MilkProduction.liters
        ).filter(
            MilkProduction.animal_id == cycle.animal_id,
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= cycle.calving_date,
            MilkProduction.date <= dry_off_date,
        ).order_by(MilkProduction.liters.desc()).first()

        cycle.total_liters_lactation = float(total_liters)
        if peak_record:
            cycle.peak_liters = float(peak_record.liters)
            cycle.peak_date = peak_record.date

        cycle.save()

        return APIResponse.success(
            data=cycle.to_namespace_dict(),
            message='Ciclo de lactancia secado correctamente'
        )
