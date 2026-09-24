# -*- coding: utf-8 -*-
"""
Auditoría y Pruebas Unitarias de las 9 Tablas Previamente Huérfanas — Villa Luz.
Valida el ciclo de vida completo de:
1. animal_care_plan_stages (AnimalCarePlanStage)
2. animal_disease_progress (AnimalDiseaseProgress)
3. join_requests (JoinRequest)
4. kb_calendario (KBCalendario)
5. lactation_cycles (LactationCycle)
6. production_targets (ProductionTarget)
7. system_contents (SystemContent)
8. task_completion_records (TaskCompletionRecord)
9. weather_records (WeatherRecord)
"""

from datetime import date, datetime, timedelta, timezone, UTC
import pytest
from app import db
from app.models import Finca, FarmType
from app.models.user import User, Role, ApprovalStatus
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.species import Species
from app.models.breeds import Breeds
from app.models.tasks import Tasks, TaskPriority, TaskStatus
from app.models.animalDiseases import AnimalDiseases
from app.models.diseases import Diseases

from app.models.animal_care_plans import AnimalCarePlan, AnimalCarePlanStage, CarePlanType, CarePlanStatus
from app.models.animalDiseaseProgress import AnimalDiseaseProgress
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.knowledge_base import KBCalendario, KBSexo
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.production_target import ProductionTarget, TargetPeriod
from app.models.system_content import SystemContent
from app.models.task_completion import TaskCompletionRecord
from app.models.weather import WeatherRecord


import uuid
import random

@pytest.fixture()
def setup_base_data(app, db_session):
    """Crea entidades base indispensables para las claves foráneas (Finca, User, Animal)."""
    with app.app_context():
        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(name=f"Finca Audit {uuid.uuid4().hex[:6]}", type=FarmType.Tradicional, is_active=True)
            db.session.commit()

        user = User.query.first()
        if not user:
            user = User.create(
                identification=random.randint(100000000, 999999999),
                fullname="Auditor Villa Luz",
                email=f"auditor_{uuid.uuid4().hex[:6]}@villaluz.com",
                phone="3119876543",
                password="Password123!",
                role=Role.Administrador,
                finca_id=finca.id,
                approval_status=ApprovalStatus.Approved,
                status=True
            )
            db.session.commit()

        specie = Species.query.first()
        if not specie:
            specie = Species(name="Bovino Audit", description="Especie de prueba")
            db.session.add(specie)
            db.session.commit()

        breed = Breeds.query.filter_by(species_id=specie.id).first()
        if not breed:
            breed = Breeds(name="Holstein Audit", species_id=specie.id)
            db.session.add(breed)
            db.session.commit()

        ident = f"BOV-{uuid.uuid4().hex[:6].upper()}"
        animal = Animals.create(
            record=ident,
            sex=Sex.Hembra,
            weight=340.0,
            birth_date=date.today() - timedelta(days=700),
            breeds_id=breed.id,
            finca_id=finca.id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()
        return {"finca": finca, "user": user, "animal": animal}


# ==============================================================================
# 1. TABLA: animal_care_plan_stages
# ==============================================================================
def test_audit_animal_care_plan_stages(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]
    animal = setup_base_data["animal"]

    plan = AnimalCarePlan.create(
        animal_id=animal.id,
        finca_id=finca.id,
        plan_type=CarePlanType.Sanitario,
        status=CarePlanStatus.Activo,
        name="Plan Sanitario Preventivo",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=60)
    )
    db.session.commit()

    # Create Stage
    stage = AnimalCarePlanStage(
        plan_id=plan.id,
        finca_id=finca.id,
        stage_order=1,
        stage_name="Etapa 1: Vacunación Inicial",
        start_date=date.today(),
        due_date=date.today() + timedelta(days=15),
        completed=False
    )
    db.session.add(stage)
    db.session.commit()
    assert stage.id is not None
    assert stage.completed is False

    # Update
    stage.completed = True
    stage.completed_at = date.today()
    stage.observation = "Vacunación completada con éxito"
    db.session.commit()
    assert stage.completed is True

    # Delete
    db.session.delete(stage)
    db.session.commit()
    assert db.session.get(AnimalCarePlanStage, stage.id) is None


