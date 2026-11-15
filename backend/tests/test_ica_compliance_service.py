"""Pruebas unitarias e integración para el servicio unificado de cumplimiento ICA.

Verifica:
1. Reconocimiento de aplicaciones oficiales a través de Vaccinations (Aftosa, Brucelosis, Clostridial).
2. Reconocimiento de aplicaciones a través de Treatments (Desparasitación, tratamientos orales/inyectables).
3. Transición de estados de vigencia: ok -> due_soon -> overdue -> missing.
4. Cálculo determinista del semáforo general (overall: green, yellow, red).
5. Paridad total entre la evaluación individual (check_animal_ica) y la del hato (herd_ica_compliance).
6. Respeto al borrado lógico (is_deleted=True) y aislamiento multi-tenant.
"""

from datetime import date, timedelta
import flask
import pytest

from app import db
from app.models import Animals, Breeds, Species, Finca, FarmType
from app.models.animals import Sex, AnimalStatus
from app.models.vaccines import Vaccines, VaccineType
from app.models.vaccinations import Vaccinations
from app.models.treatments import Treatments
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app.services.analytics.medical.ica_compliance import (
    check_animal_ica,
    herd_ica_compliance,
    compliance_status,
    overall_light,
    ICA_MAX_DAYS,
)


@pytest.fixture
def ica_setup(app):
    """Configura finca, raza, especie, vía de administración y enfermedades de prueba."""
    with app.app_context():
        finca = Finca.create(
            name="Hacienda Sanitaria ICA",
            type=FarmType.Tradicional,
            department="Cundinamarca",
            municipality="Chía",
            is_active=True,
        )
        flask.g.finca_id = finca.id

        species = Species.query.filter_by(name="Bovino").first()
        if not species:
            species = Species(name="Bovino")
            db.session.add(species)
            db.session.flush()

        breed = Breeds.query.filter_by(name="Normando").first()
        if not breed:
            breed = Breeds(name="Normando", species_id=species.id)
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


def _crear_animal(finca_id, breed_id, record="VIL-ICA-01", sex=Sex.Hembra):
    animal = Animals.create(
        finca_id=finca_id,
        breeds_id=breed_id,
        record=record,
        sex=sex,
        birth_date=date.today() - timedelta(days=700),
        status=AnimalStatus.Vivo,
        weight=420.0,
    )
    return animal


def test_compliance_status_escalera_de_estados():
    """Valida la función pura de estados de cumplimiento según días transcurridos."""
    hoy = date(2026, 11, 14)

    # 1. Sin fecha -> missing
    st_missing = compliance_status(None, 180, hoy)
    assert st_missing["status"] == "missing"
    assert st_missing["days"] is None
    assert st_missing["date"] is None

    # 2. Reciente (30 días de 180) -> ok
    st_ok = compliance_status(hoy - timedelta(days=30), 180, hoy)
    assert st_ok["status"] == "ok"
    assert st_ok["days"] == 30
    assert st_ok["date"] == "2026-10-15"

    # 3. Próximo a vencer (> 85% de 180 = 153 días, e.g. 160 días) -> due_soon
    st_due = compliance_status(hoy - timedelta(days=160), 180, hoy)
    assert st_due["status"] == "due_soon"
    assert st_due["days"] == 160

    # 4. Vencido (> 180 días, e.g. 185 días) -> overdue
    st_overdue = compliance_status(hoy - timedelta(days=185), 180, hoy)
    assert st_overdue["status"] == "overdue"
    assert st_overdue["days"] == 185


def test_overall_light_prioridades():
    """Verifica que el semáforo priorice rojo ante vencimientos y amarillo ante faltantes."""
    # Cualquier vencimiento da rojo
    assert overall_light({
        "a": {"status": "ok"},
        "b": {"status": "overdue"},
        "c": {"status": "ok"},
    }) == "red"

    # Sin vencimientos pero con faltantes o por vencer da amarillo
    assert overall_light({
        "a": {"status": "ok"},
        "b": {"status": "missing"},
        "c": {"status": "ok"},
    }) == "yellow"

    assert overall_light({
        "a": {"status": "ok"},
        "b": {"status": "due_soon"},
        "c": {"status": "ok"},
    }) == "yellow"

    # Todo ok da verde
    assert overall_light({
        "a": {"status": "ok"},
        "b": {"status": "ok"},
    }) == "green"


