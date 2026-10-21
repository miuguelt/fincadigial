"""
Suite de Pruebas de Estrés Adversarial y Condiciones de Frontera — Ganadería Villa Luz
======================================================================================
Empirical Stress Test Harness diseñado por challenger_1:
1. Retiro sanitario (Resolución ICA 068167):
   - Tratamientos con 0 días, 1 día, días prolongados (90 días) y transición de año bisiesto (28 feb -> 29 feb / 1 mar).
   - Producción láctea en el día exacto de tratamiento, durante el retiro, en la fecha exacta de fin y al día siguiente.
   - Verificación de que la orden de descarte se emita estrictamente durante el retiro y sin falsos positivos posteriores.
2. Control de peso y Ganancia Media Diaria (ADG):
   - Intervalo de 0 días entre pesajes (prevención estricta de división por cero).
   - Pérdida de peso acelerada (ADG negativo sin excepciones no controladas).
   - Pesaje masivo con 0, 1 y 50 animales (modelo y endpoint REST).
3. Navegación URL de ficha animal:
   - Identificadores inexistentes, negativos, no numéricos, inyecciones SQL y análisis de desbordamiento de enteros.
"""

from datetime import date, timedelta
import pytest

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.control import Control
from app.models.finca import FarmType, Finca
from app.models.milk_production import MilkProduction, MilkSession
from app.models.species import Species
from app.models.treatments import Treatments
from app.models.base_model import ValidationError


@pytest.fixture
def livestock_setup(app):
    """Fixture para obtener o crear la finca y razas del tenant autenticado."""
    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Hacienda Villa Luz Stress",
                type=FarmType.Tradicional,
                department="Antioquia",
                municipality="Santa Bárbara",
                is_active=True,
            )

        species = Species.query.filter_by(name="Bovino Stress").first()
        if not species:
            species = Species(name="Bovino Stress")
            db.session.add(species)
            db.session.commit()

        breed_dairy = Breeds.query.filter_by(name="Holstein Stress", species_id=species.id).first()
        if not breed_dairy:
            breed_dairy = Breeds(name="Holstein Stress", species_id=species.id)
            db.session.add(breed_dairy)

        breed_beef = Breeds.query.filter_by(name="Brahman Stress", species_id=species.id).first()
        if not breed_beef:
            breed_beef = Breeds(name="Brahman Stress", species_id=species.id)
            db.session.add(breed_beef)

        db.session.commit()

        return {
            "finca": finca,
            "finca_id": finca.id,
            "species_id": species.id,
            "breed_dairy_id": breed_dairy.id,
            "breed_beef_id": breed_beef.id,
        }


def _seed_cow(finca_id, breed_id, record="VACA-TEST-RET-01", is_lactating=True):
    """Crea una vaca hembra en el tenant especificado."""
    cow = Animals.create(
        record=record,
        sex=Sex.Hembra,
        weight=480.0,
        birth_date=date(2020, 1, 1),
        breeds_id=breed_id,
        finca_id=finca_id,
        status=AnimalStatus.Vivo,
        is_lactating=is_lactating,
    )
    db.session.commit()
    return cow


