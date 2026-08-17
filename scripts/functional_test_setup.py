import sys
import os

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from test_credentials import get_seed_password

from app import create_app, db
from app.models.finca import Finca, FarmType
from app.models.user import User, Role, ApprovalStatus
from app.models.user_finca import UserFinca
from app.models.producer_profiles import ProducerProfile, ProducerType
from app.models.territory import Territory
from app.models.animals import Animals, Gender, Purpose
from app.models.species import Species
from app.models.breeds import Breeds


def setup_functional_test():
    test_password = os.getenv("TEST_USER_PASSWORD") or get_seed_password()
    app = create_app()
    with app.app_context():
        print("🚀 Iniciando Setup de Prueba Funcional...")

        # 1. Obtener Territorio (Boyacá/Antioquia)
        boyaca_t = Territory.query.filter_by(department="Boyacá").first()
        if not boyaca_t:
            boyaca_t = Territory(
                name="Vereda Higueras",
                municipality="Duitama",
                department="Boyacá",
                vereda="Higueras",
            )
            db.session.add(boyaca_t)
            db.session.flush()

        antioquia_t = Territory.query.filter_by(municipality="Rionegro").first()

        # 2. Crear Fincas
        fincas = [
            {
                "name": "SENA Regional Boyacá - CEDEAGRO",
                "type": FarmType.Educativa,
                "t_id": boyaca_t.id,
                "mun": "Duitama",
                "dep": "Boyacá",
            },
            {
                "name": "Finca El Recuerdo (Ganadera)",
                "type": FarmType.Tradicional,
                "t_id": antioquia_t.id if antioquia_t else None,
                "mun": "Rionegro",
                "dep": "Antioquia",
            },
        ]

        fincas_map = {}
        for f in fincas:
            fobj = Finca.query.filter_by(name=f["name"]).first()
            if not fobj:
                fobj = Finca(
                    name=f["name"],
                    type=f["type"],
                    territory_id=f["t_id"],
                    municipality=f["mun"],
                    department=f["dep"],
                    is_active=True,
                )
                db.session.add(fobj)
                db.session.flush()
                print(f"✅ Finca creada: {f['name']}")
            fincas_map[f["name"]] = fobj

        # 3. Crear Usuarios
        users_data = [
            {
                "id": 3001,
                "name": "Instructor Boyacá",
                "email": "inst_boyaca@sena.edu.co",
                "phone": "3110000001",
                "role": Role.Instructor,
                "finca": "SENA Regional Boyacá - CEDEAGRO",
                "ptype": ProducerType.Institucional,
            },
            {
                "id": 4001,
                "name": "Don Pedro",
                "email": "pedro_recuerdo@gmail.com",
                "phone": "3110000002",
                "role": Role.Propietario,
                "finca": "Finca El Recuerdo (Ganadera)",
                "ptype": ProducerType.Comercial_Pequeno,
            },
        ]

        for ud in users_data:
            u = User.query.filter_by(identification=ud["id"]).first()
            if not u:
                u = User.create(
                    identification=ud["id"],
                    fullname=ud["name"],
                    email=ud["email"],
                    password=test_password,
                    phone=ud["phone"],
                    role=ud["role"],
                    finca_id=fincas_map[ud["finca"]].id,
                    status=True,
                    approval_status=ApprovalStatus.Approved,
                )
                print(f"✅ Usuario creado: {ud['name']}")

            if not UserFinca.query.filter_by(
                user_id=u.id, finca_id=fincas_map[ud["finca"]].id
            ).first():
                UserFinca.assign(
                    user_id=u.id, finca_id=fincas_map[ud["finca"]].id, role=ud["role"].value
                )

            if not ProducerProfile.query.filter_by(user_id=u.id).first():
                db.session.add(
                    ProducerProfile(
                        user_id=u.id,
                        producer_type=ud["ptype"],
                        land_tenure="Propia",
                        notes="Prueba Funcional",
                    )
                )

        # 4. Registrar Animal para Don Pedro
        finca_pedro = fincas_map["Finca El Recuerdo (Ganadera)"]
        species_bovina = Species.query.filter_by(name="Bovina").first()
        breed_holstein = Breeds.query.filter_by(name="Holstein").first()

        if not Animals.query.filter_by(name="Lucero", finca_id=finca_pedro.id).first():
            animal = Animals(
                finca_id=finca_pedro.id,
                species_id=species_bovina.id if species_bovina else 1,
                breed_id=breed_holstein.id if breed_holstein else 1,
                name="Lucero",
                gender=Gender.FEMALE,
                purpose=Purpose.MILK,
                birth_date="2022-05-10",
                status="active",
            )
            db.session.add(animal)
            print("✅ Animal 'Lucero' registrado para Don Pedro.")

        db.session.commit()
        print("✨ Setup de Prueba Funcional Completado.")


if __name__ == "__main__":
    setup_functional_test()
