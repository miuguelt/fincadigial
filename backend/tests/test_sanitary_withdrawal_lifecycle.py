"""Pruebas de integración del ciclo completo sanitario y veterinario (Escenario 1).

Verifica:
1. Diagnóstico de patología clínica (AnimalDiseases).
2. Prescripción y aplicación de tratamiento (Treatments) vinculado a medicamento y lote (InventoryLot).
3. Descuento determinista de stock de insumos veterinarios en inventario.
4. Cálculo automático de withdrawal_end_date (Resolución ICA 068167).
5. Bloqueo estricto de ordeño (MilkProduction) durante la ventana de retiro.
6. Bloqueo estricto de venta y traslado no justificado (SanitaryMovementGate).
7. Autorización de traslado de aislamiento de emergencia con justificación médica.
8. Desbloqueo y normalización de producción y movilización tras expirar el retiro.
9. Cierre clínico del caso como Recuperado.
"""

from datetime import date, timedelta
from decimal import Decimal
import flask
import pytest

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.diseases import Diseases
from app.models.animalDiseases import AnimalDiseases
from app.models.finca import FarmType, Finca
from app.models.inventory import InventoryLot, ProductType
from app.models.medications import Medications
from app.models.milk_production import MilkProduction
from app.models.route_administration import RouteAdministration
from app.models.species import Species
from app.models.treatments import Treatments
from app.models.user import User
from app.models.vaccines import Vaccines, VaccineType
from app.models.vaccinations import Vaccinations
from app.models.animal_movements import MovementType
from app.services.sanitary_movement_gate import SanitaryMovementGate
from app.models.base_model import ValidationError


