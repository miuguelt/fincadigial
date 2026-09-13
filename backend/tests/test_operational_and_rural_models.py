"""Pruebas unitarias para modelos operativos rurales y protocolos (animal_groups, pasture_aforos, infrastructure, management_plans, treatment_protocols)."""

from datetime import date, timedelta
from uuid import uuid4
import pytest

from app.extensions import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.diseases import Diseases
from app.models.finca import FarmType, Finca
from app.models.management_plans import ManagementPlan, PlanStatus, PlanType
from app.models.medications import Medications
from app.models.operational import (
    AnimalGroup,
    AnimalGroupMembership,
    Infrastructure,
    InfrastructureType,
    PastureAforo,
)
from app.models.route_administration import RouteAdministration
from app.models.species import Species
from app.models.treatment_protocol_insumos import TreatmentProtocolInsumo
from app.models.treatment_protocols import TreatmentProtocol
from app.models.user import User


@pytest.fixture
def rural_context(app, db_session):
    """Crea una finca, usuario y animal para pruebas de modelos rurales."""
    with app.app_context():
        import random
        n = random.randint(10000000, 99999999)
        finca = Finca.create(
            name=f"Finca Rural Operativa {n}",
            type=FarmType.Tradicional,
            is_active=True,
        )
        user = User.create(
            email=f"rural_{n}@villaluz.co",
            password="Password123!",
            fullname="Administrador Rural",
            identification=str(n),
            phone=f"318{n}",
            role="Administrador",
            finca_id=finca.id,
            status=True,
        )
        species = Species.create(name=f"Bovino Rural {n}")
        breed = Breeds.create(name=f"Raza Rural {n}", species_id=species.id)
        animal = Animals.create(
            record=f"RUR-{n}",
            sex=Sex.Hembra,
            weight=380.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca.id,
            status=AnimalStatus.Vivo,
        )
        disease = Diseases.create(
            name=f"Pododermatitis {n}",
            symptoms="Cojera y dolor interdigital",
            details="Afección bacteriana",
            finca_id=finca.id,
        )
        route = RouteAdministration(
            name=f"Intramuscular {n}",
            description="Vía IM",
            status=True,
            finca_id=finca.id,
        )
        db.session.add(route)
        db.session.commit()

        medication = Medications.create(
            name=f"Antibiótico L.A. {n}",
            description="Oxitetraciclina",
            indications="Infecciones bacterianas",
            dosis="1 ml / 10 kg",
            route_administration_id=route.id,
            finca_id=finca.id,
            availability=True,
        )
        db_session.session.commit()
        return finca, user, animal, disease, medication


class TestOperationalRuralModels:
    """Valida modelos de grupos, aforos e infraestructura rural."""

    def test_animal_group_and_membership(self, rural_context):
        finca, _, animal, _, _ = rural_context
        group = AnimalGroup.create(
            name="Lote de Levante y Ceba",
            description="Novillas y novillos de levante",
            finca_id=finca.id,
        )
        assert group.id is not None

        # Asociar animal al grupo mediante la tabla secundaria
        group.animals.append(animal)
        db.session.commit()

        membership = AnimalGroupMembership.query.filter_by(
            animal_id=animal.id, group_id=group.id
        ).first()
        assert membership is not None
        assert animal in group.animals

    def test_pasture_aforo(self, rural_context):
        finca, _, _, _, _ = rural_context
        from app.models.fields import Fields
        field = Fields.create(name="Potrero El Cedro", state="Disponible", area=3.5, finca_id=finca.id)
        aforo = PastureAforo.create(
            field_id=field.id,
            entry_height=42.0,
            exit_height=18.0,
            pasture_quality=4,
            notes="Excelente cobertura de Brachiaria",
            finca_id=finca.id,
        )
        assert aforo.id is not None
        assert aforo.entry_height == 42.0
        assert aforo.field_id == field.id

    def test_infrastructure_model(self, rural_context):
        finca, _, _, _, _ = rural_context
        infra = Infrastructure.create(
            name="Tanque de Enfriamiento 1000L",
            type=InfrastructureType.TANQUE,
            last_maintenance=date.today() - timedelta(days=60),
            next_maintenance=date.today() + timedelta(days=30),
            status="Operativo",
            finca_id=finca.id,
        )
        assert infra.id is not None
        assert infra.type == InfrastructureType.TANQUE
        assert infra.status == "Operativo"


class TestManagementAndProtocolModels:
    """Valida planes de manejo y protocolos de tratamiento."""

    def test_management_plan_model(self, rural_context):
        finca, user, _, _, _ = rural_context
        plan = ManagementPlan.create(
            finca_id=finca.id,
            name="Plan Sanitario Preventivo Anual",
            description="Esquema oficial de vacunación y purgas",
            plan_type=PlanType.Sanitario,
            status=PlanStatus.Activo,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            created_by_user=user.id,
        )
        assert plan.id is not None
        assert plan.plan_type == PlanType.Sanitario
        assert plan.creator.id == user.id
        assert "Sanitario" in repr(plan)

    def test_treatment_protocol_and_insumo(self, rural_context):
        finca, _, _, disease, medication = rural_context
        protocol = TreatmentProtocol.create(
            name=f"Protocolo Podal {uuid4().hex[:6]}",
            description="Tratamiento parenteral para gabarro",
            disease_id=disease.id,
            severity="Moderada",
            default_dosis="1 ml por 10 kg",
            default_frequency="Cada 48 horas por 3 aplicaciones",
            withdrawal_days=5,
            duration_days=6,
            finca_id=finca.id,
        )
        assert protocol.id is not None
        assert protocol.withdrawal_days == 5

        insumo = TreatmentProtocolInsumo.create(
            protocol_id=protocol.id,
            finca_id=finca.id,
            kind="medicamento",
            medication_id=medication.id,
            recommended_dosis="10 ml",
        )
        assert insumo.id is not None
        assert insumo.kind == "medicamento"
        assert insumo.medication_id == medication.id
