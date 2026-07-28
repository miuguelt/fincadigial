from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType

app = create_app('development')

# Single source of truth for local test users. Keep in sync with DEV_CREDENTIALS.md
# and with the quick-access buttons in frontend/src/pages/auth/login/index.tsx.
DEV_PASSWORD = 'Villaluz2024!'

USUARIOS = [
    {'identification': '1098',     'fullname': 'Admin VillaLuz',     'email': 'test_admin@villaluz.com',  'role': 'Administrador', 'password': DEV_PASSWORD},
    {'identification': '55555555', 'fullname': 'Don Carlos Dueño',   'email': 'propietario@villaluz.co',  'role': 'Propietario',   'password': DEV_PASSWORD},
    {'identification': '66666666', 'fullname': 'Capataz Pedro',      'email': 'capataz@villaluz.co',      'role': 'Capataz',       'password': DEV_PASSWORD},
    {'identification': '11111111', 'fullname': 'Instructor Jefe',    'email': 'instructor@sena.edu.co',   'role': 'Instructor',    'password': DEV_PASSWORD},
    {'identification': '22222222', 'fullname': 'Aprendiz SENA 1',    'email': 'aprendiz@sena.edu.co',     'role': 'Aprendiz',      'password': DEV_PASSWORD},
    {'identification': '33333333', 'fullname': 'María Operaria',     'email': 'operario@villaluz.co',     'role': 'Operario',      'password': DEV_PASSWORD},
    {'identification': '44444444', 'fullname': 'Dr. Martínez Vet',   'email': 'veterinario@villaluz.co',  'role': 'Veterinario',   'password': DEV_PASSWORD},
]

def sync():
    with app.app_context():
        # 1. Asegurar que existe al menos una finca
        finca = Finca.query.first()
        if not finca:
            print("🏠 Creando finca por defecto...")
            finca = Finca.create(name='Finca Villa Luz', type=FarmType.Educativa)
            print(f"✅ Finca creada: {finca.name} (ID: {finca.id})")

        for u_data in USUARIOS:
            user = User.query.filter_by(identification=u_data['identification']).first()

            if user:
                print(f"🔄 Sincronizando usuario existente: {u_data['identification']} ({user.fullname})")
                user.update(
                    password=u_data['password'],
                    status=True,
                    approval_status=ApprovalStatus.Approved,
                    role=Role(u_data['role']),
                    email=u_data['email'] # Asegurar email correcto para login
                )
                print("   ✅ OK")
            else:
                print(f"🆕 Creando nuevo usuario de prueba: {u_data['identification']} ({u_data['fullname']})")
                User.create(
                    identification=u_data['identification'],
                    fullname=u_data['fullname'],
                    email=u_data['email'],
                    password=u_data['password'],
                    role=Role(u_data['role']),
                    phone=f"300{u_data['identification'][-7:]}" if len(u_data['identification']) >= 7 else "3000000000",
                    finca_id=finca.id,
                    status=True,
                    approval_status=ApprovalStatus.Approved
                )
                print("   ✅ Creado")

        db.session.commit()
        print(f"\n🚀 {len(USUARIOS)} usuarios de prueba sincronizados (password: {DEV_PASSWORD}).")

if __name__ == "__main__":
    sync()
