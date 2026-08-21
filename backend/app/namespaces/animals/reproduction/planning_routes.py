"""Rutas de planeación reproductiva: partos, celos, calendario y genealogía.

Agrupa las consultas orientadas a la agenda de la finca — qué va a pasar y
sobre qué animal hay que actuar — separadas del CRUD y de los indicadores.
"""

import logging
from datetime import date, timedelta

import flask
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Resource

from app import db
from app.models.animals import Animals, Sex
from app.models.base_model import ValidationError
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    Offspring,
    ReproductiveEvent,
)
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter, get_current_finca_id
from app.utils.tree_builder import build_ancestor_tree, build_descendant_tree

from ._namespace import _parse_int, reproduction_ns

logger = logging.getLogger(__name__)


@reproduction_ns.route("/pending-births")
class PendingBirths(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "pending_births",
        params={
            "days": "Horizonte en días (default: 60)",
        },
    )
    def get(self):
        """Inseminaciones con parto pendiente, ordenadas por fecha esperada."""
        today = date.today()

        days = max(1, flask.request.args.get("days", default=60, type=int))
        horizon = today + timedelta(days=days)

        events = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(
                ReproductiveEvent.event_type == EventType.Inseminacion,
                ReproductiveEvent.expected_birth_date.isnot(None),
                ReproductiveEvent.expected_birth_date <= horizon,
            )
            .order_by(ReproductiveEvent.expected_birth_date)
            .all()
        )

        animal_ids = list(set(e.animal_id for e in events))
        subsequent_candidates = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(
                ReproductiveEvent.animal_id.in_(animal_ids),
                ReproductiveEvent.event_type.in_(
                    [EventType.Diagnostico, EventType.Parto]
                ),
            )
            .all()
            if animal_ids
            else []
        )

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
                    if (
                        cand.event_type == EventType.Diagnostico
                        and cand.diagnosis_result == DiagnosisResult.Negativo
                    ) or cand.event_type == EventType.Parto:
                        subsequent_event = cand
                        break

            if not subsequent_event:
                # Solo preñeces que siguen activas
                if ev.expected_birth_date >= today or (
                    today - ev.expected_birth_date < timedelta(days=45)
                ):
                    item = ev.to_namespace_dict(include_relations=True)
                    item["status"] = (
                        "overdue"
                        if ev.expected_birth_date < today
                        else "imminent"
                        if ev.expected_birth_date <= today + timedelta(days=7)
                        else "upcoming"
                    )
                    result.append(item)

        return APIResponse.success(data=result, message="Partos pendientes")



@reproduction_ns.route("/heat-alerts")
class HeatAlerts(Resource):
    @jwt_required()
    @reproduction_ns.doc("heat_alerts")
    def get(self):
        """Hembras con celo probable basado en parámetros de detección desde BD."""
        from app.models.system_content import SystemContent

        today = date.today()
        heat_min_entry = SystemContent.get_by_key(
            "param.reproduction.heat_detection_min_days"
        )
        heat_max_entry = SystemContent.get_by_key(
            "param.reproduction.heat_detection_max_days"
        )
        min_days = (
            int(heat_min_entry.content)
            if (heat_min_entry and heat_min_entry.content)
            else 18
        )
        max_days = (
            int(heat_max_entry.content)
            if (heat_max_entry and heat_max_entry.content)
            else 23
        )

        # Obtener hembras
        females = (
            apply_tenant_filter(Animals.query, Animals).filter_by(sex=Sex.Hembra).all()
        )
        female_ids = [f.id for f in females]

        # Cargar todos los eventos reproductivos de estas hembras en memoria
        all_events = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(ReproductiveEvent.animal_id.in_(female_ids))
            .order_by(ReproductiveEvent.event_date.desc(), ReproductiveEvent.id.desc())
            .all()
            if female_ids
            else []
        )

        events_by_animal = {}
        for ev in all_events:
            if ev.animal_id not in events_by_animal:
                events_by_animal[ev.animal_id] = []
            events_by_animal[ev.animal_id].append(ev)

        alerts = []
        for female in females:
            animal_events = events_by_animal.get(female.id, [])

            # Buscar último celo
            last_heat = next(
                (e for e in animal_events if e.event_type == EventType.Celo), None
            )

            if last_heat:
                days_since_heat = (today - last_heat.event_date).days
                if min_days <= days_since_heat <= max_days:
                    priority = "Media"
                    if days_since_heat >= 21:
                        priority = "Alta"
                    elif days_since_heat <= 19:
                        priority = "Baja"

                    # Buscar última inseminación válida
                    last_insem = next(
                        (
                            e
                            for e in animal_events
                            if e.event_type == EventType.Inseminacion
                            and e.expected_birth_date
                            and e.expected_birth_date >= today
                        ),
                        None,
                    )

                    is_pregnant = False
                    if last_insem:
                        # Eventos están ordenados desc, así que buscamos desde el inicio hasta last_insem
                        # para ver si hubo un parto o diag. negativo DESPUÉS de last_insem.
                        for ev in animal_events:
                            if ev.id == last_insem.id:
                                # Llegamos a la inseminación, no encontramos nada posterior que la anule (ya que iteramos desc)
                                is_pregnant = True
                                break
                            if (
                                ev.event_date >= last_insem.event_date
                                and ev.id != last_insem.id
                            ):
                                if (
                                    ev.event_type == EventType.Diagnostico
                                    and ev.diagnosis_result == DiagnosisResult.Negativo
                                ) or ev.event_type == EventType.Parto:
                                    break  # Se anuló la preñez

                    if not is_pregnant:
                        alerts.append(
                            {
                                "animal_id": female.id,
                                "record": female.record,
                                "breed": female.breed.name if female.breed else "---",
                                "days_since_last_heat": days_since_heat,
                                "last_heat_date": str(last_heat.event_date),
                                "priority": priority,
                                "age_days": (today - female.birth_date).days
                                if female.birth_date
                                else None,
                            }
                        )

        # Ordenar por prioridad y días
        priority_order = {"Alta": 0, "Media": 1, "Baja": 2}
        alerts.sort(
            key=lambda x: (priority_order[x["priority"]], -x["days_since_last_heat"])
        )

        return APIResponse.success(data=alerts, message="Alertas de celo")


