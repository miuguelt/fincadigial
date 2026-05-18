#!/usr/bin/env python3
"""
Script para resetear contraseñas de usuarios Operario y Veterinario
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'BackFinca'))

from app import create_app, db
from app.models.user import User

def reset_passwords():
    """Resetear contraseñas de Operario y Veterinario"""
    app = create_app()
    
    with app.app_context():
        try:
            # Resetear contraseña de Operario
            operario = User.query.filter_by(identification=55555555).first()
            if operario:
                operario.set_password('Operario1234!')
                db.session.commit()
                print(f"✓ Contraseña reseteada para Operario: {operario.fullname}")
            else:
                print("❌ Operario no encontrado")
            
            # Resetear contraseña de Veterinario
            veterinario = User.query.filter_by(identification=66666666).first()
            if veterinario:
                veterinario.set_password('Veterinario1234!')
                db.session.commit()
                print(f"✓ Contraseña reseteada para Veterinario: {veterinario.fullname}")
            else:
                print("❌ Veterinario no encontrado")
            
            print("\n✅ Contraseñas reseteadas exitosamente")
            print("\nCredenciales para pruebas:")
            print("  Operario:    55555555 / Operario1234!")
            print("  Veterinario: 66666666 / Veterinario1234!")
            
        except Exception as e:
            print(f"❌ Error reseteando contraseñas: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return 1
        
        return 0

if __name__ == '__main__':
    sys.exit(reset_passwords())
