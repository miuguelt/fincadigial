"""Pruebas para el servicio de trazabilidad e identificación oficial SINIGAN (ICA).

Verifica:
1. Validación sintáctica según norma ISO 11784 (15 dígitos numéricos empezando por 170)
   y formato visual oficial COL-XXX-XXXX.
2. Rechazo de códigos con formato inválido y reporte claro de error.
3. Sincronización con AnimalIdentity (status=VERIFIED con GSMI, UNVERIFIED sin GSMI).
4. Auto-hidratación de lf_tag_code en el modelo Animals para compatibilidad con bastones RFID.
5. Control de unicidad global: rechazo de aretes duplicados en distintos animales.
6. Endpoint REST PUT y GET /api/v1/animals/<id>/sinigan.
7. Integración end-to-end con el registro de movimientos en /api/v1/animals/movements/.
"""

from datetime import date, timedelta
import flask
import pytest

from app import db
from app.models import Animals, Breeds, Species, Finca, FarmType
from app.models.animals import Sex, AnimalStatus
from app.models.vaccines import Vaccines, VaccineType
from app.models.vaccinations import Vaccinations
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app.models.animal_transfers import AnimalIdentity, AnimalIdentityStatus
from app.models.sinigan_registrations import SiniganRegistrations
from app.services.sinigan_service import (
    SiniganService,
    SiniganValidationError,
    SiniganConflictError,
)


@pytest.fixture
def sinigan_setup(app):
    """Configura finca, raza y catálogo base para pruebas de trazabilidad SINIGAN."""
    with app.app_context():
        finca = Finca.create(
            name="Hacienda Trazabilidad Ganadera",
            type=FarmType.Tradicional,
            department="Cundinamarca",
            municipality="Sopó",
            is_active=True,
        )
        flask.g.finca_id = finca.id

        species = Species.query.filter_by(name="Bovino").first()
        if not species:
            species = Species(name="Bovino")
            db.session.add(species)
            db.session.flush()

        breed = Breeds.query.filter_by(name="Holstein").first()
        if not breed:
            breed = Breeds(name="Holstein", species_id=species.id)
            db.session.add(breed)
            db.session.flush()

        route = RouteAdministration.query.first()
        if not route:
            route = RouteAdministration(name="Subcutánea")
            db.session.add(route)
            db.session.flush()

        disease_aftosa = Diseases.query.filter_by(name="Fiebre Aftosa").first()
        if not disease_aftosa:
            disease_aftosa = Diseases(name="Fiebre Aftosa", finca_id=finca.id)
            db.session.add(disease_aftosa)
            db.session.flush()

        db.session.commit()

        yield {
            "finca": finca,
            "breed": breed,
            "route": route,
            "disease_aftosa": disease_aftosa,
        }


def _crear_vaca(finca_id, breed_id, record="COW-SIN-01"):
    return Animals.create(
        finca_id=finca_id,
        breeds_id=breed_id,
        record=record,
        sex=Sex.Hembra,
        birth_date=date.today() - timedelta(days=500),
        status=AnimalStatus.Vivo,
        weight=450.0,
    )


def test_validate_sinigan_code_iso_11784():
    """Valida códigos numéricos oficiales DIN / ISO 11784 de 15 dígitos con prefijo 170."""
    # 1. 15 dígitos canónicos
    valid, code, fmt, err = SiniganService.validate_sinigan_code("170000123456789")
    assert valid is True
    assert code == "170000123456789"
    assert fmt == "DIN_ISO_11784"
    assert err is None

    # 2. Con guión 170-123456789012 (se normaliza)
    valid, code, fmt, err = SiniganService.validate_sinigan_code("170-123456789012")
    assert valid is True
    assert code == "170123456789012"
    assert fmt == "DIN_ISO_11784"

    # 3. Con espacios perimetrales
    valid, code, fmt, err = SiniganService.validate_sinigan_code("   170999888777666   ")
    assert valid is True
    assert code == "170999888777666"


