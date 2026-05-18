"""
Script de reset de contraseñas de usuarios de prueba.
Ejecutar directamente en Windows con el venv_win.
"""
import os
import sys

# Cargar .env
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.user import User

app = create_app('development')

USUARIOS = [
    {'identification': '1098',     'password': 'Villaluz2024!', 'role': 'Administrador'},
    {'identification': '11111111', 'password': 'Villaluz2024!', 'role': 'Instructor'},
    {'identification': '22222222', 'password': 'Villaluz2024!', 'role': 'Aprendiz'},
    {'identification': '55555555', 'password': 'Villaluz2024!', 'role': 'Operario'},
    {'identification': '66666666', 'password': 'Villaluz2024!', 'role': 'Veterinario'},
    {'identification': '9999',     'password': 'Villaluz2024!', 'role': 'Administrador'},
]

with app.app_context():
    for u_data in USUARIOS:
        user = User.query.filter_by(identification=u_data['identification']).first()
        if user:
            user.set_password(u_data['password'])
            user.status = True
            from app.models.user import ApprovalStatus
            user.approval_status = ApprovalStatus.Approved
            db.session.commit()
            print(f"✅ Contraseña y estado actualizados: {u_data['identification']} ({u_data['role']}) -> '{u_data['password']}'")
        else:
            print(f"❌ Usuario no encontrado: {u_data['identification']}")

    print("\n✅ Proceso completo.")
    print("\n=== Credenciales para el frontend ===")
    for u in USUARIOS:
        print(f"  ID: {u['identification']:<12} | Pass: {u['password']:<15} | Rol: {u['role']}")
