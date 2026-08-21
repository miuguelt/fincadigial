"""Rutas CRUD de eventos reproductivos.

El controlador queda delgado a propósito: valida contra las reglas de dominio,
persiste y delega en ``app.services.reproduction`` la sincronización del estado
derivado del animal.
"""

import logging
from datetime import date

import flask
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Resource

from app import db
from app.models.animals import Animals
from app.models.base_model import ValidationError
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    Offspring,
    ReproductiveEvent,
)
from app.services.reproduction import (
    apply_event_effects,
    resync_animal,
    revert_event_effects,
    validate_event,
)
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter, get_current_finca_id

from ._namespace import _parse_int, event_input_model, reproduction_ns

logger = logging.getLogger(__name__)


def _actor_id() -> int | None:
    """Usuario que registra el evento, tomado del token."""
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def _clear_caches() -> None:
    """Invalida las cachés que dependen de eventos reproductivos."""
    from app.utils.namespace_helpers import _cache_clear

    _cache_clear("Animals")
    _cache_clear("ReproductiveEvent")
    _cache_clear("LactationCycle")


def _apply_update(event_id: int):
    """Actualiza un evento revalidando el dominio y resincronizando el animal."""
    event = ReproductiveEvent.get_by_id(event_id)
    if not event:
        return APIResponse.error("Evento no encontrado", status_code=404)

    payload = dict(reproduction_ns.payload or {})
    merged = {
        "animal_id": payload.get("animal_id", event.animal_id),
        "event_type": payload.get("event_type", event.event_type),
        "event_date": payload.get("event_date", event.event_date),
        "sire_id": payload.get("sire_id", event.sire_id),
        "alive_count": payload.get("alive_count", event.alive_count),
        "dead_count": payload.get("dead_count", event.dead_count),
        "technique": payload.get("technique", event.technique),
    }
    previous_animal_id = event.animal_id
    try:
        warnings = validate_event(merged, event.finca_id, event_id=event.id)
        revert_event_effects(event)
        event.update(**payload)
        db.session.flush()
        apply_event_effects(event)
        if previous_animal_id != event.animal_id:
            resync_animal(previous_animal_id, event.finca_id)
        db.session.commit()
        _clear_caches()
    except ValidationError as e:
        db.session.rollback()
        return APIResponse.error(
            e.message, status_code=400, details={"errors": e.errors, "field": e.field}
        )
    except Exception as e:
        db.session.rollback()
        logger.exception("Error actualizando evento reproductivo %s", event_id)
        return APIResponse.error(str(e), status_code=500)

    data = event.to_namespace_dict(include_relations=True)
    data["warnings"] = warnings
    return APIResponse.success(data=data, message="Evento actualizado")


@reproduction_ns.route("/events/")
class EventList(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "list_events",
        params={
            "page": "Página",
            "limit": "Registros por página",
            "animal_id": "Filtrar por hembra",
            "event_type": "Celo | Inseminacion | Diagnostico | Parto",
            "diagnosis_result": "Positivo | Negativo | Pendiente",
            "sort_by": "Campo de ordenamiento",
            "sort_order": "asc | desc",
        },
    )
    def get(self):
        """Listar eventos reproductivos."""
        page = _parse_int("page", 1)
        limit = _parse_int("limit", 20)
        sort_by = flask.request.args.get("sort_by", "event_date")
        sort_order = flask.request.args.get("sort_order", "desc")

        filters = {}
        for field in ["animal_id", "sire_id"]:
            val = flask.request.args.get(field, type=int)
            if val:
                filters[field] = val
        for field in ["event_type", "diagnosis_result"]:
            val = flask.request.args.get(field)
            if val:
                enum_cls = EventType if field == "event_type" else DiagnosisResult
                try:
                    filters[field] = enum_cls(val)
                except ValueError:
                    return APIResponse.error(
                        f"{field} inválido: {val}", status_code=400
                    )

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
            data=result.get("items", []),
            page=result.get("page", page),
            limit=result.get("limit", limit),
            total_items=result.get("total_items", 0),
            message="Eventos reproductivos obtenidos",
        )

    @jwt_required()
    @reproduction_ns.expect(event_input_model)
    def post(self):
        """Registrar nuevo evento reproductivo."""
        data = dict(reproduction_ns.payload or {})
        actor_id = _actor_id()
        if actor_id and "actor_id" not in data:
            data["actor_id"] = actor_id

        finca_id = get_current_finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)

        try:
            warnings = validate_event(data, finca_id)
            data["finca_id"] = finca_id
            event = ReproductiveEvent.create(**data)
            apply_event_effects(event)
            db.session.commit()
            _clear_caches()
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(
                e.message, status_code=400, details={"errors": e.errors, "field": e.field}
            )
        except Exception as e:
            db.session.rollback()
            logger.exception("Error registrando evento reproductivo")
            return APIResponse.error(str(e), status_code=500)

        payload = event.to_namespace_dict(include_relations=True)
        payload["warnings"] = warnings
        return APIResponse.success(
            data=payload,
            message="Evento registrado",
            status_code=201,
        )


