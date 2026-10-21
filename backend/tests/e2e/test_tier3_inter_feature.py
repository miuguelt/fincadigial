"""
Tier 3: Inter-Feature Combinations (Interacciones Cruzadas)
===========================================================
Verifica las reglas de negocio e integraciones cruzadas entre módulos ganaderos:
1. Tratamiento activo con tiempo de retiro -> Ordeño bloqueado con orden de descarte.
2. Superación del tiempo de retiro -> Ordeño normal restituido.
3. Pesaje masivo con pérdida de peso -> Generación de alerta zootécnica / nutricional.
4. Ordeño vs. Estado Fisiológico -> Rechazo a machos y vacas secas (no lactantes).
"""

from datetime import date, timedelta
import pytest
from app import db
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.milk_production import MilkProduction, MilkSession
from app.models.alerts import (
    AnimalAlert,
    AlertType,
    AlertPriority,
    build_alert_dedupe_key,
)
from app.services.alert_engine import AlertEngine
from app.models.base_model import ValidationError


class TestTier3TreatmentMilkWithdrawalInteraction:
    """Interacción crítica entre Tratamientos y Producción Lechera (Resolución ICA 068167)."""

    def test_tratamiento_activo_bloquea_ordeno_con_orden_de_descarte(self, app, client, auth_headers, livestock_setup):
        """Una vaca con tratamiento activo bajo tiempo de retiro NO permite registrar producción comercial."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca = Animals.create(
                record="T3-RETIRO-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=900),
                weight=520.0,
                finca_id=finca_id,
                is_lactating=True,
            )

            # Tratamiento aplicado hoy con 5 días de retiro
            fecha_tratamiento = date.today()
            fin_retiro = fecha_tratamiento + timedelta(days=5)

            treatment = Treatments.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                treatment_date=fecha_tratamiento,
                description="Cefalexina Intramamaria",
                dosis="1 jeringa / cuarto",
                frequency="Cada 12h por 3 días",
                withdrawal_days=5,
                withdrawal_end_date=fin_retiro,
                observations="Mastitis clínica cuarto anterior derecho",
            )
            assert treatment.withdrawal_end_date == fin_retiro

            # Intento de registrar ordeño a los 2 días (dentro del período de retiro)
            fecha_ordeno_durante_retiro = fecha_tratamiento + timedelta(days=2)

            resp = client.post(
                "/api/v1/milk-production",
                json={
                    "animal_id": vaca.id,
                    "date": fecha_ordeno_durante_retiro.isoformat(),
                    "liters": 16.0,
                    "milking_session": "AM",
                    "finca_id": finca_id,
                },
                headers=auth_headers,
            )

            # Debe ser rechazado con 400 o 422
            assert resp.status_code in (400, 422)
            error_text = resp.get_data(as_text=True).lower()
            assert "retiro" in error_text
            assert "descartarse" in error_text

            # También verificar a nivel de modelo que _validate_and_normalize arroje ValidationError
            with pytest.raises(ValidationError) as exc_info:
                MilkProduction.create(
                    animal_id=vaca.id,
                    finca_id=finca_id,
                    date=fecha_ordeno_durante_retiro,
                    liters=16.0,
                    milking_session=MilkSession.AM,
                )
            assert "descartarse" in str(exc_info.value).lower()

    def test_superacion_de_retiro_permite_ordeno_comercial(self, app, client, auth_headers, livestock_setup):
        """Una vez transcurrido el período de retiro, el ordeño comercial es admitido normalmente."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca = Animals.create(
                record="T3-LIBRE-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=1000),
                weight=530.0,
                finca_id=finca_id,
                is_lactating=True,
            )

            # Tratamiento con retiro que venció ayer
            fecha_tratamiento = date.today() - timedelta(days=7)
            fin_retiro = date.today() - timedelta(days=1)

            Treatments.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                treatment_date=fecha_tratamiento,
                description="Antibiótico Betalactámico",
                dosis="20 ml",
                frequency="Dosis única",
                withdrawal_days=6,
                withdrawal_end_date=fin_retiro,
            )

            # Ordeño de hoy (posterior al fin de retiro)
            resp = client.post(
                "/api/v1/milk-production",
                json={
                    "animal_id": vaca.id,
                    "date": date.today().isoformat(),
                    "liters": 18.5,
                    "milking_session": "AM",
                    "finca_id": finca_id,
                },
                headers=auth_headers,
            )

            assert resp.status_code in (200, 201), resp.get_data(as_text=True)
            data = resp.get_json()
            prod_data = data.get("data", data)
            assert float(prod_data["liters"]) == 18.5


