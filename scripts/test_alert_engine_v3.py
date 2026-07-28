"""
Prueba del motor de alertas v3 (Reglas 45 y 46).
Evalúa 2 escenarios:
- Regla 45: Riesgo de Cetosis (Caída abrupta de leche post-parto)
- Regla 46: Fallo en Secado (Vaca con preñez avanzada sigue dando leche)

Requiere ALLOW_SIMULATION_SCRIPTS=true
"""
import os
import sys

_ALLOW_SIM = os.getenv('ALLOW_SIMULATION_SCRIPTS', '').lower() == 'true'
if not _ALLOW_SIM:
    print("ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from datetime import date, timedelta
from app import create_app, db
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.breeds import Breeds
from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
from app.models.milk_production import MilkProduction, MilkSession
from app.models.alerts import AnimalAlert
from app.models.finca import Finca
from app.services.alert_engine import AlertEngine

PASS = 0
FAIL = 0

def check(label, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✓ {label}")
    else:
        FAIL += 1
        print(f"  ✗ {label}")

def test_alert_engine_v3():
    app = create_app('development')
    with app.app_context():
        finca = Finca.query.first()
        if not finca:
            print("No hay fincas. Crea una finca primero.")
            return

        breed = Breeds.query.filter_by(name='Holstein').first()
        if not breed:
            breed = Breeds.query.first()

        import time
        test_prefix = f'TEST-V3-{int(time.time())}-'
        old_test = Animals.query.filter(Animals.record.like('TEST-V3-%')).all()
        old_ids = [a.id for a in old_test]
        if old_ids:
            MilkProduction.query.filter(MilkProduction.animal_id.in_(old_ids)).delete(synchronize_session=False)
            ReproductiveEvent.query.filter(ReproductiveEvent.animal_id.in_(old_ids)).delete(synchronize_session=False)
            AnimalAlert.query.filter(AnimalAlert.animal_id.in_(old_ids)).delete(synchronize_session=False)
            Animals.query.filter(Animals.id.in_(old_ids)).delete(synchronize_session=False)
        db.session.commit()

        print("=== Escenario 1: Riesgo de Cetosis (Regla 45) ===")
        animal1 = Animals(
            record=f'{test_prefix}001',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=1500),
            weight=500,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal1)
        db.session.flush()

        parto = ReproductiveEvent(
            animal_id=animal1.id,
            finca_id=finca.id,
            event_type=EventType.Parto,
            event_date=date.today() - timedelta(days=30), # 30 días post-parto
            alive_count=1,
            dead_count=0
        )
        db.session.add(parto)

        milk_prev = MilkProduction(animal_id=animal1.id, finca_id=finca.id, date=date.today() - timedelta(days=2), milking_session=MilkSession.AM, liters=25)
        milk_curr = MilkProduction(animal_id=animal1.id, finca_id=finca.id, date=date.today() - timedelta(days=1), milking_session=MilkSession.AM, liters=15)
        db.session.add(milk_prev)
        db.session.add(milk_curr)
        db.session.commit()

        print("\n=== Escenario 2: Fallo en Secado (Regla 46) ===")
        animal2 = Animals(
            record=f'{test_prefix}002',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=2000),
            weight=550,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal2)
        db.session.flush()

        # Diagnostico positivo hace 230 días
        diag = ReproductiveEvent(
            animal_id=animal2.id,
            finca_id=finca.id,
            event_type=EventType.Diagnostico,
            event_date=date.today() - timedelta(days=230),
            diagnosis_result=DiagnosisResult.Positivo
        )
        db.session.add(diag)
        
        # Leche ayer
        milk2 = MilkProduction(animal_id=animal2.id, finca_id=finca.id, date=date.today() - timedelta(days=1), milking_session=MilkSession.AM, liters=8)
        db.session.add(milk2)
        db.session.commit()

        print("\n=== Ejecutando AlertEngine ===")
        alerts_before = AnimalAlert.query.count()
        AlertEngine.evaluate_all()
        alerts_after = AnimalAlert.query.count()
        check("AlertEngine.evaluate_all() ejecutado sin error", True)
        
        alerts1 = AnimalAlert.query.filter_by(animal_id=animal1.id).all()
        has_cetosis = any('CETOSIS' in a.message for a in alerts1)
        check("Regla 45: Alerta de Cetosis generada", has_cetosis)
        if has_cetosis:
            for a in alerts1:
                if 'CETOSIS' in a.message:
                    print(f"  - {a.message}")

        alerts2 = AnimalAlert.query.filter_by(animal_id=animal2.id).all()
        has_secado = any('SECADO' in a.message for a in alerts2)
        check("Regla 46: Alerta de Fallo en Secado generada", has_secado)
        if has_secado:
            for a in alerts2:
                if 'SECADO' in a.message:
                    print(f"  - {a.message}")

        print(f"\n{'='*40}")
        print(f"Resultados: {PASS} pasaron, {FAIL} fallaron")
        print(f"{'='*40}")

if __name__ == '__main__':
    test_alert_engine_v3()
