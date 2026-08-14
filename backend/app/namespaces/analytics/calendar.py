from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta, date
import logging

from sqlalchemy import case, func
from sqlalchemy.orm import selectinload

from app import db
from app.models.reproduction import ReproductiveEvent
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.alerts import AnimalAlert, AlertPriority
from app.services.calendar_future_events import build_future_events
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

calendar_ns = Namespace(
    'analytics/calendar',
    description='📅 Analytics - Calendario global de eventos'
)

DEFAULT_ALERT_DETAIL_LIMIT = 50
MAX_ALERT_DETAIL_LIMIT = 200

def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)

@calendar_ns.route('/')
class GlobalCalendar(Resource):
    @calendar_ns.doc(
        'get_global_calendar',
        params={
            'start_date': {'description': 'Fecha inicio (YYYY-MM-DD)', 'type': 'string'},
            'end_date': {'description': 'Fecha fin (YYYY-MM-DD)', 'type': 'string'},
            'finca_id': {'description': 'ID de la finca', 'type': 'integer'},
            'alert_mode': {'description': 'summary (por día) o details', 'type': 'string'},
            'alert_limit': {'description': 'Máximo de detalles de alerta (1-200)', 'type': 'integer'},
            'only_alerts': {'description': 'Omitir otros eventos al consultar el detalle diario', 'type': 'boolean'},
        },
        security=['Bearer', 'Cookie']
    )
    @jwt_required()
    def get(self):
        """Obtener eventos del calendario sin materializar miles de alertas."""
        try:
            start_date_str = flask.request.args.get('start_date')
            end_date_str = flask.request.args.get('end_date')
            finca_id = flask.request.args.get('finca_id', type=int)
            alert_mode = (flask.request.args.get('alert_mode') or 'summary').strip().lower()
            alert_limit = flask.request.args.get(
                'alert_limit', default=DEFAULT_ALERT_DETAIL_LIMIT, type=int
            )
            only_alerts = (flask.request.args.get('only_alerts') or '').lower() in {
                '1', 'true', 'yes', 'si', 'sí'
            }

            if alert_mode not in {'summary', 'details'}:
                return APIResponse.error(
                    message="alert_mode debe ser 'summary' o 'details'",
                    status_code=400,
                )
            alert_limit = max(1, min(alert_limit or DEFAULT_ALERT_DETAIL_LIMIT, MAX_ALERT_DETAIL_LIMIT))

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = date.today() - timedelta(days=30)

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = date.today() + timedelta(days=60)

            if end_date < start_date:
                return APIResponse.error(
                    message='end_date no puede ser anterior a start_date',
                    status_code=400,
                )

            start_at = datetime.combine(start_date, datetime.min.time())
            end_at = datetime.combine(end_date + timedelta(days=1), datetime.min.time())

            all_events = []
            counts_by_type = {}
            counts_by_day = {}

            def append_regular_event(event):
                all_events.append(event)
                event_type = event['type']
                event_day = str(event['start']).split('T')[0]
                counts_by_type[event_type] = counts_by_type.get(event_type, 0) + 1
                counts_by_day[event_day] = counts_by_day.get(event_day, 0) + 1

            # 1. Eventos Reproductivos (Pasados y Futuros/Estimados)
            repro_events = []
            if not only_alerts:
                repro_events = _tf(
                    ReproductiveEvent.query.options(selectinload(ReproductiveEvent.animal)),
                    ReproductiveEvent,
                ).filter(
                    ReproductiveEvent.event_date >= start_date,
                    ReproductiveEvent.event_date <= end_date
                ).all()

            for ev in repro_events:
                append_regular_event({
                    'id': f'repro_{ev.id}',
                    'title': f"RC: {ev.event_type.value} - {ev.animal.record if ev.animal else '???'}",
                    'start': str(ev.event_date),
                    'type': 'reproduction',
                    'color': '#3b82f6', # blue
                    'animal_id': ev.animal_id,
                    'description': ev.notes or f"Evento reproductivo: {ev.event_type.value}"
                })
                # Añadir fecha estimada de parto como evento futuro si existe
                if ev.expected_birth_date and start_date <= ev.expected_birth_date <= end_date:
                    append_regular_event({
                        'id': f'birth_est_{ev.id}',
                        'title': f"PART ESTIMADO: {ev.animal.record if ev.animal else '???'}",
                        'start': str(ev.expected_birth_date),
                        'type': 'future_birth',
                        'color': '#10b981', # emerald
                        'animal_id': ev.animal_id,
                        'description': f"Fecha probable de parto (basado en {ev.event_type.value})"
                    })

            # 2. Tratamientos y Sanidad
            treatments = []
            if not only_alerts:
                treatments = _tf(
                    Treatments.query.options(selectinload(Treatments.animals)),
                    Treatments,
                ).filter(
                    Treatments.treatment_date >= start_date,
                    Treatments.treatment_date <= end_date
                ).all()

            for t in treatments:
                append_regular_event({
                    'id': f'treatment_{t.id}',
                    'title': f"TX: {t.description[:20]}... - {t.animals.record if t.animals else '???'}",
                    'start': str(t.treatment_date),
                    'type': 'health',
                    'color': '#ef4444', # red
                    'animal_id': t.animal_id,
                    'description': t.description
                })

            # 3. Vacunaciones
            vaccinations = []
            if not only_alerts:
                vaccinations = _tf(
                    Vaccinations.query.options(
                        selectinload(Vaccinations.vaccines),
                        selectinload(Vaccinations.animals),
                    ),
                    Vaccinations,
                ).filter(
                    Vaccinations.vaccination_date >= start_date,
                    Vaccinations.vaccination_date <= end_date
                ).all()

            for v in vaccinations:
                append_regular_event({
                    'id': f'vacc_{v.id}',
                    'title': f"VAC: {v.vaccines.name if v.vaccines else 'Vacuna'} - {v.animals.record if v.animals else '???'}",
                    'start': str(v.vaccination_date),
                    'type': 'vaccination',
                    'color': '#8b5cf6', # violet
                    'animal_id': v.animal_id,
                    'description': f"Vacunación: {v.vaccines.name if v.vaccines else ''}"
                })

            # 4. Controles Veterinarios
            controls = []
            if not only_alerts:
                controls = _tf(
                    Control.query.options(selectinload(Control.animals)),
                    Control,
                ).filter(
                    Control.checkup_date >= start_date,
                    Control.checkup_date <= end_date
                ).all()

            for c in controls:
                append_regular_event({
                    'id': f'control_{c.id}',
                    'title': f"CTRL: {c.animals.record if c.animals else '???'}",
                    'start': str(c.checkup_date),
                    'type': 'control',
                    'color': '#f59e0b', # amber
                    'animal_id': c.animal_id,
                    'description': f"Control veterinario. Peso: {c.weight}kg"
                })

            # 5. Alertas críticas: el calendario mensual recibe un resumen por día.
            alert_filters = (
                AnimalAlert.priority.in_([AlertPriority.HIGH, AlertPriority.CRITICAL]),
                AnimalAlert.is_read.is_(False),
                AnimalAlert.superseded_by_id.is_(None),
                AnimalAlert.triggered_at >= start_at,
                AnimalAlert.triggered_at < end_at,
            )
            alert_day = func.date(AnimalAlert.triggered_at)
            alert_count_query = _tf(
                db.session.query(
                    alert_day.label('event_day'),
                    func.count(AnimalAlert.id).label('event_count'),
                ),
                AnimalAlert,
            ).filter(*alert_filters).group_by(alert_day)
            alert_counts = {
                (
                    row.event_day.isoformat()
                    if hasattr(row.event_day, 'isoformat')
                    else str(row.event_day)
                ): int(row.event_count)
                for row in alert_count_query.all()
            }
            alert_total = sum(alert_counts.values())

            counts_by_type['alert'] = alert_total
            for event_day, event_count in alert_counts.items():
                counts_by_day[event_day] = counts_by_day.get(event_day, 0) + event_count

            loaded_alerts = 0
            if alert_mode == 'summary':
                for event_day, event_count in sorted(alert_counts.items()):
                    all_events.append({
                        'id': f'alert_summary_{event_day}',
                        'title': f"⚠️ {event_count} alertas pendientes",
                        'start': event_day,
                        'type': 'alert',
                        'color': '#dc2626',
                        'animal_id': None,
                        'description': 'Seleccione este día para ver las alertas prioritarias.',
                        'count': event_count,
                        'is_summary': True,
                    })
            else:
                priority_order = case(
                    (AnimalAlert.priority == AlertPriority.CRITICAL, 0),
                    else_=1,
                )
                alerts = _tf(AnimalAlert.query, AnimalAlert).filter(
                    *alert_filters
                ).order_by(
                    priority_order,
                    AnimalAlert.triggered_at.desc(),
                ).limit(alert_limit).all()
                loaded_alerts = len(alerts)

                for alert in alerts:
                    all_events.append({
                        'id': f'alert_{alert.id}',
                        'title': f"⚠️ {alert.message[:80]}",
                        'start': alert.triggered_at.date().isoformat(),
                        'type': 'alert',
                        'color': '#dc2626',
                        'animal_id': alert.animal_id,
                        'priority': alert.priority.value if alert.priority else None,
                        'description': alert.message,
                    })

            # 6. Pendientes: próximas vacunas, fin de retiro y tareas
            if not only_alerts:
                for future_event in build_future_events(_tf, start_date, end_date):
                    append_regular_event(future_event)

            total_count = sum(counts_by_type.values())

            return APIResponse.success(data={
                'events': all_events,
                'count': len(all_events),
                'total_count': total_count,
                'counts_by_type': counts_by_type,
                'counts_by_day': counts_by_day,
                'range': {'start': str(start_date), 'end': str(end_date)},
                'alerts': {
                    'mode': alert_mode,
                    'total': alert_total,
                    'loaded': loaded_alerts,
                    'truncated': alert_mode == 'details' and loaded_alerts < alert_total,
                    'limit': alert_limit,
                },
            })

        except ValueError as e:
            return APIResponse.error(message='Formato de fecha inválido', details={'error': str(e)}, status_code=400)
        except Exception as e:
            logging.getLogger(__name__).error(f"Error en calendario global: {e}")
            return APIResponse.error(message='Error al cargar calendario', details={'error': str(e)})