@reproduction_ns.route("/events/<int:event_id>")
class EventDetail(Resource):
    @jwt_required()
    def get(self, event_id):
        """Obtener evento por ID."""
        ev = ReproductiveEvent.get_by_id(event_id, include_relations=True)
        if not ev:
            return APIResponse.error("Evento no encontrado", status_code=404)
        data = ev.to_namespace_dict(include_relations=True)
        data["offspring_list"] = [
            o.to_namespace_dict(include_relations=True) for o in ev.offspring.all()
        ]
        return APIResponse.success(data=data)

    @jwt_required()
    @reproduction_ns.expect(event_input_model)
    def put(self, event_id):
        """Actualizar evento (reemplazo total)."""
        return _apply_update(event_id)

    @jwt_required()
    def patch(self, event_id):
        """Actualizar evento (parcial)."""
        return _apply_update(event_id)

    @jwt_required()
    def delete(self, event_id):
        """Eliminar evento y devolver al animal el estado que corresponde."""
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            return APIResponse.error("Evento no encontrado", status_code=404)
        animal_id, finca_id = ev.animal_id, ev.finca_id
        try:
            revert_event_effects(ev)
            db.session.delete(ev)
            db.session.flush()
            resync_animal(animal_id, finca_id)
            db.session.commit()
            _clear_caches()
        except Exception as e:
            db.session.rollback()
            logger.exception("Error eliminando evento reproductivo %s", event_id)
            return APIResponse.error(str(e), status_code=500)
        return APIResponse.success(message="Evento eliminado")


@reproduction_ns.route("/events/animal/<int:animal_id>")
class AnimalReproductiveHistory(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Historial reproductivo completo de una hembra."""
        animal = Animals.get_by_id(animal_id)
        if not animal:
            return APIResponse.error("Animal no encontrado", status_code=404)

        events = (
            apply_tenant_filter(ReproductiveEvent.query, ReproductiveEvent)
            .filter_by(animal_id=animal_id)
            .order_by(ReproductiveEvent.event_date.desc())
            .all()
        )

        data = [e.to_namespace_dict(include_relations=True) for e in events]

        # Métricas
        inseminations = [e for e in events if e.event_type == EventType.Inseminacion]
        positive_diags = [
            e
            for e in events
            if e.event_type == EventType.Diagnostico
            and e.diagnosis_result == DiagnosisResult.Positivo
        ]
        partos = [e for e in events if e.event_type == EventType.Parto]
        total_alive = sum(e.alive_count or 0 for e in partos)
        total_dead = sum(e.dead_count or 0 for e in partos)

        conception_rate = (
            round(len(positive_diags) / len(inseminations) * 100, 1)
            if inseminations
            else None
        )

        last_insem = next((e for e in inseminations), None)
        active_pregnancy = None
        if last_insem and last_insem.expected_birth_date:
            # Verificar si esta inseminación ya está resuelta por algún parto o diagnóstico negativo posterior
            subsequent_event = next(
                (
                    e
                    for e in events
                    if e.event_date >= last_insem.event_date
                    and e.id != last_insem.id
                    and (
                        (
                            e.event_type == EventType.Diagnostico
                            and e.diagnosis_result == DiagnosisResult.Negativo
                        )
                        or (e.event_type == EventType.Parto)
                    )
                ),
                None,
            )

            if not subsequent_event:
                from datetime import timedelta

                today = date.today()
                if last_insem.expected_birth_date >= today or (
                    today - last_insem.expected_birth_date < timedelta(days=45)
                ):
                    active_pregnancy = {
                        "insemination_date": str(last_insem.event_date),
                        "expected_birth_date": str(last_insem.expected_birth_date),
                        "days_remaining": (last_insem.expected_birth_date - today).days,
                        "technique": last_insem.technique.value
                        if last_insem.technique
                        else None,
                    }

        return APIResponse.success(
            data={
                "animal_id": animal_id,
                "animal_record": animal.record,
                "events": data,
                "metrics": {
                    "total_inseminations": len(inseminations),
                    "positive_diagnoses": len(positive_diags),
                    "total_births": len(partos),
                    "total_alive_offspring": total_alive,
                    "total_dead_offspring": total_dead,
                    "conception_rate_pct": conception_rate,
                },
                "active_pregnancy": active_pregnancy,
            }
        )
