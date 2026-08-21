from datetime import date, timedelta
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.control import Control
from app.models.species import Species
from app.models.breeds import Breeds
from app.models.finca import Finca, FarmType
from app.models.base_model import ValidationError
from app import db
import pytest


def test_control_validate_and_normalize(app):
    """Verifica que Control normalice y valide fechas correctamente."""
    with app.app_context():
        finca = Finca.create(
            name="Finca Test Batch Weight",
            type=FarmType.Tradicional,
        )
        species = Species(name="Bovino Test Batch")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test Batch", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = Animals.create(
            record="BW-TEST-001",
            breeds_id=breed.id,
            sex=Sex.Hembra,
            status=AnimalStatus.Vivo,
            birth_date=date.today(),
            weight=100.0,
            finca_id=finca.id,
        )

        today_str = date.today().isoformat()
        control = Control.create(
            animal_id=animal.id,
            weight=150.5,
            checkup_date=today_str,
            health_status="Sano",
            description="Control de prueba",
            finca_id=finca.id,
        )
        assert control.id is not None
        assert control.weight == 150.5
        assert control.checkup_date == date.today()

        # Fecha futura debe fallar con ValidationError
        future_str = (date.today() + timedelta(days=2)).isoformat()
        with pytest.raises(ValidationError):
            Control.create(
                animal_id=animal.id,
                weight=160.0,
                checkup_date=future_str,
                health_status="Sano",
                finca_id=finca.id,
            )


def test_animal_batch_weight(app):
    """Verifica el flujo de batch_weight con fechas string y asignación de finca_id."""
    with app.app_context():
        finca = Finca.create(
            name="Finca Test Batch Weight 2",
            type=FarmType.Tradicional,
        )
        species = Species(name="Bovino Test Batch 2")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test Batch 2", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = Animals.create(
            record="BW-TEST-002",
            breeds_id=breed.id,
            sex=Sex.Hembra,
            status=AnimalStatus.Vivo,
            birth_date=date.today(),
            weight=100.0,
            finca_id=finca.id,
        )

        today_str = date.today().isoformat()
        results = Animals.batch_weight(
            animal_ids=[animal.id],
            weight=210.0,
            checkup_date=today_str,
            notes="Pesaje masivo lote",
            finca_id=finca.id,
        )

        assert len(results) == 1
        assert results[0].weight == 210.0
        assert results[0].finca_id == finca.id
        assert animal.weight == 210.0