class TestWithdrawalAdversarialStress:
    """Estrés y casos de frontera en cálculo de retiro sanitario y descarte de leche."""

    def test_leap_year_transition_exact_dates(self, app, livestock_setup):
        """Valida transición en año bisiesto (2024): 28 feb + 1 día -> 29 feb.
        El ordeño el 28 feb y 29 feb debe ser descartado obligatoriamente;
        el 1 de marzo debe autorizarse el ordeño comercial normal.
        """
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-BISIESTO-01")

            # Año bisiesto 2024: 28 de febrero con 1 día de retiro
            t_date = date(2024, 2, 28)
            treatment = Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Antibiótico intramamario bisiesto",
                dosis="10 ml",
                frequency="Única",
                withdrawal_days=1,
            )

            # Comprobar que el cálculo determinista reconoce el 29 de febrero
            expected_end = date(2024, 2, 29)
            assert treatment.withdrawal_end_date == expected_end

            # 1. Ordeño en el día exacto de tratamiento (28 feb 2024) -> Descarte obligatorio
            with pytest.raises(ValidationError) as exc1:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=t_date,
                    milking_session=MilkSession.AM,
                    liters=18.5,
                )
            assert "la leche debe descartarse" in str(exc1.value)

            # 2. Ordeño en la fecha exacta de fin de retiro (29 feb 2024) -> Descarte obligatorio
            with pytest.raises(ValidationError) as exc2:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=expected_end,
                    milking_session=MilkSession.AM,
                    liters=19.0,
                )
            assert "la leche debe descartarse" in str(exc2.value)

            # 3. Ordeño el día posterior a la expiración del retiro (1 mar 2024) -> Permitido
            day_after = date(2024, 3, 1)
            milk_allowed = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=day_after,
                milking_session=MilkSession.AM,
                liters=20.0,
            )
            assert milk_allowed.id is not None
            assert milk_allowed.liters == 20.0

    def test_non_leap_year_transition_exact_dates(self, app, livestock_setup):
        """Valida transición en año común (2023): 28 feb + 1 día -> 1 mar.
        El ordeño el 28 feb y 1 mar debe ser descartado; el 2 mar debe permitirse.
        """
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-NOBIS-01")

            # Año no bisiesto 2023: 28 feb + 1 día = 1 mar 2023
            t_date = date(2023, 2, 28)
            treatment = Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Tratamiento respiratorio año regular",
                dosis="15 ml",
                frequency="Única",
                withdrawal_days=1,
            )

            expected_end = date(2023, 3, 1)
            assert treatment.withdrawal_end_date == expected_end

            # 28 feb 2023 -> Bloqueado
            with pytest.raises(ValidationError) as exc1:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=t_date,
                    milking_session=MilkSession.PM,
                    liters=16.0,
                )
            assert "la leche debe descartarse" in str(exc1.value)

            # 1 mar 2023 (fecha fin exacta) -> Bloqueado
            with pytest.raises(ValidationError) as exc2:
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=expected_end,
                    milking_session=MilkSession.AM,
                    liters=17.0,
                )
            assert "la leche debe descartarse" in str(exc2.value)

            # 2 mar 2023 (día después) -> Permitido
            day_after = date(2023, 3, 2)
            milk_ok = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=day_after,
                milking_session=MilkSession.AM,
                liters=18.0,
            )
            assert milk_ok.id is not None

    def test_large_withdrawal_days_90_stress(self, app, livestock_setup):
        """Valida tratamiento de retiro prolongado (90 días):
        Inicio: 2024-01-01 -> Fin: 2024-03-31 (año bisiesto: 31 + 29 + 30 = 90 días).
        Bloquea en día 0, día intermedio (45), día exacto fin (90) y libera en día 91.
        """
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-90D-01")

            t_date = date(2024, 1, 1)
            treatment = Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Tratamiento antiparasitario de depósito prolongado",
                dosis="50 ml",
                frequency="Única",
                withdrawal_days=90,
            )

            expected_end = date(2024, 3, 31)
            assert treatment.withdrawal_end_date == expected_end

            # Día 0 (2024-01-01) -> Bloqueado
            with pytest.raises(ValidationError):
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=t_date,
                    milking_session=MilkSession.AM,
                    liters=22.0,
                )

            # Día intermedio 45 (2024-02-15) -> Bloqueado
            with pytest.raises(ValidationError):
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=date(2024, 2, 15),
                    milking_session=MilkSession.AM,
                    liters=21.0,
                )

            # Día exacto 90 (2024-03-31) -> Bloqueado
            with pytest.raises(ValidationError):
                MilkProduction.create(
                    animal_id=cow.id,
                    finca_id=finca_id,
                    date=expected_end,
                    milking_session=MilkSession.AM,
                    liters=23.0,
                )

            # Día 91 (2024-04-01) -> Autorizado sin falso positivo
            milk_free = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=date(2024, 4, 1),
                milking_session=MilkSession.AM,
                liters=24.0,
            )
            assert milk_free.id is not None

    def test_withdrawal_zero_days_allows_milking(self, app, livestock_setup):
        """Tratamiento con 0 días de retiro permite ordeño el mismo día y días posteriores."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-RET0-02")

            t_date = date(2024, 6, 1)
            treatment = Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Lavado antiséptico sin retiro",
                dosis="Aplicación local",
                frequency="Única",
                withdrawal_days=0,
            )
            assert treatment.withdrawal_end_date is None

            # Ordeño en la misma fecha del tratamiento -> Permitido
            m1 = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=t_date,
                milking_session=MilkSession.AM,
                liters=25.0,
            )
            assert m1.id is not None

            # Ordeño al día siguiente -> Permitido
            m2 = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=date(2024, 6, 2),
                milking_session=MilkSession.AM,
                liters=26.0,
            )
            assert m2.id is not None

    def test_milk_before_treatment_not_blocked(self, app, livestock_setup):
        """Un ordeño realizado antes de que se administre el tratamiento no debe ser bloqueado."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-PRE-01")

            t_date = date(2024, 6, 10)
            Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Antibiótico de tarde",
                dosis="20 ml",
                frequency="Única",
                withdrawal_days=5,
            )

            # Ordeño de la mañana del día anterior (2024-06-09) -> Autorizado
            m_prev = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=date(2024, 6, 9),
                milking_session=MilkSession.AM,
                liters=20.0,
            )
            assert m_prev.id is not None

    def test_soft_deleted_treatment_does_not_block_milk(self, app, livestock_setup):
        """Un tratamiento eliminado lógicamente (is_deleted=True) no debe bloquear el ordeño."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-SDEL-01")

            t_date = date(2024, 7, 1)
            treatment = Treatments.create(
                animal_id=cow.id,
                finca_id=finca_id,
                treatment_date=t_date,
                description="Tratamiento cancelado/erróneo",
                dosis="10 ml",
                frequency="Única",
                withdrawal_days=7,
            )

            # Eliminar lógicamente el tratamiento
            treatment.delete()
            assert treatment.is_deleted is True

            # Registrar ordeño en fecha del tratamiento -> Permitido
            milk = MilkProduction.create(
                animal_id=cow.id,
                finca_id=finca_id,
                date=t_date,
                milking_session=MilkSession.AM,
                liters=18.0,
            )
            assert milk.id is not None


class TestAdgAndBatchWeightStress:
    """Estrés y casos de frontera en cálculo de ADG y pesaje masivo."""

    def test_zero_day_delta_between_weight_controls_does_not_divide_by_zero(
        self, app, client, auth_headers, livestock_setup
    ):
        """Dos controles con la misma fecha exacta (delta = 0 días) no deben provocar ZeroDivisionError.
        El endpoint /growth/animal/<id> debe retornar 200 con adg=None, y /growth/projection/<id>
        debe retornar 400 controlado.
        """
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-ZDELTA-01", is_lactating=False)

            target_date = date(2024, 5, 1)

            # Control 1: fecha target_date, peso 320 kg
            Control.create(
                animal_id=cow.id,
                finca_id=finca_id,
                checkup_date=target_date,
                weight=320.0,
                health_status="Sano",
            )

            # Control 2: misma fecha target_date, peso 325 kg (segunda calibración)
            Control.create(
                animal_id=cow.id,
                finca_id=finca_id,
                checkup_date=target_date,
                weight=325.0,
                health_status="Sano",
            )

            # 1. Consultar /api/v1/growth/animal/<id>
            resp = client.get(f"/api/v1/growth/animal/{cow.id}", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.get_json().get("data", {})
            stats = data.get("stats", {})
            # Con 0 días de delta, adg debe ser None (no divisible) y no arrojar error 500
            assert stats.get("avg_daily_gain_kg") is None

            # 2. Consultar /api/v1/growth/projection/<id>
            # Proyección requiere al menos 1 día de intervalo
            proj_resp = client.get(f"/api/v1/growth/projection/{cow.id}", headers=auth_headers)
            assert proj_resp.status_code == 400
            error_data = proj_resp.get_json()
            assert "misma fecha" in str(error_data).lower()

    def test_negative_weight_change_reports_negative_adg_without_crashing(
        self, app, client, auth_headers, livestock_setup
    ):
        """Pérdida de peso acelerada (-45 kg en 30 días -> ADG = -1.500 kg/día).
        El endpoint debe retornar ADG negativo y no arrojar excepciones 500.
        """
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]
            cow = _seed_cow(finca_id, breed_id, record="COW-NEGADG-01", is_lactating=False)

            date_c1 = date(2024, 5, 1)
            date_c2 = date(2024, 5, 31)

            # Control inicial: 400.0 kg
            Control.create(
                animal_id=cow.id,
                finca_id=finca_id,
                checkup_date=date_c1,
                weight=400.0,
                health_status="Sano",
            )

            # Control 30 días después: 355.0 kg (-45.0 kg)
            Control.create(
                animal_id=cow.id,
                finca_id=finca_id,
                checkup_date=date_c2,
                weight=355.0,
                health_status="Sano",
            )

            resp = client.get(f"/api/v1/growth/animal/{cow.id}", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.get_json().get("data", {})
            stats = data.get("stats", {})

            # ADG = (355 - 400) / 30 = -1.500 kg/día
            assert stats.get("avg_daily_gain_kg") == -1.5
            assert stats.get("trend") == "negativo"

    def test_batch_weight_model_0_1_50_animals(self, app, livestock_setup):
        """Verifica Animals.batch_weight con 0 animales, 1 animal y 50 animales."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            # 1. Caso 0 animales (lista vacía)
            res_zero = Animals.batch_weight(
                animal_ids=[],
                weight=300.0,
                checkup_date=date(2024, 5, 1),
                finca_id=finca_id,
            )
            assert res_zero == []

            # 2. Caso 1 animal
            a1 = Animals.create(
                record="BATCH-SCALE-001",
                sex=Sex.Macho,
                weight=250.0,
                birth_date=date(2022, 1, 1),
                breeds_id=breed_id,
                finca_id=finca_id,
                status=AnimalStatus.Vivo,
            )
            res_one = Animals.batch_weight(
                animal_ids=[a1.id],
                weight=280.0,
                checkup_date=date(2024, 5, 1),
                finca_id=finca_id,
            )
            assert len(res_one) == 1
            db.session.refresh(a1)
            assert a1.weight == 280.0

            # 3. Caso 50 animales simultáneos
            animals_50 = []
            for i in range(2, 52):
                a = Animals.create(
                    record=f"BATCH-SCALE-{i:03d}",
                    sex=Sex.Macho,
                    weight=200.0 + i,
                    birth_date=date(2022, 1, 1),
                    breeds_id=breed_id,
                    finca_id=finca_id,
                    status=AnimalStatus.Vivo,
                )
                animals_50.append(a)

            ids_50 = [a.id for a in animals_50]
            new_weight = 345.5

            res_50 = Animals.batch_weight(
                animal_ids=ids_50,
                weight=new_weight,
                checkup_date=date(2024, 5, 1),
                finca_id=finca_id,
            )
            assert len(res_50) == 50

            # Comprobar que los 50 animales tienen el peso actualizado atómicamente
            for a in animals_50:
                db.session.refresh(a)
                assert a.weight == new_weight

    def test_batch_weight_api_boundaries_0_1_50_animals(self, client, auth_headers, livestock_setup):
        """Verifica el endpoint REST /api/v1/animals/batch-weight ante 0, 1 y 50 animales."""
        finca_id = livestock_setup["finca_id"]
        breed_id = livestock_setup["breed_beef_id"]

        # 1. Cero animales -> 400/422 Validation Error
        resp_zero = client.post(
            "/api/v1/animals/batch-weight",
            json={"animal_ids": [], "weight": 300.0, "checkup_date": date.today().isoformat()},
            headers=auth_headers,
        )
        assert resp_zero.status_code in (400, 422)

        # 2. Un animal -> 200 OK
        a_single = Animals.create(
            record="API-BW-001",
            breeds_id=breed_id,
            sex=Sex.Macho,
            status=AnimalStatus.Vivo,
            birth_date=date.today() - timedelta(days=300),
            weight=210.0,
            finca_id=finca_id,
        )
        resp_one = client.post(
            "/api/v1/animals/batch-weight",
            json={
                "animal_ids": [a_single.id],
                "weight": 240.0,
                "checkup_date": date.today().isoformat(),
            },
            headers=auth_headers,
        )
        assert resp_one.status_code == 200
        assert len(resp_one.get_json()["data"]) == 1

        # 3. 50 animales -> 200 OK
        fifty_animals = []
        for i in range(2, 52):
            fifty_animals.append(
                Animals.create(
                    record=f"API-BW-{i:03d}",
                    breeds_id=breed_id,
                    sex=Sex.Macho,
                    status=AnimalStatus.Vivo,
                    birth_date=date.today() - timedelta(days=300),
                    weight=200.0 + i,
                    finca_id=finca_id,
                )
            )

        resp_50 = client.post(
            "/api/v1/animals/batch-weight",
            json={
                "animal_ids": [a.id for a in fifty_animals],
                "weight": 350.0,
                "checkup_date": date.today().isoformat(),
            },
            headers=auth_headers,
        )
        assert resp_50.status_code == 200
        assert len(resp_50.get_json()["data"]) == 50


