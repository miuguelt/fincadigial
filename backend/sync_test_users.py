from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType

app = create_app('development')

import os
import json

# Intentar cargar desde el Single Source of Truth (devbrain IDENTITY.json)
identity_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "devbrain", "config", "IDENTITY.json"))
if not os.path.exists(identity_path):
    # Intentar ruta alternativa de proyectos adyacentes
    identity_path = "c:\\Users\\Miguel\\Documents\\Aplicaciones\\_projects\\devbrain\\config\\IDENTITY.json"

loaded_users = None
if os.path.exists(identity_path):
    try:
        with open(identity_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            loaded_users = data.get("test_users", [])
            print(f"📖 Cargados {len(loaded_users)} usuarios de prueba desde IDENTITY.json (SSOT)")
    except Exception as e:
        print(f"⚠️ Error al cargar IDENTITY.json: {e}")

if loaded_users:
    # Mapear las llaves del json al formato esperado
    USUARIOS = []
    for u in loaded_users:
        USUARIOS.append({
            'identification': str(u['identificacion']),
            'fullname': u['fullname'],
            'email': u['email'],
            'role': u['role'],
            'password': u.get('password', 'Villaluz2024!')
        })
else:
    # Fallback predeterminado si no se encuentra devbrain
    print("⚠️ Usando lista de usuarios fallback (devbrain no disponible)")
    USUARIOS = [
        {'identification': '1098',     'fullname': 'Admin VillaLuz',   'email': 'test_admin@villaluz.com', 'role': 'Administrador', 'password': 'Villaluz2024!'},
        {'identification': '11111111', 'fullname': 'Instructor Jefe',  'email': 'instructor@sena.edu.co',  'role': 'Instructor',    'password': 'Villaluz2024!'},
        {'identification': '22222222', 'fullname': 'Aprendiz SENA 1',  'email': 'aprendiz@sena.edu.co',    'role': 'Aprendiz',      'password': 'Villaluz2024!'},
        {'identification': '33333333', 'fullname': 'María Operaria',   'email': 'operario@villaluz.co',    'role': 'Operario',      'password': 'Villaluz2024!'},
        {'identification': '44444444', 'fullname': 'Dr. Martínez Vet', 'email': 'veterinario@villaluz.co', 'role': 'Veterinario',   'password': 'Villaluz2024!'},
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
                print(f"   ✅ OK")
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
                print(f"   ✅ Creado")
        
        db.session.commit()
        print("\n🚀 Todos los usuarios de prueba han sido sincronizados con el SSOT / Fallback exitosamente.")

if __name__ == "__main__":
    sync()
