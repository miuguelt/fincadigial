import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from sqlalchemy import func, and_

from app import db
from app.models.reproduction import (
    ReproductiveEvent, Offspring,
    EventType, InseminationTechnique, DiagnosisResult,
    CATTLE_GESTATION_DAYS,
)
from app.models.animals import Animals, Sex
from app.models.base_model import ValidationError
from app.utils.response_handler import APIResponse
from app.utils.tree_builder import build_ancestor_tree, build_descendant_tree

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
        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400, details={'errors': e.errors})
        except Exception as e:
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
        """Actualizar evento."""
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            return APIResponse.error('Evento no encontrado', status_code=404)
        try:
            ev.update(**reproduction_ns.payload)
        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400)
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

        events = ReproductiveEvent.query.filter_by(animal_id=animal_id)\
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
        if last_insem and last_insem.expected_birth_date and last_insem.expected_birth_date >= date.today():
            active_pregnancy = {
                'insemination_date': str(last_insem.event_date),
                'expected_birth_date': str(last_insem.expected_birth_date),
                'days_remaining': (last_insem.expected_birth_date - date.today()).days,
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

        total_females = Animals.query.filter_by(sex=Sex.Hembra).count()
        total_events = ReproductiveEvent.query.count()

        insem_count = ReproductiveEvent.query.filter_by(event_type=EventType.Inseminacion).count()
        positive_count = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
        ).count()
        parto_count = ReproductiveEvent.query.filter_by(event_type=EventType.Parto).count()

        # Preñeces activas (inseminación con expected_birth_date en el futuro, sin parto posterior registrado)
        active_pregnancies_query = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date >= today,
        )
        active_pregnancies = active_pregnancies_query.count()

        # Próximos partos en 30 días
        from datetime import timedelta
        births_next_30 = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date >= today,
            ReproductiveEvent.expected_birth_date <= today + timedelta(days=30),
        ).count()

        overdue = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date < today,
        ).count()

        conception_rate = round(positive_count / insem_count * 100, 1) if insem_count else None

        total_alive = db.session.query(func.sum(ReproductiveEvent.alive_count))\
            .filter(ReproductiveEvent.event_type == EventType.Parto).scalar() or 0
        total_dead = db.session.query(func.sum(ReproductiveEvent.dead_count))\
            .filter(ReproductiveEvent.event_type == EventType.Parto).scalar() or 0

        return APIResponse.success(data={
            'total_females': total_females,
            'total_events': total_events,
            'total_inseminations': insem_count,
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

        events = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date.isnot(None),
        ).order_by(ReproductiveEvent.expected_birth_date).all()

        result = []
        for ev in events:
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

        # Tasa de preñez global (últimos N meses)
        inseminations_period = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.event_date >= start_date,
        ).all()

        positive_diags_period = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
            ReproductiveEvent.event_date >= start_date,
        ).all()

        conception_rate = round(len(positive_diags_period) / len(inseminations_period) * 100, 1) if inseminations_period else 0

        # Tasa de preñez por técnica
        natural_insem = [e for e in inseminations_period if e.technique == InseminationTechnique.Natural]
        artificial_insem = [e for e in inseminations_period if e.technique == InseminationTechnique.Artificial]

        natural_positive = [e for e in positive_diags_period if e.event_date in [i.event_date for i in natural_insem]]
        artificial_positive = [e for e in positive_diags_period if e.event_date in [i.event_date for i in artificial_insem]]

        natural_rate = round(len(natural_positive) / len(natural_insem) * 100, 1) if natural_insem else 0
        artificial_rate = round(len(artificial_positive) / len(artificial_insem) * 100, 1) if artificial_insem else 0

        # Intervalo promedio entre partos
        partos = ReproductiveEvent.query.filter(
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

        for diag in positive_diags_period:
            # Buscar inseminación correspondiente
            matching_insem = next((i for i in inseminations_period if i.animal_id == diag.animal_id and i.event_date <= diag.event_date), None)
            if matching_insem:
                female_fertility[matching_insem.animal_id]['positive'] += 1

        # Calcular tasa por hembra y ordenar
        ranked_females = []
        for animal_id, data in female_fertility.items():
            if data['inseminations'] > 0:
                rate = round(data['positive'] / data['inseminations'] * 100, 1)
                animal = Animals.get_by_id(animal_id)
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
        """Hembras con celo probable (18-23 días desde último celo)."""
        from datetime import timedelta
        today = date.today()
        min_days = 18
        max_days = 23

        # Obtener hembras
        females = Animals.query.filter_by(sex=Sex.Hembra).all()

        alerts = []
        for female in females:
            # Buscar último celo registrado
            last_heat = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == female.id,
                ReproductiveEvent.event_type == EventType.Celo,
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if last_heat:
                days_since_heat = (today - last_heat.event_date).days
                if min_days <= days_since_heat <= max_days:
                    # Calcular prioridad
                    # Mayor prioridad si: más joven, mayor fertilidad histórica, más días desde último parto
                    priority = 'Media'
                    if days_since_heat >= 21:
                        priority = 'Alta'
                    elif days_since_heat <= 19:
                        priority = 'Baja'

                    # Verificar si tiene preñez activa
                    active_pregnancy = ReproductiveEvent.query.filter(
                        ReproductiveEvent.animal_id == female.id,
                        ReproductiveEvent.event_type == EventType.Inseminacion,
                        ReproductiveEvent.expected_birth_date >= today,
                    ).first()

                    if not active_pregnancy:
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
        events = ReproductiveEvent.query.filter(
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
        pending_births = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.expected_birth_date.isnot(None),
            ReproductiveEvent.expected_birth_date >= start_date,
            ReproductiveEvent.expected_birth_date <= end_date,
        ).all()

        for ev in pending_births:
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

        # Obtener inseminaciones en período
        inseminations = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.sire_id.isnot(None),
            ReproductiveEvent.event_date >= start_date,
        ).all()

        # Agrupar por toro
        sire_stats = {}
        for insem in inseminations:
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

        # Buscar diagnósticos positivos asociados
        positive_diags = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
            ReproductiveEvent.event_date >= start_date,
        ).all()

        for diag in positive_diags:
            # Buscar inseminación correspondiente del mismo toro
            matching_insem = next(
                (i for i in inseminations 
                 if i.animal_id == diag.animal_id 
                 and i.sire_id 
                 and i.event_date <= diag.event_date),
                None
            )
            if matching_insem and matching_insem.sire_id:
                sire_stats[matching_insem.sire_id]['positive'] += 1

        # Buscar partos asociados para calcular peso de crías
        partos = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Parto,
            ReproductiveEvent.event_date >= start_date,
        ).all()

        for parto in partos:
            # Buscar inseminación que originó este parto
            matching_insem = next(
                (i for i in inseminations 
                 if i.animal_id == parto.animal_id 
                 and i.sire_id 
                 and i.event_date < parto.event_date),
                None
            )
            if matching_insem and matching_insem.sire_id:
                sire_stats[matching_insem.sire_id]['total_offspring'] += (parto.alive_count or 0)
                
                # Obtener peso de crías desde offspring
                offspring = Offspring.query.filter_by(birth_event_id=parto.id).all()
                for off in offspring:
                    if off.birth_weight:
                        sire_stats[matching_insem.sire_id]['birth_weights'].append(off.birth_weight)
                        sire_stats[matching_insem.sire_id]['total_birth_weight'] += off.birth_weight

        # Calcular métricas finales y ordenar
        sire_performance = []
        for sire_id, stats in sire_stats.items():
            sire = Animals.get_by_id(sire_id)
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
