"""Andamiaje de las pruebas del módulo reproductivo.

Una finca con vaca, toro y novilla, más los ayudantes para crear eventos.
Vive en un conftest propio para que cada archivo cubra una sola capacidad sin
importar fixtures a mano.
"""

from datetime import date, timedelta

import pytest


from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.base_model import ValidationError
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.reproduction import DiagnosisResult, EventType, ReproductiveEvent
from app.models.species import Species

TODAY = date.today()


def _d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


@pytest.fixture()
def farm(app, db_session):
    with app.app_context():
        finca = Finca.query.first()
        if finca is None:
            finca = Finca(name="Finca sync", type=FarmType.Tradicional, is_active=True)
            db.session.add(finca)
            db.session.flush()
        species = Species(name="Bovino sync")
        db.session.add(species)
        db.session.flush()
        breed = Breeds(name="Raza sync", species_id=species.id)
        db.session.add(breed)
        db.session.flush()

        def _animal(record, sex, age_days=2000):
            animal = Animals(
                record=record,
                sex=sex,
                birth_date=_d(age_days),
                weight=450,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id,
            )
            db.session.add(animal)
            db.session.flush()
            return animal

        yield {
            "finca": finca,
            "cow": _animal("SYNC-VACA", Sex.Hembra),
            "sire": _animal("SYNC-TORO", Sex.Macho),
            "heifer": _animal("SYNC-NOVILLA", Sex.Hembra, age_days=400),
        }


def _reload(animal: Animals) -> Animals:
    """Reincorpora el animal a la sesión del contexto activo de la prueba."""
    return Animals.query.get(animal.id)


def _event(animal, event_type, when, **kwargs):
    event = ReproductiveEvent(
        animal_id=animal.id,
        finca_id=animal.finca_id,
        event_type=event_type,
        event_date=when,
        **kwargs,
    )
    db.session.add(event)
    db.session.flush()
    return event


