"""Servicio de reproducción — lógica de negocio reproductiva."""

import logging
from datetime import date, timedelta


from app import db
from app.models.reproduction import (
    ReproductiveEvent, EventType, DiagnosisResult,
)
from app.models.animals import Animals, Sex
from app.models.base_model import ValidationError

logger = logging.getLogger(__name__)


class ReproductionService:
    @staticmethod
    def create_event(data: dict) -> ReproductiveEvent:
        event = ReproductiveEvent.create(**data)
        animal = Animals.get_by_id(event.animal_id)
        if animal:
            if event.event_type == EventType.Diagnostico:
                if event.diagnosis_result == DiagnosisResult.Positivo:
                    animal.update(is_pregnant=True)
                elif event.diagnosis_result == DiagnosisResult.Negativo:
                    animal.update(is_pregnant=False)
            elif event.event_type == EventType.Parto:
                animal.update(is_pregnant=False, is_lactating=True, last_calving_date=event.event_date)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        from app.utils.namespace_helpers import _cache_clear
        _cache_clear('Animals')
        _cache_clear('ReproductiveEvent')
        return event

    @staticmethod
    def update_event(event_id: int, data: dict) -> ReproductiveEvent:
        ev = ReproductiveEvent.get_by_id(event_id)
        if not ev:
            raise ValidationError("Evento no encontrado", code="not_found")
        ev.update(**data)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        from app.utils.namespace_helpers import _cache_clear
        _cache_clear('ReproductiveEvent')
        return ev

    @staticmethod
    def get_event_with_offspring(event_id: int) -> dict | None:
        ev = ReproductiveEvent.get_by_id(event_id, include_relations=True)
        if not ev:
            return None
        data = ev.to_namespace_dict(include_relations=True)
        data['offspring_list'] = [o.to_namespace_dict(include_relations=True) for o in ev.offspring.all()]
        return data

    @staticmethod
    def get_animal_history(animal_id: int, page: int = 1, limit: int = 50) -> dict:
        query = ReproductiveEvent.query.filter_by(animal_id=animal_id)\
            .order_by(ReproductiveEvent.event_date.desc())
        pagination = query.paginate(page=page, per_page=limit, error_out=False)
        return {
            'items': [e.to_namespace_dict(include_relations=True) for e in pagination.items],
            'page': page,
            'limit': limit,
            'total_items': pagination.total,
        }

    @staticmethod
    def get_summary(finca_id: int) -> dict:
        today = date.today()
        last_30 = today - timedelta(days=30)
        last_365 = today - timedelta(days=365)

        total_events = ReproductiveEvent.query.count()
        events_30d = ReproductiveEvent.query.filter(ReproductiveEvent.event_date >= last_30).count()
        events_365d = ReproductiveEvent.query.filter(ReproductiveEvent.event_date >= last_365).count()

        inseminations = ReproductiveEvent.query.filter_by(event_type=EventType.Inseminacion).count()
        positive_diag = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo
        ).count()
        total_births = ReproductiveEvent.query.filter_by(event_type=EventType.Parto).count()

        pregnant_count = Animals.query.filter_by(is_pregnant=True).count()
        total_females = Animals.query.filter_by(sex=Sex.Hembra).count()

        conception_rate = (positive_diag / inseminations * 100) if inseminations > 0 else 0

        return {
            'total_events': total_events,
            'events_last_30_days': events_30d,
            'events_last_365_days': events_365d,
            'inseminations': inseminations,
            'positive_diagnoses': positive_diag,
            'total_births': total_births,
            'pregnant_animals': pregnant_count,
            'total_females': total_females,
            'conception_rate_pct': round(conception_rate, 1),
        }

    @staticmethod
    def get_pending_births(finca_id: int) -> list:
        today = date.today()
        events = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_type == EventType.Diagnostico,
            ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo,
            ReproductiveEvent.expected_birth_date.isnot(None),
            ReproductiveEvent.expected_birth_date >= today - timedelta(days=30),
        ).order_by(ReproductiveEvent.expected_birth_date.asc()).all()

        result = []
        for ev in events:
            animal = ev.animal
            days_to_birth = (ev.expected_birth_date - today).days if ev.expected_birth_date else None
            result.append({
                'event_id': ev.id,
                'animal_id': animal.id if animal else None,
                'animal_record': animal.record if animal else '---',
                'expected_birth_date': ev.expected_birth_date.isoformat() if ev.expected_birth_date else None,
                'days_to_birth': days_to_birth,
                'status': 'overdue' if days_to_birth and days_to_birth < 0 else 'upcoming',
            })
        return result

    @staticmethod
    def get_fertility_dashboard(finca_id: int, months: int = 6) -> dict:
        from app.services.fertility_analytics_service import FertilityAnalyticsService

        return FertilityAnalyticsService.get_dashboard(finca_id, months)

    @staticmethod
    def get_heat_alerts(finca_id: int) -> list:
        today = date.today()
        females = Animals.query.filter_by(sex=Sex.Hembra, status='Vivo').all()
        alerts = []
        for f in females:
            last_heat = ReproductiveEvent.query.filter_by(
                animal_id=f.id, event_type=EventType.Celo
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if not last_heat:
                continue

            days_since = (today - last_heat.event_date).days
            if days_since < 14:
                continue

            priority = 'Alta' if days_since > 60 else ('Media' if days_since > 30 else 'Baja')
            alerts.append({
                'animal_id': f.id,
                'record': f.record,
                'breed': f.breed.name if f.breed else '---',
                'days_since_last_heat': days_since,
                'last_heat_date': last_heat.event_date.isoformat(),
                'priority': priority,
                'age_days': f.age_days if hasattr(f, 'age_days') else None,
            })

        alerts.sort(key=lambda x: x['days_since_last_heat'], reverse=True)
        return alerts

    @staticmethod
    def get_calendar(start_date: str, end_date: str, finca_id: int) -> list:
        events = ReproductiveEvent.query.filter(
            ReproductiveEvent.event_date >= start_date,
            ReproductiveEvent.event_date <= end_date,
        ).order_by(ReproductiveEvent.event_date.asc()).all()

        color_map = {
            'Celo': '#f59e0b',
            'Inseminacion': '#3b82f6',
            'Diagnostico': '#8b5cf6',
            'Parto': '#10b981',
        }

        result = []
        for ev in events:
            animal = ev.animal
            result.append({
                'id': str(ev.id),
                'title': f"{ev.event_type.value} - {animal.record if animal else '---'}",
                'start': ev.event_date.isoformat(),
                'backgroundColor': color_map.get(ev.event_type.value, '#6b7280'),
                'borderColor': color_map.get(ev.event_type.value, '#6b7280'),
                'extendedProps': {
                    'event_type': ev.event_type.value,
                    'animal_id': ev.animal_id,
                    'animal_record': animal.record if animal else '---',
                    'notes': ev.notes,
                },
            })
        return result

    @staticmethod
    def get_sire_performance(finca_id: int, months: int = 12) -> dict:
        from app.services.sire_performance_service import SirePerformanceService

        return SirePerformanceService.get_performance(finca_id, months)

    @staticmethod
    def create_batch_events(data: dict, finca_id: int, actor_id: int | None = None) -> list:
        animal_ids = data.get('animal_ids')
        if animal_ids is None or not isinstance(animal_ids, list) or len(animal_ids) == 0:
            from app.models.base_model import ValidationError
            raise ValidationError("animal_ids is required and must be a non-empty list")

        event_type = data.get('event_type')
        event_date = data.get('event_date')
        if not event_type or not event_date:
            from app.models.base_model import ValidationError
            raise ValidationError("event_type and event_date are required")

        results = []
        for aid in animal_ids:
            animal = Animals.query.filter_by(id=aid, finca_id=finca_id).first()
            if not animal:
                continue

            event_data = {
                'animal_id': aid,
                'event_type': data.get('event_type'),
                'event_date': data.get('event_date'),
                'sire_id': data.get('sire_id'),
                'technique': data.get('technique'),
                'diagnosis_result': data.get('diagnosis_result'),
                'alive_count': data.get('alive_count'),
                'dead_count': data.get('dead_count'),
                'complications': data.get('complications'),
                'notes': data.get('notes'),
            }
            if actor_id:
                event_data['actor_id'] = actor_id

            try:
                event = ReproductiveEvent.create(**event_data)
                results.append({
                    'animal_id': aid,
                    'status': 'success',
                    'event_id': event.id,
                })
            except Exception as e:
                results.append({
                    'animal_id': aid,
                    'status': 'error',
                    'error': str(e),
                })

        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        from app.utils.namespace_helpers import _cache_clear
        _cache_clear('ReproductiveEvent')
        _cache_clear('Animals')
        return results