@reproduction_ns.route("/calendar")
class ReproductionCalendar(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "reproduction_calendar",
        params={
            "start_date": "Fecha inicio (YYYY-MM-DD)",
            "end_date": "Fecha fin (YYYY-MM-DD)",
        },
    )
    def get(self):
        """Eventos reproductivos en rango de fechas para calendario."""
        start_date_str = flask.request.args.get("start_date")
        end_date_str = flask.request.args.get("end_date")

        if start_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
            except ValueError:
                return APIResponse.error(
                    "start_date inválido (use YYYY-MM-DD)", status_code=400
                )
        else:
            from datetime import timedelta

            start_date = date.today() - timedelta(days=30)

        if end_date_str:
            try:
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return APIResponse.error(
                    "end_date inválido (use YYYY-MM-DD)", status_code=400
                )
        else:
            from datetime import timedelta

            end_date = date.today() + timedelta(days=60)

        # Obtener eventos en rango
        events = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(
                ReproductiveEvent.event_date >= start_date,
                ReproductiveEvent.event_date <= end_date,
            )
            .order_by(ReproductiveEvent.event_date)
            .all()
        )

        # Formatear para calendario
        calendar_events = []
        for ev in events:
            event_data = ev.to_namespace_dict(include_relations=True)

            # Asignar color según tipo
            color_map = {
                "Celo": "#fbbf24",  # amarillo
                "Inseminacion": "#3b82f6",  # azul
                "Diagnostico": "#f97316",  # naranja
                "Parto": "#10b981",  # verde
            }

            calendar_events.append(
                {
                    "id": ev.id,
                    "title": f"{ev.event_type.value} - {ev.animal.record if ev.animal else '---'}",
                    "start": str(ev.event_date),
                    "allDay": True,
                    "backgroundColor": color_map.get(ev.event_type.value, "#6b7280"),
                    "borderColor": color_map.get(ev.event_type.value, "#6b7280"),
                    "extendedProps": {
                        "event_type": ev.event_type.value,
                        "animal_id": ev.animal_id,
                        "animal_record": ev.animal.record if ev.animal else "---",
                        "notes": ev.notes,
                    },
                }
            )

        # Agregar partos pendientes (expected_birth_date)
        pending_births = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(
                ReproductiveEvent.event_type == EventType.Inseminacion,
                ReproductiveEvent.expected_birth_date.isnot(None),
                ReproductiveEvent.expected_birth_date >= start_date,
                ReproductiveEvent.expected_birth_date <= end_date,
            )
            .all()
        )

        animal_ids = list(set(e.animal_id for e in pending_births))
        subsequent_candidates = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter(
                ReproductiveEvent.animal_id.in_(animal_ids),
                ReproductiveEvent.event_type.in_(
                    [EventType.Diagnostico, EventType.Parto]
                ),
            )
            .all()
            if animal_ids
            else []
        )

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
                    if (
                        cand.event_type == EventType.Diagnostico
                        and cand.diagnosis_result == DiagnosisResult.Negativo
                    ) or cand.event_type == EventType.Parto:
                        subsequent_event = cand
                        break

            if not subsequent_event:
                calendar_events.append(
                    {
                        "id": f"pending-{ev.id}",
                        "title": f"Parto Pendiente - {ev.animal.record if ev.animal else '---'}",
                        "start": str(ev.expected_birth_date),
                        "allDay": True,
                        "backgroundColor": "#ef4444",  # rojo
                        "borderColor": "#ef4444",
                        "borderWidth": 2,
                        "extendedProps": {
                            "event_type": "Parto_Pendiente",
                            "animal_id": ev.animal_id,
                            "animal_record": ev.animal.record if ev.animal else "---",
                            "is_pending": True,
                        },
                    }
                )

        return APIResponse.success(
            data=calendar_events, message="Eventos de calendario"
        )

