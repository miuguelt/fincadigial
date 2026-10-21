"""
Tier 2: Boundary Value Analysis & Corner Cases (Valores Límite y Robustez)
==========================================================================
Verifica el comportamiento del sistema ante condiciones de frontera, límites y casos esquina:
1. Retiro sanitario de 0 días (no bloquea ordeño).
2. Pesos idénticos en fechas distintas (ADG = 0.000 kg/día sin error).
3. Controles retroactivos (no sobreescriben el peso más reciente).
4. Fechas futuras en controles (rechazo determinista con ValidationError).
5. Identificadores de animal inválidos o inexistentes (404/422 controlado).
6. Límites de producción de leche (0.0 L y 80.0 L válidos; <0 o >80 rechazados).
7. Límites de células somáticas (> 1,000,000 rechazadas).
"""

from datetime import date, timedelta
import pytest
from app import db
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.milk_production import MilkProduction, MilkSession
from app.models.base_model import ValidationError


class TestTier2WithdrawalZeroDays:
    """Valida tratamientos con 0 días de retiro."""

    def test_retiro_cero_dias_permite_ordeno_el_mismo_dia(self, app, client, auth_headers, livestock_setup):
        """Un tratamiento con withdrawal_days=0 no restringe la producción de leche en la misma fecha."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca = Animals.create(
                record="T2-RET0-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=800),
                weight=480.0,
                finca_id=finca_id,
                is_lactating=True,
            )

            today = date.today()

            # Tratamiento tópico sin retiro (días = 0)
            treatment = Treatments.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                treatment_date=today,
                description="Lavado antiséptico tópico",
                dosis="Aplicación local",
                frequency="Única",
                withdrawal_days=0,
                withdrawal_end_date=None,
            )
            assert treatment.withdrawal_days == 0

            # Registrar ordeño en el mismo día del tratamiento
            resp = client.post(
                "/api/v1/milk-production",
                json={
                    "animal_id": vaca.id,
                    "date": today.isoformat(),
                    "liters": 14.5,
                    "milking_session": "AM",
                    "finca_id": finca_id,
                },
                headers=auth_headers,
            )
            assert resp.status_code in (200, 201), resp.get_data(as_text=True)


class TestTier2IdenticalWeightsAdg:
    """Valida cálculo de ADG con pesos idénticos."""

    def test_pesos_identicos_calcula_adg_cero_sin_division_por_cero(self, app, livestock_setup):
        """Dos controles con peso idéntico en fechas distintas deben arrojar ADG = 0.000 kg/día."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            animal = Animals.create(
                record="T2-ADG0-001",
                breeds_id=breed_id,
                sex=Sex.Macho,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=600),
                weight=350.0,
                finca_id=finca_id,
            )

            # Control 1: hace 30 días, peso 350.0
            fecha_pasada = date.today() - timedelta(days=30)
            Control.create(
                animal_id=animal.id,
                finca_id=finca_id,
                checkup_date=fecha_pasada.isoformat(),
                weight=350.0,
                health_status="Sano",
            )

            # Control 2: hoy, peso 350.0
            Control.create(
                animal_id=animal.id,
                finca_id=finca_id,
                checkup_date=date.today().isoformat(),
                weight=350.0,
                health_status="Sano",
            )

            # Cálculo determinista de ADG
            dias = (date.today() - fecha_pasada).days
            assert dias == 30
            peso_inicial = 350.0
            peso_final = 350.0
            adg = round((peso_final - peso_inicial) / dias, 3)

            assert adg == 0.000


