"""
⚠️ SIMULACIÓN — NO USAR EN PRODUCCIÓN
Prepara historiales de peso para calibrar el SimulationService.
Requiere ALLOW_SIMULATION_SCRIPTS=true.
"""
import os, sys
_ALLOW_SIM = os.getenv('ALLOW_SIMULATION_SCRIPTS', '').lower() == 'true'
if not _ALLOW_SIM:
    print("⛔ Simulación deshabilitada. ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

import sys
import os
from datetime import datetime, timedelta
import random

# Añadir ruta del backend para importar modelos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app import create_app, db
from app.models.animals import Animals, AnimalStatus
from app.models.control import Control, HealthStatus

def seed_sim_data():
    app = create_app()
    with app.app_context():
        print("🚀 Iniciando preparación de datos para simuladores...")
        
        # Obtener 5 animales vivos para crearles historial
        animals = Animals.query.filter_by(status=AnimalStatus.Vivo).limit(5).all()
        
        if not animals:
            print("⚠️ No hay animales vivos para entrenar. Por favor, crea animales primero.")
            return

        for animal in animals:
            print(f"📦 Calibrando historial para Animal ID: {animal.id} ({animal.record})")
            
            # Crear 4 pesajes históricos (uno cada 30 días)
            base_weight = animal.weight - 60 # Hace 120 días pesaba 60kg menos aprox.
            
            for i in range(4, 0, -1):
                check_date = datetime.now() - timedelta(days=i*30)
                # Ganancia aleatoria entre 0.4 y 0.8 kg/día
                simulated_weight = base_weight + ((4-i) * random.uniform(15, 25))
                
                # Evitar duplicados si ya existen controles en esa fecha aprox
                exists = Control.query.filter_by(animal_id=animal.id, checkup_date=check_date.date()).first()
                if not exists:
                    control = Control(
                        animal_id=animal.id,
                        finca_id=animal.finca_id,
                        checkup_date=check_date.date(),
                        weight=round(simulated_weight, 2),
                        height=1.2,
                        health_status=HealthStatus.Bueno,
                        description="Generado automáticamente para calibración de simulador"
                    )
                    db.session.add(control)
            
        db.session.commit()
        print("✅ Entrenamiento completado. Datos de simulación listos en la BD.")

if __name__ == "__main__":
    seed_sim_data()
