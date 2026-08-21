"""Tests del motor de KPIs reproductivos de hato.

Verifica el emparejamiento servicio↔diagnóstico↔parto (unidad de servicio) y
los indicadores derivados que usa una finca real: intervalo entre partos,
días abiertos, servicios por concepción, tasa de detección de celo y edad al
primer parto.
"""

from datetime import date, timedelta

import pytest

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    ReproductiveEvent,
)
from app.models.species import Species

TODAY = date.today()


def _d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


@pytest.fixture()
def herd(app, db_session):
    """Finca con una vaca multípara, una novilla y un toro."""
    with app.app_context():
        finca = Finca.query.first()
        if finca is None:
            finca = Finca(name="Finca KPI", type=FarmType.Tradicional, is_active=True)
            db.session.add(finca)
            db.session.flush()
        species = Species(name="Bovino KPI")
        db.session.add(species)
        db.session.flush()
        breed = Breeds(name="Raza KPI", species_id=species.id)
        db.session.add(breed)
        db.session.flush()

        def _animal(record, sex, age_days):
            animal = Animals(
                record=record,
                sex=sex,
                birth_date=_d(age_days),
                weight=430,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id,
            )
            db.session.add(animal)
            db.session.flush()
            return animal

        cow = _animal("KPI-VACA", Sex.Hembra, 2200)
        heifer = _animal("KPI-NOVILLA", Sex.Hembra, 700)
        sire = _animal("KPI-TORO", Sex.Macho, 1500)
        db.session.flush()
        yield {"finca": finca, "cow": cow, "heifer": heifer, "sire": sire}


def _event(animal, event_type, when, **kwargs):
    event = ReproductiveEvent(
        animal_id=animal.id,
        finca_id=animal.finca_id,
        event_type=event_type,
        event_date=when,
        **kwargs,
    )
    db.session.add(event)
    db.session.flush()
    return event


class TestPregnancyResolver:
    """La unidad de servicio empareja servicio con su desenlace real."""

    def test_diagnostico_fuera_de_ventana_no_confirma_el_servicio(self, app, herd):
        from app.services.reproduction.pregnancy_resolver import build_service_units

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Inseminacion, _d(400), sire_id=herd["sire"].id)
            # Diagnóstico 300 días después: no puede pertenecer a ese servicio.
            _event(
                cow,
                EventType.Diagnostico,
                _d(100),
                diagnosis_result=DiagnosisResult.Positivo,
            )

            units = build_service_units([cow.id], herd["finca"].id)
            assert len(units[cow.id]) == 1
            assert units[cow.id][0].outcome == "failed"

    def test_servicio_reciente_sin_diagnostico_queda_pendiente(self, app, herd):
        from app.services.reproduction.pregnancy_resolver import build_service_units

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Inseminacion, _d(10), sire_id=herd["sire"].id)

            units = build_service_units([cow.id], herd["finca"].id)
            assert units[cow.id][0].outcome == "pending"

    def test_parto_en_ventana_de_gestacion_confirma_el_servicio(self, app, herd):
        from app.services.reproduction.pregnancy_resolver import build_service_units

        with app.app_context():
            cow = herd["cow"]
            _event(
                cow,
                EventType.Inseminacion,
                _d(300),
                sire_id=herd["sire"].id,
                technique=InseminationTechnique.Artificial,
            )
            _event(cow, EventType.Parto, _d(300 - 283), alive_count=1, dead_count=0)

            unit = build_service_units([cow.id], herd["finca"].id)[cow.id][0]
            assert unit.outcome == "calved"
            assert unit.conception_date == _d(300)

    def test_servicio_repetido_invalida_el_anterior(self, app, herd):
        from app.services.reproduction.pregnancy_resolver import build_service_units

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Inseminacion, _d(60), sire_id=herd["sire"].id)
            _event(cow, EventType.Inseminacion, _d(39), sire_id=herd["sire"].id)

            units = build_service_units([cow.id], herd["finca"].id)[cow.id]
            assert units[0].outcome == "failed"
            assert units[1].outcome == "pending"