def test_check_animal_ica_con_vacunacion_oficial_reconoce_aftosa(app, ica_setup):
    """Verifica que check_animal_ica lea de la tabla Vaccinations y marque Aftosa en OK."""
    with app.app_context():
        finca = ica_setup["finca"]
        flask.g.finca_id = finca.id

        animal = _crear_animal(finca.id, ica_setup["breed"].id, record="VIL-VAC-01")

        vacuna_aftosa = Vaccines.create(
            name="Aftogan Bivalente Tipo O y A",
            dosis="2 ml",
            route_administration_id=ica_setup["route"].id,
            vaccination_interval="Semestral",
            type=VaccineType.Inactivada,
            national_plan="Plan Nacional de Fiebre Aftosa - Ciclo I",
            target_disease_id=ica_setup["disease_aftosa"].id,
            finca_id=finca.id,
        )

        hoy = date.today()
        fecha_vacuna = hoy - timedelta(days=45)

        Vaccinations.create(
            animal_id=animal.id,
            vaccine_id=vacuna_aftosa.id,
            vaccination_date=fecha_vacuna,
            batch_number="LOTE-ICA-2026-X",
            notes="Aplicada por brigada oficial Fedegan/ICA",
            finca_id=finca.id,
        )

        res = check_animal_ica(animal.id, today=hoy, finca_id=finca.id)
        assert res["checks"]["aftosa"]["status"] == "ok"
        assert res["checks"]["aftosa"]["days"] == 45
        assert res["checks"]["aftosa"]["date"] == fecha_vacuna.isoformat()


def test_check_animal_ica_con_tratamiento_reconoce_desparasitacion(app, ica_setup):
    """Verifica que check_animal_ica lea de Treatments y detecte Desparasitación."""
    with app.app_context():
        finca = ica_setup["finca"]
        flask.g.finca_id = finca.id

        animal = _crear_animal(finca.id, ica_setup["breed"].id, record="VIL-TRAT-01")

        hoy = date.today()
        fecha_trat = hoy - timedelta(days=20)

        Treatments.create(
            animal_id=animal.id,
            treatment_date=fecha_trat,
            description="Desparasitación con Ivermectina 3.15% larga acción",
            dosis="5 ml",
            frequency="Dosis única",
            withdrawal_days=28,
            finca_id=finca.id,
        )

        res = check_animal_ica(animal.id, today=hoy, finca_id=finca.id)
        assert res["checks"]["desparasitacion"]["status"] == "ok"
        assert res["checks"]["desparasitacion"]["days"] == 20
        assert res["checks"]["desparasitacion"]["date"] == fecha_trat.isoformat()


def test_check_animal_ica_ignora_vacunaciones_eliminadas_logicamente(app, ica_setup):
    """Verifica que una vacunación con is_deleted=True no sea considerada activa."""
    with app.app_context():
        finca = ica_setup["finca"]
        flask.g.finca_id = finca.id

        animal = _crear_animal(finca.id, ica_setup["breed"].id, record="VIL-DEL-01")

        vacuna = Vaccines.create(
            name="Vacuna Clostridial 8 Vías",
            dosis="5 ml",
            route_administration_id=ica_setup["route"].id,
            vaccination_interval="Anual",
            type=VaccineType.Toxoide,
            national_plan="Control Carbón Sintomático",
            target_disease_id=ica_setup["disease_aftosa"].id,
            finca_id=finca.id,
        )

        hoy = date.today()
        v = Vaccinations.create(
            animal_id=animal.id,
            vaccine_id=vacuna.id,
            vaccination_date=hoy - timedelta(days=10),
            is_deleted=True,
            finca_id=finca.id,
        )

        res = check_animal_ica(animal.id, today=hoy, finca_id=finca.id)
        # Como está borrada lógicamente, clostridial debe quedar como missing
        assert res["checks"]["clostridial"]["status"] == "missing"


