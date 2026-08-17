#!/usr/bin/env python3
"""Remove only data whose synthetic provenance is known.

The operational database is the source of truth.  This command deliberately
does not use broad date ranges or delete arbitrary records with empty fields:
it targets the exact markers and naming patterns used by the old simulation
and test seeders.

Usage:
    python scripts/cleanup_simulated_data.py              # dry run
    python scripts/cleanup_simulated_data.py --apply \
        --confirm DELETE_PROVEN_SIMULATED_DATA

The apply mode requires both the explicit command-line confirmation and
ALLOW_SIMULATION_CLEANUP=true. A manifest containing the deleted IDs is
written to the external VillaLuz backup root before the transaction is committed.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime, UTC
from pathlib import Path
from typing import Any

from sqlalchemy import MetaData, and_, func, or_, select


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app import create_app, db  # noqa: E402
from app.models.activity_log import ActivityLog  # noqa: E402
from app.models.activity_daily_agg import ActivityDailyAgg  # noqa: E402
from app.models.alerts import AnimalAlert  # noqa: E402
from app.models.animalFields import AnimalFields  # noqa: E402
from app.models.animals import Animals  # noqa: E402
from app.models.chat_message import ChatMessage  # noqa: E402
from app.models.diseases import Diseases  # noqa: E402
from app.models.extended_summaries import FinancialSummary, MilkSummary  # noqa: E402
from app.models.finca import Finca  # noqa: E402
from app.models.fields import Fields  # noqa: E402
from app.models.financial import Transaction  # noqa: E402
from app.models.foodTypes import FoodTypes  # noqa: E402
from app.models.livestock_summary import LivestockSummary  # noqa: E402
from app.models.medications import Medications  # noqa: E402
from app.models.milk_production import MilkProduction  # noqa: E402
from app.models.inventory import InventoryMovement  # noqa: E402
from app.models.inventory import InventoryLot  # noqa: E402
from app.models.membership_request import MembershipRequest  # noqa: E402
from app.models.operational_costs import OperationalCost  # noqa: E402
from app.models.reproduction import Offspring, ReproductiveEvent  # noqa: E402
from app.models.tasks import Tasks  # noqa: E402
from app.models.treatment_medications import TreatmentMedications  # noqa: E402
from app.models.treatment_vaccines import TreatmentVaccines  # noqa: E402
from app.models.treatments import Treatments  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_finca import UserFinca  # noqa: E402
from app.models.user_location import UserLocation  # noqa: E402
from app.models.vaccines import Vaccines  # noqa: E402


CONFIRMATION = "DELETE_PROVEN_SIMULATED_DATA"
SIMULATED_MILK_BATCH_DATES = (
    date(2026, 5, 10),
    date(2026, 5, 14),
    date(2026, 5, 21),
)
LEGACY_SEED_DATE = date(2026, 5, 23)
LEGACY_STRESS_DATES = (date(2026, 5, 10), date(2026, 5, 14))
NUMERIC_SEED_NAME = re.compile(r"^(?:Enfermedad|Medicamento|Vacuna) \d+$")
CANONICAL_QUICK_START_IDENTIFICATIONS = frozenset(
    {1098, 55555555, 66666666, 11111111, 22222222, 33333333, 44444444}
)


def known_test_accounts_predicate():
    """Find legacy synthetic accounts without deleting canonical quick-start users."""
    return and_(
        or_(
            User.email.in_(
                [
                    "op1@villaluz.com",
                    "test_admin@villaluz.com",
                    "admin@fincavillaluz.com",
                    "test_crud@villaluz.com",
                    "instructor@sena.edu.co",
                    "aprendiz@sena.edu.co",
                    "operario@villaluz.co",
                    "pedro_recuerdo@gmail.com",
                ]
            ),
            User.email.ilike("usuario%@villaluz.test"),
            User.fullname.ilike("UsuarioFinal%"),
            User.fullname.in_(
                [
                    "Instructor SENA",
                    "Pedro Capataz",
                    "María Operaria",
                    "Don Pedro",
                    "Operario VillaLuz E2E",
                ]
            ),
        ),
        ~User.identification.in_(CANONICAL_QUICK_START_IDENTIFICATIONS),
    )


def _table_ids(table, predicate) -> set[int]:
    if "id" not in table.c:
        return set()
    return set(db.session.execute(select(table.c.id).where(predicate)).scalars())


def _add_target(
    target_ids: dict[str, set[int]],
    criteria: dict[str, dict[str, Any]],
    label: str,
    table,
    predicate,
) -> set[int]:
    ids = _table_ids(table, predicate)
    target_ids[table.name].update(ids)
    criteria[label] = {"table": table.name, "count": len(ids)}
    return ids


def _ids_by_python_name(model, predicate) -> set[int]:
    """Find exact numeric seed names without deleting similarly named real data."""
    rows = db.session.execute(select(model.id, model.name).where(predicate)).all()
    return {row[0] for row in rows if NUMERIC_SEED_NAME.fullmatch(str(row[1] or ""))}


def collect_targets() -> tuple[dict[str, set[int]], dict[str, dict[str, Any]], set[int]]:
    """Collect target IDs and the finca IDs affected by the purge."""
    target_ids: dict[str, set[int]] = defaultdict(set)
    criteria: dict[str, dict[str, Any]] = {}
    affected_finca_ids: set[int] = set()
    # The ORM metadata is not the complete database schema.  Reflect the
    # physical schema so FK dependants in tables without a model (for
    # example farm_entity_alert_configs) are included in the same purge.
    physical_metadata = MetaData()
    physical_metadata.reflect(bind=db.engine)

    # Explicit markers and exact legacy seed descriptions.
    _add_target(
        target_ids,
        criteria,
        "transactions_marked_simulated",
        Transaction.__table__,
        Transaction.description.ilike("[Simulado]%"),
    )
    _add_target(
        target_ids,
        criteria,
        "transactions_legacy_seed",
        Transaction.__table__,
        Transaction.description.ilike("Transacción automática de %"),
    )
    _add_target(
        target_ids,
        criteria,
        "tasks_marked_simulated",
        Tasks.__table__,
        or_(Tasks.title.ilike("%Simulado%"), Tasks.description.ilike("%Simulado%")),
    )
    _add_target(
        target_ids,
        criteria,
        "tasks_generated_critical_batch",
        Tasks.__table__,
        and_(
            Tasks.title.ilike("Tarea Crítica %"),
            Tasks.description.ilike("Descripción de la tarea operativa #%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "tasks_final_system_test",
        Tasks.__table__,
        Tasks.title.ilike("TaskFinal%"),
    )
    _add_target(
        target_ids,
        criteria,
        "tasks_legacy_final_test",
        Tasks.__table__,
        or_(
            Tasks.title.ilike("TaskFin%"),
            Tasks.title.ilike("API Test%"),
            Tasks.description.ilike("Tarea de prueba final %"),
            func.date(Tasks.created_at) == date(2026, 7, 20),
            Tasks.title.in_(
                [
                    "Tarea 897",
                    "Tarea 908",
                    "Tarea2",
                    "T1",
                    "T2",
                    "t1",
                    "6",
                    "1",
                    "2",
                    "3",
                    "4",
                    "7",
                    "8",
                    "9",
                    "10",
                    "45",
                    "74",
                    "75",
                    "77",
                    "78",
                    "79",
                    "321",
                    "821",
                    "35445",
                    "4545",
                    "78965",
                    "adsf",
                    "adsfs",
                    "asdf",
                    "asfdasdf",
                ]
            ),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "alerts_marked_simulated",
        AnimalAlert.__table__,
        AnimalAlert.message.ilike("%Simulado%"),
    )
    _add_target(
        target_ids,
        criteria,
        "activity_logs_marked_simulated",
        ActivityLog.__table__,
        or_(
            ActivityLog.title.ilike("%Simulado%"),
            ActivityLog.description.ilike("%Simulado%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "activity_logs_demo_inventory",
        ActivityLog.__table__,
        ActivityLog.title.ilike("%(DEMO-%"),
    )
    _add_target(
        target_ids,
        criteria,
        "activity_logs_inventory_alerts_without_lots",
        ActivityLog.__table__,
        and_(ActivityLog.entity == "Inventory", ActivityLog.action == "ALERTA"),
    )
    _add_target(
        target_ids,
        criteria,
        "inventory_demo_lots",
        InventoryLot.__table__,
        or_(
            InventoryLot.lot_number.ilike("DEMO-%"),
            InventoryLot.notes.ilike("Lote de demostracion%"),
            InventoryLot.notes.ilike("Lote de demostración%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "inventory_e2e_test_lots",
        InventoryLot.__table__,
        InventoryLot.lot_number.ilike("E2E-%"),
    )
    _add_target(
        target_ids,
        criteria,
        "users_known_test_accounts",
        User.__table__,
        known_test_accounts_predicate(),
    )
    _add_target(
        target_ids,
        criteria,
        "operational_costs_generated_batch",
        OperationalCost.__table__,
        OperationalCost.concept.ilike("Gasto operativo #%"),
    )
    _add_target(
        target_ids,
        criteria,
        "activity_aggregates_orphan_actors",
        ActivityDailyAgg.__table__,
        and_(
            ActivityDailyAgg.actor_id != 0,
            ~select(User.id).where(User.id == ActivityDailyAgg.actor_id).exists(),
        ),
    )

    # Remaining unlabelled fixtures from the final CRUD/campesino checks.
    infrastructure_table = physical_metadata.tables.get("infrastructure")
    if infrastructure_table is not None:
        _add_target(
            target_ids,
            criteria,
            "infrastructure_final_test_records",
            infrastructure_table,
            infrastructure_table.c.name.ilike("InfraFinal%"),
        )
    animal_groups_table = physical_metadata.tables.get("animal_groups")
    if animal_groups_table is not None:
        _add_target(
            target_ids,
            criteria,
            "animal_groups_final_test_records",
            animal_groups_table,
            animal_groups_table.c.name.ilike("GroupFinal%"),
        )
    market_offers_table = physical_metadata.tables.get("market_offers")
    if market_offers_table is not None:
        _add_target(
            target_ids,
            criteria,
            "market_offers_campesino_test_records",
            market_offers_table,
            market_offers_table.c.product_name.in_(["Maíz Amarillo", "sdf", "8744"]),
        )
    climate_alerts_table = physical_metadata.tables.get("climate_risk_alerts")
    if climate_alerts_table is not None:
        _add_target(
            target_ids,
            criteria,
            "climate_alerts_campesino_fixture",
            climate_alerts_table,
            and_(
                climate_alerts_table.c.title == "Lluvias intensas",
                climate_alerts_table.c.description == "Se esperan fuertes lluvias esta semana",
                func.date(climate_alerts_table.c.created_at) == date(2026, 5, 21),
            ),
        )
    assistance_table = physical_metadata.tables.get("technical_assistance_requests")
    if assistance_table is not None:
        _add_target(
            target_ids,
            criteria,
            "technical_assistance_test_request",
            assistance_table,
            and_(
                assistance_table.c.title == "Problema de maquinaria",
                assistance_table.c.description.ilike("%[Foto adjunta:%"),
                func.date(assistance_table.c.created_at) == date(2026, 7, 20),
            ),
        )
    water_sources_table = physical_metadata.tables.get("water_sources")
    if water_sources_table is not None:
        _add_target(
            target_ids,
            criteria,
            "water_sources_fixture_records",
            water_sources_table,
            and_(
                water_sources_table.c.name.in_(["Quebrada Principal", "Pozo Norte"]),
                func.date(water_sources_table.c.created_at).in_(
                    [date(2026, 5, 14), date(2026, 5, 21)]
                ),
                water_sources_table.c.created_by.is_(None),
            ),
        )
    water_measurements_table = physical_metadata.tables.get("water_measurements")
    if water_measurements_table is not None:
        _add_target(
            target_ids,
            criteria,
            "water_measurements_fixture_records",
            water_measurements_table,
            and_(
                water_measurements_table.c.notes == "Medición de rutina",
                water_measurements_table.c.measured_by.is_(None),
                func.date(water_measurements_table.c.created_at) == date(2026, 5, 14),
            ),
        )
    farm_alerts_table = physical_metadata.tables.get("farm_entity_alerts")
    if farm_alerts_table is not None:
        water_source_ids = target_ids.get("water_sources", set())
        water_alert_predicates = []
        if water_source_ids:
            water_alert_predicates.append(
                and_(
                    farm_alerts_table.c.entity_type == "water_source",
                    farm_alerts_table.c.entity_id.in_(water_source_ids),
                )
            )
        crop_plots_table = physical_metadata.tables.get("crop_plots")
        if crop_plots_table is not None:
            water_alert_predicates.append(
                and_(
                    farm_alerts_table.c.entity_type == "crop_plot",
                    ~select(crop_plots_table.c.id)
                    .where(crop_plots_table.c.id == farm_alerts_table.c.entity_id)
                    .exists(),
                )
            )
        if water_alert_predicates:
            _add_target(
                target_ids,
                criteria,
                "farm_entity_alerts_for_deleted_fixtures",
                farm_alerts_table,
                or_(*water_alert_predicates),
            )

    species_table = physical_metadata.tables.get("species")
    if species_table is not None:
        _add_target(
            target_ids,
            criteria,
            "species_final_test_records",
            species_table,
            species_table.c.name.ilike("SpeciesFinal%"),
        )
    breeds_table = physical_metadata.tables.get("breeds")
    if breeds_table is not None:
        _add_target(
            target_ids,
            criteria,
            "breeds_final_test_records",
            breeds_table,
            or_(
                breeds_table.c.name.ilike("BreedFinal%"),
                breeds_table.c.name == "BreedTestUPDATE_OK",
                breeds_table.c.name.ilike("Raza Actualizada %"),
            ),
        )
    diseases_table = physical_metadata.tables.get("diseases")
    if diseases_table is not None:
        _add_target(
            target_ids,
            criteria,
            "diseases_final_and_legacy_test_records",
            diseases_table,
            or_(
                diseases_table.c.name.ilike("DiseaseFinal%"),
                and_(
                    diseases_table.c.details == "Detalles de prueba",
                    func.date(diseases_table.c.created_at) == date(2026, 5, 10),
                ),
            ),
        )
    food_types_table = physical_metadata.tables.get("food_types")
    if food_types_table is not None:
        _add_target(
            target_ids,
            criteria,
            "food_types_final_test_records",
            food_types_table,
            food_types_table.c.food_type.ilike("PastoFinal%"),
        )
    medications_table = physical_metadata.tables.get("medications")
    if medications_table is not None:
        _add_target(
            target_ids,
            criteria,
            "medications_final_test_records",
            medications_table,
            medications_table.c.name.ilike("MedFinal%"),
        )
    vaccines_table = physical_metadata.tables.get("vaccines")
    if vaccines_table is not None:
        _add_target(
            target_ids,
            criteria,
            "vaccines_final_test_records",
            vaccines_table,
            vaccines_table.c.name.ilike("VaccineFinal%"),
        )

    # Unlabelled legacy audit-seed batch. All of these rows were created by
    # scripts/db_audit_and_seed.py on the same run date with fixed sample
    # messages/notes; they are not user-entered operational movements.
    _add_target(
        target_ids,
        criteria,
        "legacy_transactions_batch",
        Transaction.__table__,
        and_(
            func.date(Transaction.created_at) == LEGACY_SEED_DATE,
            Transaction.description.in_(
                [
                    "Venta mensual de leche",
                    "Venta de novilla",
                    "Compra de concentrado",
                    "Vacunación general",
                    "Servicio veterinario",
                    "Mantenimiento de potreros",
                ]
            ),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_milk_batch",
        MilkProduction.__table__,
        and_(
            func.date(MilkProduction.created_at) == LEGACY_SEED_DATE,
            MilkProduction.notes.ilike("Ordeño % - %"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_reproductive_batch",
        ReproductiveEvent.__table__,
        and_(
            func.date(ReproductiveEvent.created_at) == LEGACY_SEED_DATE,
            ReproductiveEvent.notes.in_(
                [
                    "Celo detectado por comportamiento",
                    "Inseminación artificial",
                    "Diagnóstico positivo de preñez",
                ]
            ),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_offspring_batch",
        Offspring.__table__,
        and_(
            func.date(Offspring.created_at) == LEGACY_SEED_DATE,
            Offspring.notes == "Cría saludable",
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_activity_aggregate_batch",
        ActivityDailyAgg.__table__,
        and_(
            func.date(ActivityDailyAgg.created_at) == LEGACY_SEED_DATE,
            ActivityDailyAgg.entity.in_(["animals", "treatments", "vaccinations"]),
            ActivityDailyAgg.action == "create",
            ActivityDailyAgg.severity == "info",
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_chat_batch",
        ChatMessage.__table__,
        and_(
            func.date(ChatMessage.created_at) == LEGACY_SEED_DATE,
            ChatMessage.finca_id == 1,
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_membership_request_batch",
        MembershipRequest.__table__,
        and_(
            func.date(MembershipRequest.created_at) == LEGACY_SEED_DATE,
            MembershipRequest.message == "Solicito unirme a esta finca para colaborar",
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_user_finca_batch",
        UserFinca.__table__,
        func.date(UserFinca.created_at) == LEGACY_SEED_DATE,
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_location_batch",
        UserLocation.__table__,
        and_(
            func.date(UserLocation.created_at) == LEGACY_SEED_DATE,
            UserLocation.reported_by_node_id.ilike("node-%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_inventory_batch",
        InventoryMovement.__table__,
        InventoryMovement.notes.ilike("Movimiento automático para lote %"),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_auto_assignments",
        AnimalFields.__table__,
        AnimalFields.notes == "Asignación inicial por seeder automático",
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_treatment_medication_batch",
        TreatmentMedications.__table__,
        func.date(TreatmentMedications.created_at) == LEGACY_SEED_DATE,
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_treatment_vaccine_batch",
        TreatmentVaccines.__table__,
        func.date(TreatmentVaccines.created_at) == LEGACY_SEED_DATE,
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_reproductive_stress_batches",
        ReproductiveEvent.__table__,
        and_(
            func.date(ReproductiveEvent.created_at).in_(LEGACY_STRESS_DATES),
            ReproductiveEvent.notes.ilike("Evento reproductivo #%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "legacy_treatment_stress_batch",
        Treatments.__table__,
        and_(
            func.date(Treatments.created_at) == date(2026, 5, 14),
            Treatments.description.ilike("Tratamiento curativo #%"),
            Treatments.observations == "Suministrado por vía IM",
        ),
    )

    # Exact identities generated by the simulation seeders.
    animal_predicate = or_(
        Animals.record.ilike("HEMBRA-%"),
        Animals.record.ilike("ANIM-GEN-%"),
    )
    animal_ids = _add_target(
        target_ids,
        criteria,
        "animals_generated_records",
        Animals.__table__,
        animal_predicate,
    )
    _add_target(
        target_ids,
        criteria,
        "animals_legacy_stress_batches",
        Animals.__table__,
        func.date(Animals.created_at).in_(LEGACY_STRESS_DATES),
    )
    _add_target(
        target_ids,
        criteria,
        "animals_final_test_records",
        Animals.__table__,
        or_(
            Animals.record.ilike("REC%"),
            Animals.record.ilike("DEBUG_ANIMAL_%"),
            Animals.record.ilike("TEST-%"),
            Animals.record.ilike("AN-%"),
            Animals.record.ilike("TORO-%-%"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "fields_generated_names",
        Fields.__table__,
        or_(
            Fields.name.ilike("Potrero Simulado %"),
            Fields.name.ilike("Potrero Norte %"),
            Fields.name.ilike("Potrero % (Finca Villa Luz)"),
            Fields.name.ilike("Potrero % (Villa Luz)"),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "fields_final_test_records",
        Fields.__table__,
        Fields.name.ilike("FieldFinal%"),
    )
    _add_target(
        target_ids,
        criteria,
        "food_generated_names",
        FoodTypes.__table__,
        FoodTypes.food_type.ilike("Alimento Premium %"),
    )

    # The massive seeder uses numbered names; avoid matching real names such
    # as "Vacuna Aftosa" or "Enfermedad bovina".
    disease_ids = _ids_by_python_name(Diseases, Diseases.name.ilike("Enfermedad %"))
    medication_ids = _ids_by_python_name(Medications, Medications.name.ilike("Medicamento %"))
    vaccine_ids = _ids_by_python_name(Vaccines, Vaccines.name.ilike("Vacuna %"))
    for label, model, ids in (
        ("diseases_generated_numbered", Diseases, disease_ids),
        ("medications_generated_numbered", Medications, medication_ids),
        ("vaccines_generated_numbered", Vaccines, vaccine_ids),
    ):
        target_ids[model.__tablename__].update(ids)
        criteria[label] = {"table": model.__tablename__, "count": len(ids)}

    _add_target(
        target_ids,
        criteria,
        "animal_field_assignments_generated",
        AnimalFields.__table__,
        AnimalFields.notes.ilike("Asignación inicial por seeder masivo"),
    )
    _add_target(
        target_ids,
        criteria,
        "treatments_generated_audit",
        Treatments.__table__,
        Treatments.observations.ilike("Generado por auditoría masiva"),
    )
    _add_target(
        target_ids,
        criteria,
        "users_generated_seed",
        User.__table__,
        or_(User.email.ilike("usuario%@finca.com"), User.email.ilike("admin99%")),
    )

    # These three dates are the exact unlabelled milk batches produced by the
    # old dashboard simulation. Real operational records contain control or
    # notes and are intentionally excluded.
    milk_batch_predicate = and_(
        func.date(MilkProduction.created_at).in_(SIMULATED_MILK_BATCH_DATES),
        MilkProduction.control_id.is_(None),
        MilkProduction.notes.is_(None),
    )
    _add_target(
        target_ids,
        criteria,
        "milk_generated_batches",
        MilkProduction.__table__,
        milk_batch_predicate,
    )
    _add_target(
        target_ids,
        criteria,
        "activity_logs_legacy_animal_batch",
        ActivityLog.__table__,
        and_(
            func.date(ActivityLog.created_at) == date(2026, 5, 14),
            ActivityLog.action == "CREATE",
            ActivityLog.entity == "Animal",
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "activity_aggregates_legacy_stress_batch",
        ActivityDailyAgg.__table__,
        and_(
            func.date(ActivityDailyAgg.created_at).in_(LEGACY_STRESS_DATES),
            ActivityDailyAgg.entity.in_(["animals", "treatments", "vaccinations"]),
            ActivityDailyAgg.action == "create",
            ActivityDailyAgg.severity == "info",
        ),
    )

    # Final CRUD tests created disposable farms. Their unique names are not
    # valid operational identifiers, so the complete tenant scope can be
    # removed without touching Finca Villa Luz.
    final_finca_ids = _add_target(
        target_ids,
        criteria,
        "fincas_final_test",
        Finca.__table__,
        or_(Finca.name.ilike("TestFinal%"), Finca.name.ilike("FincaFinal%")),
    )
    final_finca_ids.update(
        _add_target(
            target_ids,
            criteria,
            "fincas_legacy_test_names",
            Finca.__table__,
            Finca.name.in_(
                [
                    "Finca Respaldo 2",
                    "Finca Respaldo 3",
                    "Finca Respaldo 4",
                    "Finca15",
                    "Otra finca",
                    "Finca de Instructor",
                ]
            ),
        )
    )
    _add_target(
        target_ids,
        criteria,
        "orphan_generated_finca_tenant",
        Finca.__table__,
        and_(
            Finca.name == "Miguel Ángel Tejedor",
            ~select(User.id).where(User.finca_id == Finca.id).exists(),
            ~select(UserFinca.id).where(UserFinca.finca_id == Finca.id).exists(),
        ),
    )
    _add_target(
        target_ids,
        criteria,
        "finca_municipio_de_prueba_fixture",
        Finca.__table__,
        and_(
            Finca.name == "Villa Luz",
            Finca.municipality == "Municipio de Prueba",
        ),
    )

    # Remove any records owned by generated animals/fields/catalogs before
    # removing their parent rows. This covers audit logs, controls, alerts,
    # assignments, vaccinations and join tables without a brittle list of
    # every feature table in the application.
    sorted_tables = list(physical_metadata.sorted_tables)
    # Follow foreign-key edges from known synthetic parents to their child
    # rows. Iterate because a child may itself be referenced by another
    # child (for example: finca -> user -> crop activity). Self-references
    # such as animal genealogy are excluded so a real parent is never removed
    # merely because a synthetic animal points at it.
    for _ in range(len(sorted_tables) + 1):
        known_ids = {name: set(ids) for name, ids in target_ids.items() if ids}
        changed = False
        for table in sorted_tables:
            if "id" not in table.c:
                continue
            relation_clauses = []
            for column in table.c:
                for foreign_key in column.foreign_keys:
                    target_table = foreign_key.column.table.name
                    if target_table == table.name:
                        continue
                    ids = known_ids.get(target_table, set())
                    if ids:
                        relation_clauses.append(column.in_(ids))
            if not relation_clauses:
                continue
            related_ids = _table_ids(table, or_(*relation_clauses))
            new_ids = related_ids - target_ids[table.name]
            if new_ids:
                target_ids[table.name].update(new_ids)
                criteria[f"rows_related_to_generated_{table.name}"] = {
                    "table": table.name,
                    "count": len(target_ids[table.name]),
                }
                changed = True
        if not changed:
            break

    # Child rows created from the synthetic reproductive/treatment batches.
    reproductive_ids = target_ids.get("reproductive_events", set())
    treatment_ids = target_ids.get("treatments", set())
    for table_name, column_name, ids, label in (
        (
            "offspring",
            "birth_event_id",
            reproductive_ids,
            "offspring_related_to_generated_reproductive_events",
        ),
        (
            "treatment_medications",
            "treatment_id",
            treatment_ids,
            "medication_links_related_to_generated_treatments",
        ),
        (
            "treatment_vaccines",
            "treatment_id",
            treatment_ids,
            "vaccine_links_related_to_generated_treatments",
        ),
    ):
        table = physical_metadata.tables.get(table_name)
        if table is None or "id" not in table.c or column_name not in table.c or not ids:
            continue
        child_ids = _table_ids(table, table.c[column_name].in_(ids))
        if child_ids:
            target_ids[table_name].update(child_ids)
            criteria[label] = {"table": table_name, "count": len(child_ids)}

    # Controls are generated only through records belonging to generated
    # animals. Resolve them now so their milk/reproductive children are also
    # included before the controls are deleted.
    control_table = physical_metadata.tables.get("control")
    if control_table is not None and animal_ids:
        control_ids = _table_ids(control_table, control_table.c.animal_id.in_(animal_ids))
        target_ids["control"].update(control_ids)
        criteria["controls_related_to_generated_animals"] = {
            "table": "control",
            "count": len(control_ids),
        }
        for table in sorted_tables:
            if "id" in table.c and "control_id" in table.c and control_ids:
                ids = _table_ids(table, table.c.control_id.in_(control_ids))
                if ids:
                    target_ids[table.name].update(ids)
                    criteria[f"rows_related_to_generated_controls_{table.name}"] = {
                        "table": table.name,
                        "count": len(ids),
                    }

    # Capture finca IDs before deleting anything, then refresh all materialized
    # summaries from the remaining transactional tables.
    for table_name, ids in target_ids.items():
        table = physical_metadata.tables.get(table_name)
        if table is None or "finca_id" not in table.c or not ids:
            continue
        affected_finca_ids.update(
            db.session.execute(
                select(table.c.finca_id).where(table.c.id.in_(ids), table.c.finca_id.is_not(None))
            ).scalars()
        )

    return target_ids, criteria, affected_finca_ids


def write_manifest(target_ids: dict[str, set[int]], criteria: dict[str, dict[str, Any]]) -> Path:
    backup_dir = (
        Path(
            os.getenv("VILLALUZ_BACKUP_ROOT")
            or (Path.home() / "Documents" / "Backups" / "VillaLuz")
        ).resolve()
        / "cleanup"
    )
    if ROOT.resolve() in backup_dir.parents:
        raise RuntimeError("VILLALUZ_BACKUP_ROOT no puede estar dentro del repositorio")
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = backup_dir / f"simulated_data_{timestamp}.json"
    payload = {
        "created_at": datetime.now(UTC).isoformat(),
        "purpose": "IDs removed by cleanup_simulated_data.py",
        "criteria": criteria,
        "deleted_ids_by_table": {
            table: sorted(ids) for table, ids in sorted(target_ids.items()) if ids
        },
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def refresh_summaries() -> None:
    for summary_model in (FinancialSummary, MilkSummary, LivestockSummary):
        for summary in summary_model.query.all():
            summary.recalculate()


def apply_deletion(target_ids: dict[str, set[int]]) -> int:
    physical_metadata = MetaData()
    physical_metadata.reflect(bind=db.engine)
    sorted_tables = list(physical_metadata.sorted_tables)
    table_order = {table.name: index for index, table in enumerate(sorted_tables)}
    deleted = 0
    for table_name in sorted(target_ids, key=lambda name: table_order.get(name, -1), reverse=True):
        ids = target_ids[table_name]
        table = physical_metadata.tables.get(table_name)
        if table is None or not ids or "id" not in table.c:
            continue
        result = db.session.execute(table.delete().where(table.c.id.in_(ids)))
        deleted += result.rowcount or 0
    return deleted


def run(apply: bool) -> int:
    app = create_app()
    with app.app_context():
        target_ids, criteria, affected_finca_ids = collect_targets()
        total = sum(len(ids) for ids in target_ids.values())
        print("Registros identificados por procedencia sintética:")
        for label, info in criteria.items():
            if info["count"]:
                print(f"  - {label}: {info['count']} ({info['table']})")
        print(f"Total de IDs únicos a eliminar: {total}")
        print(f"Fincas afectadas: {len(affected_finca_ids)}")

        if not apply:
            db.session.rollback()
            print("Modo consulta: no se modificó la base de datos.")
            return 0

        manifest = write_manifest(target_ids, criteria)
        deleted = apply_deletion(target_ids)
        db.session.commit()
        refresh_summaries()
        print(f"Eliminados: {deleted} registros.")
        print(f"Manifiesto de IDs: {manifest}")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="aplica la eliminación")
    parser.add_argument("--confirm", default="", help="debe ser DELETE_PROVEN_SIMULATED_DATA")
    args = parser.parse_args()

    if args.apply:
        if os.getenv("ALLOW_SIMULATION_CLEANUP", "").lower() != "true":
            parser.error("requiere ALLOW_SIMULATION_CLEANUP=true")
        if args.confirm != CONFIRMATION:
            parser.error(f"requiere --confirm {CONFIRMATION}")
    return run(args.apply)


if __name__ == "__main__":
    raise SystemExit(main())