def test_full_sanitary_withdrawal_lifecycle(app):
    """Verifica el ciclo de vida completo de sanidad, retiro e inocuidad alimentaria ICA."""
    with app.app_context():
        # 1. Configurar finca, veterinario y catálogo
        finca = Finca.create(
            name="Hacienda Inocuidad ICA",
            type=FarmType.Tradicional,
            department="Cundinamarca",
            municipality="Ubaté",
        )
        flask.g.finca_id = finca.id

        user = User.query.filter_by(finca_id=finca.id).first()
        if not user:
            user = User.create(
                email="vet.andrea@villaluz.co",
                password="VetP@ssw0rd2026!",
                fullname="Dra. Andrea Morales",
                identification="1098765432",
                phone="3109876543",
                role="Veterinario",
                finca_id=finca.id,
            )

        species = Species.query.filter_by(name="Bovino").first() or Species.create(name="Bovino")
        breed = Breeds.query.first() or Breeds.create(name="Holstein Sanidad", species_id=species.id)
        cow = Animals.create(
            record="VACA-INOCUIDAD-01",
            sex=Sex.Hembra,
            weight=520.0,
            birth_date=date.today() - timedelta(days=1200),
            breeds_id=breed.id,
            finca_id=finca.id,
            status=AnimalStatus.Vivo,
            is_lactating=True,
        )

        # Esquema oficial de Fiebre Aftosa al día (Resolución ICA 20148)
        disease_aftosa = Diseases.query.filter_by(name="Fiebre Aftosa").first()
        if not disease_aftosa:
            disease_aftosa = Diseases.create(name="Fiebre Aftosa", finca_id=finca.id)

        route_im = RouteAdministration.query.first() or RouteAdministration.create(name="Intramuscular")
        vacuna_aftosa = Vaccines.create(
            name="Vacuna Aftosa Oficial",
            dosis="2 ml",
            route_administration_id=route_im.id,
            vaccination_interval="Semestral",
            type=VaccineType.Inactivada,
            national_plan="Aftosa",
            target_disease_id=disease_aftosa.id,
            finca_id=finca.id,
        )
        Vaccinations.create(
            animal_id=cow.id,
            vaccine_id=vacuna_aftosa.id,
            vaccination_date=date.today() - timedelta(days=60),
            finca_id=finca.id,
        )

        route = RouteAdministration.query.first() or RouteAdministration.create(name="Intramamaria")
        med = Medications.create(
            name="Ceftiofur Intramamario Plus",
            description="Antibiótico para mastitis",
            route_administration_id=route.id,
            finca_id=finca.id,
            availability=True,
        )

        lot = InventoryLot.create(
            finca_id=finca.id,
            product_type=ProductType.Medicamento,
            medication_id=med.id,
            lot_number="LOT-CEFT-2026",
            quantity=Decimal("50.0"),
            current_quantity=Decimal("50.0"),
            unit="ml",
            expiry_date=date.today() + timedelta(days=365),
        )

        # 2. Diagnóstico clínico de mastitis (hace 10 días)
        disease = Diseases.query.filter_by(name="Mastitis Clínica").first()
        if not disease:
            disease = Diseases.create(name="Mastitis Clínica", finca_id=finca.id)

        diagnosis_date = date.today() - timedelta(days=10)
        episode = AnimalDiseases.create(
            animal_id=cow.id,
            disease_id=disease.id,
            instructor_id=user.id,
            diagnosis_date=diagnosis_date,
            status="Activo",
            severity="Moderada",
            finca_id=finca.id,
        )
        assert episode.id is not None
        assert episode.status == "Activo"

        # 3. Aplicación de tratamiento con lote y 5 días de retiro (hace 10 días)
        treatment_date = diagnosis_date
        withdrawal_days = 5
        expected_withdrawal_end = treatment_date + timedelta(days=withdrawal_days)  # Hace 5 días

        treatment = Treatments.create(
            treatment_date=treatment_date,
            description="Ceftiofur para mastitis clínica",
            frequency="Cada 24 horas",
            dosis="10 ml",
            withdrawal_days=withdrawal_days,
            animal_id=cow.id,
            finca_id=finca.id,
            medication_id=med.id,
            lot_id=lot.id,
            quantity=Decimal("10.0"),
            animal_disease_id=episode.id,
        )

        assert treatment.withdrawal_end_date == expected_withdrawal_end
        assert treatment.withdrawal_days == 5

        # 4. Descuento de inventario verificado
        db.session.refresh(lot)
        assert lot.current_quantity == Decimal("40.0")

        # 5. Bloqueo determinista de ordeño dentro del retiro (hace 8 días)
        with pytest.raises(ValidationError) as exc_milk:
            MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca.id,
                date=treatment_date + timedelta(days=2),
                liters=14.5,
                milking_session="AM",
            )
        assert "período de retiro" in str(exc_milk.value).lower()
        assert "descartarse" in str(exc_milk.value).lower()

        # 6. Bloqueo de venta durante retiro activo (hace 8 días)
        res_venta = SanitaryMovementGate.check_movement_eligibility(
            animal=cow,
            fecha_movimiento=treatment_date + timedelta(days=2),
            tipo_movimiento=MovementType.Venta_Traslado_Externo,
        )
        assert res_venta.allowed is False
        assert res_venta.conflict_type == "WITHDRAWAL_ACTIVE"
        assert "período de retiro activo" in res_venta.message.lower()

        # 7. Bloqueo de traslado interno ordinario y autorización de aislamiento de emergencia
        res_traslado = SanitaryMovementGate.check_movement_eligibility(
            animal=cow,
            fecha_movimiento=treatment_date + timedelta(days=2),
            tipo_movimiento=MovementType.Traslado_Interno,
            traslado_sanitario_emergencia=False,
        )
        assert res_traslado.allowed is False
        assert res_traslado.conflict_type == "WITHDRAWAL_ACTIVE"

        res_aislamiento = SanitaryMovementGate.check_movement_eligibility(
            animal=cow,
            fecha_movimiento=treatment_date + timedelta(days=2),
            tipo_movimiento=MovementType.Traslado_Interno,
            traslado_sanitario_emergencia=True,
            justificacion_sanitaria="Aislamiento preventivo en corral hospitalario",
        )
        assert res_aislamiento.allowed is True

        # 8. Desbloqueo tras expirar el retiro (expected_withdrawal_end + 1, hace 4 días)
        post_withdrawal_date = expected_withdrawal_end + timedelta(days=1)
        milk_ok = MilkProduction.create(
            animal_id=cow.id,
            finca_id=finca.id,
            date=post_withdrawal_date,
            liters=16.0,
            milking_session="AM",
        )
        assert milk_ok.id is not None
        assert milk_ok.liters == 16.0

        res_post = SanitaryMovementGate.check_movement_eligibility(
            animal=cow,
            fecha_movimiento=post_withdrawal_date,
            tipo_movimiento=MovementType.Venta_Traslado_Externo,
        )
        assert res_post.allowed is True
        assert res_post.conflict_type is None

        # 9. Cierre clínico del caso
        episode.update(status="Recuperado", recovery_date=post_withdrawal_date)
        assert episode.status == "Recuperado"
        assert episode.recovery_date == post_withdrawal_date
