#!/usr/bin/env python3
"""
Script para verificar y crear usuario Admin faltante
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'BackFinca')))

from app import create_app, db
from app.models.user import User, Role
from app.models.user_finca import UserFinca
from app.models.finca import Finca, FarmType

def verify_and_fix_users():
    """Verificar y crear usuario Admin faltante"""
    app = create_app()
    
    with app.app_context():
        try:
            # Verificar si la finca de prueba existe (finca_id=1)
            finca = Finca.query.filter_by(id=1).first()
            if not finca:
                print("❌ Finca de prueba (id=1) no encontrada. Creando...")
                finca = Finca(
                    name='Finca de Prueba',
                    type=FarmType.TRADICIONAL,
                    department='Antioquia',
                    municipality='Medellín',
                    is_active=True
                )
                db.session.add(finca)
                db.session.commit()
                print(f"✓ Finca creada: {finca.name} (id={finca.id})")
            
            print("\n--- Verificando usuarios existentes ---")
            
            # Verificar usuario Admin (1098)
            admin = User.query.filter_by(identification=1098).first()
            if admin:
                print(f"✓ Admin encontrado: {admin.fullname} (id={admin.id}, identification={admin.identification})")
                print(f"  Rol: {admin.role}, Status: {admin.status}")
                # Forzar reset de password para asegurar auditoria
                admin.set_password('Admin1234!')
                db.session.commit()
                print("✓ Password de Admin reseteado a 'Admin1234!'")
            else:
                print("❌ Admin (1098) NO encontrado. Creando...")
                admin = User(
                    identification=1098,
                    fullname='Administrador Principal',
                    email='admin@villaluz.com',
                    phone='3000000000',
                    password='Admin1234!',
                    role='Administrador',
                    status=True,
                    finca_id=finca.id
                )
                admin.set_password('Admin1234!')
                db.session.add(admin)
                db.session.commit()
                print(f"✓ Admin creado: {admin.fullname} (id={admin.id}, identification={admin.identification})")
                
                # Crear relación UserFinca
                user_finca = UserFinca(
                    user_id=admin.id,
                    finca_id=finca.id,
                    is_primary=True
                )
                db.session.add(user_finca)
                db.session.commit()
                print(f"✓ Relación UserFinca creada para Admin")
            
            # Verificar usuario Instructor (11111111)
            instructor = User.query.filter_by(identification=11111111).first()
            if instructor:
                print(f"✓ Instructor encontrado: {instructor.fullname} (id={instructor.id}, identification={instructor.identification})")
            else:
                print("❌ Instructor (11111111) NO encontrado. Creando...")
                instructor = User(
                    identification=11111111,
                    fullname='Maria Garcia',
                    email='instructor@finca.com',
                    phone='3101234567',
                    password='Instructor1234!',
                    role='Instructor',
                    status=True,
                    finca_id=finca.id
                )
                instructor.set_password('Instructor1234!')
                db.session.add(instructor)
                db.session.commit()
                print(f"✓ Instructor creado: {instructor.fullname} (id={instructor.id}, identification={instructor.identification})")
                
                # Crear relación UserFinca
                user_finca = UserFinca(
                    user_id=instructor.id,
                    finca_id=finca.id,
                    is_primary=True
                )
                db.session.add(user_finca)
                db.session.commit()
                print(f"✓ Relación UserFinca creada para Instructor")
            
            # Verificar usuario Operario (55555555)
            operario = User.query.filter_by(identification=55555555).first()
            if operario:
                print(f"✓ Operario encontrado: {operario.fullname} (id={operario.id}, identification={operario.identification})")
            else:
                print("❌ Operario (55555555) NO encontrado.")
            
            # Verificar usuario Veterinario (66666666)
            veterinario = User.query.filter_by(identification=66666666).first()
            if veterinario:
                print(f"✓ Veterinario encontrado: {veterinario.fullname} (id={veterinario.id}, identification={veterinario.identification})")
            else:
                print("❌ Veterinario (66666666) NO encontrado.")
            
            print("\n✅ Verificación completada")
            print("\nCredenciales para pruebas:")
            print("  Admin:       1098 / Admin1234!")
            print("  Instructor:  11111111 / Instructor1234!")
            print("  Operario:    55555555 / Operario1234!")
            print("  Veterinario: 66666666 / Veterinario1234!")
            
        except Exception as e:
            print(f"❌ Error verificando usuarios: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return 1
        
        return 0

if __name__ == '__main__':
    sys.exit(verify_and_fix_users())
