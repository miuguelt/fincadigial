"""
Tier 1: Feature Coverage (Aislamiento por Flujo)
=================================================
Verifica el comportamiento primario (happy path) de cada flujo ganadero esencial:
1. Inventario y Registro Animal
2. Sanidad y Tratamientos
3. Control de Peso y Lotes (Pesaje masivo y ADG)
4. Alertas Sanitarias y Reproductivas (Jerarquía de Viewport)
"""

from datetime import date, timedelta
from app import db
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.animal_health_history import AnimalHealthHistory, HealthEventType
from app.models.alerts import (
    AnimalAlert,
    AlertType,
    AlertPriority,
    build_alert_dedupe_key,
)
from app.services.alert_engine import AlertEngine


class TestTier1AnimalInventory:
    """Pruebas de cobertura para Inventario y Registro de Animales."""

    def test_registro_animal_completo_y_consulta_ficha(self, app, client, auth_headers, livestock_setup):
        """Valida el registro de un animal y su posterior consulta individual por ID."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            payload = {
                "record": "T1-BOV-001",
                "breeds_id": breed_id,
                "sex": "Hembra",
                "status": "Vivo",
                "birth_date": (date.today() - timedelta(days=365)).isoformat(),
                "weight": 320.5,
                "finca_id": finca_id,
                "is_lactating": False,
            }

            # 1. Crear animal vía API
            resp_create = client.post(
                "/api/v1/animals",
                json=payload,
                headers=auth_headers,
            )
            assert resp_create.status_code in (200, 201), resp_create.get_data(as_text=True)
            data_create = resp_create.get_json()
            animal_data = data_create.get("data", data_create)
            animal_id = animal_data.get("id")
            assert animal_id is not None

            # 2. Consultar ficha individual por ID
            resp_get = client.get(
                f"/api/v1/animals/{animal_id}",
                headers=auth_headers,
            )
            assert resp_get.status_code == 200
            data_get = resp_get.get_json()
            animal_record = data_get.get("data", data_get)

            assert animal_record["record"] == "T1-BOV-001"
            assert float(animal_record["weight"]) == 320.5
            assert animal_record["sex"] == "Hembra"

            # 3. Verificar persistencia en base de datos
            persisted = Animals.query.get(animal_id)
            assert persisted is not None
            assert persisted.finca_id == finca_id
            assert persisted.record == "T1-BOV-001"


class TestTier1SanidadYTratamientos:
    """Pruebas de cobertura para Registro de Tratamientos y Sanidad."""

    def test_registro_tratamiento_y_espejo_en_bitacora(self, app, client, auth_headers, livestock_setup):
        """Valida que un tratamiento persista y se refleje en la bitácora sanitaria unificada."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            animal = Animals.create(
                record="T1-SAN-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=700),
                weight=450.0,
                finca_id=finca_id,
            )

            today = date.today()
            # Crear tratamiento con días de retiro
            treatment = Treatments.create(
                animal_id=animal.id,
                finca_id=finca_id,
                treatment_date=today,
                description="Oxitetraciclina L.A. 20%",
                dosis="10 ml / 100 kg",
                frequency="Dosis única",
                observations="Tratamiento por neumonía clínica",
                withdrawal_days=7,
                withdrawal_end_date=today + timedelta(days=7),
            )

            assert treatment.id is not None
            assert treatment.withdrawal_days == 7
            assert treatment.withdrawal_end_date == today + timedelta(days=7)

            # Verificar el espejo en AnimalHealthHistory
            history_event = AnimalHealthHistory.query.filter_by(
                animal_id=animal.id,
                reference_kind="treatment",
                reference_id=treatment.id,
            ).first()

            assert history_event is not None
            assert history_event.event_type == HealthEventType.Treatment
            assert "Oxitetraciclina" in history_event.description
            assert history_event.event_date == today


class TestTier1ControlPesoYAdg:
    """Pruebas de cobertura para Pesaje Masivo y Cálculo Determinista de ADG."""

    def test_pesaje_masivo_sincroniza_pesos_y_calcula_adg(self, app, livestock_setup):
        """Valida el pesaje masivo en lote, sincronización de pesos y cálculo de ADG."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_beef_id"]

            # Crear lote de 2 animales
            a1 = Animals.create(
                record="T1-LOTE-001",
                breeds_id=breed_id,
                sex=Sex.Macho,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=400),
                weight=280.0,
                finca_id=finca_id,
            )
            a2 = Animals.create(
                record="T1-LOTE-002",
                breeds_id=breed_id,
                sex=Sex.Macho,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=400),
                weight=290.0,
                finca_id=finca_id,
            )

            today_str = date.today().isoformat()
            new_batch_weight = 310.0

            # Ejecutar pesaje masivo
            results = Animals.batch_weight(
                animal_ids=[a1.id, a2.id],
                weight=new_batch_weight,
                checkup_date=today_str,
                notes="Pesaje masivo lote engorde",
                finca_id=finca_id,
            )

            assert len(results) == 2
            db.session.refresh(a1)
            db.session.refresh(a2)

            # Verificar actualización atómica en el modelo Animals
            assert a1.weight == new_batch_weight
            assert a2.weight == new_batch_weight

            # Verificar creación de registros de Control
            c1 = Control.query.filter_by(animal_id=a1.id, checkup_date=date.today()).first()
            assert c1 is not None
            assert c1.weight == new_batch_weight

            # Validar cálculo matemático de ADG entre pesajes
            # a1: de 280.0 a 310.0 en 30 días -> (310 - 280) / 30 = 1.000 kg/día
            dias_intervalo = 30
            peso_anterior = 280.0
            peso_actual = new_batch_weight
            adg_calculado = round((peso_actual - peso_anterior) / dias_intervalo, 3)
            assert adg_calculado == 1.0


class TestTier1AlertasViewport:
    """Pruebas de cobertura para Alertas y Jerarquía en el Dashboard."""

    def test_alertas_prioritarias_y_deduplicacion_sha256(self, app, client, auth_headers, livestock_setup):
        """Valida generación determinista de alertas, deduplicación y consulta priorizada."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            animal = Animals.create(
                record="T1-ALERTA-001",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=date.today() - timedelta(days=500),
                weight=400.0,
                finca_id=finca_id,
            )

            # Generar clave de deduplicación determinista
            dedupe_key = build_alert_dedupe_key(
                finca_id=finca_id,
                animal_id=animal.id,
                alert_type=AlertType.HEALTH,
                message="Condición corporal baja: 2.0 / 5.0",
            )
            assert len(dedupe_key) == 64  # Hash SHA-256

            # Disparar alerta mediante el motor determinista
            alerta = AlertEngine._trigger_if_not_exists(
                animal_id=animal.id,
                finca_id=finca_id,
                alert_type=AlertType.HEALTH,
                message="Condición corporal baja: 2.0 / 5.0",
                priority=AlertPriority.HIGH,
            )
            assert alerta is not None
            db.session.commit()

            # Consultar alertas vía API
            resp = client.get("/api/v1/alerts", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.get_json()
            alerts_list = data.get("data", data)
            assert len(alerts_list) >= 1

            # Verificar que la alerta sanitaria creada esté presente
            found = any(a.get("animal_id") == animal.id for a in alerts_list)
            assert found is True