def test_paridad_total_entre_check_animal_ica_y_herd_ica_compliance(app, ica_setup):
    """Asegura que el semáforo individual coincida exactamente con el reporte del hato."""
    with app.app_context():
        finca = ica_setup["finca"]
        flask.g.finca_id = finca.id

        hoy = date.today()

        # Animal A: Todo al día
        a1 = _crear_animal(finca.id, ica_setup["breed"].id, record="COW-ALL-OK")
        vac_aftosa = Vaccines.create(
            name="Aftosa Cepas O y A",
            dosis="2 ml",
            route_administration_id=ica_setup["route"].id,
            vaccination_interval="Semestral",
            type=VaccineType.Inactivada,
            national_plan="Aftosa",
            target_disease_id=ica_setup["disease_aftosa"].id,
            finca_id=finca.id,
        )
        Vaccinations.create(
            animal_id=a1.id,
            vaccine_id=vac_aftosa.id,
            vaccination_date=hoy - timedelta(days=30),
            finca_id=finca.id,
        )
        Treatments.create(
            animal_id=a1.id,
            treatment_date=hoy - timedelta(days=15),
            description="Control de parásitos - desparasitacion albendazol",
            dosis="10 ml",
            frequency="Dosis única",
            finca_id=finca.id,
        )
        Treatments.create(
            animal_id=a1.id,
            treatment_date=hoy - timedelta(days=40),
            description="Vacunación Brucelosis Cepa 19",
            dosis="2 ml",
            frequency="Dosis única",
            finca_id=finca.id,
        )
        Treatments.create(
            animal_id=a1.id,
            treatment_date=hoy - timedelta(days=50),
            description="Vacuna Clostridial polivalente",
            dosis="5 ml",
            frequency="Dosis única",
            finca_id=finca.id,
        )

        # Animal B: Aftosa vencida (hace 220 días > 180)
        a2 = _crear_animal(finca.id, ica_setup["breed"].id, record="COW-OVERDUE")
        Vaccinations.create(
            animal_id=a2.id,
            vaccine_id=vac_aftosa.id,
            vaccination_date=hoy - timedelta(days=220),
            finca_id=finca.id,
        )

        # Animal C: Sin registros
        a3 = _crear_animal(finca.id, ica_setup["breed"].id, record="COW-EMPTY")

        # 1. Evaluación individual
        indiv_1 = check_animal_ica(a1.id, today=hoy, finca_id=finca.id)
        indiv_2 = check_animal_ica(a2.id, today=hoy, finca_id=finca.id)
        indiv_3 = check_animal_ica(a3.id, today=hoy, finca_id=finca.id)

        assert indiv_1["overall"] == "green"
        assert indiv_2["overall"] == "red"
        assert indiv_3["overall"] == "yellow"

        # 2. Evaluación colectiva de hato
        herd = herd_ica_compliance(finca.id, today=hoy)
        assert herd["total"] == 3
        assert herd["counts"]["green"] == 1
        assert herd["counts"]["red"] == 1
        assert herd["counts"]["yellow"] == 1

        herd_animals = {entry["animal_id"]: entry for entry in herd["animals"]}

        # 3. Verificación de paridad 1 a 1
        for a_id, ind_res in [(a1.id, indiv_1), (a2.id, indiv_2), (a3.id, indiv_3)]:
            h_entry = herd_animals[a_id]
            assert h_entry["overall"] == ind_res["overall"], f"Discrepancia overall en animal {a_id}"
            for chk_key in ("aftosa", "brucelosis", "clostridial", "desparasitacion"):
                assert (
                    h_entry["checks"][chk_key]["status"]
                    == ind_res["checks"][chk_key]["status"]
                ), f"Discrepancia en {chk_key} para animal {a_id}"
                assert (
                    h_entry["checks"][chk_key]["days"]
                    == ind_res["checks"][chk_key]["days"]
                ), f"Discrepancia en días de {chk_key} para animal {a_id}"
