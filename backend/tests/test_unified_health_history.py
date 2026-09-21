"""Bitácora unificada: espejo de eventos de negocio en animal_health_history.

Cubre los dominios que antes no entraban a la línea de tiempo: controles,
tratamientos, reproducción, producción de leche, condición corporal y
movimientos ICA. También verifica que la línea de tiempo analítica mezcla la
bitácora sin duplicar los tipos que ya tienen fuente directa.
"""

from datetime import date

from flask_jwt_extended import decode_token

from app import db
from app.models.animal_health_history import AnimalHealthHistory as AHH
from app.models.animal_health_history import HealthEventType as HET
from app.models.animal_movements import AnimalMovement as MovementModel
from app.models.animal_movements import MovementType
from app.models.animals import AnimalStatus, Sex
from app.models.animals import Animals as AnimalsModel
from app.models.body_condition_scores import BodyConditionScore as BCSModel
from app.models.breeds import Breeds as BreedsModel
from app.models.control import Control as ControlModel
from app.models.control import HealthStatus
from app.models.milk_production import MilkProduction as MilkModel
from app.models.reproduction import EventType as ReproEventType
from app.models.reproduction import ReproductiveEvent as ReproModel
from app.models.species import Species as SpeciesModel
from app.models.treatments import Treatments as TreatmentModel


def _seed_animal(app, auth_headers):
    with app.app_context():
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        species = SpeciesModel(name="Bovino Test Bitácora")
        db.session.add(species)
        db.session.commit()

        breed = BreedsModel(name="Raza Test Bitácora", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = AnimalsModel.create(
            record="BOV-BIT-001",
            sex=Sex.Hembra,
            weight=320.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
            is_lactating=True,
        )
        db.session.commit()
        return finca_id, animal.id


def _mirror_count(reference_kind):
    return AHH.query.filter_by(reference_kind=reference_kind).count()


def test_domains_mirror_into_bitacora(client, auth_headers, app):
    finca_id, animal_id = _seed_animal(app, auth_headers)

    with app.app_context():
        control = ControlModel.create(
            animal_id=animal_id,
            checkup_date=date.today(),
            health_status=HealthStatus.Malo,
            weight=315.0,
            temperature=40.2,
            description="Control de seguimiento",
            finca_id=finca_id,
        )
        treatment = TreatmentModel.create(
            animal_id=animal_id,
            treatment_date=date.today(),
            description="Antibiótico diagnóstico",
            frequency="1 vez al día",
            dosis="5 ml IM",
            finca_id=finca_id,
        )
        milk = MilkModel.create(
            animal_id=animal_id,
            finca_id=finca_id,
            date=date.today(),
            liters=12.5,
            milking_session="AM",
            fat_percentage=3.9,
            somatic_cells=250000,
        )
        bcs = BCSModel.create(
            animal_id=animal_id,
            finca_id=finca_id,
            score_date=date.today(),
            score=5.0,
        )
        repro = ReproModel.create(
            animal_id=animal_id,
            finca_id=finca_id,
            event_type=ReproEventType.Parto,
            event_date=date.today(),
        )
        movement = MovementModel.create(
            animal_id=animal_id,
            finca_origen_id=finca_id,
            tipo_movimiento=MovementType.Traslado_Interno,
            fecha_movimiento=date.today(),
            finca_destino_id=finca_id,
        )
        db.session.commit()

        assert _mirror_count("control") == 1
        assert _mirror_count("treatment") == 1
        assert _mirror_count("milk_production") == 1
        assert _mirror_count("body_condition_score") == 1
        assert _mirror_count("reproductive_event") == 1
        assert _mirror_count("animal_movement") == 1

    with app.app_context():
        row = AHH.query.filter_by(reference_kind="milk_production").first()
        assert row is not None
        assert row.event_type == HET.Milk

        milk_id = row.reference_id
        milk = MilkModel.get_by_id(milk_id, include_deleted=True)
        milk.delete(commit=False)
        db.session.commit()
        assert _mirror_count("milk_production") == 0

        milk = MilkModel.get_by_id(milk_id, include_deleted=True)
        milk.restore(commit=False)
        db.session.commit()
        assert _mirror_count("milk_production") == 1
        assert _mirror_count("control") == 1


def test_timeline_merges_bitacora_without_duplicates(client, auth_headers, app):
    from app.services.analytics.medical.medical_history import (
        get_animal_medical_history,
    )

    finca_id, animal_id = _seed_animal(app, auth_headers)

    with app.app_context():
        TreatmentModel.create(
            animal_id=animal_id,
            treatment_date=date.today(),
            description="Tratamiento único en timeline",
            frequency="1 vez al día",
            dosis="5 ml",
            finca_id=finca_id,
        )
        MilkModel.create(
            animal_id=animal_id,
            finca_id=finca_id,
            date=date.today(),
            liters=10.0,
            milking_session="AM",
        )
        ReproModel.create(
            animal_id=animal_id,
            finca_id=finca_id,
            event_type=ReproEventType.Celo,
            event_date=date.today(),
        )
        db.session.commit()

    with app.app_context():
        history = get_animal_medical_history(animal_id)
        assert history is not None

        timeline_types = [entry["type"] for entry in history["timeline"]]
        assert timeline_types.count("treatment") == 1
        assert "milk" in timeline_types
        assert "reproductive" in timeline_types
        assert history["summary"]["total_bitacora"] >= 2