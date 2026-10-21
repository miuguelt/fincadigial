"""
Pruebas para el cálculo determinista de tiempos de retiro en tratamientos
y la protección de descarte de leche (Resolución ICA 068167).
"""

from datetime import date, datetime, timedelta
import pytest

from app import db
from app.models.base_model import ValidationError
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.milk_production import MilkProduction
from app.models.species import Species
from app.models.treatments import Treatments


def _seed_cow(finca_id, record="VACA-TEST-RET-01", is_lactating=True):
    """Crea una res hembra en la base de datos."""
    species = Species.query.first() or Species.create(name="Bovino Retiro Test")
    breed = Breeds.query.first() or Breeds.create(
        name="Holstein Retiro Test", species_id=species.id
    )
    cow = Animals.create(
        record=record,
        sex=Sex.Hembra,
        weight=480.0,
        birth_date=date(2021, 1, 1),
        breeds_id=breed.id,
        finca_id=finca_id,
        status=AnimalStatus.Vivo,
        is_lactating=is_lactating,
    )
    db.session.commit()
    return cow


class TestTreatmentsWithdrawalDate:
    """Pruebas del cálculo determinista de withdrawal_end_date en Treatments."""

    def test_withdrawal_date_calculated_on_create_with_date_object(self, app):
        """Al crear con treatment_date=2026-10-18 y withdrawal_days=5, withdrawal_end_date es 2026-10-23."""
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Retiro Test", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="COW-RET-01")

            treatment = Treatments.create(
                treatment_date=date(2026, 10, 18),
                description="Antibiótico para mastitis",
                frequency="Cada 24h",
                dosis="20 ml",
                withdrawal_days=5,
                animal_id=cow.id,
                finca_id=finca.id,
            )

            assert treatment.withdrawal_end_date == date(2026, 10, 23)
            assert treatment.withdrawal_days == 5

            # Verificar persistencia en base de datos
            persisted = Treatments.get_by_id(treatment.id)
            assert persisted.withdrawal_end_date == date(2026, 10, 23)

    def test_withdrawal_date_calculated_from_iso_string_and_datetime(self, app):
        """Verifica que acepte cadenas ISO YYYY-MM-DD y objetos datetime."""
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Retiro Test 2", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="COW-RET-02")

            # Caso string ISO YYYY-MM-DD
            t1 = Treatments.create(
                treatment_date="2026-10-18",
                description="Tratamiento cadena ISO",
                frequency="Día de por medio",
                dosis="15 ml",
                withdrawal_days=5,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert t1.withdrawal_end_date == date(2026, 10, 23)

            # Caso datetime con hora
            dt_input = datetime(2026, 10, 18, 14, 30, 0)
            t2 = Treatments.create(
                treatment_date=dt_input,
                description="Tratamiento objeto datetime",
                frequency="Cada 12h",
                dosis="10 ml",
                withdrawal_days=7,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert t2.withdrawal_end_date == date(2026, 10, 25)

    def test_withdrawal_date_zero_or_explicit(self, app):
        """Verifica que withdrawal_days=0 deje withdrawal_end_date en None y respete fechas explícitas."""
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Retiro Test 3", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="COW-RET-03")

            # Sin retiro (días = 0)
            t_no_with = Treatments.create(
                treatment_date=date(2026, 10, 18),
                description="Vitamina sin retiro",
                frequency="Única dosis",
                dosis="10 ml",
                withdrawal_days=0,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert t_no_with.withdrawal_end_date is None

            # Con fecha explícita provista por el llamador
            explicit_date = date(2026, 10, 28)
            t_explicit = Treatments.create(
                treatment_date=date(2026, 10, 18),
                description="Tratamiento con fecha explícita",
                frequency="Diario",
                dosis="5 ml",
                withdrawal_days=5,
                withdrawal_end_date=explicit_date,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert t_explicit.withdrawal_end_date == explicit_date

    def test_withdrawal_date_synchronized_on_update(self, app):
        """Verifica que al actualizar treatment_date o withdrawal_days se sincronice withdrawal_end_date."""
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Retiro Test 4", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="COW-RET-04")

            treatment = Treatments.create(
                treatment_date=date(2026, 10, 18),
                description="Tratamiento a actualizar",
                frequency="Cada 24h",
                dosis="10 ml",
                withdrawal_days=5,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert treatment.withdrawal_end_date == date(2026, 10, 23)

            # 1. Modificar withdrawal_days a 10 días
            treatment.update(withdrawal_days=10)
            assert treatment.withdrawal_end_date == date(2026, 10, 28)

            # 2. Modificar treatment_date a 2026-10-20
            treatment.update(treatment_date=date(2026, 10, 20))
            assert treatment.withdrawal_end_date == date(2026, 10, 30)

            # 3. Modificar withdrawal_days a 0 (elimina retiro)
            treatment.update(withdrawal_days=0)
            assert treatment.withdrawal_end_date is None


class TestMilkProductionWithdrawalProtection:
    """Pruebas de la protección y descarte de leche en período de retiro activo."""

    def test_milk_production_validate_blocks_during_withdrawal(self, app):
        """Verifica que MilkProduction rechace registros dentro de la ventana de retiro calculada."""
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Leche Retiro", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="VACA-LECHE-RET-01", is_lactating=True)

            # Usar fechas en el pasado respecto a date.today() para permitir el guardado
            # en la bitácora de salud (AnimalHealthHistory rechaza fechas futuras).
            treatment_date = date.today() - timedelta(days=10)
            withdrawal_days = 5
            expected_end_date = treatment_date + timedelta(days=withdrawal_days)

            # Crear tratamiento con retiro (ej: hace 10 días, 5 días de retiro -> finaliza hace 5 días)
            t = Treatments.create(
                treatment_date=treatment_date,
                description="Ceftiofur intramamario",
                frequency="Cada 24h",
                dosis="10 ml",
                withdrawal_days=withdrawal_days,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            assert t.withdrawal_end_date == expected_end_date

            # 1. Intento de ordeño el mismo día del tratamiento: debe fallar
            with pytest.raises(ValidationError) as exc1:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca.id,
                    date=treatment_date,
                    liters=15.0,
                    milking_session="AM",
                )
            assert "período de retiro" in str(exc1.value).lower()
            assert "descartarse" in str(exc1.value).lower()

            # 2. Intento de ordeño en fecha intermedia: debe fallar
            with pytest.raises(ValidationError) as exc2:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca.id,
                    date=treatment_date + timedelta(days=2),
                    liters=14.0,
                    milking_session="PM",
                )
            assert "período de retiro" in str(exc2.value).lower()

            # 3. Intento de ordeño en fecha de fin de retiro: debe fallar (inclusive)
            with pytest.raises(ValidationError) as exc3:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca.id,
                    date=expected_end_date,
                    liters=16.0,
                    milking_session="AM",
                )
            assert "período de retiro" in str(exc3.value).lower()

            # 4. Ordeño posterior al retiro (hace 4 días): debe permitirse normalmente
            mp_after = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca.id,
                date=expected_end_date + timedelta(days=1),
                liters=16.5,
                milking_session="AM",
            )
            assert mp_after.id is not None
            assert mp_after.liters == 16.5

            # 5. Ordeño anterior al tratamiento (hace 11 días): debe permitirse normalmente
            mp_before = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca.id,
                date=treatment_date - timedelta(days=1),
                liters=15.0,
                milking_session="AM",
            )
            assert mp_before.id is not None

    def test_milk_production_api_blocks_during_withdrawal(self, app, client, token_for):
        """Verifica que el endpoint REST /api/v1/milk-production devuelva 400/422 durante retiro."""
        ADMIN = "Administrador"
        with app.app_context():
            finca = Finca.query.first() or Finca.create(
                name="Finca Leche API Retiro", type=FarmType.Tradicional
            )
            cow = _seed_cow(finca.id, record="VACA-API-RET-01", is_lactating=True)

            treatment_date = date.today() - timedelta(days=10)
            withdrawal_days = 5
            expected_end_date = treatment_date + timedelta(days=withdrawal_days)

            Treatments.create(
                treatment_date=treatment_date,
                description="Antibiótico de amplio espectro",
                frequency="Cada 12h",
                dosis="20 ml",
                withdrawal_days=withdrawal_days,
                animal_id=cow.id,
                finca_id=finca.id,
            )
            cow_id = cow.id

        headers = token_for(ADMIN)

        # Intento de registrar ordeño dentro del período de retiro
        blocked_date = (treatment_date + timedelta(days=2)).isoformat()
        resp_blocked = client.post(
            "/api/v1/milk-production",
            json={
                "animal_id": cow_id,
                "date": blocked_date,
                "liters": 18.0,
                "milking_session": "AM",
            },
            headers=headers,
        )
        assert resp_blocked.status_code in (400, 422)
        resp_data = resp_blocked.get_data(as_text=True)
        assert "período de retiro" in resp_data.lower() or "descartarse" in resp_data.lower()

        # Registro exitoso después del período de retiro (hace 4 días)
        allowed_date = (expected_end_date + timedelta(days=1)).isoformat()
        resp_allowed = client.post(
            "/api/v1/milk-production",
            json={
                "animal_id": cow_id,
                "date": allowed_date,
                "liters": 17.5,
                "milking_session": "AM",
            },
            headers=headers,
        )
        assert resp_allowed.status_code == 201

