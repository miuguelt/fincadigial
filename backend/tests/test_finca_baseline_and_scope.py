from datetime import date

import pytest

from app.models import (
    Animals,
    Breeds,
    Diseases,
    Finca,
    FoodTypes,
    FarmType,
    Medications,
    RouteAdministration,
    Species,
    TreatmentMedications,
    TreatmentVaccines,
    Treatments,
    Vaccines,
)
from app.models.animals import AnimalStatus, Sex
from app.models.base_model import ValidationError


@pytest.mark.unit
def test_new_finca_gets_baseline_catalogs(db_session):
    finca = Finca.create(name="Finca baseline test", type=FarmType.Tradicional)

    assert RouteAdministration.query.filter_by(finca_id=finca.id).count() > 0
    assert Diseases.query.filter_by(finca_id=finca.id).count() > 0
    assert Medications.query.filter_by(finca_id=finca.id).count() > 0
    assert Vaccines.query.filter_by(finca_id=finca.id).count() > 0
    assert FoodTypes.query.filter_by(finca_id=finca.id).count() > 0


@pytest.mark.unit
def test_treatment_bridges_reject_cross_finca_catalogs(db_session):
    finca_a = Finca.create(name="Finca scope A", type=FarmType.Tradicional)
    finca_b = Finca.create(name="Finca scope B", type=FarmType.Tradicional)
    species = Species.create(name="Especie scope")
    breed = Breeds.create(name="Raza scope", species_id=species.id)
    animal = Animals.create(
        sex=Sex.Hembra,
        birth_date=date(2020, 1, 1),
        weight=400,
        record="SCOPE-001",
        breeds_id=breed.id,
        status=AnimalStatus.Vivo,
        finca_id=finca_a.id,
    )
    treatment = Treatments.create(
        treatment_date=date.today(),
        description="Tratamiento scope",
        frequency="Única",
        dosis="1",
        animal_id=animal.id,
        finca_id=finca_a.id,
    )
    medication_from_b = Medications.query.filter_by(finca_id=finca_b.id).first()
    vaccine_from_b = Vaccines.query.filter_by(finca_id=finca_b.id).first()

    with pytest.raises(ValidationError, match="misma finca"):
        TreatmentMedications.create(
            treatment_id=treatment.id,
            medication_id=medication_from_b.id,
        )
    with pytest.raises(ValidationError, match="misma finca"):
        TreatmentVaccines.create(
            treatment_id=treatment.id,
            vaccine_id=vaccine_from_b.id,
        )

    assert TreatmentMedications.query.count() == 0
    assert TreatmentVaccines.query.count() == 0