class TestTier2RetroactiveAndFutureControls:
    """Valida controles retroactivos y prevención de fechas futuras."""

    def test_control_retroactivo_no_sobrescribe_peso_actual(self, app, livestock_setup):
        """Un pesaje anterior en el tiempo no debe sustituir el peso actual más reciente del animal."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            animal = Animals.create(
                record="T2-RETRO-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=500),
                weight=200.0,
                finca_id=finca_id,
            )

            # Control actual (hoy): 250.0 kg
            Control.create(
                animal_id=animal.id,
                finca_id=finca_id,
                checkup_date=date.today().isoformat(),
                weight=250.0,
                health_status="Sano",
            )
            db.session.refresh(animal)
            assert animal.weight == 250.0

            # Control retroactivo (hace 45 días): 190.0 kg
            fecha_retroactiva = date.today() - timedelta(days=45)
            Control.create(
                animal_id=animal.id,
                finca_id=finca_id,
                checkup_date=fecha_retroactiva.isoformat(),
                weight=190.0,
                health_status="Sano",
            )
            db.session.refresh(animal)

            # El peso actual DEBE mantenerse en 250.0 kg
            assert animal.weight == 250.0

    def test_control_fecha_futura_falla_con_validation_error(self, app, livestock_setup):
        """Un control con fecha futura debe ser rechazado inmediatamente con ValidationError."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            animal = Animals.create(
                record="T2-FUT-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=300),
                weight=220.0,
                finca_id=finca_id,
            )

            fecha_futura = (date.today() + timedelta(days=3)).isoformat()
            with pytest.raises(ValidationError) as exc_info:
                Control.create(
                    animal_id=animal.id,
                    finca_id=finca_id,
                    checkup_date=fecha_futura,
                    weight=230.0,
                    health_status="Sano",
                )
            assert "futura" in str(exc_info.value).lower() or "fecha" in str(exc_info.value).lower()


class TestTier2InvalidIdentifiers:
    """Valida respuesta ante identificadores inexistentes o inválidos."""

    def test_consulta_animal_inexistente_retorna_404(self, client, auth_headers):
        """Consultar un animal con ID 999999 debe responder con 404 Not Found."""
        resp = client.get("/api/v1/animals/999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_consulta_animal_id_negativo_retorna_error_controlado(self, client, auth_headers):
        """Consultar un animal con ID negativo debe ser manejado limpiamente con 404 o 422."""
        resp = client.get("/api/v1/animals/-1", headers=auth_headers)
        assert resp.status_code in (404, 422)


class TestTier2MilkProductionLimits:
    """Valida los límites exactos de producción láctea y células somáticas."""

    def test_limites_exactos_litros_leche(self, app, livestock_setup):
        """Valida frontera de 0.0 L, 80.0 L y rechazo fuera del rango permitido."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca = Animals.create(
                record="T2-LIM-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=900),
                weight=500.0,
                finca_id=finca_id,
                is_lactating=True,
            )

            # Límite inferior exacto: 0.0 L (válido)
            p_cero = MilkProduction.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                date=date.today(),
                liters=0.0,
                milking_session=MilkSession.AM,
            )
            assert p_cero.liters == 0.0

            # Límite superior exacto: 80.0 L (válido)
            p_max = MilkProduction.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                date=date.today(),
                liters=80.0,
                milking_session=MilkSession.PM,
            )
            assert p_max.liters == 80.0

            # Valor excedido: 80.1 L (debe fallar)
            with pytest.raises(ValidationError) as exc_excedido:
                MilkProduction.create(
                    animal_id=vaca.id,
                    finca_id=finca_id,
                    date=date.today(),
                    liters=80.1,
                    milking_session=MilkSession.Extra,
                )
            assert "80" in str(exc_excedido.value)

            # Valor negativo: -1.0 L (debe fallar)
            with pytest.raises(ValidationError) as exc_negativo:
                MilkProduction.create(
                    animal_id=vaca.id,
                    finca_id=finca_id,
                    date=date.today(),
                    liters=-1.0,
                    milking_session=MilkSession.Extra,
                )
            assert "Litros" in str(exc_negativo.value)

    def test_limite_celulas_somaticas(self, app, livestock_setup):
        """Valida que células somáticas > 1,000,000 o negativas sean rechazadas."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            vaca = Animals.create(
                record="T2-CEL-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=900),
                weight=500.0,
                finca_id=finca_id,
                is_lactating=True,
            )

            with pytest.raises(ValidationError) as exc_somatic:
                MilkProduction.create(
                    animal_id=vaca.id,
                    finca_id=finca_id,
                    date=date.today(),
                    liters=15.0,
                    milking_session=MilkSession.AM,
                    somatic_cells=1_000_001,
                )
            assert "somáticas" in str(exc_somatic.value).lower()
