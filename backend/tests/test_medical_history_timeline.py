"""El historial médico de un animal no puede pisar el contexto de Flask.

La línea `for flask.g in genetics:` usaba el global de aplicación de Flask como
variable del bucle, así que al terminar `flask.g` dejaba de ser el contexto y
pasaba a ser un registro de mejoramiento genético. Eso rompe todo lo que
después lee `flask.g.is_admin` (motor de alertas, tareas, filtro de borrado
lógico) y el cronómetro de petición del middleware.
"""

from datetime import date

import flask
import pytest

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.geneticImprovements import GeneticImprovements
from app.services.analytics.medical_service import MedicalAnalyticsService


@pytest.fixture()
def animal_con_genetica(app, db_session):
    """Un animal vivo con un evento reproductivo, que es lo que dispara el bucle."""
    from app.models.breeds import Breeds
    from app.models.finca import FarmType, Finca
    from app.models.species import Species

    finca = Finca.query.first()
    if finca is None:
        finca = Finca.create(
            name="Finca Historial Test", type=FarmType.Tradicional, is_active=True
        )
        db.session.commit()

    # `db_session` revierte por prueba, así que el catálogo puede no existir:
    # la fixture se crea lo mínimo que necesita en vez de suponerlo.
    breed = Breeds.query.first()
    if breed is None:
        species = Species.query.first()
        if species is None:
            species = Species(name="Bovino")
            db.session.add(species)
            db.session.flush()
        breed = Breeds(name="Holstein", species_id=species.id, is_active=True)
        db.session.add(breed)
        db.session.flush()

    animal = Animals(
        breeds_id=breed.id,
        record=f"TEST-GEN-{date.today().isoformat()}",
        birth_date=date(2023, 1, 1),
        weight=400,
        sex=Sex.Hembra,
        status=AnimalStatus.Vivo,
        finca_id=finca.id,
    )
    db.session.add(animal)
    db.session.flush()

    db.session.add(
        GeneticImprovements(
            animal_id=animal.id,
            date=date(2025, 6, 1),
            genetic_event_technique="Inseminación artificial",
            details="Pajilla 123",
            results="Positivo",
            finca_id=finca.id,
        )
    )
    db.session.commit()
    return animal


def test_el_historial_no_reemplaza_el_global_de_flask(app, animal_con_genetica):
    with app.app_context():
        flask.g.is_admin = True

        MedicalAnalyticsService.get_animal_medical_history(animal_con_genetica.id)

        # Si el bucle pisó `flask.g`, esto lanza AttributeError o devuelve el
        # registro genético en vez del contexto.
        assert getattr(flask.g, "is_admin", None) is True
        assert not isinstance(flask.g, GeneticImprovements)


def test_el_historial_incluye_el_evento_reproductivo(app, animal_con_genetica):
    with app.app_context():
        history = MedicalAnalyticsService.get_animal_medical_history(
            animal_con_genetica.id
        )

    assert history is not None
    assert history["summary"]["total_reproductive"] == 1

    reproductivos = [
        item for item in history["timeline"] if item["type"] == "reproductive"
    ]
    assert len(reproductivos) == 1
    assert reproductivos[0]["title"] == "Inseminación artificial"
    assert reproductivos[0]["subtitle"] == "Pajilla 123 → Positivo"
    assert reproductivos[0]["date"] == "2025-06-01"


def test_animal_inexistente_devuelve_none(app, db_session):
    with app.app_context():
        assert MedicalAnalyticsService.get_animal_medical_history(-1) is None
