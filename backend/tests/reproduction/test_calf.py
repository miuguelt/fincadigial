"""Alta de la cría del parto como animal del hato, con su genealogía."""

from datetime import timedelta

import pytest

from app import db
from app.models.base_model import ValidationError
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.reproduction import DiagnosisResult, EventType

from .conftest import TODAY, _d, _event, _reload

class TestCalfRegistration:
    """La cría del parto se da de alta con su genealogía ya resuelta."""

    def _birth_with_calf(self, cow, sire):
        from app.services.reproduction import apply_event_effects

        _event(cow, EventType.Inseminacion, _d(300), sire_id=sire.id)
        birth = _event(cow, EventType.Parto, _d(17), alive_count=1, dead_count=0)
        apply_event_effects(birth)
        return birth

    def test_da_de_alta_la_cria_con_madre_y_padre(self, app, farm):
        from app.models.animals import Sex as AnimalSex
        from app.services.reproduction.calf_registration import register_calf

        with app.app_context():
            cow, sire = _reload(farm["cow"]), _reload(farm["sire"])
            birth = self._birth_with_calf(cow, sire)
            calf_row = birth.offspring.first()

            calf = register_calf(
                calf_row.id,
                cow.finca_id,
                {"record": "CRIA-001", "sex": "Hembra", "weight": 32},
            )

            assert calf.record == "CRIA-001"
            assert calf.sex == AnimalSex.Hembra
            assert calf.birth_date == _d(17)
            assert calf.idMother == cow.id
            assert calf.idFather == sire.id
            assert calf.breeds_id == cow.breeds_id
            assert calf_row.animal_id == calf.id

    def test_hereda_los_abuelos_conocidos(self, app, farm):
        from app.services.reproduction.calf_registration import register_calf

        with app.app_context():
            cow, sire = _reload(farm["cow"]), _reload(farm["sire"])
            grandma = _reload(farm["heifer"])
            cow.idMother = grandma.id
            db.session.flush()
            birth = self._birth_with_calf(cow, sire)

            calf = register_calf(
                birth.offspring.first().id,
                cow.finca_id,
                {"record": "CRIA-002", "sex": "Macho"},
            )
            assert calf.idMotherMother == grandma.id

    def test_rechaza_registrar_dos_veces_la_misma_cria(self, app, farm):
        from app.services.reproduction.calf_registration import register_calf

        with app.app_context():
            cow, sire = _reload(farm["cow"]), _reload(farm["sire"])
            birth = self._birth_with_calf(cow, sire)
            offspring_id = birth.offspring.first().id
            register_calf(offspring_id, cow.finca_id, {"record": "CRIA-003", "sex": "Hembra"})

            with pytest.raises(ValidationError, match="ya está registrada"):
                register_calf(
                    offspring_id, cow.finca_id, {"record": "CRIA-004", "sex": "Hembra"}
                )

    def test_rechaza_dar_de_alta_una_cria_muerta(self, app, farm):
        from app.services.reproduction import apply_event_effects
        from app.services.reproduction.calf_registration import register_calf

        with app.app_context():
            cow = _reload(farm["cow"])
            birth = _event(cow, EventType.Parto, _d(9), alive_count=0, dead_count=1)
            apply_event_effects(birth)

            with pytest.raises(ValidationError, match="muerta"):
                register_calf(
                    birth.offspring.first().id,
                    cow.finca_id,
                    {"record": "CRIA-005", "sex": "Hembra"},
                )
