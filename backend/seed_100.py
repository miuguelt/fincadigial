import os
import sys
import logging
from datetime import date, datetime, timedelta
from random import choice, randint, uniform, sample

# Configurar path para importar app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app import create_app, db
from app.models import (
    Species, Breeds, Finca, FarmType, User, Role, 
    Animals, Fields, FoodTypes, Diseases, RouteAdministration,
    Vaccines, Medications, InventoryLot, InventoryMovement,
    MilkProduction, Tasks, AnimalDiseases,
    AnimalFields, Vaccinations, Control, ReproductiveEvent, Treatments,
    Infrastructure, InfrastructureType, GeneticImprovements, Offspring
)
from app.models.operational_costs import OperationalCost, OperationalCategory
from app.models.control import HealthStatus
from app.models.reproduction import EventType, DiagnosisResult
from app.models.animals import AnimalStatus, Sex
from app.models.fields import LandStatus
from app.models.inventory import ProductType, MovementType
from app.models.vaccines import VaccineType
from app.models.milk_production import MilkSession
from app.models.tasks import TaskStatus, TaskPriority

def seed_100():
    app = create_app()
    with app.app_context():
        print("🌱 Iniciando poblamiento masivo (100 registros por tabla)...")
        
        # 1. Fincas
        fincas = Finca.query.all()
        if not fincas:
             finca = Finca.create(name="Villa Luz", type=FarmType.Tradicional, department="Cundinamarca")
             fincas = [finca]
        
        # 2. Maestros
        admin = User.query.filter(User.email.like('%admin%')).first()
        if not admin:
            admin = User.query.first()

        bovino = Species.query.filter_by(name="Bovino").first()
        if not bovino:
            bovino = Species.create(name="Bovino")
        
        breed_names = ["Holstein", "Jersey", "Brahman", "Gyr", "Angus", "Hereford", "Simmental", "Pardo Suizo", "Normando", "Brangus"]
        breeds = []
        for b_name in breed_names:
            b = Breeds.query.filter_by(name=b_name).first()
            if not b:
                b = Breeds.create(name=b_name, species_id=bovino.id)
            breeds.append(b)

        disease_names = ["Aftosa", "Brucelosis", "Mastitis", "Anaplasmosis", "Babesiosis", "Carbón Sintomático", "Rabia Silvestre", "Tuberculosis"]
        diseases = []
        for d_name in disease_names:
            d = Diseases.query.filter_by(name=d_name).first()
            if not d:
                d = Diseases.create(name=d_name, symptoms="Sintomas generales", details="Detalles de prueba")
            diseases.append(d)

        routes = ["Intramuscular", "Subcutánea", "Oral", "Tópica"]
        route_objs = []
        for r_name in routes:
            r = RouteAdministration.query.filter_by(name=r_name).first()
            if not r:
                r = RouteAdministration.create(name=r_name)
            route_objs.append(r)

        for finca in fincas:
            print(f"🏠 Poblando datos para finca: {finca.name} (ID: {finca.id})")

            # 3. Potreros
            field_objs = []
            for i in range(1, 21):
                f_name = f"Potrero {i:02d} ({finca.name})"
                f = Fields.query.filter_by(name=f_name, finca_id=finca.id).first()
                if not f:
                    f = Fields.create(name=f_name, finca_id=finca.id, area=str(randint(5, 30)), state=LandStatus.Disponible)
                field_objs.append(f)

            # 4. Animales (100 registros)
            print(f"  🐄 Creando 100 animales para {finca.name}...")
            existing_count = Animals.query.filter_by(finca_id=finca.id).count()
            for i in range(existing_count + 1, 101 + existing_count):
                tag = f"AN-{finca.id}-{i:03d}"
                # Asegurar balance de sexos
                sex_val = Sex.Hembra if i % 2 == 0 else Sex.Macho
                Animals.create(
                    record=tag,
                    birth_date=date.today() - timedelta(days=randint(30, 2000)),
                    weight=uniform(30.0, 800.0),
                    breeds_id=choice(breeds).id,
                    sex=sex_val,
                    status=AnimalStatus.Vivo,
                    finca_id=finca.id
                )
            
            db.session.commit()
            
            all_animals = Animals.query.filter_by(finca_id=finca.id).all()
            # Filtrar por valor del enum o por el enum mismo
            females = [a for a in all_animals if a.sex == Sex.Hembra]
            print(f"  📊 Estadísticas Reales: {len(all_animals)} animales, {len(females)} hembras.")

            # 5. Producción de Leche (100 registros)
            print(f"  🥛 Creando 100 registros de leche para {finca.name}...")
            if not females:
                 print("  ⚠️ No hay hembras para leche.")
            else:
                for i in range(100):
                    MilkProduction.create(
                        animal_id=choice(females).id,
                        finca_id=finca.id,
                        date=date.today() - timedelta(days=randint(0, 365)),
                        liters=uniform(5.0, 35.0),
                        milking_session=choice(list(MilkSession))
                    )

            # 6. Controles de Salud (100 registros)
            print(f"  🩺 Creando 100 controles de salud para {finca.name}...")
            for i in range(100):
                Control.create(
                    animal_id=choice(all_animals).id,
                    checkup_date=date.today() - timedelta(days=randint(0, 365)),
                    weight=uniform(100.0, 700.0),
                    height=uniform(1.0, 1.8),
                    description=f"Control rutinario #{i}",
                    health_status=choice(list(HealthStatus)),
                    finca_id=finca.id
                )

            # 7. Tareas (100 registros)
            print(f"  📋 Creando 100 tareas para {finca.name}...")
            for i in range(100):
                Tasks.create(
                    title=f"Tarea Crítica #{i}",
                    description=f"Descripción de la tarea operativa #{i}",
                    status=choice(list(TaskStatus)),
                    priority=choice(list(TaskPriority)),
                    due_date=datetime.now() + timedelta(days=randint(-10, 30)),
                    assigned_to=admin.id if admin else None,
                    finca_id=finca.id
                )

            # 8. Gastos Operativos (100 registros)
            print(f"  💰 Creando 100 gastos operativos para {finca.name}...")
            for i in range(100):
                OperationalCost.create(
                    concept=f"Gasto operativo #{i}",
                    amount=uniform(50000, 2000000),
                    date=date.today() - timedelta(days=randint(0, 365)),
                    category=choice(list(OperationalCategory)),
                    finca_id=finca.id
                )

            # 9. Inventario (100 registros/lotes)
            print(f"  📦 Creando 100 lotes de inventario para {finca.name}...")
            for i in range(100):
                InventoryLot.create(
                    finca_id=finca.id,
                    product_type=choice(list(ProductType)),
                    lot_number=f"LOTE-{randint(1000, 9999)}",
                    quantity=randint(50, 500),
                    current_quantity=randint(0, 50),
                    unit=choice(["cm3", "kg", "unidades", "bolsas"]),
                    unit_cost=uniform(1000, 50000),
                    expiry_date=date.today() + timedelta(days=randint(30, 700))
                )

            # 10. Reproducción (100 registros)
            print(f"  🧬 Creando 100 eventos reproductivos para {finca.name}...")
            for i in range(100):
                if females:
                    ReproductiveEvent.create(
                        animal_id=choice(females).id,
                        event_date=date.today() - timedelta(days=randint(0, 500)),
                        event_type=choice(list(EventType)),
                        diagnosis_result=choice(list(DiagnosisResult)),
                        notes=f"Evento reproductivo #{i}",
                        finca_id=finca.id
                    )

            # 10.1 Mejoras Genéticas (GeneticImprovements)
            print(f"  🧪 Creando 100 mejoras genéticas para {finca.name}...")
            for i in range(100):
                if females:
                    GeneticImprovements.create(
                        animal_id=choice(females).id,
                        date=date.today() - timedelta(days=randint(0, 500)),
                        genetic_event_technique=choice(["Inseminación Artificial", "Transferencia de Embriones", "Monta Natural"]),
                        results=choice(["Positivo", "Pendiente", "Negativo"]),
                        details=f"Mejora genética #{i}",
                        finca_id=finca.id
                    )

            # 10.2 Crías (Offspring)
            print(f"  👶 Creando registros de crías para {finca.name}...")
            repr_events = ReproductiveEvent.query.filter_by(finca_id=finca.id, event_type=EventType.Parto).limit(50).all()
            for ev in repr_events:
                Offspring.create(
                    birth_event_id=ev.id,
                    animal_id=ev.animal_id,
                    sex=choice(list(Sex)),
                    alive=True,
                    birth_weight=uniform(25.0, 45.0),
                    finca_id=finca.id
                )

            # 11. Vacunaciones (100 registros)
            print(f"  💉 Creando 100 vacunaciones para {finca.name}...")
            vaccine_list = Vaccines.query.all()
            if not vaccine_list:
                v = Vaccines.create(name="Fiebre Aftosa", dosis="2ml", route_administration_id=route_objs[0].id, type=VaccineType.Inactivada, target_disease_id=diseases[0].id)
                vaccine_list = [v]
            
            for i in range(100):
                Vaccinations.create(
                    animal_id=choice(all_animals).id,
                    vaccine_id=choice(vaccine_list).id,
                    vaccination_date=date.today() - timedelta(days=randint(0, 365)),
                    finca_id=finca.id,
                    next_due_date=date.today() + timedelta(days=180)
                )

            # 12. Medicamentos y Tratamientos
            print(f"  💊 Creando medicamentos y tratamientos para {finca.name}...")
            from app.models.medications import Medications
            from app.models.treatment_medications import TreatmentMedications
            from app.models.treatment_vaccines import TreatmentVaccines
            
            med_list = Medications.query.all()
            if not med_list:
                m = Medications.create(name="Ivermectina", description="Antiparasitario", dosis="1ml/50kg", route_administration_id=route_objs[0].id)
                med_list = [m]
            
            for i in range(100):
                t = Treatments.create(
                    animal_id=choice(all_animals).id,
                    treatment_date=date.today() - timedelta(days=randint(0, 30)),
                    description=f"Tratamiento curativo #{i}",
                    finca_id=finca.id,
                    dosis="10cc",
                    frequency="Cada 24 horas",
                    observations="Suministrado por vía IM"
                )
                # Asociar medicamento
                TreatmentMedications.create(
                    treatment_id=t.id,
                    medication_id=choice(med_list).id,
                    finca_id=finca.id
                )
                # Asociar vacuna (opcional en tratamientos)
                if i % 5 == 0:
                    TreatmentVaccines.create(
                        treatment_id=t.id,
                        vaccine_id=choice(vaccine_list).id,
                        finca_id=finca.id
                    )

            # 12.1 Enfermedades Animales (AnimalDiseases)
            print(f"  🏥 Registrando enfermedades para {finca.name}...")
            for i in range(50):
                AnimalDiseases.create(
                    animal_id=choice(all_animals).id,
                    disease_id=choice(diseases).id,
                    instructor_id=admin.id if admin else 1,
                    diagnosis_date=date.today() - timedelta(days=randint(0, 100)),
                    status="En Tratamiento",
                    notes=f"Caso clínico #{i}",
                    finca_id=finca.id
                )

            # 12.2 Movimientos de Inventario (InventoryMovement)
            print(f"  🔄 Generando movimientos de inventario para {finca.name}...")
            lots = InventoryLot.query.filter_by(finca_id=finca.id).all()
            for lot in lots[:50]:
                InventoryMovement.create(
                    lot_id=lot.id,
                    movement_type=choice(list(MovementType)),
                    quantity=randint(1, 10),
                    notes="Movimiento de auditoría",
                    finca_id=finca.id
                )

            # 13. Tipos de Alimentación
            print(f"  🌾 Creando tipos de alimentación para {finca.name}...")
            if FoodTypes.query.filter_by(finca_id=finca.id).count() == 0:
                for ft_name in ["Pasto Kikuyo", "Silaje de Maíz", "Concentrado Proteico", "Sales Minerales"]:
                    FoodTypes.create(
                        food_type=ft_name,
                        handlings="Manejo estándar orgánico",
                        finca_id=finca.id,
                        sowing_date=date.today() - timedelta(days=90),
                        area=10,
                        gauges="Calibre A"
                    )

            # 14. Infraestructura
            print(f"  🏗️ Creando infraestructura para {finca.name}...")
            if Infrastructure.query.filter_by(finca_id=finca.id).count() == 0:
                infra_types = list(InfrastructureType)
                for i, infra_name in enumerate(["Corral Principal", "Báscula Mecánica", "Tanque de Enfriamiento", "Bodega de Insumos"]):
                    Infrastructure.create(
                        name=infra_name, 
                        type=infra_types[i % len(infra_types)],
                        status="Bueno", 
                        finca_id=finca.id
                    )

            # 15. Activity Log
            print(f"  📝 Generando logs de actividad para {finca.name}...")
            from app.models.activity_log import ActivityLog
            for i in range(50):
                ActivityLog.create(
                    actor_id=admin.id if admin else 1,
                    action="CREATE",
                    entity="Animal",
                    entity_id=choice(all_animals).id,
                    description=f"Registro automático de animal via seed",
                    finca_id=finca.id,
                    severity="info"
                )

            # 16. Fuentes de Agua y Mediciones
            print(f"  💧 Creando fuentes de agua para {finca.name}...")
            from app.models.campesino import WaterSource, WaterMeasurement, WaterSourceType
            if WaterSource.query.filter_by(finca_id=finca.id).count() == 0:
                ws = WaterSource.create(
                    name="Quebrada Principal", 
                    source_type=WaterSourceType.STREAM, 
                    reliability="Alta", 
                    finca_id=finca.id
                )
                for i in range(10):
                    WaterMeasurement.create(
                        water_source_id=ws.id,
                        measured_at=datetime.now() - timedelta(days=i*3),
                        flow_liters_minute=uniform(1.5, 5.0),
                        notes="Medición de rutina",
                        finca_id=finca.id
                    )

            # 17. Aforos de Pasto
            print(f"  🌱 Creando aforos de pasto para {finca.name}...")
            from app.models.operational import PastureAforo
            fields_list = Fields.query.filter_by(finca_id=finca.id).all()
            if fields_list:
                for fld in fields_list[:5]:
                    PastureAforo.create(
                        field_id=fld.id,
                        entry_height=uniform(30.0, 45.0),
                        exit_height=uniform(5.0, 15.0),
                        pasture_quality=randint(3, 5),
                        notes="Aforo de rotación",
                        finca_id=finca.id
                    )

            db.session.commit()
        print("\n✅ Base de datos poblada exitosamente con 100+ registros por tabla.")

if __name__ == "__main__":
    seed_100()
