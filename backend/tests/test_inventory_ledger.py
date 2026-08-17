from datetime import date, timedelta
from decimal import Decimal

import pytest

from app import db
from app.models.finca import FarmType, Finca
from app.models.inventory import InventoryLot, InventoryMovement, MovementType, ProductType
from app.models.treatment_medications import TreatmentMedications
from app.models.treatments import Treatments
from app.models.medications import Medications
from app.models.route_administration import RouteAdministration
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.species import Species
from app.services.inventory_service import InventoryService, InventoryStockError


def _lot(*, expires_in_days: int = 30, quantity: str = "100") -> InventoryLot:
    finca = Finca(
        name=f"Finca ledger {quantity} {expires_in_days}",
        type=FarmType.Tradicional,
        is_active=True,
    )
    db.session.add(finca)
    db.session.flush()
    lot = InventoryLot(
        product_type=ProductType.Medicamento,
        medication_id=1,
        lot_number=f"LEDGER-{quantity}-{expires_in_days}",
        quantity=Decimal(quantity),
        current_quantity=Decimal(quantity),
        unit="ml",
        expiry_date=date.today() + timedelta(days=expires_in_days),
        entry_date=date.today(),
        finca_id=finca.id,
    )
    db.session.add(lot)
    db.session.commit()
    return lot


@pytest.mark.unit
def test_every_movement_uses_one_ledger_and_preserves_decimal_quantities(db_session):
    lot = _lot(quantity="100.000")

    movement = InventoryService.register_movement(
        lot.id,
        MovementType.Salida,
        Decimal("2.5"),
        reference_type="manual_use",
        notes="Aplicación en campo",
    )

    assert lot.current_quantity == Decimal("97.500")
    assert movement.quantity == Decimal("2.500")
    assert movement.balance_before == Decimal("100.000")
    assert movement.balance_after == Decimal("97.500")


@pytest.mark.unit
def test_adjustment_means_counted_balance_and_never_allows_negative_stock(db_session):
    lot = _lot(quantity="10")

    InventoryService.register_movement(lot.id, MovementType.Ajuste, Decimal("4"))
    assert lot.current_quantity == Decimal("4.000")

    InventoryService.register_movement(lot.id, MovementType.Ajuste, Decimal("0"))
    assert lot.current_quantity == Decimal("0.000")

    with pytest.raises(InventoryStockError, match="Stock insuficiente"):
        InventoryService.register_movement(lot.id, MovementType.Salida, Decimal("5"))

    assert lot.current_quantity == Decimal("0.000")
    assert InventoryMovement.query.filter_by(lot_id=lot.id).count() == 2


@pytest.mark.unit
def test_expired_lot_is_not_usable_but_is_disposed_with_an_explicit_writeoff(db_session):
    lot = _lot(expires_in_days=-1, quantity="8")

    with pytest.raises(InventoryStockError, match="vencido"):
        InventoryService.register_movement(lot.id, MovementType.Salida, Decimal("1"))

    movement = InventoryService.register_movement(
        lot.id,
        MovementType.Baja,
        Decimal("8"),
        reference_type="expiry",
        notes="Baja por vencimiento",
    )

    assert movement.movement_type == MovementType.Baja
    assert lot.current_quantity == Decimal("0.000")


@pytest.mark.unit
def test_new_lot_creates_its_opening_entry_once(db_session):
    lot = InventoryService.create_lot(
        {
            "product_type": ProductType.Medicamento,
            "medication_id": 1,
            "lot_number": "OPEN-001",
            "quantity": Decimal("25.5"),
            "unit": "ml",
            "expiry_date": date.today() + timedelta(days=60),
            "finca_id": _lot(quantity="1").finca_id,
        }
    )

    movements = InventoryMovement.query.filter_by(lot_id=lot.id).all()
    assert lot.current_quantity == Decimal("25.500")
    assert len(movements) == 1
    assert movements[0].movement_type == MovementType.Entrada
    assert movements[0].quantity == Decimal("25.500")


