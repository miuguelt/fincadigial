"""Reglas de dominio al registrar o editar un evento reproductivo."""

from datetime import timedelta

import pytest

from app import db
from app.models.base_model import ValidationError
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.reproduction import DiagnosisResult, EventType

from .conftest import TODAY, _d, _event, _reload

class TestValidators:
    def test_rechaza_evento_sobre_un_macho(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            with pytest.raises(ValidationError, match="macho"):
                validate_event(
                    {
                        "animal_id": farm["sire"].id,
                        "event_type": "Celo",
                        "event_date": _d(1).isoformat(),
                    },
                    farm["finca"].id,
                )

    def test_rechaza_fecha_futura(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            with pytest.raises(ValidationError, match="futura"):
                validate_event(
                    {
                        "animal_id": farm["cow"].id,
                        "event_type": "Celo",
                        "event_date": (TODAY + timedelta(days=1)).isoformat(),
                    },
                    farm["finca"].id,
                )

    def test_rechaza_dos_partos_demasiado_seguidos(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            cow = farm["cow"]
            _event(cow, EventType.Parto, _d(60), alive_count=1)
            with pytest.raises(ValidationError, match="240 días"):
                validate_event(
                    {
                        "animal_id": cow.id,
                        "event_type": "Parto",
                        "event_date": _d(5).isoformat(),
                        "alive_count": 1,
                    },
                    farm["finca"].id,
                )

    def test_rechaza_parto_sin_crias(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            with pytest.raises(ValidationError, match="al menos una cría"):
                validate_event(
                    {
                        "animal_id": farm["cow"].id,
                        "event_type": "Parto",
                        "event_date": _d(5).isoformat(),
                    },
                    farm["finca"].id,
                )

    def test_rechaza_reproductor_que_es_hembra(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            with pytest.raises(ValidationError, match="hembra"):
                validate_event(
                    {
                        "animal_id": farm["cow"].id,
                        "event_type": "Inseminacion",
                        "event_date": _d(5).isoformat(),
                        "sire_id": farm["heifer"].id,
                    },
                    farm["finca"].id,
                )

    def test_advierte_servicio_en_novilla_muy_joven(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            warnings = validate_event(
                {
                    "animal_id": farm["heifer"].id,
                    "event_type": "Inseminacion",
                    "event_date": _d(1).isoformat(),
                    "sire_id": farm["sire"].id,
                },
                farm["finca"].id,
            )
            assert any("meses" in warning for warning in warnings)

    def test_rechaza_evento_duplicado(self, app, farm):
        from app.services.reproduction import validate_event

        with app.app_context():
            cow = farm["cow"]
            _event(cow, EventType.Celo, _d(3))
            with pytest.raises(ValidationError, match="Ya existe"):
                validate_event(
                    {
                        "animal_id": cow.id,
                        "event_type": "Celo",
                        "event_date": _d(3).isoformat(),
                    },
                    farm["finca"].id,
                )


