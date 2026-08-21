"""Sincronización del estado reproductivo derivado de los eventos.

El estado del animal es derivado: corregir o borrar un evento debe
recalcularlo, no dejarlo congelado en el valor que puso el último alta."""

from datetime import timedelta

import pytest

from app import db
from app.models.base_model import ValidationError
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.reproduction import DiagnosisResult, EventType

from .conftest import TODAY, _d, _event, _reload

class TestStateSync:
    def test_corregir_diagnostico_a_negativo_libera_la_prenez(self, app, farm):
        from app.services.reproduction import apply_event_effects

        with app.app_context():
            cow = _reload(farm["cow"])
            _event(cow, EventType.Inseminacion, _d(60), sire_id=farm["sire"].id)
            diagnosis = _event(
                cow,
                EventType.Diagnostico,
                _d(20),
                diagnosis_result=DiagnosisResult.Positivo,
            )
            apply_event_effects(diagnosis)
            assert cow.is_pregnant is True

            diagnosis.diagnosis_result = DiagnosisResult.Negativo
            db.session.flush()
            apply_event_effects(diagnosis)
            assert cow.is_pregnant is False

    def test_borrar_el_parto_devuelve_el_estado_anterior(self, app, farm):
        from app.services.reproduction import (
            apply_event_effects,
            resync_animal,
            revert_event_effects,
        )

        with app.app_context():
            cow = _reload(farm["cow"])
            _event(cow, EventType.Inseminacion, _d(300), sire_id=farm["sire"].id)
            birth = _event(cow, EventType.Parto, _d(17), alive_count=1, dead_count=0)
            apply_event_effects(birth)
            assert cow.is_lactating is True
            assert cow.last_calving_date == _d(17)

            revert_event_effects(birth)
            db.session.delete(birth)
            db.session.flush()
            resync_animal(cow.id, cow.finca_id)

            assert cow.last_calving_date is None
            assert cow.is_lactating is False

    def test_el_parto_abre_el_ciclo_de_lactancia(self, app, farm):
        from app.services.reproduction import apply_event_effects

        with app.app_context():
            cow = farm["cow"]
            birth = _event(cow, EventType.Parto, _d(10), alive_count=1)
            apply_event_effects(birth)

            cycle = LactationCycle.get_active_for_animal(cow.id, cow.finca_id)
            assert cycle is not None
            assert cycle.calving_date == _d(10)
            assert cycle.lactation_number == 1
            assert cycle.status == LactationStatus.Active

    def test_el_parto_materializa_las_crias_declaradas(self, app, farm):
        from app.services.reproduction import apply_event_effects

        with app.app_context():
            cow = farm["cow"]
            birth = _event(cow, EventType.Parto, _d(5), alive_count=2, dead_count=1)
            apply_event_effects(birth)

            offspring = birth.offspring.all()
            assert len(offspring) == 3
            assert sum(1 for calf in offspring if calf.alive) == 2


class TestLactationExpiry:
    """Una lactancia sin secado registrado no puede durar para siempre."""

    def test_ciclo_vencido_deja_de_contar_como_lactancia(self, app, farm):
        from app.services.reproduction import apply_event_effects, resync_animal

        with app.app_context():
            cow = _reload(farm["cow"])
            birth = _event(cow, EventType.Parto, _d(400), alive_count=1)
            apply_event_effects(birth)
            cycle = LactationCycle.get_active_for_animal(cow.id, cow.finca_id)
            assert cycle is not None

            resync_animal(cow.id, cow.finca_id)
            assert cow.is_lactating is False


class TestDryOff:
    """El secado cierra la lactancia con fecha real, no por vencimiento."""

    def test_el_secado_cierra_el_ciclo_de_lactancia(self, app, farm):
        from app.services.reproduction import apply_event_effects

        with app.app_context():
            cow = _reload(farm["cow"])
            birth = _event(cow, EventType.Parto, _d(220), alive_count=1)
            apply_event_effects(birth)
            assert cow.is_lactating is True

            dry_off = _event(cow, EventType.Secado, _d(10))
            apply_event_effects(dry_off)

            cycle = LactationCycle.query.filter_by(
                animal_id=cow.id, calving_date=_d(220)
            ).one()
            assert cycle.status == LactationStatus.Dry
            assert cycle.dry_off_date == _d(10)
            assert cow.is_lactating is False

    def test_un_parto_posterior_reabre_la_lactancia(self, app, farm):
        from app.services.reproduction import apply_event_effects

        with app.app_context():
            cow = _reload(farm["cow"])
            apply_event_effects(_event(cow, EventType.Parto, _d(300), alive_count=1))
            apply_event_effects(_event(cow, EventType.Secado, _d(60)))
            assert cow.is_lactating is False

            apply_event_effects(_event(cow, EventType.Parto, _d(5), alive_count=1))
            assert cow.is_lactating is True
            assert LactationCycle.query.filter_by(animal_id=cow.id).count() == 2

    def test_rechaza_secado_sin_lactancia_abierta(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            with pytest.raises(ValidationError, match="lactancia"):
                validate_event(
                    {
                        "animal_id": farm["cow"].id,
                        "event_type": "Secado",
                        "event_date": _d(5).isoformat(),
                    },
                    farm["finca"].id,
                )




