from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta, date
import logging

from sqlalchemy import func

from app.models.reproduction import ReproductiveEvent
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.alerts import AnimalAlert, AlertPriority
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

calendar_ns = Namespace(
    'analytics/calendar',
    description='📅 Analytics - Calendario global de eventos'
)

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
        },
        security=['Bearer', 'Cookie']
    )
    @jwt_required()
    def get(self):
        """Obtener todos los eventos del sistema para vista de calendario."""
        try:
            start_date_str = flask.request.args.get('start_date')
            end_date_str = flask.request.args.get('end_date')
            finca_id = flask.request.args.get('finca_id', type=int)

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = date.today() - timedelta(days=30)

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = date.today() + timedelta(days=60)

            all_events = []

            # 1. Eventos Reproductivos (Pasados y Futuros/Estimados)
            repro_events = _tf(ReproductiveEvent.query, ReproductiveEvent).filter(
                ReproductiveEvent.event_date >= start_date,
                ReproductiveEvent.event_date <= end_date
            ).all()

            for ev in repro_events:
                all_events.append({
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
                    all_events.append({
                        'id': f'birth_est_{ev.id}',
                        'title': f"PART ESTIMADO: {ev.animal.record if ev.animal else '???'}",
                        'start': str(ev.expected_birth_date),
                        'type': 'future_birth',
                        'color': '#10b981', # emerald
                        'animal_id': ev.animal_id,
                        'description': f"Fecha probable de parto (basado en {ev.event_type.value})"
                    })

            # 2. Tratamientos y Sanidad
            treatments = _tf(Treatments.query, Treatments).filter(
                Treatments.treatment_date >= start_date,
                Treatments.treatment_date <= end_date
            ).all()

            for t in treatments:
                all_events.append({
                    'id': f'treatment_{t.id}',
                    'title': f"TX: {t.description[:20]}... - {t.animal.record if t.animal else '???'}",
                    'start': str(t.treatment_date),
                    'type': 'health',
                    'color': '#ef4444', # red
                    'animal_id': t.animal_id,
                    'description': t.description
                })

            # 3. Vacunaciones
            vaccinations = _tf(Vaccinations.query, Vaccinations).filter(
                Vaccinations.vaccination_date >= start_date,
                Vaccinations.vaccination_date <= end_date
            ).all()

            for v in vaccinations:
                all_events.append({
                    'id': f'vacc_{v.id}',
                    'title': f"VAC: {v.vaccine.name if v.vaccine else 'Vacuna'} - {v.animal.record if v.animal else '???'}",
                    'start': str(v.vaccination_date),
                    'type': 'vaccination',
                    'color': '#8b5cf6', # violet
                    'animal_id': v.animal_id,
                    'description': f"Vacunación: {v.vaccine.name if v.vaccine else ''}"
                })

            # 4. Controles Veterinarios
            controls = _tf(Control.query, Control).filter(
                Control.checkup_date >= start_date,
                Control.checkup_date <= end_date
            ).all()

            for c in controls:
                all_events.append({
                    'id': f'control_{c.id}',
                    'title': f"CTRL: {c.animal.record if c.animal else '???'}",
                    'start': str(c.checkup_date),
                    'type': 'control',
                    'color': '#f59e0b', # amber
                    'animal_id': c.animal_id,
                    'description': f"Control veterinario. Peso: {c.weight}kg"
                })

            # 5. Alertas Críticas (Como eventos en el calendario)
            alerts = _tf(AnimalAlert.query, AnimalAlert).filter(
                AnimalAlert.priority.in_([AlertPriority.HIGH, AlertPriority.CRITICAL]),
                func.date(AnimalAlert.triggered_at) >= start_date,
                func.date(AnimalAlert.triggered_at) <= end_date
            ).all()

            for a in alerts:
                all_events.append({
                    'id': f'alert_{a.id}',
                    'title': f"⚠️ {a.message[:30]}...",
                    'start': a.triggered_at.date().isoformat(),
                    'type': 'alert',
                    'color': '#000000', # black
                    'animal_id': a.animal_id,
                    'description': a.message
                })

            return APIResponse.success(data={
                'events': all_events,
                'count': len(all_events),
                'range': {'start': str(start_date), 'end': str(end_date)}
            })

        except Exception as e:
            logging.getLogger(__name__).error(f"Error en calendario global: {e}")
            return APIResponse.error(message='Error al cargar calendario', details={'error': str(e)})
