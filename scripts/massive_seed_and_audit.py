"""
⚠️ SIMULACIÓN — NO USAR EN PRODUCCIÓN
Genera datos masivos falsos para pruebas de estrés.
Requiere ALLOW_SIMULATION_SCRIPTS=true.
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("⛔ Simulación deshabilitada. ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

import random
from test_credentials import get_seed_password
from datetime import date, timedelta
import string

backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def generate_random_string(length=8):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def run_massive_seed_and_audit():
    from app import create_app, db
    from app.models.user import User, Role
    from app.models.finca import Finca, FarmType
    from app.models.species import Species
    from app.models.breeds import Breeds
    from app.models.animals import Animals, Sex, AnimalStatus
    from app.models.fields import Fields, LandStatus
    from app.models.diseases import Diseases
    from app.models.vaccines import Vaccines, VaccineType
    from app.models.medications import Medications
    from app.models.foodTypes import FoodTypes
    from app.models.route_administration import RouteAdministration
    from app.models.treatments import Treatments
    from app.models.treatment_medications import TreatmentMedications
    from app.models.treatment_vaccines import TreatmentVaccines
    from app.models.animalFields import AnimalFields
    from werkzeug.security import generate_password_hash

    app = create_app("development")

    with app.app_context():
        print("🧬 [GENESIS] Iniciando poblado masivo de base de datos...")

        # 0. Asegurar Finca
        default_finca = Finca.query.first()
        if not default_finca:
            default_finca = Finca(
                name="Villa Luz Principal",
                type=FarmType.Tradicional if hasattr(FarmType, "Tradicional") else "Tradicional",
                department="Cundinamarca",
                municipality="Zipaquira",
            )
            db.session.add(default_finca)
            db.session.commit()
            print(f"🏘️ [SEED] Finca creada: {default_finca.name}")

        # 1. Asegurar Admin
        admin = User.query.filter_by(identification=99999999).first()
        if not admin:
            admin = User(
                identification=99999999,
                fullname="Super Admin",
                email="admin99@finca.com",
                phone="9999999999",
                role=Role.Administrador if hasattr(Role, "Administrador") else "Administrador",
                password=generate_password_hash(get_seed_password()),
                status=True,
                finca_id=default_finca.id,
            )
            db.session.add(admin)

        # 2. Generar 20 Usuarios
        print("👥 [SEED] Generando Usuarios...")
        for i in range(20):
            uid = 10000000 + i
            u_email = f"usuario{i}@finca.com"
            u_phone = f"30000000{i:02d}"
            if not User.query.filter(
                (User.identification == uid) | (User.email == u_email) | (User.phone == u_phone)
            ).first():
                db.session.add(
                    User(
                        identification=uid,
                        fullname=f"Usuario Prueba {i}",
                        email=u_email,
                        phone=u_phone,
                        role=random.choice(list(Role)),
                        password=generate_password_hash(get_seed_password()),
                        status=True,
                        finca_id=default_finca.id,
                    )
                )

        # 3. Tipos de Alimento (20)
        print("🌾 [SEED] Generando Tipos de Alimento...")
        for i in range(20):
            ft_name = f"Alimento Premium {i}"
            if not FoodTypes.query.filter_by(food_type=ft_name, finca_id=default_finca.id).first():
                db.session.add(
                    FoodTypes(
                        food_type=ft_name,
                        sowing_date=date.today() - timedelta(days=90),
                        area=50,
                        handlings="Manejo estándar",
                        gauges="Medidor 1",
                        finca_id=default_finca.id,
                    )
                )
        db.session.commit()

        # 4. Potreros/Campos (20)
        print("🏞️ [SEED] Generando Potreros...")
        food_types = FoodTypes.query.all()
        for i in range(20):
            fname = f"Potrero Norte {i}"
            if not Fields.query.filter_by(name=fname, finca_id=default_finca.id).first():
                ft = random.choice(food_types)
                db.session.add(
                    Fields(
                        name=fname,
                        ubication=f"Bloque {i % 5}",
                        capacity="100",
                        state=random.choice(list(LandStatus)),
                        handlings="Rotacional",
                        gauges="1x1",
                        area="200",
                        food_type_id=ft.id,
                        finca_id=default_finca.id,
                    )
                )
        db.session.commit()

        # 5. Especies, Razas y Rutas (Asegurar base)
        species_bov = Species.query.filter_by(name="Bovino").first()
        if not species_bov:
            species_bov = Species(name="Bovino")
            db.session.add(species_bov)
            db.session.commit()

        breed = Breeds.query.filter_by(name="Angus").first()
        if not breed:
            breed = Breeds(name="Angus", species_id=species_bov.id)
            db.session.add(breed)
            db.session.commit()

        route = RouteAdministration.query.first()
        if not route:
            route = RouteAdministration(name="Intramuscular", description="IM")
            db.session.add(route)
            db.session.commit()

        # 6. Animales (20) con Genealogía aleatoria
        print("🐄 [SEED] Generando Animales y Genealogía...")
        for i in range(20):
            rec = f"ANIM-GEN-{i}-{generate_random_string(4)}"
            if not Animals.query.filter_by(record=rec, finca_id=default_finca.id).first():
                existing = Animals.query.filter_by(finca_id=default_finca.id).all()
                f_id, m_id = None, None
                if len(existing) > 2 and random.random() > 0.3:
                    males = [
                        a
                        for a in existing
                        if str(a.sex) == "Macho" or getattr(a.sex, "value", "") == "Macho"
                    ]
                    females = [
                        a
                        for a in existing
                        if str(a.sex) == "Hembra" or getattr(a.sex, "value", "") == "Hembra"
                    ]
                    if males:
                        f_id = random.choice(males).id
                    if females:
                        m_id = random.choice(females).id

                db.session.add(
                    Animals(
                        record=rec,
                        sex=random.choice(list(Sex)),
                        breeds_id=breed.id,
                        birth_date=date.today() - timedelta(days=random.randint(100, 2000)),
                        weight=random.uniform(40, 600),
                        status=random.choice(list(AnimalStatus)),
                        idFather=f_id,
                        idMother=m_id,
                        finca_id=default_finca.id,
                    )
                )
        db.session.commit()

        # 6.5 Asignación de Animales a Potreros
        print("🏞️ [SEED] Asignando Animales a Potreros (animal_fields)...")
        all_fields = Fields.query.filter_by(finca_id=default_finca.id).all()
        all_animals = Animals.query.filter_by(finca_id=default_finca.id).all()
        if all_fields and all_animals:
            for animal in all_animals:
                existing_af = AnimalFields.query.filter_by(
                    animal_id=animal.id, removal_date=None
                ).first()
                if not existing_af:
                    target_field = random.choice(all_fields)
                    db.session.add(
                        AnimalFields(
                            animal_id=animal.id,
                            field_id=target_field.id,
                            assignment_date=date.today() - timedelta(days=random.randint(1, 30)),
                            removal_date=None,
                            notes="Asignación inicial por seeder masivo",
                            finca_id=default_finca.id,
                        )
                    )
            db.session.commit()

        # 7. Enfermedades, Medicamentos, Vacunas (20 c/u)
        print("💊 [SEED] Generando Enfermedades, Medicamentos y Vacunas...")
        for i in range(20):
            d_name = f"Enfermedad {i}"
            if not Diseases.query.filter_by(name=d_name).first():
                db.session.add(Diseases(name=d_name, symptoms="Fiebre", details="N/A"))
        db.session.commit()

        diseases = Diseases.query.all()
        for i in range(20):
            m_name = f"Medicamento {i}"
            if not Medications.query.filter_by(name=m_name).first():
                db.session.add(
                    Medications(
                        name=m_name,
                        description="Antiinflamatorio",
                        dosis="5ml",
                        route_administration_id=route.id,
                        availability=True,
                    )
                )

            v_name = f"Vacuna {i}"
            if not Vaccines.query.filter_by(name=v_name).first():
                t_dis = random.choice(diseases) if diseases else None
                if t_dis:
                    db.session.add(
                        Vaccines(
                            name=v_name,
                            dosis="2ml",
                            route_administration_id=route.id,
                            vaccination_interval="Anual",
                            type=random.choice(list(VaccineType)),
                            national_plan="Si",
                            target_disease_id=t_dis.id,
                        )
                    )
        db.session.commit()

        # 8. Tratamientos (20) y relaciones N:M
        print("💉 [SEED] Generando Tratamientos y relaciones N:M...")
        animals = Animals.query.all()
        meds = Medications.query.all()
        vacs = Vaccines.query.all()
        for i in range(20):
            target_animal = random.choice(animals)
            treatment = Treatments(
                animal_id=target_animal.id,
                finca_id=default_finca.id,
                treatment_date=date.today() - timedelta(days=random.randint(1, 30)),
                description="Diagnóstico preventivo",
                frequency="Diaria",
                dosis="2ml",
                observations="Generado por auditoría masiva",
            )
            db.session.add(treatment)
            db.session.flush()  # Para obtener ID

            # N:M con Medicamentos
            if meds:
                db.session.add(
                    TreatmentMedications(
                        treatment_id=treatment.id, medication_id=random.choice(meds).id
                    )
                )

            # N:M con Vacunas
            if vacs:
                db.session.add(
                    TreatmentVaccines(treatment_id=treatment.id, vaccine_id=random.choice(vacs).id)
                )
        db.session.commit()

        print("✅ [GENESIS] Base de datos expandida exitosamente.")

        # --- AUDITORÍA CRUD DESDE FRONTEND ---
        print("\n🌐 [API AUDIT] Iniciando pruebas de estrés y auditoría de Endpoints...")
        client = app.test_client()

        res_login = client.post(
            "/api/v1/auth/login",
            json={"identification": 99999999, "password": get_seed_password()},
        )
        if res_login.status_code != 200:
            print(f"❌ [API] Fallo crítico de autenticación: {res_login.data}")
            return

        token = res_login.get_json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        endpoints_to_audit = [
            ("Users", "/api/v1/users/"),
            ("Animals", "/api/v1/animals/"),
            ("Fields", "/api/v1/fields/"),
            ("Diseases", "/api/v1/diseases/"),
            ("Vaccines", "/api/v1/vaccines/"),
            ("Medications", "/api/v1/medications/"),
        ]

        report = []
        for name, url in endpoints_to_audit:
            print(f"🔍 Auditando Endpoint: {name} ({url})...")
            import time

            start = time.time()
            res_list = client.get(f"{url}?limit=5", headers=headers)
            ms = (time.time() - start) * 1000

            status = res_list.status_code
            if status == 200:
                data = res_list.get_json()
                total = data.get("meta", {}).get("pagination", {}).get("total_items", "N/A")
                success_flag = data.get("success", False)
                report.append(
                    f"✅ {name:15} | GET List | {status} | {ms:.1f}ms | Total: {total} | Format: {'OK' if success_flag else 'WARN'}"
                )
            else:
                report.append(f"❌ {name:15} | GET List | {status} | {res_list.data[:50]}")

            if status == 200 and data.get("data"):
                first_item_id = data["data"][0]["id"]
                start = time.time()
                res_detail = client.get(f"{url}{first_item_id}", headers=headers)
                ms = (time.time() - start) * 1000
                report.append(f"✅ {name:15} | GET Det. | {res_detail.status_code} | {ms:.1f}ms")

                start = time.time()
                res_dep = client.get(f"{url}{first_item_id}/dependencies", headers=headers)
                ms = (time.time() - start) * 1000
                if res_dep.status_code == 200:
                    dep_data = res_dep.get_json()["data"]
                    report.append(
                        f"✅ {name:15} | GET Dep. | {res_dep.status_code} | {ms:.1f}ms | Bloqueos: {dep_data.get('totalDependencies', 0)}"
                    )
                else:
                    report.append(
                        f"⚠️ {name:15} | GET Dep. | {res_dep.status_code} | Endpoint no implementado o error"
                    )

        print("\n📊 --- REPORTE DE AUDITORÍA DE API ---")
        for line in report:
            print(line)


if __name__ == "__main__":
    try:
        run_massive_seed_and_audit()
    except Exception as e:
        print(f"🔥 [FATAL] Error durante la ejecución masiva: {e}")
        import traceback

        traceback.print_exc()
