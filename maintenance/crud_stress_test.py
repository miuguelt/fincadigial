import os
import sys
import time
from datetime import date, datetime, timedelta
import random

# Añadir el path del backend para poder importar la app
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)
os.chdir(backend_path) # Cambiar al directorio del backend para que las rutas relativas de config funcionen

from app import create_app, db
from app.models import User, Finca, Species, Breeds, Animal, MilkProduction, FarmType, Role
from app.models.animals import Sex, AnimalStatus
from app.models.milk_production import MilkSession

def run_crud_test():
    app = create_app('testing')
    results = []

    with app.app_context():
        # Asegurar que la base de datos existe
        db.create_all()

        print("\n🚀 Iniciando Prueba de Estrés CRUD VillaLuz...")
        print("-" * 50)

        tables_to_test = [
            {"model": Finca, "name": "Finca"},
            {"model": User, "name": "User"},
            {"model": Species, "name": "Species"},
            {"model": Breeds, "name": "Breeds"},
            {"model": Animal, "name": "Animal"},
            {"model": MilkProduction, "name": "MilkProduction"}
        ]

        # Necesitamos datos base para las relaciones
        test_finca = None
        test_user = None
        test_species = None
        test_breed = None
        test_animal = None

        for table in tables_to_test:
            model = table["model"]
            name = table["name"]
            print(f"📦 Procesando tabla: {name}")

            try:
                start_time = time.time()

                # 1. CREATE (10 registros)
                created_ids = []
                for i in range(1, 11):
                    data = {}
                    if name == "Finca":
                        data = {"name": f"Finca Test {i} - {time.time()}", "type": FarmType.Tradicional}
                    elif name == "User":
                        if not test_finca: test_finca = Finca.query.first()
                        data = {
                            "identification": random.randint(10000000, 99999999),
                            "fullname": f"User Test {i}",
                            "email": f"test_{i}_{int(time.time())}@villaluz.com",
                            "phone": f"300{random.randint(1000000, 9999999)}",
                            "role": Role.Operario,
                            "password": "password123",
                            "finca_id": test_finca.id
                        }
                    elif name == "Species":
                        data = {"name": f"Especie {i} - {time.time()}"}
                    elif name == "Breeds":
                        if not test_species: test_species = Species.query.first()
                        data = {"name": f"Raza {i} - {time.time()}", "species_id": test_species.id}
                    elif name == "Animal":
                        if not test_finca: test_finca = Finca.query.first()
                        if not test_breed: test_breed = Breeds.query.first()
                        data = {
                            "record": f"REC-{i}-{int(time.time())}",
                            "sex": random.choice([Sex.Hembra, Sex.Macho]),
                            "birth_date": date.today() - timedelta(days=random.randint(300, 1000)),
                            "weight": random.uniform(100.0, 500.0),
                            "finca_id": test_finca.id,
                            "breeds_id": test_breed.id,
                            "status": AnimalStatus.Vivo
                        }
                    elif name == "MilkProduction":
                        if not test_animal: test_animal = Animal.query.filter_by(sex=Sex.Hembra).first()
                        if not test_animal: # Crear uno rápido si no hay hembras
                            test_animal = Animal.create(
                                record=f"MAMA-{int(time.time())}",
                                sex=Sex.Hembra,
                                birth_date=date.today() - timedelta(days=1000),
                                weight=450.0,
                                finca_id=test_finca.id,
                                breeds_id=test_breed.id,
                                status=AnimalStatus.Vivo
                            )
                        data = {
                            "animal_id": test_animal.id,
                            "date": date.today() - timedelta(days=i),
                            "liters": random.uniform(5.0, 25.0),
                            "milking_session": random.choice([MilkSession.AM, MilkSession.PM]),
                            "finca_id": test_finca.id
                        }

                    obj = model.create(**data)
                    created_ids.append(obj.id)

                db.session.commit()
                create_duration = time.time() - start_time

                # Asignar datos base para siguientes tablas
                if name == "Finca" and not test_finca: test_finca = Finca.query.get(created_ids[0])
                if name == "Species" and not test_species: test_species = Species.query.get(created_ids[0])
                if name == "Breeds" and not test_breed: test_breed = Breeds.query.get(created_ids[0])
                if name == "Animal" and not test_animal: test_animal = Animal.query.get(created_ids[0])

                # 2. READ
                read_start = time.time()
                all_objs = model.query.filter(model.id.in_(created_ids)).all()
                read_duration = time.time() - read_start

                # 3. UPDATE (1 registro)
                update_start = time.time()
                target = model.query.get(created_ids[0])
                if name == "Finca": target.update(name=f"Finca Actualizada {int(time.time())}")
                elif name == "Animal": target.update(weight=target.weight + 10.5)
                elif name == "MilkProduction": target.update(liters=30.0)
                db.session.commit()
                update_duration = time.time() - update_start

                # 4. DELETE (1 registro)
                delete_start = time.time()
                target_del = model.query.get(created_ids[-1])
                target_del.delete()
                db.session.commit()
                delete_duration = time.time() - delete_start

                results.append({
                    "Tabla": name,
                    "Creados": 10,
                    "T_Create": f"{create_duration:.4f}s",
                    "T_Read": f"{read_duration:.4f}s",
                    "T_Update": f"{update_duration:.4f}s",
                    "T_Delete": f"{delete_duration:.4f}s",
                    "Estado": "✅ OK"
                })

            except Exception as e:
                print(f"❌ Error en tabla {name}: {str(e)}")
                results.append({
                    "Tabla": name,
                    "Creados": 0,
                    "T_Create": "-",
                    "T_Read": "-",
                    "T_Update": "-",
                    "T_Delete": "-",
                    "Estado": f"❌ Error: {str(e)[:20]}..."
                })

        # Mostrar tabla de resultados
        print("\n📊 TABLA DE RESULTADOS - CRUD VILLALUZ")
        print("=" * 85)
        print(f"{'Tabla':<15} | {'Creados':<7} | {'Create':<10} | {'Read':<10} | {'Update':<10} | {'Delete':<10} | {'Estado'}")
        print("-" * 85)
        for r in results:
            print(f"{r['Tabla']:<15} | {r['Creados']:<7} | {r['T_Create']:<10} | {r['T_Read']:<10} | {r['T_Update']:<10} | {r['T_Delete']:<10} | {r['Estado']}")
        print("=" * 85)

if __name__ == "__main__":
    run_crud_test()
