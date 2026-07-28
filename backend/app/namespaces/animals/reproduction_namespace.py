import flask
import logging
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from sqlalchemy import func

from app import db
from app.models.reproduction import (
    ReproductiveEvent, Offspring,
    EventType, InseminationTechnique, DiagnosisResult,
)
from app.models.animals import Animals, Sex
from app.models.base_model import ValidationError
from app.utils.response_handler import APIResponse
from app.utils.tree_builder import build_ancestor_tree, build_descendant_tree
from app.utils.tenant_context import apply_tenant_filter

logger = logging.getLogger(__name__)

reproduction_ns = Namespace('reproduction', description='🐄 Gestión reproductiva: celos, inseminaciones, diagnósticos y partos')

# --- Swagger models ---

event_input_model = reproduction_ns.model('ReproductiveEventInput', {
    'animal_id': fields.Integer(required=True, description='ID de la hembra'),
    'event_type': fields.String(required=True, enum=['Celo', 'Inseminacion', 'Diagnostico', 'Parto']),
    'event_date': fields.Date(required=True),
    'sire_id': fields.Integer(description='ID del macho (solo Inseminacion)'),
    'technique': fields.String(enum=['Natural', 'Artificial', 'Transferencia_Embrionaria']),
    'diagnosis_result': fields.String(enum=['Positivo', 'Negativo', 'Pendiente']),
    'expected_birth_date': fields.Date(description='Se calcula automáticamente si no se provee'),
    'alive_count': fields.Integer(description='Crías vivas (solo Parto)'),
    'dead_count': fields.Integer(description='Crías muertas (solo Parto)'),
    'complications': fields.Boolean(description='¿Hubo complicaciones? (solo Parto)'),
    'notes': fields.String(),
})

offspring_input_model = reproduction_ns.model('OffspringInput', {
    'birth_event_id': fields.Integer(required=True),
    'animal_id': fields.Integer(description='ID del animal creado para esta cría (opcional)'),
    'sex': fields.String(enum=['Hembra', 'Macho']),
    'alive': fields.Boolean(default=True),
    'birth_weight': fields.Integer(),
    'notes': fields.String(),
})


def _parse_int(name, default=1):
    val = flask.request.args.get(name, default=default, type=int)
    return max(1, val or default)


# --- Reproductive Events ---

@reproduction_ns.route('/events/')
class EventList(Resource):
    @jwt_required()
    @reproduction_ns.doc('list_events', params={
        'page': 'Página', 'limit': 'Registros por página',
        'animal_id': 'Filtrar por hembra',
        'event_type': 'Celo | Inseminacion | Diagnostico | Parto',
        'diagnosis_result': 'Positivo | Negativo | Pendiente',
        'sort_by': 'Campo de ordenamiento',
        'sort_order': 'asc | desc',
    })
    def get(self):
        """Listar eventos reproductivos."""
        page = _parse_int('page', 1)
        limit = _parse_int('limit', 20)
        sort_by = flask.request.args.get('sort_by', 'event_date')
        sort_order = flask.request.args.get('sort_order', 'desc')

        filters = {}
        for field in ['animal_id', 'sire_id']:
            val = flask.request.args.get(field, type=int)
            if val:
                filters[field] = val
        for field in ['event_type', 'diagnosis_result']:
            val = flask.request.args.get(field)
            if val:
                enum_cls = EventType if field == 'event_type' else DiagnosisResult
                try:
                    filters[field] = enum_cls(val)
                except ValueError:
                    return APIResponse.error(f"{field} inválido: {val}", status_code=400)

        query = ReproductiveEvent.get_namespace_query(
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=limit,
            include_relations=True,
        )
        result = ReproductiveEvent.get_paginated_response(query, include_relations=True)
        return APIResponse.paginated_success(
            data=result.get('items', []),
            page=result.get('page', page),
            limit=result.get('limit', limit),
            total_items=result.get('total_items', 0),
            message='Eventos reproductivos obtenidos',
        )

    @jwt_required()
    @reproduction_ns.expect(event_input_model)
    def post(self):
        """Registrar nuevo evento reproductivo."""
        data = dict(reproduction_ns.payload or {})

        try:
            actor_id = int(get_jwt_identity())
        except Exception:
            actor_id = None
        if actor_id and 'actor_id' not in data:
            data['actor_id'] = actor_id

        try:
            event = ReproductiveEvent.create(**data)
            
            # Actualizar estados del animal en caliente
            animal = Animals.get_by_id(event.animal_id)
            if animal:
                if event.event_type == EventType.Diagnostico:
                    if event.diagnosis_result == DiagnosisResult.Positivo:
                        animal.update(is_pregnant=True)
                    elif event.diagnosis_result == DiagnosisResult.Negativo:
                        animal.update(is_pregnant=False)
                elif event.event_type == EventType.Parto:
                    animal.update(is_pregnant=False, is_lactating=True, last_calving_date=event.event_date)
            db.session.commit()
            
            # Limpiar cachés
            from app.utils.namespace_helpers import _cache_clear
            _cache_clear('Animals')
            _cache_clear('ReproductiveEvent')
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(e.message, status_code=400, details={'errors': e.errors})
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=event.to_namespace_dict(include_relations=True),
            message='Evento registrado',
            status_code=201,
        )


