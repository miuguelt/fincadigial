from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType

app = create_app('development')

USUARIOS = [
    {'identification': '1098',     'fullname': 'Administrador VillaLuz', 'email': 'admin@villaluz.com', 'role': 'Administrador'},
    {'identification': '10203040', 'fullname': 'Instructor SENA',        'email': 'instructor@sena.edu.co', 'role': 'Instructor'},
    {'identification': '11223344', 'fullname': 'Aprendiz SENA',          'email': 'aprendiz@sena.edu.co', 'role': 'Aprendiz'},
    {'identification': '9999',     'fullname': 'Test Admin',             'email': 'test@villaluz.com',  'role': 'Administrador'},
    {'identification': '12345678', 'fullname': 'Usuario Genérico',       'email': 'user@villaluz.com',  'role': 'Administrador'},
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
                    password='Villaluz2024!',
                    status=True,
                    approval_status=ApprovalStatus.Approved,
                    role=Role(u_data['role']),
                    email=u_data['email'] # Asegurar email correcto para login
                )
                print(f"   ✅ OK")
            else:
                print(f"🆕 Creando nuevo usuario de prueba: {u_data['identification']} ({u_data['fullname']})")
                User.create(
                    identification=u_data['identification'],
                    fullname=u_data['fullname'],
                    email=u_data['email'],
                    password='Villaluz2024!',
                    role=Role(u_data['role']),
                    phone=f"300{u_data['identification'][-7:]}" if len(u_data['identification']) >= 7 else "3000000000",
                    finca_id=finca.id,
                    status=True,
                    approval_status=ApprovalStatus.Approved
                )
                print(f"   ✅ Creado")
        
        db.session.commit()
        print("\n🚀 Todos los usuarios de prueba han sido sincronizados con la contraseña 'Villaluz2024!'.")

if __name__ == "__main__":
    sync()
