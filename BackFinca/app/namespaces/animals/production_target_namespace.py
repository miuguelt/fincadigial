"""Namespace API para metas de producción"""
import flask
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from app.models.production_target import ProductionTarget, TargetPeriod
from app.models.milk_production import MilkProduction
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app import db
import logging
from datetime import datetime, date, timedelta
from sqlalchemy import func, extract

logger = logging.getLogger(__name__)

target_ns = create_optimized_namespace(
    name='production-targets',
    description='Gestión de metas de producción láctea',
    model_class=ProductionTarget,
    path='/production-targets'
)


@target_ns.route('/finca/progress')
class FincaTargetProgress(Resource):
    @target_ns.doc('get_finca_progress', description='Obtener progreso de metas de la finca')
    @jwt_required()
    def get(self):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        period = flask.request.args.get('period', 'Daily')

        targets = ProductionTarget.get_active_for_finca(finca_id, period)
        if not targets:
            return APIResponse.success(data=None, message='No hay metas activas para este período')

        target = targets[0]
        today = date.today()

        if target.period == TargetPeriod.Daily:
            start = today
            end = today
        elif target.period == TargetPeriod.Weekly:
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
        else:
            start = today.replace(day=1)
            next_month = today.replace(day=28) + timedelta(days=4)
            end = next_month - timedelta(days=next_month.day)

        actual = db.session.query(
            func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start,
            MilkProduction.date <= end,
        ).scalar() or 0

        if target.animal_id:
            actual = db.session.query(
                func.sum(MilkProduction.liters)
            ).filter(
                MilkProduction.animal_id == target.animal_id,
                MilkProduction.finca_id == finca_id,
                MilkProduction.date >= start,
                MilkProduction.date <= end,
            ).scalar() or 0

        progress_pct = (actual / target.target_liters * 100) if target.target_liters > 0 else 0

        return APIResponse.success(data={
            'target': target.to_namespace_dict(),
            'actual_liters': float(actual),
            'target_liters': target.target_liters,
            'progress_percentage': round(progress_pct, 2),
            'remaining_liters': max(0, target.target_liters - actual),
            'period': {
                'start': start.isoformat(),
                'end': end.isoformat(),
            },
        })


@target_ns.route('/<int:target_id>/progress')
class TargetProgress(Resource):
    @target_ns.doc('get_target_progress', description='Obtener progreso de una meta específica')
    @jwt_required()
    def get(self, target_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('Finca no seleccionada', code=400)

        target = ProductionTarget.query.filter_by(id=target_id, finca_id=finca_id).first()
        if not target:
            return APIResponse.error('Meta no encontrada', code=404)

        today = date.today()

        if target.period == TargetPeriod.Daily:
            start = today
            end = today
        elif target.period == TargetPeriod.Weekly:
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
        else:
            start = today.replace(day=1)
            next_month = today.replace(day=28) + timedelta(days=4)
            end = next_month - timedelta(days=next_month.day)

        query = MilkProduction.query.filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start,
            MilkProduction.date <= end,
        )

        if target.animal_id:
            query = query.filter(MilkProduction.animal_id == target.animal_id)

        actual = db.session.query(func.sum(MilkProduction.liters)).select_from(query.subquery()).scalar() or 0

        progress_pct = (actual / target.target_liters * 100) if target.target_liters > 0 else 0

        return APIResponse.success(data={
            'target': target.to_namespace_dict(),
            'actual_liters': float(actual),
            'target_liters': target.target_liters,
            'progress_percentage': round(progress_pct, 2),
            'remaining_liters': max(0, target.target_liters - actual),
            'on_track': progress_pct >= 50,
        })