@reproduction_ns.route('/events/<int:event_id>')
class EventDetail(Resource):
    @jwt_required()
    def get(self, event_id):
        """Obtener evento por ID."""
        ev = ReproductiveEvent.get_by_id(event_id, include_relations=True)
        if not ev:
            return APIResponse.error('Evento no encontrado', status_code=404)
        data = ev.to_namespace_dict(include_relations=True)
        data['offspring_list'] = [o.to_namespace_dict(include_relations=True) for o in ev.offspring.all()]
        return APIResponse.success(data=data)

    @jwt_required()
    @reproduction_ns.expect(event_input_model)
    def put(self, event_id):
        """Actualizar evento (reemplazo total)."""
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            return APIResponse.error('Evento no encontrado', status_code=404)
        try:
            ev.update(**reproduction_ns.payload)
            db.session.commit()
            
            from app.utils.namespace_helpers import _cache_clear
            _cache_clear('ReproductiveEvent')
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)
        return APIResponse.success(data=ev.to_namespace_dict(include_relations=True), message='Evento actualizado')

    @jwt_required()
    def patch(self, event_id):
        """Actualizar evento (parcial)."""
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            return APIResponse.error('Evento no encontrado', status_code=404)
        try:
            ev.update(**reproduction_ns.payload)
            db.session.commit()
            
            from app.utils.namespace_helpers import _cache_clear
            _cache_clear('ReproductiveEvent')
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)
        return APIResponse.success(data=ev.to_namespace_dict(include_relations=True), message='Evento actualizado')

    @jwt_required()
    def delete(self, event_id):
        """Eliminar evento."""
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            return APIResponse.error('Evento no encontrado', status_code=404)
        ev.delete()
        return APIResponse.success(message='Evento eliminado')


