"""
🚀 SEEDER PROFESIONAL 4VILLALUZ
Puebla usuarios, fincas y animales para un inicio inmediato.
"""
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.species import Species
from app.models.breeds import Breeds

app = create_app('development')

def seed():
    with app.app_context():
        print("🌱 Iniciando población de datos...")

        # 1. Asegurar Finca Principal
        finca = Finca.query.filter_by(name="Villa Luz").first()
        if not finca:
            finca = Finca(
                name="Villa Luz",
                type="Educativa",
                municipality="Municipio de Prueba",
                department="Cundinamarca",
                is_active=True
            )
            db.session.add(finca)
            db.session.commit()
            print("✅ Finca 'Villa Luz' creada.")

        # 2. Especies y Razas Base (si no existen)
        especie = Species.query.filter_by(name="Bovino").first()
        if not especie:
            especie = Species(name="Bovino", description="Ganado vacuno")
            db.session.add(especie)
            db.session.commit()
        
        raza = Breeds.query.filter_by(name="Holstein").first()
        if not raza:
            raza = Breeds(name="Holstein", species_id=especie.id)
            db.session.add(raza)
            db.session.commit()

        # 3. Usuarios de Prueba
        USUARIOS = [
            {'id': '1098',     'name': 'Admin VillaLuz',   'role': Role.Administrador, 'pass': 'Villaluz2024!'},
            {'id': '11111111', 'name': 'Instructor Jefe',  'role': Role.Instructor,    'pass': 'Villaluz2024!'},
            {'id': '22222222', 'name': 'Aprendiz SENA 1',  'role': Role.Aprendiz,      'pass': 'Villaluz2024!'},
            {'id': '33333333', 'name': 'María Operaria',   'role': Role.Operario,      'pass': 'Villaluz2024!'},
            {'id': '44444444', 'name': 'Dr. Martínez Vet', 'role': Role.Veterinario,   'pass': 'Villaluz2024!'},
        ]

        for u_data in USUARIOS:
            user = User.query.filter_by(identification=u_data['id']).first()
            if not user:
                user = User(
                    identification=u_data['id'],
                    fullname=u_data['name'],
                    email=f"user_{u_data['id']}@villaluz.co",
                    role=u_data['role'],
                    approval_status=ApprovalStatus.Approved,
                    finca_id=finca.id
                )
                user.set_password(str(u_data['pass']))
                db.session.add(user)
                print(f"✅ Usuario {u_data['name']} creado.")
            else:
                user.finca_id = finca.id # Asegurar link
                user.approval_status = ApprovalStatus.Approved
                user.set_password(str(u_data['pass'])) # Forzar reset en dev
        
        db.session.commit()

        # 4. Animales para AI Insights
        if Animals.query.count() < 5:
            animales_data = [
                {'record': 'VL-001', 'name': 'Bessie', 'weight': 450.5},
                {'record': 'VL-002', 'name': 'Clara',  'weight': 420.0},
                {'record': 'VL-003', 'name': 'Daisy',  'weight': 480.2},
            ]
            for a in animales_data:
                nuevo = Animals(
                    record=a['record'],
                    weight=int(a['weight']),
                    sex=Sex.Hembra,
                    status=AnimalStatus.Vivo,
                    finca_id=finca.id,
                    breeds_id=raza.id,
                    birth_date=datetime(2022, 1, 1).date()
                )
                db.session.add(nuevo)
            db.session.commit()
            print("✅ Animales de prueba creados para análisis.")

        print("\n🚀 ¡Base de datos lista para usar!")

if __name__ == "__main__":
    seed()

