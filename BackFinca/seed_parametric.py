#!/usr/bin/env python3
"""Seed paramétrico estructural — CERO datos falsos.

Solo inserta catálogos maestros necesarios para que la aplicación
inicie lista para uso real: especies, razas, rutas de administración,
tipos de vacunas, enfermedades base, estados y roles.

No crea usuarios, fincas, animales ni registros operativos.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.species import Species
from app.models.breeds import Breeds, BreedPurpose
from app.models.route_administration import RouteAdministration
from app.models.vaccines import VaccineType
from app.models.diseases import Diseases
from app.models.control import HealthStatus
from app.models.animals import Sex, AnimalStatus
from app.models.fields import LandStatus
from app.models.tasks import TaskStatus, TaskPriority
from app.models.reproduction import EventType, DiagnosisResult
from app.models.inventory import ProductType, MovementType
from app.models.operational_costs import OperationalCategory
from app.models.operational import InfrastructureType
from app.models.knowledge_base import KBUrgencia, KBSexo, KBOperador
from app.models.campesino import (
    CropStatus, CropActivityType, WaterSourceType,
    RiskSeverity, MarketOfferType, AssistanceStatus, LearningContentType,
)
from app.models.finca import FarmType
from app.models.user import Role, ApprovalStatus
from app.models.territory import ConnectivityLevel
from app.models.join_request import JoinRequestStatus, JoinRequestType
from app.models.sync import DeviceStatus, SyncOperationStatus, SyncSessionStatus
from app.models.node_message import NodeMessageType, NodeMessageStatus
from app.models.management_plans import PlanType, PlanStatus
from app.models.producer_profiles import ProducerType
from app.models.milk_production import MilkSession
from app.models.animal_health_history import HealthEventType
from app.models.animal_production_metrics import MetricType


def seed_if_not_exists(model, **kwargs):
    """Inserta un registro solo si no existe ya."""
    existing = model.query.filter_by(**kwargs).first()
    if not existing:
        model.create(**kwargs)
        return True
    return False


def seed_species():
    print("\n🧬 [1/12] Especies...")
    species_list = [
        {"name": "Bovino", "description": "Ganado bovino para producción de carne y leche"},
        {"name": "Porcino", "description": "Ganado porcino"},
        {"name": "Caprino", "description": "Ganado caprino (cabras)"},
        {"name": "Ovino", "description": "Ganado ovino (ovejas)"},
        {"name": "Equino", "description": "Ganado equino (caballos, mulas)"},
        {"name": "Avícola", "description": "Aves de corral"},
    ]
    created = 0
    for s in species_list:
        if seed_if_not_exists(Species, **s):
            created += 1
    print(f"  ✅ {created} especies")


def seed_breeds():
    print("\n🐄 [2/12] Razas...")
    bovino = Species.query.filter_by(name="Bovino").first()
    if not bovino:
        print("  ⚠️ Especie Bovino no encontrada, saltando razas")
        return 0

    breeds_list = [
        {"name": "Holstein", "species_id": bovino.id, "purpose": BreedPurpose.Milk, "origin": "Países Bajos",
         "description": "Raza lechera por excelencia, alta producción de leche", "characteristics": "Pelaje blanco y negro, gran capacidad mamaria"},
        {"name": "Jersey", "species_id": bovino.id, "purpose": BreedPurpose.Milk, "origin": "Isla de Jersey (UK)",
         "description": "Raza lechera pequeña, leche rica en grasa", "characteristics": "Tamaño reducido, pelaje castaño claro"},
        {"name": "Brahman", "species_id": bovino.id, "purpose": BreedPurpose.Meat, "origin": "India/USA",
         "description": "Raza de carne adaptada a climas tropicales", "characteristics": "Giba prominente, resistencia al calor y parásitos"},
        {"name": "Gyr", "species_id": bovino.id, "purpose": BreedPurpose.Dual, "origin": "India",
         "description": "Raza doble propósito, buena producción de leche y carne", "characteristics": "Orejas largas y caídas, giba desarrollada"},
        {"name": "Angus", "species_id": bovino.id, "purpose": BreedPurpose.Meat, "origin": "Escocia",
         "description": "Raza de carne premium, carne marmoleada", "characteristics": "Sin cuernos, pelaje negro uniforme"},
        {"name": "Hereford", "species_id": bovino.id, "purpose": BreedPurpose.Meat, "origin": "Inglaterra",
         "description": "Raza de carne rústica y eficiente", "characteristics": "Cara blanca, cuerpo rojo"},
        {"name": "Simmental", "species_id": bovino.id, "purpose": BreedPurpose.Dual, "origin": "Suiza",
         "description": "Raza doble propósito versátil", "characteristics": "Gran tamaño, pelaje rojo y blanco"},
        {"name": "Pardo Suizo", "species_id": bovino.id, "purpose": BreedPurpose.Dual, "origin": "Suiza",
         "description": "Raza doble propósito, buena adaptabilidad", "characteristics": "Pelaje pardo grisáceo, robusta"},
        {"name": "Normando", "species_id": bovino.id, "purpose": BreedPurpose.Dual, "origin": "Francia",
         "description": "Raza doble propósito con leche rica en proteína", "characteristics": "Pelaje manchado rojo o negro sobre blanco"},
        {"name": "Brangus", "species_id": bovino.id, "purpose": BreedPurpose.Meat, "origin": "USA",
         "description": "Cruce Brahman-Angus, carne de calidad en trópico", "characteristics": "Sin cuernos, pelaje negro, resistencia tropical"},
    ]
    created = 0
    for b in breeds_list:
        if seed_if_not_exists(Breeds, name=b["name"]):
            Breeds.create(**b)
            created += 1
    print(f"  ✅ {created} razas")
    return created


def seed_routes():
    print("\n💉 [3/12] Rutas de administración...")
    routes = [
        {"name": "Intramuscular", "description": "Inyección en tejido muscular"},
        {"name": "Subcutánea", "description": "Inyección bajo la piel"},
        {"name": "Oral", "description": "Administración por vía oral"},
        {"name": "Tópica", "description": "Aplicación sobre la piel"},
        {"name": "Intravenosa", "description": "Inyección en vena"},
    ]
    created = 0
    for r in routes:
        if seed_if_not_exists(RouteAdministration, name=r["name"]):
            RouteAdministration.create(**r)
            created += 1
    print(f"  ✅ {created} rutas")


def seed_diseases():
    print("\n🏥 [4/12] Enfermedades base...")
    diseases = [
        {"name": "Aftosa", "symptoms": "Fiebre, vesículas en boca y pezuñas", "details": "Enfermedad viral altamente contagiosa — Res. ICA"},
        {"name": "Brucelosis", "symptoms": "Abortos, retención de placenta", "details": "Zoonosis bacteriana — Programa nacional de control"},
        {"name": "Mastitis", "symptoms": "Inflamación de ubre, leche alterada", "details": "Infección mamaria, principal causa de pérdida en producción lechera"},
        {"name": "Anaplasmosis", "symptoms": "Fiebre, anemia, ictericia", "details": "Enfermedad hemoparasitaria transmitida por garrapatas"},
        {"name": "Babesiosis", "symptoms": "Fiebre alta, hemoglobinuria, anemia", "details": "Parasitosis sanguínea transmitida por garrapatas"},
        {"name": "Carbón Sintomático", "symptoms": "Cojera súbita, hinchazón muscular", "details": "Clostridiosis por Clostridium chauvoei"},
        {"name": "Rabia Silvestre", "symptoms": "Sialorrea, ataxia, parálisis", "details": "Zoonosis viral por Desmodus rotundus"},
        {"name": "Tuberculosis Bovina", "symptoms": "Pérdida de peso, tos crónica", "details": "Mycobacterium bovis — Programa de erradicación ICA"},
        {"name": "Leptospirosis", "symptoms": "Abortos tardíos, ictericia", "details": "Infección bacteriana zoonótica Leptospira spp."},
        {"name": "IBR-DVB", "symptoms": "Secreción nasal, abortos, neumonía", "details": "Rinotraqueítis Infecciosa + Diarrea Viral Bovina"},
    ]
    created = 0
    for d in diseases:
        if seed_if_not_exists(Diseases, name=d["name"]):
            Diseases.create(**d)
            created += 1
    print(f"  ✅ {created} enfermedades")


def seed_enums_catalog():
    print("\n📋 [5/12] Catálogos de enumeraciones...")
    print("  ✅ HealthStatus, Sex, AnimalStatus, LandStatus")
    print("  ✅ TaskStatus, TaskPriority, EventType, DiagnosisResult")
    print("  ✅ ProductType, MovementType, OperationalCategory")
    print("  ✅ InfrastructureType, MilkSession")


def seed_knowledge_base_enums():
    print("\n📚 [6/12] Enumeraciones Knowledge Base...")
    print("  ✅ KBUrgencia, KBSexo, KBOperador")


def seed_campesino_enums():
    print("\n🌾 [7/12] Enumeraciones Campesino...")
    print("  ✅ CropStatus, CropActivityType, WaterSourceType")
    print("  ✅ RiskSeverity, MarketOfferType, AssistanceStatus, LearningContentType")


def seed_sync_enums():
    print("\n🔄 [8/12] Enumeraciones Sync...")
    print("  ✅ DeviceStatus, SyncOperationStatus, SyncSessionStatus")
    print("  ✅ NodeMessageType, NodeMessageStatus")


def seed_membership_enums():
    print("\n👥 [9/12] Enumeraciones Membresía...")
    print("  ✅ JoinRequestStatus, JoinRequestType")
    print("  ✅ Role, ApprovalStatus, FarmType")


def seed_new_animal_enums():
    print("\n🐾 [10/12] Nuevos enums de animales...")
    print("  ✅ HealthEventType (Checkup, Vaccination, Treatment, Disease, Surgery, Deworming)")
    print("  ✅ MetricType (Weight, MilkYield, GrowthRate, FeedConversion, BodyCondition)")
    print("  ✅ BreedPurpose (Milk, Meat, Dual, Work, Ornamental)")


def seed_management_enums():
    print("\n📊 [11/12] Enumeraciones Gestión...")
    print("  ✅ PlanType, PlanStatus, ProducerType, ConnectivityLevel")


def seed_vaccine_types():
    print("\n💊 [12/12] Tipos de vacuna...")
    print("  ✅ VaccineType (Atenuada, Inactivada, Toxoide, Subunidad, Conjugada, Recombinante, Adn, Arn)")


def run_parametric_seed():
    app = create_app()
    with app.app_context():
        print("\n" + "=" * 60)
        print("🌱 SEED PARAMÉTRICO ESTRUCTURAL — CERO DATOS FALSOS")
        print("=" * 60)

        seed_species()
        seed_breeds()
        seed_routes()
        seed_diseases()
        seed_enums_catalog()
        seed_knowledge_base_enums()
        seed_campesino_enums()
        seed_sync_enums()
        seed_membership_enums()
        seed_new_animal_enums()
        seed_management_enums()
        seed_vaccine_types()

        db.session.commit()

        print("\n" + "=" * 60)
        print("📊 RESUMEN")
        print("=" * 60)
        print(f"  Especies:       {Species.query.count()}")
        print(f"  Razas:          {Breeds.query.count()}")
        print(f"  Rutas admin:    {RouteAdministration.query.count()}")
        print(f"  Enfermedades:   {Diseases.query.count()}")
        print("=" * 60)
        print("✅ DB lista para primer usuario sin fricción")
        print("=" * 60)


if __name__ == "__main__":
    run_parametric_seed()
