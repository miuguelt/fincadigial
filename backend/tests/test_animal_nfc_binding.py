"""Vinculación de aretes NFC y transpondedores LF con el animal.

El chip se graba en el celular del operario, pero la fuente autoritativa del
vínculo animal↔chip es la base de datos: sin esta vinculación un arete perdido
o reescrito no se puede auditar.
"""

from datetime import date, datetime, timezone

import pytest

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import Finca, FarmType
from app.models.species import Species
from app.services.nfc.tag_binding_service import (
    TagConflictError,
    bind_tag,
    find_by_tag,
    normalize_nfc_uid,
    unbind_tag,
)
from app.models.base_model import ValidationError


def _make_animal(record: str, finca_id: int, breed_id: int) -> Animals:
    return Animals.create(
        record=record,
        breeds_id=breed_id,
        sex=Sex.Hembra,
        status=AnimalStatus.Vivo,
        birth_date=date(2023, 1, 2),
        weight=120.0,
        finca_id=finca_id,
    )


@pytest.fixture
def herd(app):
    """Dos animales de la misma finca y uno de otra finca."""
    with app.app_context():
        finca = Finca.create(name="Finca NFC A", type=FarmType.Tradicional)
        other = Finca.create(name="Finca NFC B", type=FarmType.Tradicional)
        species = Species(name="Bovino NFC")
        db.session.add(species)
        db.session.commit()
        breed = Breeds(name="Raza NFC", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        a = _make_animal("NFC-001", finca.id, breed.id)
        b = _make_animal("NFC-002", finca.id, breed.id)
        foreign = _make_animal("NFC-003", other.id, breed.id)

        yield {
            "finca_id": finca.id,
            "other_finca_id": other.id,
            "a_id": a.id,
            "b_id": b.id,
            "foreign_id": foreign.id,
        }


class TestNormalizeNfcUid:
    def test_strips_separators_and_uppercases(self):
        assert normalize_nfc_uid("04:a2:24:1a:b3:5c:80") == "04A2241AB35C80"

    def test_accepts_spaced_hex(self):
        assert normalize_nfc_uid(" 04 a2 24 1a ") == "04A2241A"

    def test_rejects_non_hex(self):
        with pytest.raises(ValidationError):
            normalize_nfc_uid("ZZ-no-es-hex")

    def test_rejects_too_short(self):
        with pytest.raises(ValidationError):
            normalize_nfc_uid("04A2")


class TestBindTag:
    def test_binds_nfc_uid_to_animal(self, app, herd):
        with app.app_context():
            written = datetime(2026, 8, 19, 10, 30, tzinfo=timezone.utc)
            animal = bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04:a2:24:1a:b3:5c:80",
                written_at=written,
            )
            assert animal.nfc_uid == "04A2241AB35C80"
            assert animal.nfc_written_at is not None

    def test_is_idempotent_for_same_animal(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            again = bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            assert again.nfc_uid == "04A2241AB35C80"

    def test_rejects_uid_already_used_by_another_animal(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            with pytest.raises(TagConflictError) as exc:
                bind_tag(
                    animal_id=herd["b_id"],
                    finca_id=herd["finca_id"],
                    nfc_uid="04A2241AB35C80",
                )
            assert exc.value.holder_record == "NFC-001"

    def test_force_transfers_uid_and_clears_previous_holder(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            bind_tag(
                animal_id=herd["b_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
                force=True,
            )
            previous = db.session.get(Animals, herd["a_id"])
            assert previous.nfc_uid is None
            assert db.session.get(Animals, herd["b_id"]).nfc_uid == "04A2241AB35C80"

    def test_rejects_animal_from_another_finca(self, app, herd):
        with app.app_context():
            with pytest.raises(ValidationError):
                bind_tag(
                    animal_id=herd["foreign_id"],
                    finca_id=herd["finca_id"],
                    nfc_uid="04A2241AB35C80",
                )

    def test_binds_lf_transponder_code(self, app, herd):
        with app.app_context():
            animal = bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                lf_tag_code="982 000123456789",
            )
            assert animal.lf_tag_code == "982000123456789"

    def test_rejects_lf_code_with_wrong_length(self, app, herd):
        with app.app_context():
            with pytest.raises(ValidationError):
                bind_tag(
                    animal_id=herd["a_id"],
                    finca_id=herd["finca_id"],
                    lf_tag_code="12345",
                )

    def test_requires_at_least_one_code(self, app, herd):
        with app.app_context():
            with pytest.raises(ValidationError):
                bind_tag(animal_id=herd["a_id"], finca_id=herd["finca_id"])


class TestFindByTag:
    def test_finds_animal_by_nfc_uid(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            found = find_by_tag(finca_id=herd["finca_id"], nfc_uid="04:a2:24:1a:b3:5c:80")
            assert found is not None and found.id == herd["a_id"]

    def test_does_not_leak_animals_from_another_finca(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["foreign_id"],
                finca_id=herd["other_finca_id"],
                nfc_uid="04A2241AB35C80",
            )
            assert find_by_tag(finca_id=herd["finca_id"], nfc_uid="04A2241AB35C80") is None


class TestUnbindTag:
    def test_clears_both_codes(self, app, herd):
        with app.app_context():
            bind_tag(
                animal_id=herd["a_id"],
                finca_id=herd["finca_id"],
                nfc_uid="04A2241AB35C80",
                lf_tag_code="982000123456789",
            )
            animal = unbind_tag(animal_id=herd["a_id"], finca_id=herd["finca_id"])
            assert animal.nfc_uid is None
            assert animal.lf_tag_code is None
            assert animal.nfc_written_at is None