class TestHerdKpis:
    def test_intervalo_entre_partos_y_dias_abiertos(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Parto, _d(800), alive_count=1)
            _event(cow, EventType.Inseminacion, _d(800 - 90), sire_id=herd["sire"].id)
            _event(cow, EventType.Parto, _d(800 - 90 - 283), alive_count=1)

            kpis = build_herd_kpis(herd["finca"].id, months=36)
            interval = kpis["efficiency"]["calving_interval_days"]
            assert interval["n"] == 1
            assert interval["avg"] == 373
            assert kpis["efficiency"]["days_open"]["avg"] == 90

    def test_servicios_por_concepcion(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Inseminacion, _d(120), sire_id=herd["sire"].id)
            _event(cow, EventType.Inseminacion, _d(99), sire_id=herd["sire"].id)
            _event(
                cow,
                EventType.Diagnostico,
                _d(60),
                diagnosis_result=DiagnosisResult.Positivo,
            )

            kpis = build_herd_kpis(herd["finca"].id, months=12)
            assert kpis["efficiency"]["services_per_conception"]["avg"] == 2.0
            assert kpis["efficiency"]["conception_rate_pct"] == 50.0

    def test_edad_al_primer_parto_en_meses(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            # Nació hace 2200 días; primer parto a los 900 días de edad.
            _event(cow, EventType.Parto, _d(2200 - 900), alive_count=1)

            kpis = build_herd_kpis(herd["finca"].id, months=120)
            assert kpis["efficiency"]["age_at_first_calving_months"]["avg"] == 29.6

    def test_finca_ajena_no_contamina_los_indicadores(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            other = Finca(name="Finca ajena KPI", type=FarmType.Tradicional, is_active=True)
            db.session.add(other)
            db.session.flush()
            outsider = Animals(
                record="KPI-AJENA",
                sex=Sex.Hembra,
                birth_date=_d(2000),
                weight=400,
                status=AnimalStatus.Vivo,
                finca_id=other.id,
                breeds_id=herd["cow"].breeds_id,
            )
            db.session.add(outsider)
            db.session.flush()
            _event(outsider, EventType.Inseminacion, _d(30))

            kpis = build_herd_kpis(herd["finca"].id, months=12)
            assert kpis["efficiency"]["total_services"] == 0


class TestRiskLists:
    def test_vaca_con_dias_abiertos_excedidos_aparece_en_riesgo(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Parto, _d(200), alive_count=1)

            risk = build_herd_kpis(herd["finca"].id, months=12)["risk"]
            records = [item["record"] for item in risk["open_over_limit"]]
            assert "KPI-VACA" in records

    def test_novilla_sin_evento_reproductivo_se_reporta(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            risk = build_herd_kpis(herd["finca"].id, months=12)["risk"]
            records = [item["record"] for item in risk["heifers_without_service"]]
            assert "KPI-NOVILLA" in records

    def test_servicio_sin_diagnostico_se_reporta_como_no_confirmado(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Inseminacion, _d(70), sire_id=herd["sire"].id)

            risk = build_herd_kpis(herd["finca"].id, months=12)["risk"]
            records = [item["record"] for item in risk["unconfirmed_services"]]
            assert "KPI-VACA" in records


class TestBirthAssignment:
    """Un parto pertenece a un solo servicio: el que mejor lo explica."""

    def test_dos_servicios_cercanos_no_reclaman_el_mismo_parto(self, app, herd):
        from app.services.reproduction.pregnancy_resolver import build_service_units

        with app.app_context():
            cow = herd["cow"]
            # Servicio fallido y re-servicio 21 días después; el parto ocurre
            # 283 días después del segundo, dentro de la ventana de ambos.
            _event(cow, EventType.Inseminacion, _d(325), sire_id=herd["sire"].id)
            _event(cow, EventType.Inseminacion, _d(304), sire_id=herd["sire"].id)
            _event(cow, EventType.Parto, _d(304 - 283), alive_count=1)

            units = build_service_units([cow.id], herd["finca"].id)[cow.id]
            calved = [unit for unit in units if unit.outcome == "calved"]
            assert len(calved) == 1
            assert calved[0].service_date == _d(304)
            assert units[0].outcome == "failed"


class TestFirstCalvingWindow:
    def test_no_reporta_edad_al_primer_parto_si_hubo_partos_antes(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            _event(cow, EventType.Parto, _d(1500), alive_count=1)
            _event(cow, EventType.Parto, _d(1100), alive_count=1)

            # Ventana de 12 meses: el primer parto real queda fuera y no debe
            # tomarse el parto más antiguo visible como si fuera el primero.
            kpis = build_herd_kpis(herd["finca"].id, months=12)
            assert kpis["efficiency"]["age_at_first_calving_months"]["n"] == 0


class TestBodyConditionLink:
    """La condición corporal al servicio explica buena parte de la concepción."""

    def _bcs(self, animal, when, score):
        from app.models.body_condition_scores import BodyConditionScore

        record = BodyConditionScore(
            animal_id=animal.id,
            finca_id=animal.finca_id,
            score_date=when,
            score=score,
        )
        db.session.add(record)
        db.session.flush()
        return record

    def test_agrupa_la_concepcion_por_condicion_corporal(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow, heifer = herd["cow"], herd["heifer"]
            # Vaca en condición ideal que concibe.
            self._bcs(cow, _d(130), 5.0)
            _event(cow, EventType.Inseminacion, _d(120), sire_id=herd["sire"].id)
            _event(
                cow,
                EventType.Diagnostico,
                _d(80),
                diagnosis_result=DiagnosisResult.Positivo,
            )
            # Novilla delgada que falla.
            self._bcs(heifer, _d(130), 3.0)
            _event(heifer, EventType.Inseminacion, _d(120), sire_id=herd["sire"].id)
            _event(
                heifer,
                EventType.Diagnostico,
                _d(80),
                diagnosis_result=DiagnosisResult.Negativo,
            )

            bands = build_herd_kpis(herd["finca"].id, months=12)["efficiency"][
                "conception_by_body_condition"
            ]
            assert bands["bands"]["Ideal"] == {
                "services": 1,
                "conceptions": 1,
                "rate_pct": 100.0,
            }
            assert bands["bands"]["Delgado"]["rate_pct"] == 0.0
            assert bands["coverage_pct"] == 100.0

    def test_servicio_sin_condicion_corporal_reciente_no_se_agrupa(self, app, herd):
        from app.services.reproduction.herd_kpis import build_herd_kpis

        with app.app_context():
            cow = herd["cow"]
            # Medición de hace un año: demasiado vieja para explicar el servicio.
            self._bcs(cow, _d(400), 5.0)
            _event(cow, EventType.Inseminacion, _d(120), sire_id=herd["sire"].id)
            _event(
                cow,
                EventType.Diagnostico,
                _d(80),
                diagnosis_result=DiagnosisResult.Positivo,
            )

            bands = build_herd_kpis(herd["finca"].id, months=12)["efficiency"][
                "conception_by_body_condition"
            ]
            assert bands["bands"] == {}
            assert bands["coverage_pct"] == 0.0