@reproduction_ns.route('/events/animal/<int:animal_id>')
class AnimalReproductiveHistory(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Historial reproductivo completo de una hembra."""
        animal = Animals.get_by_id(animal_id)
        if not animal:
            return APIResponse.error('Animal no encontrado', status_code=404)

        events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter_by(animal_id=animal_id)\
            .order_by(ReproductiveEvent.event_date.desc()).all()

        data = [e.to_namespace_dict(include_relations=True) for e in events]

        # Métricas
        inseminations = [e for e in events if e.event_type == EventType.Inseminacion]
        positive_diags = [e for e in events if e.event_type == EventType.Diagnostico
                          and e.diagnosis_result == DiagnosisResult.Positivo]
        partos = [e for e in events if e.event_type == EventType.Parto]
        total_alive = sum(e.alive_count or 0 for e in partos)
        total_dead = sum(e.dead_count or 0 for e in partos)

        conception_rate = round(len(positive_diags) / len(inseminations) * 100, 1) if inseminations else None

        last_insem = next((e for e in inseminations), None)
        active_pregnancy = None
        if last_insem and last_insem.expected_birth_date:
            # Verificar si esta inseminación ya está resuelta por algún parto o diagnóstico negativo posterior
            subsequent_event = next((e for e in events if e.event_date >= last_insem.event_date and e.id != last_insem.id and (
                (e.event_type == EventType.Diagnostico and e.diagnosis_result == DiagnosisResult.Negativo) or
                (e.event_type == EventType.Parto)
            )), None)

            if not subsequent_event:
                from datetime import timedelta
                today = date.today()
                if last_insem.expected_birth_date >= today or (today - last_insem.expected_birth_date < timedelta(days=45)):
                    active_pregnancy = {
                        'insemination_date': str(last_insem.event_date),
                        'expected_birth_date': str(last_insem.expected_birth_date),
                        'days_remaining': (last_insem.expected_birth_date - today).days,
                        'technique': last_insem.technique.value if last_insem.technique else None,
                    }

        return APIResponse.success(data={
            'animal_id': animal_id,
            'animal_record': animal.record,
            'events': data,
            'metrics': {
                'total_inseminations': len(inseminations),
                'positive_diagnoses': len(positive_diags),
                'total_births': len(partos),
                'total_alive_offspring': total_alive,
                'total_dead_offspring': total_dead,
                'conception_rate_pct': conception_rate,
            },
            'active_pregnancy': active_pregnancy,
        })


# --- Offspring ---

@reproduction_ns.route('/offspring/')
class OffspringList(Resource):
    @jwt_required()
    def get(self):
        """Listar crías."""
        page = _parse_int('page', 1)
        limit = _parse_int('limit', 20)
        filters = {}
        birth_event_id = flask.request.args.get('birth_event_id', type=int)
        if birth_event_id:
            filters['birth_event_id'] = birth_event_id
        query = Offspring.get_namespace_query(filters=filters, sort_by='created_at',
                                              sort_order='desc', page=page, per_page=limit)
        result = Offspring.get_paginated_response(query)
        return APIResponse.paginated_success(
            data=result.get('items', []),
            page=result.get('page', page),
            limit=result.get('limit', limit),
            total_items=result.get('total_items', 0),
            message='Crías obtenidas',
        )

    @jwt_required()
    @reproduction_ns.expect(offspring_input_model)
    def post(self):
        """Registrar cría de un parto."""
        data = dict(reproduction_ns.payload or {})
        birth_event_id = data.get('birth_event_id')
        if birth_event_id:
            ev = ReproductiveEvent.get_by_id(birth_event_id)
            if not ev or ev.event_type != EventType.Parto:
                return APIResponse.error('El evento debe ser de tipo Parto', status_code=400)
        try:
            offspring = Offspring.create(**data)
        except ValidationError as e:
            logger.warning(f"Error de validación al registrar cría: {e.message} - Payload: {data}")
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            logger.error(f"Error inesperado al registrar cría: {str(e)}", exc_info=True)
            return APIResponse.error('Error al procesar el registro de la cría', status_code=500)
        return APIResponse.success(
            data=offspring.to_namespace_dict(include_relations=True),
            message='Cría registrada', status_code=201,
        )


# --- Summary & Stats ---

@reproduction_ns.route('/summary')
class ReproductionSummary(Resource):
    @jwt_required()
    def get(self):
        """Resumen global del estado reproductivo del hato."""
        today = date.today()
        from datetime import timedelta

        total_females = apply_tenant_filter(Animals.query, Animals).filter_by(sex=Sex.Hembra).count()
        total_events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).count()

        insem_count = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter_by(event_type=EventType.Inseminacion).count()
        heat_count = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter_by(event_type=EventType.Celo).count()
        diag_count = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter_by(event_type=EventType.Diagnostico).count()
        positive_count = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
        ).count()
        parto_count = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter_by(event_type=EventType.Parto).count()

        # Preñeces activas (inseminaciones sin parto posterior registrado o diagnóstico posterior negativo)
        all_inseminations = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date.isnot(None),
        ).all()
        
        # Cargar todos los Diagnosticos y Partos de las hembras inseminadas para no hacer queries en loop
        animal_ids = list(set(i.animal_id for i in all_inseminations))
        subsequent_candidates = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.animal_id.in_(animal_ids),
            ReproductiveEvent.event_type.in_([EventType.Diagnostico, EventType.Parto])
        ).all() if animal_ids else []

        candidates_by_animal = {}
        for ev in subsequent_candidates:
            if ev.animal_id not in candidates_by_animal:
                candidates_by_animal[ev.animal_id] = []
            candidates_by_animal[ev.animal_id].append(ev)

        active_pregnancies = 0
        overdue = 0
        births_next_30 = 0

        for insem in all_inseminations:
            animal_events = candidates_by_animal.get(insem.animal_id, [])
            subsequent_event = None
            for ev in animal_events:
                if ev.event_date >= insem.event_date and ev.id != insem.id:
                    if (ev.event_type == EventType.Diagnostico and ev.diagnosis_result == DiagnosisResult.Negativo) or ev.event_type == EventType.Parto:
                        # Para ser más exacto, debería ser el primer evento después, pero si existe CUALQUIERA, anula
                        subsequent_event = ev
                        break

            if not subsequent_event:
                # No hay eventos que anulen o completen la preñez
                if insem.expected_birth_date >= today:
                    active_pregnancies += 1
                    # Próximos partos en 30 días
                    if insem.expected_birth_date <= today + timedelta(days=30):
                        births_next_30 += 1
                # Si está en el pasado, está vencido (hasta un límite razonable de 45 días)
                elif today - insem.expected_birth_date < timedelta(days=45):
                    overdue += 1

        conception_rate = round(positive_count / insem_count * 100, 1) if insem_count else None

        total_alive = apply_tenant_filter(db.session.query(func.sum(ReproductiveEvent.alive_count)), ReproductiveEvent)\
            .filter(ReproductiveEvent.event_type == EventType.Parto).scalar() or 0
        total_dead = apply_tenant_filter(db.session.query(func.sum(ReproductiveEvent.dead_count)), ReproductiveEvent)\
            .filter(ReproductiveEvent.event_type == EventType.Parto).scalar() or 0

        return APIResponse.success(data={
            'total_females': total_females,
            'total_events': total_events,
            'total_inseminations': insem_count,
            'total_heats': heat_count,
            'total_diagnoses': diag_count,
            'total_births': parto_count,
            'active_pregnancies': active_pregnancies,
            'births_next_30_days': births_next_30,
            'overdue_births': overdue,
            'conception_rate_pct': conception_rate,
            'total_alive_offspring': int(total_alive),
            'total_dead_offspring': int(total_dead),
        }, message='Resumen reproductivo')


@reproduction_ns.route('/pending-births')
class PendingBirths(Resource):
    @jwt_required()
    @reproduction_ns.doc('pending_births', params={
        'days': 'Horizonte en días (default: 60)',
    })
    def get(self):
        """Inseminaciones con parto pendiente, ordenadas por fecha esperada."""
        today = date.today()
        from datetime import timedelta
        days = max(1, flask.request.args.get('days', default=60, type=int))
        horizon = today + timedelta(days=days)

        events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date.isnot(None),
            ReproductiveEvent.expected_birth_date <= horizon,
        ).order_by(ReproductiveEvent.expected_birth_date).all()

        animal_ids = list(set(e.animal_id for e in events))
        subsequent_candidates = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.animal_id.in_(animal_ids),
            ReproductiveEvent.event_type.in_([EventType.Diagnostico, EventType.Parto])
        ).all() if animal_ids else []

        candidates_by_animal = {}
        for ev in subsequent_candidates:
            if ev.animal_id not in candidates_by_animal:
                candidates_by_animal[ev.animal_id] = []
            candidates_by_animal[ev.animal_id].append(ev)

        result = []
        for ev in events:
            animal_events = candidates_by_animal.get(ev.animal_id, [])
            subsequent_event = None
            for cand in animal_events:
                if cand.event_date >= ev.event_date and cand.id != ev.id:
                    if (cand.event_type == EventType.Diagnostico and cand.diagnosis_result == DiagnosisResult.Negativo) or cand.event_type == EventType.Parto:
                        subsequent_event = cand
                        break

            if not subsequent_event:
                # Solo preñeces que siguen activas
                if ev.expected_birth_date >= today or (today - ev.expected_birth_date < timedelta(days=45)):
                    item = ev.to_namespace_dict(include_relations=True)
                    item['status'] = (
                        'overdue' if ev.expected_birth_date < today else
                        'imminent' if ev.expected_birth_date <= today + timedelta(days=7) else
                        'upcoming'
                    )
                    result.append(item)

        return APIResponse.success(data=result, message='Partos pendientes')


@reproduction_ns.route('/fertility-dashboard')
class FertilityDashboard(Resource):
    @jwt_required()
    @reproduction_ns.doc('fertility_dashboard', params={
        'months': 'Período en meses (default: 12)',
    })
    def get(self):
        """Dashboard de fertilidad con métricas clave."""
        from datetime import timedelta
        months = max(1, flask.request.args.get('months', default=12, type=int))
        start_date = date.today() - timedelta(days=months * 30)

        # Cargar todos los eventos relevantes en memoria para evitar N+1 queries
        all_events_in_period = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_date >= start_date,
            ReproductiveEvent.event_type.in_([EventType.Inseminacion, EventType.Diagnostico, EventType.Parto])
        ).order_by(ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc()).all()

        events_by_animal = {}
        for ev in all_events_in_period:
            if ev.animal_id not in events_by_animal:
                events_by_animal[ev.animal_id] = []
            events_by_animal[ev.animal_id].append(ev)

        inseminations_period = [e for e in all_events_in_period if e.event_type == EventType.Inseminacion]

        # Determinar éxito de inseminaciones en el período
        successful_inseminations = []
        for insem in inseminations_period:
            animal_events = events_by_animal.get(insem.animal_id, [])
            next_event = None
            for ev in animal_events:
                if ev.event_date > insem.event_date or (ev.event_date == insem.event_date and ev.id > insem.id):
                    next_event = ev
                    break

            if next_event:
                if (next_event.event_type == EventType.Diagnostico and next_event.diagnosis_result == DiagnosisResult.Positivo) or next_event.event_type == EventType.Parto:
                    successful_inseminations.append(insem)

        conception_rate = round(len(successful_inseminations) / len(inseminations_period) * 100, 1) if inseminations_period else 0

        # Tasa de preñez por técnica
        natural_insem = [e for e in inseminations_period if e.technique == InseminationTechnique.Natural]
        artificial_insem = [e for e in inseminations_period if e.technique == InseminationTechnique.Artificial]

        natural_success = [e for e in successful_inseminations if e.technique == InseminationTechnique.Natural]
        artificial_success = [e for e in successful_inseminations if e.technique == InseminationTechnique.Artificial]

        natural_rate = round(len(natural_success) / len(natural_insem) * 100, 1) if natural_insem else 0
        artificial_rate = round(len(artificial_success) / len(artificial_insem) * 100, 1) if artificial_insem else 0

        # Intervalo promedio entre partos
        partos = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Parto,
            ReproductiveEvent.event_date >= start_date,
        ).all()

        intervals = []
        for animal_id in set(p.animal_id for p in partos):
            animal_partos = sorted([p for p in partos if p.animal_id == animal_id], key=lambda x: x.event_date)
            for i in range(1, len(animal_partos)):
                interval = (animal_partos[i].event_date - animal_partos[i-1].event_date).days
                intervals.append(interval)

        avg_interval = round(sum(intervals) / len(intervals), 1) if intervals else 0

        # Tasa de mortalidad perinatal
        total_alive = sum(p.alive_count or 0 for p in partos)
        total_born = total_alive + sum(p.dead_count or 0 for p in partos)
        mortality_rate = round((sum(p.dead_count or 0 for p in partos) / total_born) * 100, 1) if total_born > 0 else 0

        # Distribución de eventos por mes
        events_by_month = {}
        for ev in inseminations_period:
            month_key = ev.event_date.strftime('%Y-%m')
            events_by_month[month_key] = events_by_month.get(month_key, 0) + 1

        # Top 5 hembras más fértiles
        female_fertility = {}
        for insem in inseminations_period:
            animal_id = insem.animal_id
            if animal_id not in female_fertility:
                female_fertility[animal_id] = {'inseminations': 0, 'positive': 0}
            female_fertility[animal_id]['inseminations'] += 1

        for insem in successful_inseminations:
            female_fertility[insem.animal_id]['positive'] += 1

        # Obtener nombres de las hembras de una sola vez
        animal_ids = list(female_fertility.keys())
        females_db = apply_tenant_filter(Animals.query, Animals).filter(
            Animals.id.in_(animal_ids)
        ).all() if animal_ids else []
        females_dict = {f.id: f for f in females_db}

        # Calcular tasa por hembra y ordenar
        ranked_females = []
        for animal_id, data in female_fertility.items():
            if data['inseminations'] > 0:
                rate = round(data['positive'] / data['inseminations'] * 100, 1)
                animal = females_dict.get(animal_id)
                ranked_females.append({
                    'animal_id': animal_id,
                    'record': animal.record if animal else '---',
                    'inseminations': data['inseminations'],
                    'positive': data['positive'],
                    'rate': rate,
                })

        ranked_females.sort(key=lambda x: x['rate'], reverse=True)
        top_females = ranked_females[:5]
        bottom_females = ranked_females[-5:] if len(ranked_females) > 5 else []

        return APIResponse.success(data={
            'period_months': months,
            'total_inseminations': len(inseminations_period),
            'successful_inseminations': len(successful_inseminations),
            'conception_rate_pct': conception_rate,
            'conception_by_technique': {
                'natural': natural_rate,
                'artificial': artificial_rate,
            },
            'avg_interval_between_births_days': avg_interval,
            'perinatal_mortality_rate_pct': mortality_rate,
            'events_by_month': events_by_month,
            'top_females': top_females,
            'bottom_females': bottom_females,
        }, message='Dashboard de fertilidad')


@reproduction_ns.route('/heat-alerts')
class HeatAlerts(Resource):
    @jwt_required()
    @reproduction_ns.doc('heat_alerts')
    def get(self):
        """Hembras con celo probable basado en parámetros de detección desde BD."""
        from app.models.system_content import SystemContent
        today = date.today()
        heat_min_entry = SystemContent.get_by_key('param.reproduction.heat_detection_min_days')
        heat_max_entry = SystemContent.get_by_key('param.reproduction.heat_detection_max_days')
        min_days = int(heat_min_entry.content) if (heat_min_entry and heat_min_entry.content) else 18
        max_days = int(heat_max_entry.content) if (heat_max_entry and heat_max_entry.content) else 23

        # Obtener hembras
        females = apply_tenant_filter(Animals.query, Animals).filter_by(sex=Sex.Hembra).all()
        female_ids = [f.id for f in females]

        # Cargar todos los eventos reproductivos de estas hembras en memoria
        all_events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.animal_id.in_(female_ids)
        ).order_by(ReproductiveEvent.event_date.desc(), ReproductiveEvent.id.desc()).all() if female_ids else []

        events_by_animal = {}
        for ev in all_events:
            if ev.animal_id not in events_by_animal:
                events_by_animal[ev.animal_id] = []
            events_by_animal[ev.animal_id].append(ev)

        alerts = []
        for female in females:
            animal_events = events_by_animal.get(female.id, [])
            
            # Buscar último celo
            last_heat = next((e for e in animal_events if e.event_type == EventType.Celo), None)

            if last_heat:
                days_since_heat = (today - last_heat.event_date).days
                if min_days <= days_since_heat <= max_days:
                    priority = 'Media'
                    if days_since_heat >= 21:
                        priority = 'Alta'
                    elif days_since_heat <= 19:
                        priority = 'Baja'

                    # Buscar última inseminación válida
                    last_insem = next((e for e in animal_events if e.event_type == EventType.Inseminacion and e.expected_birth_date and e.expected_birth_date >= today), None)
                    
                    is_pregnant = False
                    if last_insem:
                        # Eventos están ordenados desc, así que buscamos desde el inicio hasta last_insem
                        # para ver si hubo un parto o diag. negativo DESPUÉS de last_insem.
                        for ev in animal_events:
                            if ev.id == last_insem.id:
                                # Llegamos a la inseminación, no encontramos nada posterior que la anule (ya que iteramos desc)
                                is_pregnant = True
                                break
                            if ev.event_date >= last_insem.event_date and ev.id != last_insem.id:
                                if (ev.event_type == EventType.Diagnostico and ev.diagnosis_result == DiagnosisResult.Negativo) or ev.event_type == EventType.Parto:
                                    break # Se anuló la preñez

                    if not is_pregnant:
                        alerts.append({
                            'animal_id': female.id,
                            'record': female.record,
                            'breed': female.breed.name if female.breed else '---',
                            'days_since_last_heat': days_since_heat,
                            'last_heat_date': str(last_heat.event_date),
                            'priority': priority,
                            'age_days': (today - female.birth_date).days if female.birth_date else None,
                        })

        # Ordenar por prioridad y días
        priority_order = {'Alta': 0, 'Media': 1, 'Baja': 2}
        alerts.sort(key=lambda x: (priority_order[x['priority']], -x['days_since_last_heat']))

        return APIResponse.success(data=alerts, message='Alertas de celo')


@reproduction_ns.route('/calendar')
class ReproductionCalendar(Resource):
    @jwt_required()
    @reproduction_ns.doc('reproduction_calendar', params={
        'start_date': 'Fecha inicio (YYYY-MM-DD)',
        'end_date': 'Fecha fin (YYYY-MM-DD)',
    })
    def get(self):
        """Eventos reproductivos en rango de fechas para calendario."""
        start_date_str = flask.request.args.get('start_date')
        end_date_str = flask.request.args.get('end_date')

        if start_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
            except ValueError:
                return APIResponse.error('start_date inválido (use YYYY-MM-DD)', status_code=400)
        else:
            from datetime import timedelta
            start_date = date.today() - timedelta(days=30)

        if end_date_str:
            try:
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return APIResponse.error('end_date inválido (use YYYY-MM-DD)', status_code=400)
        else:
            from datetime import timedelta
            end_date = date.today() + timedelta(days=60)

        # Obtener eventos en rango
        events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_date >= start_date,
            ReproductiveEvent.event_date <= end_date,
        ).order_by(ReproductiveEvent.event_date).all()

        # Formatear para calendario
        calendar_events = []
        for ev in events:
            event_data = ev.to_namespace_dict(include_relations=True)

            # Asignar color según tipo
            color_map = {
                'Celo': '#fbbf24',      # amarillo
                'Inseminacion': '#3b82f6',  # azul
                'Diagnostico': '#f97316',   # naranja
                'Parto': '#10b981',        # verde
            }

            calendar_events.append({
                'id': ev.id,
                'title': f"{ev.event_type.value} - {ev.animal.record if ev.animal else '---'}",
                'start': str(ev.event_date),
                'allDay': True,
                'backgroundColor': color_map.get(ev.event_type.value, '#6b7280'),
                'borderColor': color_map.get(ev.event_type.value, '#6b7280'),
                'extendedProps': {
                    'event_type': ev.event_type.value,
                    'animal_id': ev.animal_id,
                    'animal_record': ev.animal.record if ev.animal else '---',
                    'notes': ev.notes,
                }
            })

        # Agregar partos pendientes (expected_birth_date)
        pending_births = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date.isnot(None),
            ReproductiveEvent.expected_birth_date >= start_date,
            ReproductiveEvent.expected_birth_date <= end_date,
        ).all()

        animal_ids = list(set(e.animal_id for e in pending_births))
        subsequent_candidates = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.animal_id.in_(animal_ids),
            ReproductiveEvent.event_type.in_([EventType.Diagnostico, EventType.Parto])
        ).all() if animal_ids else []

        candidates_by_animal = {}
        for ev in subsequent_candidates:
            if ev.animal_id not in candidates_by_animal:
                candidates_by_animal[ev.animal_id] = []
            candidates_by_animal[ev.animal_id].append(ev)

        for ev in pending_births:
            animal_events = candidates_by_animal.get(ev.animal_id, [])
            subsequent_event = None
            for cand in animal_events:
                if cand.event_date >= ev.event_date and cand.id != ev.id:
                    if (cand.event_type == EventType.Diagnostico and cand.diagnosis_result == DiagnosisResult.Negativo) or cand.event_type == EventType.Parto:
                        subsequent_event = cand
                        break

            if not subsequent_event:
                calendar_events.append({
                    'id': f"pending-{ev.id}",
                    'title': f"Parto Pendiente - {ev.animal.record if ev.animal else '---'}",
                    'start': str(ev.expected_birth_date),
                    'allDay': True,
                    'backgroundColor': '#ef4444',  # rojo
                    'borderColor': '#ef4444',
                    'borderWidth': 2,
                    'extendedProps': {
                        'event_type': 'Parto_Pendiente',
                        'animal_id': ev.animal_id,
                        'animal_record': ev.animal.record if ev.animal else '---',
                        'is_pending': True,
                    }
                })

        return APIResponse.success(data=calendar_events, message='Eventos de calendario')


@reproduction_ns.route('/sire-performance')
class SirePerformance(Resource):
    @jwt_required()
    @reproduction_ns.doc('sire_performance', params={
        'months': 'Período en meses (default: 12)',
    })
    def get(self):
        """Análisis de desempeño de toros (sires)."""
        from datetime import timedelta
        months = max(1, flask.request.args.get('months', default=12, type=int))
        start_date = date.today() - timedelta(days=months * 30)

        # Cargar todos los eventos en memoria para evitar N+1
        # Obtenemos todos los eventos (incluyendo antes del start_date para poder encontrar la insem. de un parto)
        all_events = apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent).filter(
            ReproductiveEvent.event_type.in_([EventType.Inseminacion, EventType.Diagnostico, EventType.Parto])
        ).order_by(ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc()).all()

        events_by_animal = {}
        for ev in all_events:
            if ev.animal_id not in events_by_animal:
                events_by_animal[ev.animal_id] = []
            events_by_animal[ev.animal_id].append(ev)

        inseminations_period = [
            e for e in all_events 
            if e.event_type == EventType.Inseminacion and e.sire_id is not None and e.event_date >= start_date
        ]

        partos_period = [
            e for e in all_events
            if e.event_type == EventType.Parto and e.event_date >= start_date
        ]

        # Cargar crías de una sola vez
        parto_ids = [p.id for p in partos_period]
        offspring_list = apply_tenant_filter(Offspring.query, Offspring).filter(Offspring.birth_event_id.in_(parto_ids)).all() if parto_ids else []
        offspring_by_parto = {}
        for off in offspring_list:
            if off.birth_event_id not in offspring_by_parto:
                offspring_by_parto[off.birth_event_id] = []
            offspring_by_parto[off.birth_event_id].append(off)

        # Agrupar por toro e inicializar métricas
        sire_stats = {}
        for insem in inseminations_period:
            sire_id = insem.sire_id
            if sire_id not in sire_stats:
                sire_stats[sire_id] = {
                    'inseminations': 0,
                    'positive': 0,
                    'total_offspring': 0,
                    'total_birth_weight': 0,
                    'birth_weights': [],
                }
            sire_stats[sire_id]['inseminations'] += 1

            # Buscar evento subsiguiente en memoria
            animal_events = events_by_animal.get(insem.animal_id, [])
            next_event = None
            for ev in animal_events:
                if ev.event_date > insem.event_date or (ev.event_date == insem.event_date and ev.id > insem.id):
                    next_event = ev
                    break

            if next_event:
                if (next_event.event_type == EventType.Diagnostico and next_event.diagnosis_result == DiagnosisResult.Positivo) or next_event.event_type == EventType.Parto:
                    sire_stats[sire_id]['positive'] += 1

        for parto in partos_period:
            # Buscar inseminación previa en memoria
            animal_events = events_by_animal.get(parto.animal_id, [])
            matching_insem = None
            for ev in reversed(animal_events):
                if ev.event_type == EventType.Inseminacion and ev.sire_id is not None and (ev.event_date < parto.event_date or (ev.event_date == parto.event_date and ev.id < parto.id)):
                    matching_insem = ev
                    break

            if matching_insem and matching_insem.sire_id:
                sire_id = matching_insem.sire_id
                if sire_id not in sire_stats:
                    sire_stats[sire_id] = {
                        'inseminations': 0, 'positive': 0, 'total_offspring': 0,
                        'total_birth_weight': 0, 'birth_weights': [],
                    }
                sire_stats[sire_id]['total_offspring'] += (parto.alive_count or 0)

                # Obtener peso de crías desde memoria
                parto_offspring = offspring_by_parto.get(parto.id, [])
                for off in parto_offspring:
                    if off.birth_weight:
                        sire_stats[sire_id]['birth_weights'].append(off.birth_weight)
                        sire_stats[sire_id]['total_birth_weight'] += off.birth_weight

        # Obtener toros de una vez
        sire_ids = list(sire_stats.keys())
        sires_db = Animals.query.filter(Animals.id.in_(sire_ids)).all() if sire_ids else []
        sires_dict = {s.id: s for s in sires_db}

        # Calcular métricas finales y ordenar
        sire_performance = []
        for sire_id, stats in sire_stats.items():
            sire = sires_dict.get(sire_id)
            if not sire:
                continue

            conception_rate = round(stats['positive'] / stats['inseminations'] * 100, 1) if stats['inseminations'] > 0 else 0
            avg_birth_weight = round(sum(stats['birth_weights']) / len(stats['birth_weights']), 1) if stats['birth_weights'] else 0

            # Calificación general
            grade = 'D'
            if conception_rate >= 70 and stats['inseminations'] >= 5:
                grade = 'A'
            elif conception_rate >= 60 and stats['inseminations'] >= 3:
                grade = 'B'
            elif conception_rate >= 50 and stats['inseminations'] >= 2:
                grade = 'C'

            sire_performance.append({
                'sire_id': sire_id,
                'record': sire.record,
                'breed': sire.breed.name if sire.breed else '---',
                'inseminations': stats['inseminations'],
                'positive_diagnoses': stats['positive'],
                'conception_rate_pct': conception_rate,
                'total_offspring': stats['total_offspring'],
                'avg_birth_weight_kg': avg_birth_weight,
                'grade': grade,
            })

        # Ordenar por tasa de preñez
        sire_performance.sort(key=lambda x: x['conception_rate_pct'], reverse=True)

        return APIResponse.success(data={
            'period_months': months,
            'sires': sire_performance,
        }, message='Desempeño de toros')


@reproduction_ns.route('/genealogy/<int:animal_id>')
class GenealogyTree(Resource):
    @jwt_required()
    @reproduction_ns.doc('genealogy_tree', params={
        'depth': 'Profundidad del árbol (default: 3)',
        'direction': 'ancestors | descendants | both (default: both)',
    })
    def get(self, animal_id):
        """Árbol genealógico de un animal."""
        depth = max(1, flask.request.args.get('depth', default=3, type=int))
        direction = flask.request.args.get('direction', default='both')

        animal = Animals.get_by_id(animal_id)
        if not animal:
            return APIResponse.error('Animal no encontrado', status_code=404)

        result = {
            'root_id': animal_id,
            'root_record': animal.record,
            'root_sex': str(animal.sex) if animal.sex else None,
        }

        if direction in ('ancestors', 'both'):
            result['ancestors'] = build_ancestor_tree(animal_id, max_depth=depth)

        if direction in ('descendants', 'both'):
            result['descendants'] = build_descendant_tree(animal_id, max_depth=depth)

        return APIResponse.success(data=result, message='Árbol genealógico')


@reproduction_ns.route('/batch')
class ReproductionBatch(Resource):
    @jwt_required()
    @reproduction_ns.expect(reproduction_ns.model('ReproductionBatchInput', {
        'animal_ids': fields.List(fields.Integer, required=True, description='Lista de IDs de las hembras'),
        'event_type': fields.String(required=True, enum=['Celo', 'Inseminacion', 'Diagnostico', 'Parto']),
        'event_date': fields.Date(required=True),
        'sire_id': fields.Integer(description='ID del macho (solo Inseminacion)'),
        'technique': fields.String(enum=['Natural', 'Artificial', 'Transferencia_Embrionaria']),
        'diagnosis_result': fields.String(enum=['Positivo', 'Negativo', 'Pendiente']),
        'alive_count': fields.Integer(description='Crías vivas (solo Parto)'),
        'dead_count': fields.Integer(description='Crías muertas (solo Parto)'),
        'complications': fields.Boolean(description='¿Hubo complicaciones? (solo Parto)'),
        'notes': fields.String(),
    }))
    def post(self):
        """Registrar eventos reproductivos masivos."""
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get('animal_ids')
            event_type = data.get('event_type')
            event_date = data.get('event_date')

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error({'animal_ids': 'Se requiere lista de IDs'})
            if not event_type:
                return APIResponse.validation_error({'event_type': 'Se requiere tipo de evento'})
            if not event_date:
                return APIResponse.validation_error({'event_date': 'Se requiere fecha de evento'})

            from app.utils.tenant_context import get_current_finca_id
            finca_id = get_current_finca_id()

            try:
                actor_id = int(get_jwt_identity())
            except Exception:
                actor_id = None

            results = []
            for aid in animal_ids:
                # Verificar que el animal existe y pertenece a la finca
                animal = Animals.query.filter_by(id=aid, finca_id=finca_id).first()
                if not animal:
                    continue

                event_data = {
                    'animal_id': aid,
                    'event_type': event_type,
                    'event_date': event_date,
                    'finca_id': finca_id,
                    'actor_id': actor_id,
                    'notes': data.get('notes'),
                }

                if event_type == 'Inseminacion':
                    if 'sire_id' in data:
                        event_data['sire_id'] = data.get('sire_id')
                    if 'technique' in data:
                        event_data['technique'] = data.get('technique')
                elif event_type == 'Diagnostico':
                    if 'diagnosis_result' in data:
                        event_data['diagnosis_result'] = data.get('diagnosis_result')
                elif event_type == 'Parto':
                    event_data['alive_count'] = data.get('alive_count', 1)
                    event_data['dead_count'] = data.get('dead_count', 0)
                    event_data['complications'] = data.get('complications', False)

                # Crear evento reproductivo
                event = ReproductiveEvent.create(**event_data)
                results.append(event)

                # Actualizar estados del animal en caliente
                if event_type == 'Diagnostico':
                    diag = data.get('diagnosis_result')
                    if diag == 'Positivo':
                        animal.update(is_pregnant=True)
                    elif diag == 'Negativo':
                        animal.update(is_pregnant=False)
                elif event_type == 'Parto':
                    # Al parir: deja de estar preñada y empieza a lactar
                    animal.update(is_pregnant=False, is_lactating=True, last_calving_date=event_date)

            db.session.commit()
            
            # Limpiar cachés
            from app.utils.namespace_helpers import _cache_clear
            _cache_clear('ReproductiveEvent')
            _cache_clear('Animals')

            return APIResponse.success(
                data=[r.to_namespace_dict(include_relations=True) for r in results],
                message=f'Evento reproductivo masivo registrado para {len(results)} animales'
            )
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(message=f'Error en registro reproductivo masivo: {str(e)}')

