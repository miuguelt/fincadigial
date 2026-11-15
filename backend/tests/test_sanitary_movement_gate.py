"""Pruebas para la compuerta sanitaria y regulatoria ICA previa a la movilización (SanitaryMovementGate).

Verifica:
1. Bloqueo estricto de ventas ante período de retiro activo de medicamentos.
2. Bloqueo de ventas ante vacunación de fiebre aftosa vencida (overdue) o faltante en adultos (>180d).
3. Excepción permitida para crías menores a 180 días sin vacuna (cría al pie).
4. Bloqueo de traslados internos con retiro o aftosa vencida cuando no se declara emergencia.
5. Autorización de traslados internos de aislamiento cuando se activa traslado_sanitario_emergencia con justificación médica.
6. Rechazo de traslados de emergencia si la justificación es vacía o insuficiente (<10 caracteres).
7. Integración end-to-end a través del endpoint HTTP POST /api/v1/animals/movements/ con payload RFC 7807 (code: SANITARY_LOCK).
"""

from datetime import date, timedelta
import flask
import pytest

from app import db
from app.models import Animals, Breeds, Species, Finca, FarmType
from app.models.animals import Sex, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccines import Vaccines, VaccineType
from app.models.vaccinations import Vaccinations
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app.models.animal_movements import MovementType, AnimalMovement
from app.services.sanitary_movement_gate import SanitaryMovementGate


@pytest.fixture
def gate_setup(app):
    """Configura ambiente con dos fincas (origen y destino), razas y catálogo base."""
    with app.app_context():
        finca_origen = Finca.create(
            name="Hacienda El Retiro",
            type=FarmType.Tradicional,
            department="Santander",
            municipality="Socorro",
            is_active=True,
        )
        finca_destino = Finca.create(
            name="Finca La Esperanza",
            type=FarmType.Tradicional,
            department="Santander",
            municipality="San Gil",
            is_active=True,
        )
        flask.g.finca_id = finca_origen.id

        species = Species.query.filter_by(name="Bovino").first()
        if not species:
            species = Species(name="Bovino")
            db.session.add(species)
            db.session.flush()

        breed = Breeds.query.filter_by(name="Cebú Brahman").first()
        if not breed:
            breed = Breeds(name="Cebú Brahman", species_id=species.id)
            db.session.add(breed)
            db.session.flush()

        route = RouteAdministration.query.first()
        if not route:
            route = RouteAdministration(name="Intramuscular")
            db.session.add(route)
            db.session.flush()

        disease_aftosa = Diseases.query.filter_by(name="Fiebre Aftosa").first()
        if not disease_aftosa:
            disease_aftosa = Diseases(name="Fiebre Aftosa", finca_id=finca_origen.id)
            db.session.add(disease_aftosa)
            db.session.flush()

        db.session.commit()

        yield {
            "finca_origen": finca_origen,
            "finca_destino": finca_destino,
            "breed": breed,
            "route": route,
            "disease_aftosa": disease_aftosa,
        }


def _crear_novillo(finca_id, breed_id, record="NOV-GATE-01", age_days=600):
    animal = Animals.create(
        finca_id=finca_id,
        breeds_id=breed_id,
        record=record,
        sex=Sex.Macho,
        birth_date=date.today() - timedelta(days=age_days),
        status=AnimalStatus.Vivo,
        weight=480.0,
    )
    return animal


def test_venta_bloqueada_por_retiro_activo(app, gate_setup):
    """Verifica que un animal con retiro activo de medicamento no pueda venderse."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="VIL-RET-01")

        hoy = date.today()
        # Tratamiento con retiro hasta dentro de 5 días
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy - timedelta(days=2),
            description="Antibiótico Oxitetraciclina L.A.",
            dosis="10 ml",
            frequency="Dosis única",
            withdrawal_days=7,
            finca_id=finca.id,
        )

        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Venta_Traslado_Externo,
            finca_id=finca.id,
        )

        assert res.allowed is False
        assert res.conflict_type == "WITHDRAWAL_ACTIVE"
        assert "período de retiro activo" in res.message
        assert res.metadata["dias_restantes"] == 5


def test_venta_bloqueada_por_aftosa_vencida(app, gate_setup):
    """Verifica que una venta externa o en predio se bloquee si la vacuna de Aftosa está vencida (>180d)."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="VIL-AFT-01")

        vacuna_aftosa = Vaccines.create(
            name="Vacuna Bivalente Aftosa",
            dosis="2 ml",
            route_administration_id=gate_setup["route"].id,
            vaccination_interval="Semestral",
            type=VaccineType.Inactivada,
            national_plan="Aftosa",
            target_disease_id=gate_setup["disease_aftosa"].id,
            finca_id=finca.id,
        )

        hoy = date.today()
        # Vacuna aplicada hace 210 días (límite 180 días)
        Vaccinations.create(
            animal_id=animal.id,
            vaccine_id=vacuna_aftosa.id,
            vaccination_date=hoy - timedelta(days=210),
            finca_id=finca.id,
        )

        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Venta_En_Predio,
            finca_id=finca.id,
        )

        assert res.allowed is False
        assert res.conflict_type == "AFTOSA_OVERDUE"
        assert "vacunación contra Fiebre Aftosa vencida" in res.message


