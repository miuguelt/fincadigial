#!/usr/bin/env python3
"""
Script para crear usuarios de prueba faltantes (Operario y Veterinario)
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'BackFinca'))

from app import create_app, db
from app.models.user import User, Role
from app.models.user_finca import UserFinca
from app.models.finca import Finca, FarmType

def create_test_users():
    """Crear usuarios de prueba para Operario y Veterinario"""
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
            
            # Crear usuario Operario (usando ID que no existe)
            operario = User.query.filter_by(identification='55555555').first()
            if not operario:
                print("Creando usuario Operario...")
                operario = User(
                    identification=55555555,
                    fullname='Juan Operario',
                    email='operario@villaluz.com',
                    phone='3005555555',
                    password='Operario1234!',
                    role='Operario',
                    status=True,
                    finca_id=finca.id
                )
                operario.set_password('Operario1234!')
                db.session.add(operario)
                db.session.commit()
                print(f"✓ Operario creado: {operario.fullname} (id={operario.id}, identification={operario.identification})")
                
                # Crear relación UserFinca
                user_finca = UserFinca(
                    user_id=operario.id,
                    finca_id=finca.id,
                    is_primary=True
                )
                db.session.add(user_finca)
                db.session.commit()
                print(f"✓ Relación UserFinca creada para Operario")
            else:
                print(f"✓ Operario ya existe: {operario.fullname}")
            
            # Crear usuario Veterinario (usando ID que no existe)
            veterinario = User.query.filter_by(identification='66666666').first()
            if not veterinario:
                print("Creando usuario Veterinario...")
                veterinario = User(
                    identification=66666666,
                    fullname='María Veterinaria',
                    email='veterinario@villaluz.com',
                    phone='3006666666',
                    password='Veterinario1234!',
                    role='Veterinario',
                    status=True,
                    finca_id=finca.id
                )
                veterinario.set_password('Veterinario1234!')
                db.session.add(veterinario)
                db.session.commit()
                print(f"✓ Veterinario creado: {veterinario.fullname} (id={veterinario.id}, identification={veterinario.identification})")
                
                # Crear relación UserFinca
                user_finca = UserFinca(
                    user_id=veterinario.id,
                    finca_id=finca.id,
                    is_primary=True
                )
                db.session.add(user_finca)
                db.session.commit()
                print(f"✓ Relación UserFinca creada para Veterinario")
            else:
                print(f"✓ Veterinario ya existe: {veterinario.fullname}")
            
            print("\n✅ Usuarios de prueba creados exitosamente")
            print("\nCredenciales para pruebas:")
            print("  Operario:    55555555 / Operario1234!")
            print("  Veterinario: 66666666 / Veterinario1234!")
            
        except Exception as e:
            print(f"❌ Error creando usuarios: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return 1
        
        return 0

if __name__ == '__main__':
    sys.exit(create_test_users())