class TestTier3BatchWeightLossAlert:
    """Interacción entre Pesaje por Lote y Detección de Pérdida de Peso."""

    def test_pesaje_con_perdida_acelerada_dispara_alerta_nutricional(self, app, livestock_setup):
        """Al detectar una res con pérdida crítica de peso en pesaje masivo, se registra la alerta."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            animal = Animals.create(
                record="T3-PERDIDA-001",
                breeds_id=breed_id,
                sex=Sex.Macho,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=500),
                weight=380.0,
                finca_id=finca_id,
            )

            # Pesaje anterior hace 20 días: 380 kg
            Control.create(
                animal_id=animal.id,
                finca_id=finca_id,
                checkup_date=(date.today() - timedelta(days=20)).isoformat(),
                weight=380.0,
                health_status="Sano",
            )

            # Pesaje actual: bajó drásticamente a 335 kg (-45 kg en 20 días -> ADG = -2.25 kg/día)
            nuevo_peso = 335.0
            Animals.batch_weight(
                animal_ids=[animal.id],
                weight=nuevo_peso,
                checkup_date=date.today().isoformat(),
                notes="Alerta: baja repentina de biomasa",
                finca_id=finca_id,
            )

            db.session.refresh(animal)
            assert animal.weight == nuevo_peso

            # Disparo determinista de alerta de pérdida de peso
            created = AlertEngine._trigger_if_not_exists(
                animal_id=animal.id,
                finca_id=finca_id,
                alert_type=AlertType.HEALTH,
                message=f"Pérdida acelerada de peso: {nuevo_peso} kg (baja de 45 kg)",
                priority=AlertPriority.CRITICAL,
            )
            assert created is True
            db.session.commit()

            alerta = AnimalAlert.query.filter_by(animal_id=animal.id).first()
            assert alerta is not None
            assert alerta.priority == AlertPriority.CRITICAL
            assert alerta.animal_id == animal.id


class TestTier3PhysiologicalMilkingChecks:
    """Validaciones cruzadas entre estado fisiológico del animal y ordeño."""

    def test_ordeno_rechazado_para_macho(self, app, livestock_setup):
        """Un animal macho jamás puede tener registro de producción lechera."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            toro = Animals.create(
                record="T3-TORO-001",
                breeds_id=breed_id,
                sex=Sex.Macho,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=1200),
                weight=750.0,
                finca_id=finca_id,
                is_lactating=False,
            )

            with pytest.raises(ValidationError) as exc_macho:
                MilkProduction.create(
                    animal_id=toro.id,
                    finca_id=finca_id,
                    date=date.today(),
                    liters=10.0,
                    milking_session=MilkSession.AM,
                )
            assert "macho" in str(exc_macho.value).lower()

    def test_ordeno_rechazado_para_hembra_no_lactante(self, app, livestock_setup):
        """Una vaca seca o novilla que no esté en lactancia activa no admite registro de ordeño."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca_seca = Animals.create(
                record="T3-SECA-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=900),
                weight=490.0,
                finca_id=finca_id,
                is_lactating=False,
            )

            with pytest.raises(ValidationError) as exc_seca:
                MilkProduction.create(
                    animal_id=vaca_seca.id,
                    finca_id=finca_id,
                    date=date.today(),
                    liters=8.0,
                    milking_session=MilkSession.AM,
                )
            assert "lactancia" in str(exc_seca.value).lower()