# ==============================================================================
# 2. TABLA: animal_disease_progress
# ==============================================================================
def test_audit_animal_disease_progress(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]
    animal = setup_base_data["animal"]
    user = setup_base_data["user"]

    disease = Diseases(
        name=f"Mastitis Bovina {uuid.uuid4().hex[:6]}",
        symptoms="Inflamación mamaria",
        details="Diagnóstico clínico en ubre",
        finca_id=finca.id
    )
    db.session.add(disease)
    db.session.commit()

    episode = AnimalDiseases(
        animal_id=animal.id,
        disease_id=disease.id,
        instructor_id=user.id,
        diagnosis_date=date.today() - timedelta(days=3),
        status="En tratamiento",
        finca_id=finca.id
    )
    db.session.add(episode)
    db.session.commit()

    # Create Progress
    progress = AnimalDiseaseProgress(
        animal_disease_id=episode.id,
        progress_date=date.today(),
        weight=480.5,
        temperature=38.6,
        status="Mejorando",
        observation="Respuesta favorable al antibiótico",
        performed_by=user.id,
        finca_id=finca.id
    )
    db.session.add(progress)
    db.session.commit()
    assert progress.id is not None
    assert progress.temperature == 38.6

    # Update & Delete
    progress.temperature = 38.2
    db.session.commit()
    assert progress.temperature == 38.2

    db.session.delete(progress)
    db.session.commit()
    assert db.session.get(AnimalDiseaseProgress, progress.id) is None


# ==============================================================================
# 3. TABLA: join_requests
# ==============================================================================
def test_audit_join_requests(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]
    user = setup_base_data["user"]

    join_req = JoinRequest(
        user_id=user.id,
        finca_id=finca.id,
        status=JoinRequestStatus.PENDING,
        request_type=JoinRequestType.REQUEST,
        notes="Solicitud de ingreso como operario",
        expires_at=datetime.now(UTC) + timedelta(days=7)
    )
    db.session.add(join_req)
    db.session.commit()
    assert join_req.id is not None
    assert join_req.status == JoinRequestStatus.PENDING

    join_req.status = JoinRequestStatus.APPROVED
    db.session.commit()
    assert join_req.status == JoinRequestStatus.APPROVED

    db.session.delete(join_req)
    db.session.commit()
    assert db.session.get(JoinRequest, join_req.id) is None


# ==============================================================================
# 4. TABLA: kb_calendario
# ==============================================================================
def test_audit_kb_calendario(app, db_session):
    cal = KBCalendario(
        codigo="VAC-FIEBRE-AFTOSA",
        nombre="Vacunación contra Fiebre Aftosa (Ciclo I)",
        descripcion="Ciclo oficial obligatorio ICA para bovinos",
        tipo="vacunacion",
        obligatorio_ica=True,
        sexo=KBSexo.AMBOS,
        edad_inicio_dias=90,
        frecuencia_dias=180,
        producto_sugerido="Aftogan / Vecol",
        dosis_referencia="2ml subcutánea",
        activo=True
    )
    db.session.add(cal)
    db.session.commit()
    assert cal.id is not None
    assert cal.obligatorio_ica is True

    cal.nombre = "Vacunación Fiebre Aftosa Actualizada"
    db.session.commit()
    assert cal.nombre == "Vacunación Fiebre Aftosa Actualizada"

    db.session.delete(cal)
    db.session.commit()
    assert db.session.get(KBCalendario, cal.id) is None