def test_validate_sinigan_code_visual_col():
    """Valida códigos de formato visual oficial tipo COL-XXX-XXXX."""
    valid, code, fmt, err = SiniganService.validate_sinigan_code("COL-001-2026")
    assert valid is True
    assert code == "COL-001-2026"
    assert fmt == "VISUAL_COL"
    assert err is None

    # En minúsculas se pasa a mayúsculas
    valid, code, fmt, err = SiniganService.validate_sinigan_code("col-123-4567")
    assert valid is True
    assert code == "COL-123-4567"

    # Con consecutivo numérico directo
    valid, code, fmt, err = SiniganService.validate_sinigan_code("COL-12345678")
    assert valid is True
    assert code == "COL-12345678"


def test_validate_sinigan_code_invalidos():
    """Verifica que códigos fuera del estándar sean rechazados con mensaje explicativo."""
    casos_invalidos = [
        "",
        "   ",
        "12345",  # Muy corto
        "ABC-123",  # No es COL
        "171000123456789",  # No empieza con 170
        "17000012345678",  # 14 dígitos (le falta uno)
        "1700001234567890",  # 16 dígitos (le sobra uno)
        "COL-INVALIDO",
    ]
    for caso in casos_invalidos:
        valid, code, fmt, err = SiniganService.validate_sinigan_code(caso)
        assert valid is False, f"Se esperaba inválido para '{caso}'"
        assert err is not None


def test_assign_sinigan_iso_11784_hydrates_lf_tag_and_identity(app, sinigan_setup):
    """Verifica asignación de arete 15 dígitos, hidratando lf_tag_code y status UNVERIFIED sin guía."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-TAG-01")

        reg, identity = SiniganService.assign_sinigan_to_animal(
            animal_id=vaca.id,
            arete_sinigan="170000111222333",
            finca_id=finca.id,
        )

        assert reg.arete_sinigan == "170000111222333"
        assert identity.official_code == "170000111222333"
        assert identity.official_system == "SINIGAN"
        assert identity.status == AnimalIdentityStatus.UNVERIFIED

        # Verifica auto-hidratación del chip LF para bastones lectores
        assert vaca.lf_tag_code == "170000111222333"
        assert vaca.has_electronic_id is True


def test_assign_sinigan_with_guia_marks_verified(app, sinigan_setup):
    """Verifica que amparar el arete con Guía GSMI establezca status VERIFIED en la identidad."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-TAG-02")

        reg, identity = SiniganService.assign_sinigan_to_animal(
            animal_id=vaca.id,
            arete_sinigan="COL-001-2026",
            finca_id=finca.id,
            guia_movilizacion="GSMI-ICA-7777",
        )

        assert identity.status == AnimalIdentityStatus.VERIFIED
        assert "GSMI-ICA-7777" in identity.verification_reference
        assert identity.verified_at is not None


