import sys
import os

# Path setup
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.operational import AnimalGroup, PastureAforo, Infrastructure, InfrastructureType
from app.models.finca import Finca
from app.models.fields import Fields
from datetime import date, timedelta

app = create_app('development')
with app.app_context():
    print("🛠️ Creando nuevas tablas operativas...")
    db.create_all()

    finca = Finca.query.first()
    if not finca:
        print("❌ No se encontró ninguna finca para inicializar.")
        sys.exit(1)

    print(f"✅ Inicializando datos para: {finca.name}")

    # 1. Crear infraestructura básica
    if not Infrastructure.query.filter_by(finca_id=finca.id).first():
        print("🏗️ Creando infraestructura de prueba...")
        infra = [
            Infrastructure(name="Tanque de Leche Principal", type=InfrastructureType.TANQUE,
                          next_maintenance=date.today() + timedelta(days=5), finca_id=finca.id),
            Infrastructure(name="Cerca Eléctrica Potrero 1", type=InfrastructureType.CERCA,
                          next_maintenance=date.today() - timedelta(days=2), finca_id=finca.id, status="Requiere Arreglo"),
            Infrastructure(name="Tractor John Deere", type=InfrastructureType.MAQUINARIA,
                          next_maintenance=date.today() + timedelta(days=30), finca_id=finca.id)
        ]
        db.session.add_all(infra)

    # 2. Crear un Lote de prueba
    if not AnimalGroup.query.filter_by(finca_id=finca.id).first():
        print("🐂 Creando lote 'Novillas de Ceba'...")
        group = AnimalGroup(name="Novillas de Ceba", description="Lote principal de engorde", finca_id=finca.id)
        db.session.add(group)

    # 3. Crear aforos iniciales para el semáforo
    field = Fields.query.filter_by(finca_id=finca.id).first()
    if field and not PastureAforo.query.filter_by(field_id=field.id).first():
        print(f"🌿 Registrando aforo para potrero: {field.name}")
        aforo = PastureAforo(field_id=field.id, entry_height=25, exit_height=4, finca_id=finca.id)
        db.session.add(aforo)

    db.session.commit()
    print("✨ Sincronización operativa completada al 100%.")