# ==============================================================================
# 5. TABLA: lactation_cycles
# ==============================================================================
def test_audit_lactation_cycles(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]
    animal = setup_base_data["animal"]

    lactation = LactationCycle.create(
        animal_id=animal.id,
        finca_id=finca.id,
        calving_date=date.today() - timedelta(days=90),
        lactation_number=2,
        status=LactationStatus.Active,
        peak_liters=24.5,
        peak_date=date.today() - timedelta(days=45),
        total_liters_lactation=1850.0,
        notes="Lactancia normal pico alcanzado"
    )
    db.session.commit()
    assert lactation.id is not None
    assert lactation.peak_liters == 24.5

    lactation.status = LactationStatus.Completed
    lactation.dry_off_date = date.today()
    db.session.commit()
    assert lactation.status == LactationStatus.Completed

    db.session.delete(lactation)
    db.session.commit()
    assert db.session.get(LactationCycle, lactation.id) is None


# ==============================================================================
# 6. TABLA: production_targets
# ==============================================================================
def test_audit_production_targets(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]

    target = ProductionTarget.create(
        finca_id=finca.id,
        target_liters=350.0,
        period=TargetPeriod.Daily,
        start_date=date.today(),
        is_active=True,
        notes="Meta diaria de producción de ordeño"
    )
    db.session.commit()
    assert target.id is not None
    assert target.target_liters == 350.0

    target.target_liters = 380.0
    db.session.commit()
    assert target.target_liters == 380.0

    db.session.delete(target)
    db.session.commit()
    assert db.session.get(ProductionTarget, target.id) is None


# ==============================================================================
# 7. TABLA: system_contents
# ==============================================================================
def test_audit_system_contents(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]

    content = SystemContent.create(
        key="banner_campaña_vacunacion",
        category="anuncio",
        content_type="text/markdown",
        priority="alta",
        title="Inicio del Ciclo de Vacunación",
        content="Recuerde registrar todas las vacunaciones en la plataforma.",
        is_active=True,
        finca_id=finca.id
    )
    db.session.commit()
    assert content.id is not None
    assert content.key == "banner_campaña_vacunacion"

    found = SystemContent.get_by_key("banner_campaña_vacunacion", finca_id=finca.id)
    assert found is not None
    assert found.id == content.id

    db.session.delete(content)
    db.session.commit()
    assert db.session.get(SystemContent, content.id) is None


# ==============================================================================
# 8. TABLA: task_completion_records
# ==============================================================================
def test_audit_task_completion_records(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]
    user = setup_base_data["user"]

    task = Tasks.create(
        title="Revisión de cercas perimetrales",
        finca_id=finca.id,
        priority=TaskPriority.MEDIUM,
        status=TaskStatus.PENDING,
        due_date=date.today() + timedelta(days=2)
    )
    db.session.commit()

    record = TaskCompletionRecord(
        task_id=task.id,
        finca_id=finca.id,
        completed_by=user.id,
        notes="Se repararon 10 metros de alambre en el potrero 3."
    )
    db.session.add(record)
    db.session.commit()
    assert record.id is not None
    assert record.task_id == task.id

    record.notes = "Notas actualizadas con material extra"
    db.session.commit()
    assert record.notes == "Notas actualizadas con material extra"

    db.session.delete(record)
    db.session.commit()
    assert db.session.get(TaskCompletionRecord, record.id) is None


# ==============================================================================
# 9. TABLA: weather_records
# ==============================================================================
def test_audit_weather_records(app, db_session, setup_base_data):
    finca = setup_base_data["finca"]

    record = WeatherRecord.create(
        finca_id=finca.id,
        recorded_at=datetime.now(timezone.utc),
        temperature_celsius=21.5,
        humidity_percent=78.0,
        precipitation_mm=12.4,
        wind_speed_kmh=15.2,
        uv_index=5.0
    )
    db.session.commit()
    assert record.id is not None
    assert record.temperature_celsius == 21.5

    record.temperature_celsius = 22.0
    db.session.commit()
    assert record.temperature_celsius == 22.0

    db.session.delete(record)
    db.session.commit()
    assert db.session.get(WeatherRecord, record.id) is None
