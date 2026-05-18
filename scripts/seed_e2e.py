
import os
import sys

# Añadir ruta del backend al path
backend_path = os.path.join(os.getcwd(), 'BackFinca')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType
from app.models.user_finca import UserFinca

def seed_e2e_users():
    app = create_app('development')
    
    with app.app_context():
        db.create_all()
        print("🌱 Seeding E2E Test Users...")
        
        # 1. Asegurar Finca 1
        finca = Finca.query.get(1)
        if not finca:
            finca = Finca(
                id=1,
                name='Villa Luz - E2E',
                type=FarmType.Educativa,
                department='Antioquia',
                municipality='Medellín'
            )
            db.session.add(finca)
            db.session.commit()
            print("✓ Finca 1 creada")
        
        test_users = [
            {
                'identification': 1098,
                'fullname': 'Admin E2E',
                'email': 'admin@villaluz.com',
                'phone': '3001098',
                'role': 'Administrador',
                'password': 'Admin1234!'
            },
            {
                'identification': 11111111,
                'fullname': 'Instructor E2E',
                'email': 'instructor@villaluz.com',
                'phone': '3001111',
                'role': 'Instructor',
                'password': 'Instructor1234!'
            },
            {
                'identification': 22222222,
                'fullname': 'Aprendiz E2E',
                'email': 'aprendiz@villaluz.com',
                'phone': '3002222',
                'role': 'Aprendiz',
                'password': 'Aprendiz1234!'
            },
            {
                'identification': 55555555,
                'fullname': 'Operario E2E',
                'email': 'operario@villaluz.com',
                'phone': '3005555',
                'role': 'Operario',
                'password': 'Operario1234!'
            },
            {
                'identification': 66666666,
                'fullname': 'Veterinario E2E',
                'email': 'veterinario@villaluz.com',
                'phone': '3006666',
                'role': 'Veterinario',
                'password': 'Veterinario1234!'
            }
        ]
        
        for u_data in test_users:
            user = User.query.filter_by(identification=u_data['identification']).first()
            if not user:
                # Usar User.create para manejar set_password y UserFinca.assign automáticamente
                user = User.create(
                    identification=u_data['identification'],
                    fullname=u_data['fullname'],
                    email=u_data['email'],
                    phone=u_data['phone'],
                    role=u_data['role'],
                    password=u_data['password'],
                    finca_id=finca.id,
                    status=True,
                    approval_status=ApprovalStatus.Approved,
                    commit=True
                )
                print(f"✓ Usuario creado: {u_data['fullname']} ({u_data['role']})")
            else:
                print(f"✓ Usuario ya existe: {u_data['fullname']}")
                
        print("✅ E2E Seed Complete")

if __name__ == "__main__":
    seed_e2e_users()