def _treatment_context():
    finca = Finca(name="Finca treatment ledger", type=FarmType.Tradicional, is_active=True)
    species = Species(name="Bovino ledger")
    db.session.add_all([finca, species])
    db.session.flush()
    breed = Breeds(name="Criollo ledger", species_id=species.id)
    route = RouteAdministration(name="Intramuscular ledger", finca_id=finca.id)
    db.session.add_all([breed, route])
    db.session.flush()
    animal = Animals(
        sex=Sex.Hembra,
        birth_date=date(2020, 1, 1),
        weight=400,
        record="LEDGER-ANIMAL-001",
        status=AnimalStatus.Vivo,
        finca_id=finca.id,
        breeds_id=breed.id,
    )
    medication = Medications(
        name="Medicamento ledger",
        description="Para prueba de consumo",
        route_administration_id=route.id,
        finca_id=finca.id,
    )
    db.session.add_all([animal, medication])
    db.session.flush()
    treatment = Treatments(
        treatment_date=date.today(),
        description="Tratamiento ledger",
        frequency="Única",
        dosis="2.5 ml",
        animal_id=animal.id,
        finca_id=finca.id,
    )
    lot = InventoryLot(
        product_type=ProductType.Medicamento,
        medication_id=medication.id,
        lot_number="TREATMENT-001",
        quantity=Decimal("20"),
        current_quantity=Decimal("20"),
        unit="ml",
        expiry_date=date.today() + timedelta(days=30),
        finca_id=finca.id,
    )
    db.session.add_all([treatment, lot])
    db.session.commit()
    return treatment, medication, lot


@pytest.mark.unit
def test_editing_and_deleting_an_application_reconciles_inventory(db_session):
    treatment, medication, lot = _treatment_context()

    application = TreatmentMedications.create(
        treatment_id=treatment.id,
        medication_id=medication.id,
        lot_id=lot.id,
        quantity=Decimal("2.5"),
    )
    assert lot.current_quantity == Decimal("17.500")

    application.update(quantity=Decimal("4"))
    assert lot.current_quantity == Decimal("16.000")

    application.delete()
    assert lot.current_quantity == Decimal("20.000")
    assert InventoryMovement.query.filter_by(
        reference_type="TreatmentMedication", reference_id=application.id
    ).count() == 4


@pytest.mark.unit
def test_deleting_an_application_after_expiry_reverses_physical_balance(db_session):
    treatment, medication, lot = _treatment_context()

    application = TreatmentMedications.create(
        treatment_id=treatment.id,
        medication_id=medication.id,
        lot_id=lot.id,
        quantity=Decimal("2.5"),
    )
    lot.expiry_date = date.today() - timedelta(days=1)
    db.session.flush()

    application.delete()

    assert lot.current_quantity == Decimal("20.000")
    assert lot.available_quantity == Decimal("0.000")


@pytest.mark.unit
def test_deleting_a_treatment_reverses_all_linked_consumptions(db_session):
    treatment, medication, lot = _treatment_context()

    TreatmentMedications.create(
        treatment_id=treatment.id,
        medication_id=medication.id,
        lot_id=lot.id,
        quantity=Decimal("2.5"),
    )
    assert lot.current_quantity == Decimal("17.500")

    treatment.delete()

    assert lot.current_quantity == Decimal("20.000")


@pytest.mark.integration
def test_inventory_api_uses_decimal_movements_and_explicit_expiry_disposal(
    client, auth_headers
):
    medication = Medications.query.first()
    assert medication is not None
    common = {
        "product_type": "Medicamento",
        "medication_id": medication.id,
        "unit": "ml",
        "entry_date": date.today().isoformat(),
        "finca_id": medication.finca_id,
    }
    created = client.post(
        "/api/v1/inventory/lots/",
        json={
            **common,
            "lot_number": "API-DECIMAL-001",
            "quantity": 10,
            "expiry_date": (date.today() + timedelta(days=10)).isoformat(),
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    lot_id = created.get_json()["data"]["id"]

    used = client.post(
        "/api/v1/inventory/movements/",
        json={
            "lot_id": lot_id,
            "movement_type": "Salida",
            "quantity": 2.5,
            "reference_type": "manual_use",
        },
        headers=auth_headers,
    )
    assert used.status_code == 201
    assert used.get_json()["data"]["balance_after"] == 7.5

    expired = client.post(
        "/api/v1/inventory/lots/",
        json={
            **common,
            "lot_number": "API-EXPIRED-001",
            "quantity": 4,
            "expiry_date": (date.today() - timedelta(days=1)).isoformat(),
        },
        headers=auth_headers,
    )
    assert expired.status_code == 201
    expired_id = expired.get_json()["data"]["id"]
    disposed = client.post(
        f"/api/v1/inventory/lots/{expired_id}/dispose-expired",
        headers=auth_headers,
    )
    assert disposed.status_code == 201
    assert disposed.get_json()["data"]["movement_type"] == "Baja"
