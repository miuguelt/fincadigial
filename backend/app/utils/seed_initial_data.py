"""
⚠️ SEED DATA — Requiere ALLOW_SIMULATION_SCRIPTS=true
Este script genera datos de inicialización no determinísticos.
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("⛔ Seed deshabilitado. ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

from datetime import date, timedelta
from random import choice, randint, uniform

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app import create_app, db
from app.models import (
    Species,
    Breeds,
    Finca,
    FarmType,
    Animals,
    Fields,
    FoodTypes,
    Diseases,
    RouteAdministration,
    Vaccines,
    Medications,
    InventoryLot,
    MilkProduction,
)
from app.models.animals import AnimalStatus
from app.models.fields import LandStatus
from app.models.inventory import ProductType
from app.models.vaccines import VaccineType
from app.models.milk_production import MilkSession


def seed():
    app = create_app()
    with app.app_context():
        # Intentar localizar y borrar la DB para asegurar frescura
        db_path = os.path.join(app.instance_path, "test_finca.db")
        if os.path.exists(db_path):
            try:
                # Cerrar conexiones antes de borrar
                db.session.remove()
                db.engine.dispose()
                os.remove(db_path)
                print(f"🗑️ Base de datos eliminada en: {db_path}")
            except Exception as e:
                print(f"⚠️ No se pudo eliminar la DB: {e}")

        print(f"📡 DB URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        # Asegurar que las tablas existen
        db.create_all()

        print("🌱 Iniciando poblamiento maestro integral de VillaLuz...")

        # 1. Asegurar Finca
        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(
                name="Villa Luz", type=FarmType.Tradicional, department="Colombia"
            )
            print(f"✅ Finca creada: {finca.name}")

        # 2. Especies
        species_names = ["Bovino", "Equino", "Porcino", "Caprino"]
        for s_name in species_names:
            if not Species.query.filter_by(name=s_name).first():
                Species.create(name=s_name)
        print("✅ Especies sincronizadas")

        # 3. Razas
        bovino = Species.query.filter_by(name="Bovino").first()
        breeds_data = ["Holstein", "Jersey", "Brahman", "Gyr"]
        for b_name in breeds_data:
            if not Breeds.query.filter_by(name=b_name, species_id=bovino.id).first():
                Breeds.create(name=b_name, species_id=bovino.id)
        print("✅ Razas sincronizadas")

        # 4. Enfermedades (Globales)
        diseases_data = [
            {
                "name": "Aftosa",
                "symptoms": "Fiebre, llagas en boca",
                "details": "Enfermedad viral altamente contagiosa",
            },
            {
                "name": "Brucelosis",
                "symptoms": "Abortos",
                "details": "Enfermedad bacteriana zoonótica",
            },
            {
                "name": "Mastitis",
                "symptoms": "Inflamación ubre",
                "details": "Infección de la glándula mamaria",
            },
        ]
        for d in diseases_data:
            if not Diseases.query.filter_by(name=d["name"]).first():
                Diseases.create(**d)
        print("✅ Enfermedades sincronizadas")

        # 5. Rutas de Administración (Globales)
        routes = ["Intramuscular", "Subcutánea", "Oral", "Tópica"]
        for r_name in routes:
            if not RouteAdministration.query.filter_by(name=r_name).first():
                RouteAdministration.create(name=r_name)
        print("✅ Rutas de administración sincronizadas")

        # 6. Vacunas
        aftosa = Diseases.query.filter_by(name="Aftosa").first()
        im = RouteAdministration.query.filter_by(name="Intramuscular").first()
        if not Vaccines.query.filter_by(name="Vacuna Aftosa").first():
            Vaccines.create(
                name="Vacuna Aftosa",
                dosis="2ml",
                route_administration_id=im.id,
                vaccination_interval="6 meses",
                type=VaccineType.Inactivada,
                national_plan="Plan Nacional contra la Aftosa",
                target_disease_id=aftosa.id,
            )
        print("✅ Vacunas sincronizadas")

        # 7. Medicamentos
        if not Medications.query.filter_by(name="Oxitetraciclina").first():
            Medications.create(
                name="Oxitetraciclina",
                description="Antibiótico de amplio espectro",
                route_administration_id=im.id,
                availability=True,
            )
        print("✅ Medicamentos sincronizados")

        # 8. Tipos de Alimento
        food_data = [
            "Concentrado Lechería",
            "Silo de Maíz",
            "Sal Mineralizada",
            "Pasto de Corte",
        ]
        for food in food_data:
            if not FoodTypes.query.filter_by(food_type=food, finca_id=finca.id).first():
                FoodTypes.create(
                    food_type=food,
                    finca_id=finca.id,
                    sowing_date=date.today() - timedelta(days=90),
                    area=randint(1, 10),
                    handlings="Manejo estándar",
                    gauges="N/A",
                )
        print("✅ Alimentos sincronizados")

        # 9. Potreros (Fields)
        fields_data = [
            "Potrero Principal",
            "Lote Engorde",
            "Cuna Terneros",
            "Reserva Forestal",
        ]
        for f_name in fields_data:
            if not Fields.query.filter_by(name=f_name, finca_id=finca.id).first():
                Fields.create(
                    name=f_name,
                    finca_id=finca.id,
                    area=str(round(uniform(5.0, 20.0), 1)),
                    state=LandStatus.Disponible,
                )
        print("✅ Potreros sincronizados")

        # 10. Animales
        if Animals.query.count() < 2:
            holstein = Breeds.query.filter_by(name="Holstein").first()
            Animals.create(
                record="VACA-001",
                birth_date=date.today() - timedelta(days=1000),
                weight=450.0,
                breeds_id=holstein.id,
                sex="Hembra",
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
            )
            Animals.create(
                record="TORO-001",
                birth_date=date.today() - timedelta(days=1200),
                weight=750.0,
                breeds_id=holstein.id,
                sex="Macho",
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
            )
            print("✅ Animales base creados")

        # 11. Producción de Leche
        if MilkProduction.query.count() == 0:
            vaca = Animals.query.filter_by(record="VACA-001").first()
            if vaca:
                for i in range(10):
                    MilkProduction.create(
                        animal_id=vaca.id,
                        finca_id=finca.id,
                        date=date.today() - timedelta(days=i),
                        liters=round(uniform(15.0, 25.0), 1),
                        milking_session=choice([MilkSession.AM, MilkSession.PM]),
                    )
                print("✅ Producción de leche histórica creada")

        # 12. Lotes de Inventario
        if not InventoryLot.query.first():
            med = Medications.query.first()
            InventoryLot.create(
                finca_id=finca.id,
                product_type=ProductType.Medicamento,
                medication_id=med.id if med else None,
                lot_number=f"LOT-{randint(100, 999)}",
                quantity=100,
                current_quantity=85,
                unit="cm3",
                unit_cost=1500.0,
                expiry_date=date.today() + timedelta(days=365),
            )
            print("✅ Lote de inventario inicial creado")

        db.session.commit()
        print("\n✨ Ecosistema VillaLuz poblado íntegramente.")


if __name__ == "__main__":
    seed()