def test_venta_bloqueada_por_aftosa_faltante_en_adulto(app, gate_setup):
    """Verifica que un animal adulto (>180 días) sin vacuna de aftosa no pueda comercializarse."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="VIL-ADULT-NOAFT", age_days=300)

        hoy = date.today()
        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Venta_Traslado_Externo,
            finca_id=finca.id,
        )

        assert res.allowed is False
        assert res.conflict_type == "AFTOSA_MISSING"
        assert "carece de registro de vacunación" in res.message


def test_venta_permitida_para_cria_menor_de_180_dias(app, gate_setup):
    """Verifica que un ternero recién nacido (<180 días) pueda movilizarse como cría al pie."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        # Cría de 45 días
        cria = _crear_novillo(finca.id, gate_setup["breed"].id, record="CRIA-45D", age_days=45)

        hoy = date.today()
        res = SanitaryMovementGate.check_movement_eligibility(
            animal=cria,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Venta_Traslado_Externo,
            finca_id=finca.id,
        )

        # Sin retiro y siendo cría menor a 180 días, debe ser permitido
        assert res.allowed is True
        assert res.conflict_type is None


def test_traslado_interno_bloqueado_sin_emergencia(app, gate_setup):
    """Verifica que un traslado interno con retiro activo se bloquee si no se declara emergencia."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="NOV-INTERNO-01")

        hoy = date.today()
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy - timedelta(days=1),
            description="Tratamiento intramamario",
            dosis="1 jeringa",
            frequency="Dosis única",
            withdrawal_days=4,
            finca_id=finca.id,
        )

        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Traslado_Interno,
            traslado_sanitario_emergencia=False,
            finca_id=finca.id,
        )

        assert res.allowed is False
        assert res.conflict_type == "WITHDRAWAL_ACTIVE"
        assert "Para traslados internos de aislamiento" in res.message


def test_traslado_interno_permitido_con_emergencia_y_justificacion(app, gate_setup):
    """Verifica que un traslado interno con retiro se autorice con bandera de emergencia y justificación."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="NOV-EMERG-OK")

        hoy = date.today()
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy - timedelta(days=1),
            description="Antiinflamatorio esteroideo",
            dosis="5 ml",
            frequency="Dosis única",
            withdrawal_days=5,
            finca_id=finca.id,
        )

        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Traslado_Interno,
            traslado_sanitario_emergencia=True,
            justificacion_sanitaria="Traslado urgente al potrero hospital para aislamiento y cuarentena",
            finca_id=finca.id,
        )

        assert res.allowed is True
        assert res.conflict_type is None


def test_traslado_interno_rechazado_por_justificacion_corta(app, gate_setup):
    """Verifica que la emergencia requiera justificación médica válida (al menos 10 caracteres)."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="NOV-JUST-SHORT")

        hoy = date.today()
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy,
            description="Antiparasitario",
            dosis="5 ml",
            frequency="Dosis única",
            withdrawal_days=10,
            finca_id=finca.id,
        )

        res = SanitaryMovementGate.check_movement_eligibility(
            animal=animal,
            fecha_movimiento=hoy,
            tipo_movimiento=MovementType.Traslado_Interno,
            traslado_sanitario_emergencia=True,
            justificacion_sanitaria="urgente",  # Menor a 10 caracteres
            finca_id=finca.id,
        )

        assert res.allowed is False
        assert "al menos 10 caracteres" in res.message


def test_endpoint_movimiento_bloqueado_por_compuerta_sanitaria(client, auth_headers, app, gate_setup):
    """Verifica que el endpoint HTTP /animals/movements/ responda 422 con código SANITARY_LOCK ante retiro activo."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="NOV-API-LOCK")

        hoy = date.today()
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy,
            description="Antibiótico de amplio espectro",
            dosis="8 ml",
            frequency="Dosis única",
            withdrawal_days=14,
            finca_id=finca.id,
        )

    payload = {
        "animal_id": animal.id,
        "tipo_movimiento": "Venta_Traslado_Externo",
        "fecha_movimiento": hoy.isoformat(),
        "finca_destino_externa": "Frigorífico Metropolitano",
        "guia_movilizacion": "GSMI-2026-9999",
    }

    resp = client.post("/api/v1/animals/movements/", json=payload, headers=auth_headers)
    assert resp.status_code == 422
    body = resp.get_json()
    assert body["success"] is False
    assert "WITHDRAWAL_ACTIVE" in str(body)


def test_endpoint_traslado_interno_emergencia_exitoso(client, auth_headers, app, gate_setup):
    """Verifica que el endpoint HTTP permita el traslado con justificación de emergencia."""
    with app.app_context():
        finca = gate_setup["finca_origen"]
        finca_dest = gate_setup["finca_destino"]
        flask.g.finca_id = finca.id
        animal = _crear_novillo(finca.id, gate_setup["breed"].id, record="NOV-API-EMERG")

        hoy = date.today()
        Treatments.create(
            animal_id=animal.id,
            treatment_date=hoy,
            description="Sedante y analgésico",
            dosis="3 ml",
            frequency="Dosis única",
            withdrawal_days=3,
            finca_id=finca.id,
        )

    payload = {
        "animal_id": animal.id,
        "tipo_movimiento": "Traslado_Interno",
        "fecha_movimiento": hoy.isoformat(),
        "finca_destino_id": finca_dest.id,
        "guia_movilizacion": "GSMI-INTERNA-001",
        "traslado_sanitario_emergencia": True,
        "justificacion_sanitaria": "Traslado de aislamiento veterinario a potrero hospital",
        "notes": "Requiere vigilancia diaria",
    }

    resp = client.post("/api/v1/animals/movements/", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["success"] is True
    # Verifica que la justificación de emergencia haya quedado en las notas del movimiento
    assert "[TRASLADO SANITARIO DE EMERGENCIA:" in body["data"]["notes"]