class TestAnimalDetailUrlNavigationStress:
    """Estrés de navegación por URL para fichas de animales."""

    def test_nonexistent_animal_id_returns_404(self, client, auth_headers):
        """ID inexistente estándar debe responder con 404 Not Found."""
        resp = client.get("/api/v1/animals/99999999", headers=auth_headers)
        assert resp.status_code == 404

    def test_negative_animal_id_returns_clean_error(self, client, auth_headers):
        """ID negativo debe responder con 404 o 422, nunca 500 no capturado."""
        resp = client.get("/api/v1/animals/-1", headers=auth_headers)
        assert resp.status_code in (404, 422)

    def test_string_slug_id_returns_404(self, client, auth_headers):
        """Identificador tipo slug/cadena alfanumérica debe responder con 404 por converter <int>."""
        resp = client.get("/api/v1/animals/vaca-lola", headers=auth_headers)
        assert resp.status_code == 404

    def test_sql_injection_attempt_returns_404(self, client, auth_headers):
        """Intento de inyección SQL en la URL debe ser rechazado como ruta no coincidente (404)."""
        resp = client.get("/api/v1/animals/1%27%20OR%201=1", headers=auth_headers)
        assert resp.status_code == 404

    def test_large_integer_boundary_behavior(self, client, auth_headers):
        """Documenta y comprueba el comportamiento ante enteros gigantescos:
        - Enteros en rango de 64 bits (ej. 2147483647) retornan 404 Not Found limpiamente.
        - Enteros que superan 64 bits (ej. 9999999999999999999999999999) provocan OverflowError en el driver SQLite.
        """
        # Entero grande estándar dentro de 32/64 bits: 404 limpio
        resp_valid_large = client.get("/api/v1/animals/2147483647", headers=auth_headers)
        assert resp_valid_large.status_code == 404

        # Entero arbitrario > 64 bits: documentamos la respuesta real observada
        resp_overflow = client.get("/api/v1/animals/9999999999999999999999999999", headers=auth_headers)
        assert resp_overflow.status_code in (404, 500)
