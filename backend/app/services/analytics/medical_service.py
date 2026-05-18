import flask
from sqlalchemy import desc
from datetime import date, datetime, timedelta, timezone
from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.geneticImprovements import GeneticImprovements
from app.models.animalDiseases import AnimalDiseases
from app.models.alerts import AnimalAlert
import logging

logger = logging.getLogger(__name__)


class MedicalAnalyticsService:

    @staticmethod
    def get_animal_medical_history(animal_id, limit=50, start_date=None, end_date=None):
        animal = db.session.get(Animals, animal_id)
        if not animal:
            return None

        if start_date and isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date and isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        def _apply_date(q, col):
            if start_date:
                q = q.filter(col >= start_date)
            if end_date:
                q = q.filter(col <= end_date)
            return q

        treatments   = _apply_date(Treatments.query.filter_by(animal_id=animal_id),        Treatments.treatment_date      ).order_by(desc(Treatments.treatment_date      )).limit(limit).all()
        vaccinations = _apply_date(Vaccinations.query.filter_by(animal_id=animal_id),       Vaccinations.vaccination_date  ).order_by(desc(Vaccinations.vaccination_date  )).limit(limit).all()
        controls     = _apply_date(Control.query.filter_by(animal_id=animal_id),            Control.checkup_date           ).order_by(desc(Control.checkup_date           )).limit(limit).all()
        genetics     = _apply_date(GeneticImprovements.query.filter_by(animal_id=animal_id), GeneticImprovements.date      ).order_by(desc(GeneticImprovements.date        )).limit(limit).all()
        diseases     = AnimalDiseases.query.filter_by(animal_id=animal_id).order_by(desc(AnimalDiseases.diagnosis_date)).limit(limit).all()
        alerts_q     = AnimalAlert.query.filter_by(animal_id=animal_id).order_by(desc(AnimalAlert.triggered_at)).limit(20).all()

        timeline = []

        for t in treatments:
            timeline.append({
                'type': 'treatment', 'date': t.treatment_date.isoformat(),
                'title': t.description,
                'subtitle': f'Dosis: {t.dosis} | Frecuencia: {t.frequency}',
                'color': 'red', 'icon': '💊',
            })
        for v in vaccinations:
            vname = v.vaccines.name if v.vaccines else 'N/D'
            timeline.append({
                'type': 'vaccination', 'date': v.vaccination_date.isoformat(),
                'title': f'Vacunación: {vname}', 'subtitle': '',
                'color': 'green', 'icon': '💉',
            })
        for c in controls:
            status_v = c.health_status.value if c.health_status else 'N/D'
            peso_str = f'Peso: {c.weight} kg' if c.weight else ''
            desc_str = c.description or ''
            timeline.append({
                'type': 'control', 'date': c.checkup_date.isoformat(),
                'title': f'Control Veterinario — {status_v}',
                'subtitle': ' | '.join(filter(None, [peso_str, desc_str])),
                'color': 'blue', 'icon': '⚕️',
            })
        for flask.g in genetics:
            timeline.append({
                'type': 'reproductive', 'date': flask.g.date.isoformat(),
                'title': flask.g.genetic_event_technique,
                'subtitle': f'{flask.g.details} → {flask.g.results}',
                'color': 'purple', 'icon': '🐄',
            })
        for d in diseases:
            dname   = d.disease.name if d.disease else 'N/D'
            ddate   = d.diagnosis_date.isoformat() if d.diagnosis_date else ''
            timeline.append({
                'type': 'disease', 'date': ddate,
                'title': f'Diagnóstico: {dname}',
                'subtitle': f'Estado: {d.status}' + (f' | {d.notes}' if d.notes else ''),
                'color': 'orange', 'icon': '🏥',
            })

        timeline.sort(key=lambda x: x['date'] or '', reverse=True)

        today = date.today()
        ica_ok = MedicalAnalyticsService._check_ica_compliance(animal_id, today)

        return {
            'animal_info': {
                'id': animal.id, 'record': animal.record,
                'status': animal.status.value,
                'sex': animal.sex.value if animal.sex else None,
                'age_months': animal.age_in_months,
                'weight': animal.weight,
            },
            'summary': {
                'total_treatments':   len(treatments),
                'total_vaccinations': len(vaccinations),
                'total_controls':     len(controls),
                'total_reproductive': len(genetics),
                'total_diseases':     len(diseases),
                'unread_alerts':      sum(1 for a in alerts_q if not a.is_read),
            },
            'ica_compliance': ica_ok,
            'alerts': [
                {
                    'message':  a.message,
                    'priority': a.priority.value,
                    'type':     a.alert_type.value,
                    'is_read':  a.is_read,
                    'date':     a.triggered_at.date().isoformat() if a.triggered_at else None,
                }
                for a in alerts_q
            ],
            'timeline': timeline[:limit],
        }

    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _check_ica_compliance(animal_id: int, today: date) -> dict:
        """Estado de cumplimiento ICA para un animal (semáforo verde/amarillo/rojo)."""
        from sqlalchemy import or_

        def last_tx(keywords):
            return Treatments.query.filter(
                Treatments.animal_id == animal_id,
                or_(*[Treatments.description.ilike(f'%{k}%') for k in keywords])
            ).order_by(desc(Treatments.treatment_date)).first()

        aftosa     = last_tx(['aftosa', 'fiebre aftosa'])
        brucelosis = last_tx(['brucelosis', 'brucela', 'rb51'])
        desp       = last_tx(['desparasit', 'ivermectin', 'albendazol', 'levamisol'])
        clostrid   = last_tx(['clostridial', 'clostridi', 'enterotoxemia'])

        def status(tx, max_days):
            if not tx:
                return {'status': 'missing', 'days': None, 'date': None}
            days = (today - tx.treatment_date).days
            if days > max_days:
                return {'status': 'overdue', 'days': days, 'date': tx.treatment_date.isoformat()}
            if days > int(max_days * 0.85):
                return {'status': 'due_soon', 'days': days, 'date': tx.treatment_date.isoformat()}
            return {'status': 'ok', 'days': days, 'date': tx.treatment_date.isoformat()}

        checks = {
            'aftosa':          status(aftosa, 180),
            'brucelosis':      status(brucelosis, 365),
            'desparasitacion': status(desp, 120),
            'clostridial':     status(clostrid, 365),
        }
        if any(v['status'] == 'overdue' for v in checks.values()):
            overall = 'red'
        elif any(v['status'] in ('missing', 'due_soon') for v in checks.values()):
            overall = 'yellow'
        else:
            overall = 'green'

        return {'overall': overall, 'checks': checks}

    @staticmethod
    def get_herd_ica_compliance(finca_id: int) -> dict:
        """Semáforo de cumplimiento ICA para todo el hato."""
        from app.models.animals import Animals, AnimalStatus
        from collections import defaultdict
        
        today = date.today()
        animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
        
        animal_ids = [a.id for a in animals]
        if not animal_ids:
            return {'counts': {'green': 0, 'yellow': 0, 'red': 0}, 'total': 0, 'animals': []}
            
        from sqlalchemy import or_, desc
        all_treatments = Treatments.query.filter(
            Treatments.animal_id.in_(animal_ids),
            or_(
                Treatments.description.ilike('%aftosa%'),
                Treatments.description.ilike('%brucelosis%'),
                Treatments.description.ilike('%brucela%'),
                Treatments.description.ilike('%rb51%'),
                Treatments.description.ilike('%desparasit%'),
                Treatments.description.ilike('%ivermectin%'),
                Treatments.description.ilike('%albendazol%'),
                Treatments.description.ilike('%levamisol%'),
                Treatments.description.ilike('%clostridial%'),
                Treatments.description.ilike('%clostridi%'),
                Treatments.description.ilike('%enterotoxemia%')
            )
        ).order_by(desc(Treatments.treatment_date)).all()
        
        tx_by_animal = defaultdict(list)
        for tx in all_treatments:
            tx_by_animal[tx.animal_id].append(tx)
            
        result_animals = []
        counts = {'green': 0, 'yellow': 0, 'red': 0}
        
        for animal in animals:
            txs = tx_by_animal.get(animal.id, [])
            
            def last_tx(keywords):
                for tx in txs:
                    if tx.description and any(k in tx.description.lower() for k in keywords):
                        return tx
                return None

            aftosa     = last_tx(['aftosa'])
            brucelosis = last_tx(['brucelosis', 'brucela', 'rb51'])
            desp       = last_tx(['desparasit', 'ivermectin', 'albendazol', 'levamisol'])
            clostrid   = last_tx(['clostridial', 'clostridi', 'enterotoxemia'])

            def status(tx, max_days):
                if not tx:
                    return {'status': 'missing', 'days': None, 'date': None}
                days = (today - tx.treatment_date).days
                if days > max_days:
                    return {'status': 'overdue', 'days': days, 'date': tx.treatment_date.isoformat()}
                if days > int(max_days * 0.85):
                    return {'status': 'due_soon', 'days': days, 'date': tx.treatment_date.isoformat()}
                return {'status': 'ok', 'days': days, 'date': tx.treatment_date.isoformat()}

            checks = {
                'aftosa':          status(aftosa, 180),
                'brucelosis':      status(brucelosis, 365),
                'desparasitacion': status(desp, 120),
                'clostridial':     status(clostrid, 365),
            }
            if any(v['status'] == 'overdue' for v in checks.values()):
                overall = 'red'
            elif any(v['status'] in ('missing', 'due_soon') for v in checks.values()):
                overall = 'yellow'
            else:
                overall = 'green'
                
            counts[overall] += 1
            
            animal_sex = animal.sex.value if hasattr(animal.sex, 'value') else animal.sex
            animal_alias = getattr(animal, 'alias', '')
            if not animal_alias:
                animal_alias = getattr(animal, 'name', '')

            result_animals.append({
                'animal_id': animal.id,
                'record': animal.record,
                'name': animal_alias,
                'sex': animal_sex,
                'overall': overall,
                'checks': checks
            })
            
        return {
            'counts': counts,
            'total': len(animals),
            'animals': result_animals
        }

    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_upcoming_events(days_ahead: int = 30) -> dict:
        """
        Eventos ganaderos en los próximos `days_ahead` días:
        Optimizado para evitar N+1 queries.
        """
        from sqlalchemy import or_, and_
        from app.utils.tenant_context import get_current_finca_id
        
        finca_id = get_current_finca_id()
        if not finca_id:
            return {'generated_at': datetime.now(timezone.utc).isoformat(), 'horizon_days': days_ahead, 'summary': {'total': 0}}
            
        today   = date.today()
        horizon_date = today + timedelta(days=days_ahead)

        # 1. Obtener todos los animales vivos de la finca una sola vez
        alive_animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
        animal_ids = [a.id for a in alive_animals]
        females_ids = [a.id for a in alive_animals if a.sex == Sex.Hembra]
        
        if not animal_ids:
            return {'generated_at': datetime.now(timezone.utc).isoformat(), 'horizon_days': days_ahead, 'summary': {'total': 0}}

        animal_map = {a.id: a for a in alive_animals}

        # 2. Carga masiva de Eventos Reproductivos (Partos y Gestaciones)
        upcoming_births = []
        postparto_monitoring = []
        
        if females_ids:
            # Gestaciones activas (último registro por animal)
            # Simplificación: obtenemos todos los registros positivos recientes
            gestations = GeneticImprovements.query.filter(
                GeneticImprovements.animal_id.in_(females_ids),
                GeneticImprovements.date >= today - timedelta(days=300),
                or_(
                    GeneticImprovements.results.ilike('%positivo%'),
                    GeneticImprovements.results.ilike('%preñada%'),
                    GeneticImprovements.results.ilike('%gestante%'),
                )
            ).order_by(GeneticImprovements.animal_id, desc(GeneticImprovements.date)).all()
            
            seen_births = set()
            for g in gestations:
                if g.animal_id in seen_births: continue
                seen_births.add(g.animal_id)
                
                expected_birth = g.date + timedelta(days=283)
                days_to_birth = (expected_birth - today).days
                if -14 <= days_to_birth <= days_ahead:
                    upcoming_births.append({
                        'animal_id': g.animal_id,
                        'record': animal_map[g.animal_id].record,
                        'expected_birth': expected_birth.isoformat(),
                        'days_to_birth': days_to_birth,
                        'status': 'overdue' if days_to_birth < 0 else ('imminent' if days_to_birth <= 7 else 'upcoming'),
                    })

            # Post-partos recientes
            births = GeneticImprovements.query.filter(
                GeneticImprovements.animal_id.in_(females_ids),
                GeneticImprovements.date >= today - timedelta(days=22),
                or_(
                    GeneticImprovements.details.ilike('%parto%'),
                    GeneticImprovements.genetic_event_technique.ilike('%parto%'),
                    GeneticImprovements.results.ilike('%parto%'),
                )
            ).order_by(GeneticImprovements.animal_id, desc(GeneticImprovements.date)).all()
            
            seen_pp = set()
            for b in births:
                if b.animal_id in seen_pp: continue
                seen_pp.add(b.animal_id)
                days_pp = (today - b.date).days
                postparto_monitoring.append({
                    'animal_id': b.animal_id,
                    'record': animal_map[b.animal_id].record,
                    'birth_date': b.date.isoformat(),
                    'days_postparto': days_pp,
                    'next_check': (b.date + timedelta(days=14 if days_pp < 14 else 21)).isoformat(),
                })

        # 3. Vacunaciones masivas
        vaccination_due = []
        recent_icas = Treatments.query.filter(
            Treatments.animal_id.in_(animal_ids),
            Treatments.treatment_date >= today - timedelta(days=210),
            or_(
                Treatments.description.ilike('%aftosa%'),
                Treatments.description.ilike('%brucelosis%'),
                Treatments.description.ilike('%brucela%'),
            )
        ).order_by(Treatments.animal_id, desc(Treatments.treatment_date)).all()
        
        seen_vacc = set()
        for v in recent_icas:
            if v.animal_id in seen_vacc: continue
            seen_vacc.add(v.animal_id)
            days_since = (today - v.treatment_date).days
            days_remaining = 180 - days_since
            if -30 <= days_remaining <= 30:
                vaccination_due.append({
                    'animal_id': v.animal_id,
                    'record': animal_map[v.animal_id].record,
                    'vaccine': 'Aftosa / Brucelosis ICA',
                    'last_date': v.treatment_date.isoformat(),
                    'due_date': (v.treatment_date + timedelta(days=180)).isoformat(),
                    'days_remaining': days_remaining,
                    'status': 'overdue' if days_remaining < 0 else 'due_soon',
                })

        # 4. Controles masivos
        controls_due = []
        recent_controls = Control.query.filter(
            Control.animal_id.in_(animal_ids),
            Control.checkup_date >= today - timedelta(days=100)
        ).order_by(Control.animal_id, desc(Control.checkup_date)).all()
        
        seen_ctrl = set()
        for c in recent_controls:
            if c.animal_id in seen_ctrl: continue
            seen_ctrl.add(c.animal_id)
            days_since_ctrl = (today - c.checkup_date).days
            if 55 <= days_since_ctrl <= 90:
                controls_due.append({
                    'animal_id': c.animal_id,
                    'record': animal_map[c.animal_id].record,
                    'last_control': c.checkup_date.isoformat(),
                    'days_since': days_since_ctrl,
                    'recommended_by': (c.checkup_date + timedelta(days=60)).isoformat(),
                })

        return {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'horizon_days': days_ahead,
            'upcoming_births': sorted(upcoming_births, key=lambda x: x['days_to_birth']),
            'postparto_monitoring': sorted(postparto_monitoring, key=lambda x: x['days_postparto']),
            'vaccination_due': sorted(vaccination_due, key=lambda x: x['days_remaining']),
            'controls_due': sorted(controls_due, key=lambda x: x['days_since'], reverse=True),
            'summary': {
                'births': len(upcoming_births),
                'postparto': len(postparto_monitoring),
                'vaccinations_due': len(vaccination_due),
                'controls_due': len(controls_due),
                'total': len(upcoming_births) + len(postparto_monitoring) + len(vaccination_due) + len(controls_due),
            },
        }
