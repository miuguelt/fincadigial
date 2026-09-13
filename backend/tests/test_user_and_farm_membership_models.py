"""Pruebas unitarias para modelos de usuarios, membresías y trazabilidad (membership_request, producer_profiles, user_favorites, sinigan_registrations)."""

from datetime import date, datetime, UTC
from uuid import uuid4
import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.breeds import Breeds
from app.models.finca import FarmType, Finca
from app.models.membership_request import MembershipRequest, RequestStatus
from app.models.producer_profiles import ProducerProfile, ProducerType
from app.models.sinigan_registrations import SiniganRegistrations
from app.models.species import Species
from app.models.user import User
from app.models.user_favorite import UserFavorite


@pytest.fixture
def farm_and_users(app, db_session):
    """Crea una finca y usuarios para pruebas de solicitudes y perfiles."""
    with app.app_context():
        import random
        n1 = random.randint(10000000, 49999999)
        n2 = random.randint(50000000, 89999999)
        finca = Finca.create(
            name=f"Hacienda La Trazabilidad {n1}",
            type=FarmType.Tradicional,
            is_active=True,
        )
        admin_user = User.create(
            email=f"admin_{n1}@villaluz.co",
            password="AdminPassword123!",
            fullname="Admin Verificador",
            identification=str(n1),
            phone=f"300{n1}",
            role="Administrador",
            finca_id=finca.id,
            status=True,
        )
        worker_user = User.create(
            email=f"worker_{n2}@villaluz.co",
            password="WorkerPassword123!",
            fullname="Trabajador Campesino",
            identification=str(n2),
            phone=f"310{n2}",
            role="Operario",
            finca_id=finca.id,
            status=True,
        )
        species = Species.create(name=f"Bovino Trazable {n1}")
        breed = Breeds.create(name=f"Normando Trazable {n1}", species_id=species.id)
        animal = Animals.create(
            record=f"SIN-{n1}",
            sex=Sex.Macho,
            weight=310.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca.id,
            status=AnimalStatus.Vivo,
        )
        db_session.session.commit()
        return finca, admin_user, worker_user, animal


class TestMembershipRequestModel:
    """Valida el ciclo de vida de MembershipRequest."""

    def test_create_default_pending_status(self, farm_and_users):
        finca, _, worker, _ = farm_and_users
        req = MembershipRequest.create(
            user_id=worker.id,
            finca_id=finca.id,
            requested_role="Veterinario",
            message="Solicitud de ingreso como asistente técnico",
        )
        assert req.id is not None
        assert req.status == RequestStatus.Pending
        assert "User" in repr(req)

    def test_approve_request_lifecycle(self, farm_and_users):
        finca, admin, worker, _ = farm_and_users
        req = MembershipRequest.create(
            user_id=worker.id,
            finca_id=finca.id,
            requested_role="Operario",
        )
        req.status = RequestStatus.Approved
        req.processed_by = admin.id
        req.processed_at = datetime.now(UTC)
        db.session.commit()

        updated = db.session.get(MembershipRequest, req.id)
        assert updated.status == RequestStatus.Approved
        assert updated.processed_by == admin.id
        assert updated.processor.id == admin.id


class TestProducerProfileModel:
    """Valida el perfil rural del usuario campesino (ProducerProfile)."""

    def test_create_profile_and_enum(self, farm_and_users):
        _, _, worker, _ = farm_and_users
        profile = ProducerProfile.create(
            user_id=worker.id,
            producer_type=ProducerType.Comercial_Pequeno,
            certifications="BPG, Predio Libre de Brucelosis",
            has_credit_access=True,
            association_name="Asoganaderos de la Región",
            years_experience=15,
            land_tenure="Propia",
            notes="Productor lechero tradicional",
        )
        assert profile.id is not None
        assert profile.producer_type == ProducerType.Comercial_Pequeno
        assert "Comercial Pequeño" in repr(profile)
        assert profile.user.id == worker.id

    def test_unique_user_id_constraint(self, farm_and_users):
        _, _, worker, _ = farm_and_users
        ProducerProfile.create(
            user_id=worker.id,
            producer_type=ProducerType.Subsistencia,
        )
        with pytest.raises(IntegrityError):
            ProducerProfile.create(
                user_id=worker.id,
                producer_type=ProducerType.Comercial_Mediano,
            )
        db.session.rollback()


class TestUserFavoriteModel:
    """Valida el modelo de accesos favoritos por usuario (UserFavorite)."""

    def test_create_and_unique_endpoint_per_user(self, farm_and_users):
        _, _, worker, _ = farm_and_users
        fav1 = UserFavorite.create(
            user_id=worker.id,
            endpoint="/api/v1/animals",
            label="Mis Animales",
            method="GET",
        )
        assert fav1.id is not None
        assert fav1.endpoint == "/api/v1/animals"

        # No debe permitir duplicar el mismo endpoint para el mismo usuario
        with pytest.raises(IntegrityError):
            UserFavorite.create(
                user_id=worker.id,
                endpoint="/api/v1/animals",
                label="Duplicado",
                method="GET",
            )
        db.session.rollback()


class TestSiniganRegistrationsModel:
    """Valida la tabla oficial de identificación SINIGAN (ICA)."""

    def test_create_and_unique_arete(self, farm_and_users):
        finca, _, _, animal = farm_and_users
        sinigan = SiniganRegistrations.create(
            finca_id=finca.id,
            animal_id=animal.id,
            arete_sinigan="COL-12345678",
            fecha_registro=date.today(),
            predio_origen="Finca La Esperanza",
            guia_movilizacion="GM-2026-9988",
            notes="Chapeta oficial colocada en oreja izquierda",
        )
        assert sinigan.id is not None
        assert sinigan.arete_sinigan == "COL-12345678"
        assert "COL-12345678" in repr(sinigan)
        from app.models.base_model import ValidationError

        # La chapeta debe ser única a nivel nacional
        with pytest.raises(ValidationError, match="ya existe para el campo 'arete_sinigan'"):
            SiniganRegistrations.create(
                finca_id=finca.id,
                animal_id=animal.id,
                arete_sinigan="COL-12345678",
                fecha_registro=date.today(),
            )
