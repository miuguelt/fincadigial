"""Fixtures deterministas para QA local; nunca se ejecutan por defecto."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from app import db
from app.models.animals import AnimalStatus, Animals, Sex
from app.models.animalDiseases import AnimalDiseases
from app.models.animalFields import AnimalFields
from app.models.body_condition_scores import BodyConditionScore
from app.models.breeds import Breeds
from app.models.campesino import (
    CropActivity,
    CropActivityType,
    CropPlot,
    CropStatus,
    WaterMeasurement,
    WaterSource,
    WaterSourceType,
)
from app.models.control import Control, HealthStatus
from app.models.diseases import Diseases
from app.models.fields import Fields
from app.models.finca import Finca, FarmType
from app.models.financial import Transaction, TransactionCategory, TransactionType
from app.models.inventory import InventoryLot, ProductType
from app.models.management_plans import ManagementPlan, PlanStatus, PlanType
from app.models.medications import Medications
from app.models.milk_production import MilkProduction, MilkSession
from app.models.operational import AnimalGroup, Infrastructure, InfrastructureType, PastureAforo
from app.models.producer_profiles import ProducerProfile, ProducerType
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    ReproductiveEvent,
)
from app.models.tasks import TaskPriority, Tasks, TaskStatus
from app.models.treatments import Treatments
from app.models.user import ApprovalStatus, Role, User
from app.models.user_finca import UserFinca
from app.models.vaccinations import Vaccinations
from app.models.vaccines import Vaccines
from app.models.animal_health_history import AnimalHealthHistory, HealthEventType
from .config import BootstrapSettings, FarmDefinition
from .farms import ensure_farms


DEMO_FARMS = (
    FarmDefinition(
        name="Demo - Granja Educativa",
        farm_type=FarmType.Educativa,
        department="Santander",
        municipality="Vélez",
        address="Vereda Santa Cruz",
    ),
    FarmDefinition(
        name="Demo - Finca Ganadera",
        farm_type=FarmType.Tradicional,
        department="Santander",
        municipality="Barbosa",
        address="Vereda Cite",
    ),
)

DEMO_USERS = (
    (70000001, "demo.admin@villaluz.co", "Administrador Demo", Role.Administrador),
    (70000002, "demo.propietario@villaluz.co", "Propietario Demo", Role.Propietario),
    (70000003, "demo.capataz@villaluz.co", "Capataz Demo", Role.Capataz),
    (70000004, "demo.instructor@villaluz.co", "Instructor Demo", Role.Instructor),
    (70000005, "demo.aprendiz@villaluz.co", "Aprendiz Demo", Role.Aprendiz),
    (70000006, "demo.operario@villaluz.co", "Operario Demo", Role.Operario),
    (70000007, "demo.veterinario@villaluz.co", "Veterinario Demo", Role.Veterinario),
)


def ensure_demo_farms_and_users(settings: BootstrapSettings):
    if not settings.demo_password:
        raise ValueError(
            "VILLALUZ_SEED_DEMO_DATA=true requiere VILLALUZ_DEMO_PASSWORD "
            "o TEST_USER_PASSWORD."
        )
    farms = ensure_farms(DEMO_FARMS)
    for index, (identification, email, fullname, role) in enumerate(DEMO_USERS):
        user = User.query.filter_by(identification=identification).first()
        if not user:
            user = User(
                identification=identification,
                email=email,
                fullname=fullname,
                phone=f"310{identification % 10000000:07d}",
                role=role,
                finca_id=farms[index % len(farms)].id,
                status=True,
                approval_status=ApprovalStatus.Approved,
            )
            db.session.add(user)
            user.set_password(settings.demo_password)
            db.session.flush()
        user.set_password(settings.demo_password)
        user.email = email
        user.fullname = fullname
        user.role = role
        primary = farms[index % len(farms)]
        user.finca_id = primary.id
        profile = ProducerProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            db.session.add(
                ProducerProfile(
                    user_id=user.id,
                    producer_type=(
                        ProducerType.Institucional
                        if role in {Role.Administrador, Role.Instructor, Role.Aprendiz}
                        else ProducerType.Comercial_Pequeno
                    ),
                    land_tenure="Demo",
                    notes="Perfil de prueba",
                )
            )
        UserFinca.assign(
            user_id=user.id,
            finca_id=primary.id,
            role=role.value,
            is_primary=True,
            commit=False,
        )
    db.session.commit()
    return farms


def _animal(finca_id: int, record: str, breed_id: int, sex: Sex, weight: float):
    animal = Animals.query.filter_by(finca_id=finca_id, record=record).first()
    if animal:
        return animal
    animal = Animals(
        finca_id=finca_id,
        record=record,
        sex=sex,
        birth_date=date.today() - timedelta(days=900),
        weight=weight,
        breeds_id=breed_id,
        status=AnimalStatus.Vivo,
        is_lactating=sex == Sex.Hembra,
    )
    db.session.add(animal)
    db.session.flush()
    return animal


def _seed_operations_for_farm(finca_id: int, actor_id: int, suffix: str) -> None:
    breed = Breeds.query.filter_by(name="Holstein").first()
    fields = Fields.query.filter_by(finca_id=finca_id).order_by(Fields.id).all()
    vaccine = Vaccines.query.filter_by(finca_id=finca_id).first()
    disease = Diseases.query.filter_by(finca_id=finca_id).first()
    medication = Medications.query.filter_by(finca_id=finca_id).first()
    if not breed or not fields:
        return
    cow = _animal(finca_id, f"DEMO-{suffix}-VACA-001", breed.id, Sex.Hembra, 460)
    bull = _animal(finca_id, f"DEMO-{suffix}-TORO-001", breed.id, Sex.Macho, 620)
    if not AnimalFields.query.filter_by(animal_id=cow.id, field_id=fields[0].id).first():
        db.session.add(AnimalFields(animal_id=cow.id, field_id=fields[0].id, assignment_date=date.today() - timedelta(days=30), finca_id=finca_id, notes="Fixture demo"))
    control = Control.query.filter_by(animal_id=cow.id, finca_id=finca_id).first()
    if not control:
        control = Control(checkup_date=date.today() - timedelta(days=7), health_status=HealthStatus.Bueno, weight=460, height=135, description="Control preventivo demo", animal_id=cow.id, finca_id=finca_id)
        db.session.add(control)
        db.session.flush()
    if vaccine and not Vaccinations.query.filter_by(animal_id=cow.id, vaccine_id=vaccine.id, finca_id=finca_id).first():
        db.session.add(Vaccinations(animal_id=cow.id, vaccine_id=vaccine.id, vaccination_date=date.today() - timedelta(days=20), dosis=vaccine.dosis, batch_number=f"DEMO-{suffix}-001", performed_by=actor_id, finca_id=finca_id))
    if disease and not AnimalDiseases.query.filter_by(animal_id=cow.id, disease_id=disease.id, finca_id=finca_id).first():
        db.session.add(AnimalDiseases(animal_id=cow.id, disease_id=disease.id, instructor_id=actor_id, diagnosis_date=date.today() - timedelta(days=15), status="Resuelto", finca_id=finca_id, notes="Registro de demostración"))
    if medication and not Treatments.query.filter_by(animal_id=cow.id, finca_id=finca_id, description="Tratamiento preventivo demo").first():
        db.session.add(Treatments(treatment_date=date.today() - timedelta(days=14), description="Tratamiento preventivo demo", frequency="Única", dosis="10 ml", animal_id=cow.id, control_id=control.id, finca_id=finca_id, performed_by=actor_id, cost=45000))
    for days_ago, session, liters in ((1, MilkSession.AM, 14.2), (1, MilkSession.PM, 11.8)):
        day = date.today() - timedelta(days=days_ago)
        if not MilkProduction.query.filter_by(animal_id=cow.id, date=day, milking_session=session).first():
            db.session.add(MilkProduction(animal_id=cow.id, finca_id=finca_id, date=day, liters=liters, milking_session=session, fat_percentage=3.8, protein_percentage=3.2, notes="Ordeño demo"))
    if medication and not InventoryLot.query.filter_by(finca_id=finca_id, lot_number=f"DEMO-{suffix}-MED-001").first():
        db.session.add(InventoryLot(product_type=ProductType.Medicamento, medication_id=medication.id, lot_number=f"DEMO-{suffix}-MED-001", quantity=100, current_quantity=85, unit="ml", unit_cost=1500, expiry_date=date.today() + timedelta(days=300), finca_id=finca_id))
    if not Transaction.query.filter_by(finca_id=finca_id, description="Venta de leche demo").first():
        db.session.add(Transaction(finca_id=finca_id, animal_id=cow.id, transaction_type=TransactionType.Income, category=TransactionCategory.Milk, amount=250000, date=date.today() - timedelta(days=3), description="Venta de leche demo"))
    if not Tasks.query.filter_by(finca_id=finca_id, title="Revisar potrero demo").first():
        db.session.add(Tasks(finca_id=finca_id, title="Revisar potrero demo", description="Verificar disponibilidad de forraje", status=TaskStatus.PENDING, priority=TaskPriority.MEDIUM, due_date=datetime.utcnow() + timedelta(days=2), field_id=fields[0].id, assigned_to=actor_id))
    if not BodyConditionScore.query.filter_by(animal_id=cow.id, finca_id=finca_id).first():
        db.session.add(BodyConditionScore(animal_id=cow.id, finca_id=finca_id, score_date=date.today() - timedelta(days=7), score=5.0, evaluator_id=actor_id, notes="Condición ideal demo"))
    if not AnimalHealthHistory.query.filter_by(animal_id=cow.id, finca_id=finca_id, event_type=HealthEventType.Checkup).first():
        db.session.add(AnimalHealthHistory(animal_id=cow.id, finca_id=finca_id, event_type=HealthEventType.Checkup, event_date=date.today() - timedelta(days=7), weight=460, health_status="Bueno", description="Control preventivo demo", performed_by=actor_id, reference_id=control.id))
    if not ReproductiveEvent.query.filter_by(animal_id=cow.id, finca_id=finca_id, event_type=EventType.Diagnostico).first():
        db.session.add(ReproductiveEvent(animal_id=cow.id, event_type=EventType.Diagnostico, event_date=date.today() - timedelta(days=10), diagnosis_result=DiagnosisResult.Negativo, technique=InseminationTechnique.Artificial, actor_id=actor_id, finca_id=finca_id, notes="Diagnóstico demo"))
    group = AnimalGroup.query.filter_by(finca_id=finca_id, name="Lote Demo").first()
    if not group:
        group = AnimalGroup(finca_id=finca_id, name="Lote Demo", description="Grupo para pruebas")
        db.session.add(group)
        db.session.flush()
    if cow not in group.animals:
        group.animals.append(cow)
    if not PastureAforo.query.filter_by(finca_id=finca_id, field_id=fields[0].id).first():
        db.session.add(PastureAforo(finca_id=finca_id, field_id=fields[0].id, entry_height=35, exit_height=18, pasture_quality=4, notes="Aforo demo"))
    _seed_crop_water_plans(finca_id, actor_id, fields[0].id)
    _seed_infrastructure(finca_id)
    _seed_plan(finca_id, actor_id)
    from .demo_extended import seed_extended_demo

    lot = InventoryLot.query.filter_by(finca_id=finca_id).first()
    farm = Finca.query.get(finca_id)
    seed_extended_demo(
        finca_id,
        cow,
        Treatments.query.filter_by(animal_id=cow.id, finca_id=finca_id).first(),
        vaccine,
        medication,
        lot,
        actor_id,
        farm.territory_id if farm else None,
    )


def _seed_crop_water_plans(finca_id: int, actor_id: int, field_id: int) -> None:
    crop = CropPlot.query.filter_by(finca_id=finca_id, name="Huerta Demo").first()
    if not crop:
        crop = CropPlot(finca_id=finca_id, field_id=field_id, name="Huerta Demo", crop_name="Maíz", variety="ICA V-305", area=0.5, area_unit="ha", sowing_date=date.today() - timedelta(days=20), expected_harvest_date=date.today() + timedelta(days=80), status=CropStatus.ACTIVE, seed_source="Fixture demo")
        db.session.add(crop)
        db.session.flush()
    if not CropActivity.query.filter_by(crop_plot_id=crop.id, activity_type=CropActivityType.SOWING).first():
        db.session.add(CropActivity(finca_id=finca_id, crop_plot_id=crop.id, activity_type=CropActivityType.SOWING, activity_date=date.today() - timedelta(days=20), description="Siembra demo", performed_by=actor_id))
    source = WaterSource.query.filter_by(finca_id=finca_id, name="Tanque de reserva demo").first()
    if not source:
        source = WaterSource(finca_id=finca_id, name="Tanque de reserva demo", source_type=WaterSourceType.RESERVOIR, capacity_liters=5000, is_potable=False, reliability="Alta")
        db.session.add(source)
        db.session.flush()
    if not WaterMeasurement.query.filter_by(water_source_id=source.id, finca_id=finca_id).first():
        db.session.add(WaterMeasurement(finca_id=finca_id, water_source_id=source.id, measured_at=datetime.utcnow(), level_percent=72, ph=7.1, rainfall_mm=4, measured_by=actor_id, notes="Lectura demo"))


def _seed_infrastructure(finca_id: int) -> None:
    if not Infrastructure.query.filter_by(finca_id=finca_id, name="Bebedero principal demo").first():
        db.session.add(Infrastructure(finca_id=finca_id, name="Bebedero principal demo", type=InfrastructureType.BEBEDERO, status="Operativo", last_maintenance=date.today() - timedelta(days=30), next_maintenance=date.today() + timedelta(days=60)))


def _seed_plan(finca_id: int, actor_id: int) -> None:
    if not ManagementPlan.query.filter_by(finca_id=finca_id, name="Plan sanitario demo").first():
        db.session.add(ManagementPlan(finca_id=finca_id, name="Plan sanitario demo", description="Plan de prueba para QA", plan_type=PlanType.Sanitario, status=PlanStatus.Activo, start_date=date.today() - timedelta(days=30), end_date=date.today() + timedelta(days=335), created_by_user=actor_id))


def seed_demo_data(settings: BootstrapSettings) -> dict[str, int]:
    farms = ensure_demo_farms_and_users(settings)
    from .finca import seed_finca_baseline

    for farm in farms:
        seed_finca_baseline(farm.id)
    admin = User.query.filter_by(identification=70000001).first()
    for farm in farms:
        _seed_operations_for_farm(farm.id, admin.id, str(farm.id))
    db.session.commit()
    return {"demo_farms": len(farms), "demo_users": len(DEMO_USERS)}
