"""
⚠️ SIMULACIÓN — NO USAR EN PRODUCCIÓN
Genera datos aleatorios de producción láctea y finanzas.
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("⛔ Simulación deshabilitada. ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

import random
from datetime import date, timedelta
from decimal import Decimal

backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def seed_dashboard_data():
    from app import create_app, db
    from app.models.finca import Finca
    from app.models.animals import Animals
    from app.models.milk_production import MilkProduction, MilkSession
    from app.models.financial import Transaction, TransactionType, TransactionCategory

    app = create_app("development")
    with app.app_context():
        print(
            "🐄 [SEED] Iniciando poblado de producción láctea y finanzas para todas las fincas..."
        )
        fincas = Finca.query.all()
        if not fincas:
            print("❌ [ERROR] No hay fincas.")
            return

        for finca in fincas:
            print(f"🌱 [SEED] Sembrando datos para Finca ID: {finca.id} - {finca.name}")
            animals = Animals.query.filter_by(finca_id=finca.id).all()
            females = [
                a
                for a in animals
                if str(a.sex) == "Hembra" or getattr(a.sex, "value", "") == "Hembra"
            ]

            if not females:
                print(f"⚠️ [WARN] No hay hembras en la finca {finca.id}. Creando hembras base...")
                # Crear al menos 5 hembras para tener producción
                from app.models.breeds import Breeds

                breed = Breeds.query.first()
                if breed:
                    for i in range(5):
                        female = Animals(
                            record=f"HEMBRA-{finca.id}-{i}",
                            sex="Hembra",
                            breeds_id=breed.id,
                            birth_date=date.today() - timedelta(days=1000),
                            weight=400.0,
                            status="Vivo",
                            finca_id=finca.id,
                        )
                        db.session.add(female)
                        females.append(female)
                    db.session.commit()

            if females:
                print(f"🥛 [SEED] Generando Producción Láctea para Finca {finca.id}...")
                for day in range(90):
                    d = date.today() - timedelta(days=day)
                    for female in females:
                        if random.random() > 0.2:
                            liters_am = round(random.uniform(5.0, 15.0), 1)
                            db.session.add(
                                MilkProduction(
                                    animal_id=female.id,
                                    finca_id=finca.id,
                                    date=d,
                                    liters=liters_am,
                                    milking_session=MilkSession.AM,
                                    fat_percentage=round(random.uniform(3.0, 4.5), 1),
                                    protein_percentage=round(random.uniform(2.8, 3.8), 1),
                                    somatic_cells=random.randint(100000, 300000),
                                )
                            )
                            liters_pm = round(random.uniform(4.0, 12.0), 1)
                            db.session.add(
                                MilkProduction(
                                    animal_id=female.id,
                                    finca_id=finca.id,
                                    date=d,
                                    liters=liters_pm,
                                    milking_session=MilkSession.PM,
                                    fat_percentage=round(random.uniform(3.0, 4.5), 1),
                                    protein_percentage=round(random.uniform(2.8, 3.8), 1),
                                )
                            )
                db.session.commit()

            print(f"💵 [SEED] Generando Finanzas para Finca {finca.id}...")
            categories_income = [
                TransactionCategory.Milk,
                TransactionCategory.Animal,
                TransactionCategory.Other,
            ]
            categories_expense = [
                TransactionCategory.Medication,
                TransactionCategory.Food,
                TransactionCategory.Service,
                TransactionCategory.Other,
            ]

            for day in range(90):
                d = date.today() - timedelta(days=day)
                for _ in range(random.randint(2, 5)):
                    t_type = random.choice(list(TransactionType))
                    if t_type == TransactionType.Income:
                        cat = random.choice(categories_income)
                        amount = Decimal(str(round(random.uniform(50000, 500000), 2)))
                    else:
                        cat = random.choice(categories_expense)
                        amount = Decimal(str(round(random.uniform(20000, 200000), 2)))

                    db.session.add(
                        Transaction(
                            finca_id=finca.id,
                            date=d,
                            transaction_type=t_type,
                            category=cat,
                            amount=amount,
                            description=f"[Simulado] Transacción automática de {cat.value}",
                        )
                    )
            db.session.commit()

        print("✅ [SEED] Datos de Dashboard completados para todas las fincas.")


if __name__ == "__main__":
    seed_dashboard_data()