def test_assign_sinigan_duplicate_rejected(app, sinigan_setup):
    """Verifica que no se permita asignar el mismo arete SINIGAN a dos animales diferentes."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca_1 = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-DUP-01")
        vaca_2 = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-DUP-02")

        # Asignar a la primera vaca
        SiniganService.assign_sinigan_to_animal(
            animal_id=vaca_1.id,
            arete_sinigan="170888999000111",
            finca_id=finca.id,
        )

        # Intentar asignar el mismo a la segunda vaca debe fallar con conflicto
        with pytest.raises(SiniganConflictError) as exc_info:
            SiniganService.assign_sinigan_to_animal(
                animal_id=vaca_2.id,
                arete_sinigan="170888999000111",
                finca_id=finca.id,
            )
        assert "ya está asignado" in str(exc_info.value)


def test_endpoint_put_and_get_sinigan(client, auth_headers, app, sinigan_setup):
    """Verifica los endpoints REST PUT y GET /api/v1/animals/<id>/sinigan."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-REST-01")

    # 1. Asignar arete vía PUT
    payload = {
        "arete_sinigan": "170555666777888",
        "guia_movilizacion": "GSMI-EXP-2026",
        "notes": "Arete colocado en jornada de trazabilidad",
    }
    resp = client.put(f"/api/v1/animals/{vaca.id}/sinigan", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["has_sinigan"] is True
    assert data["arete_sinigan"] == "170555666777888"
    assert data["identity_status"] == "VERIFIED"
    assert data["lf_tag_code"] == "170555666777888"

    # 2. Consultar vía GET
    get_resp = client.get(f"/api/v1/animals/{vaca.id}/sinigan", headers=auth_headers)
    assert get_resp.status_code == 200
    get_data = get_resp.get_json()["data"]
    assert get_data["arete_sinigan"] == "170555666777888"
    assert get_data["guia_movilizacion"] == "GSMI-EXP-2026"


def test_endpoint_put_sinigan_invalid_format_returns_422(client, auth_headers, app, sinigan_setup):
    """Verifica que el endpoint rechace un código fuera de estándar con HTTP 422."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-INVALID-01")

    payload = {"arete_sinigan": "codigo-invalido"}
    resp = client.put(f"/api/v1/animals/{vaca.id}/sinigan", json=payload, headers=auth_headers)
    assert resp.status_code == 422
    body = resp.get_json()
    assert body["success"] is False
    assert "estándar oficial" in str(body)


def test_animal_movement_syncs_sinigan_and_identity(client, auth_headers, app, sinigan_setup):
    """Verifica que al registrar un movimiento con arete SINIGAN se sincronice la identidad oficial."""
    with app.app_context():
        finca = sinigan_setup["finca"]
        flask.g.finca_id = finca.id
        vaca = _crear_vaca(finca.id, sinigan_setup["breed"].id, record="VIL-MOV-SIN-01")

        # Asegurar vacuna de aftosa vigente para que pase la compuerta sanitaria
        vac = Vaccines.create(
            name="Aftosa Oficial",
            dosis="2 ml",
            route_administration_id=sinigan_setup["route"].id,
            vaccination_interval="Semestral",
            type=VaccineType.Inactivada,
            national_plan="Aftosa",
            target_disease_id=sinigan_setup["disease_aftosa"].id,
            finca_id=finca.id,
        )
        Vaccinations.create(
            animal_id=vaca.id,
            vaccine_id=vac.id,
            vaccination_date=date.today() - timedelta(days=20),
            finca_id=finca.id,
        )

    payload = {
        "animal_id": vaca.id,
        "tipo_movimiento": "Venta_Traslado_Externo",
        "fecha_movimiento": date.today().isoformat(),
        "finca_destino_externa": "Frigorífico Bovinos del Oriente",
        "guia_movilizacion": "GSMI-BOG-2026-001",
        "arete_sinigan": "170111222333444",
        "rpp_destino_externo": "123456789012",
        "precio_venta": 3500000.0,
        "comprador": "Comercializadora de Carnes S.A.S.",
    }

    resp = client.post("/api/v1/animals/movements/", json=payload, headers=auth_headers)
    assert resp.status_code == 200

    with app.app_context():
        # Verifica registro en SiniganRegistrations
        reg = SiniganRegistrations.query.filter_by(animal_id=vaca.id).first()
        assert reg is not None
        assert reg.arete_sinigan == "170111222333444"

        # Verifica sincronización con AnimalIdentity
        identity = AnimalIdentity.query.filter_by(animal_id=vaca.id).first()
        assert identity is not None
        assert identity.official_code == "170111222333444"
        assert identity.status == AnimalIdentityStatus.VERIFIED

        # Verifica hidratación de lf_tag_code
        vaca_db = Animals.query.get(vaca.id)
        assert vaca_db.lf_tag_code == "170111222333444"
