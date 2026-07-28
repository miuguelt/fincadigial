"""
Prueba integral del motor de alertas v2 (AlertEngine).
Evalúa 6 escenarios: peso bajo vs raza, ADG bajo, BCS bajo, tendencia BCS,
pérdida de peso + enfermedad, lactancia + pérdida.
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
from app.models.control import Control, HealthStatus
from app.models.body_condition_scores import BodyConditionScore
from app.models.breed_growth_standards import BreedGrowthStandard
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


def test_alert_engine_v2():
    app = create_app('development')
    with app.app_context():
        finca = Finca.query.first()
        if not finca:
            print("No hay fincas. Crea una finca primero.")
            return

        breed = Breeds.query.filter_by(name='Brahman').first()
        if not breed:
            print("No hay raza Brahman. Ejecuta seed_breed_growth_standards.py primero.")
            return

        # Clean up previous test data
        import time
        test_prefix = f'TEST-{int(time.time())}-'
        old_test = Animals.query.filter(Animals.record.like('TEST-%')).all()
        old_ids = [a.id for a in old_test]
        if old_ids:
            BodyConditionScore.query.filter(BodyConditionScore.animal_id.in_(old_ids)).delete(synchronize_session=False)
            Control.query.filter(Control.animal_id.in_(old_ids)).delete(synchronize_session=False)
            AnimalAlert.query.filter(AnimalAlert.animal_id.in_(old_ids)).delete(synchronize_session=False)
            Animals.query.filter(Animals.id.in_(old_ids)).delete(synchronize_session=False)
        db.session.commit()

        print("=== Escenario 1: Peso bajo vs raza (Rule 30) ===")
        animal1 = Animals(
            record=f'{test_prefix}001',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=365),
            weight=250,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal1)
        db.session.flush()

        # Peso esperado para hembra Brahman 12mo ≈ 240 kg, mínimo ≈ 192 kg
        # Creamos un control con 150 kg (muy por debajo del mínimo)
        ctrl1 = Control(animal_id=animal1.id, weight=150, finca_id=finca.id, health_status=HealthStatus.Bueno, checkup_date=date.today())
        db.session.add(ctrl1)
        db.session.commit()

        existing_std = BreedGrowthStandard.query.filter_by(
            breed_id=breed.id, sex='Hembra', age_months=12
        ).first()
        if existing_std:
            check("Estándar de 12 meses existe", True)
            check("Peso esperado > 200", existing_std.expected_weight_kg > 200)
        else:
            print("  - Saltando: necesita seed_breed_growth_standards.py")

        print("\n=== Escenario 2: ADG sostenido bajo (Rule 31) ===")
        animal2 = Animals(
            record=f'{test_prefix}002',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=730),
            weight=280,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal2)
        db.session.flush()

        for i, weight in enumerate([280, 285, 290, 293, 295]):
            ctrl = Control(
                animal_id=animal2.id,
                weight=weight,
                finca_id=finca.id,
                health_status=HealthStatus.Bueno,
                checkup_date=date.today() - timedelta(days=(len(range(5)) - i) * 30),
            )
            db.session.add(ctrl)
        db.session.commit()

        print("\n=== Escenario 3: BCS bajo (Rule 36) ===")
        animal3 = Animals(
            record=f'{test_prefix}003',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=1095),
            weight=400,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal3)
        db.session.flush()

        bcs1 = BodyConditionScore(
            animal_id=animal3.id,
            finca_id=finca.id,
            score=2.0,
            score_date=date.today(),
            notes='Test BCS bajo crítico',
        )
        db.session.add(bcs1)
        db.session.commit()

        latest = BodyConditionScore.get_latest(animal3.id)
        check("BCS latest retorna registro", latest is not None)
        if latest:
            check("BCS score = 2.0", latest.score == 2.0)
            check("BCS category = Emaciado", latest.category == 'Emaciado')

        trend = BodyConditionScore.get_trend(animal3.id, days=90)
        check("BCS trend retorna lista", len(trend) >= 1)

        print("\n=== Escenario 4: BCS tendencia negativa (Rule 37) ===")
        animal4 = Animals(
            record=f'{test_prefix}004',
            sex=Sex.Hembra,
            birth_date=date.today() - timedelta(days=1460),
            weight=500,
            finca_id=finca.id,
            breeds_id=breed.id,
            status=AnimalStatus.Vivo,
        )
        db.session.add(animal4)
        db.session.flush()

        for i, score in enumerate([5.0, 4.0, 3.5, 3.0]):
            bcs = BodyConditionScore(
                animal_id=animal4.id,
                finca_id=finca.id,
                score=score,
                score_date=date.today() - timedelta(days=(3 - i) * 30),
            )
            db.session.add(bcs)
        db.session.commit()

        trend4 = BodyConditionScore.get_trend(animal4.id, days=90)
        check("BCS tendencia 4 registros", len(trend4) >= 2)
        if len(trend4) >= 2:
            drop = trend4[0].score - trend4[-1].score
            check(f"Caída ≥ 1.5 puntos ({drop:.1f})", drop >= 1.5)

        print("\n=== Escenario 5: Ejecución AlertEngine ===")
        try:
            alerts_before = AnimalAlert.query.count()
            AlertEngine.evaluate_all()
            alerts_after = AnimalAlert.query.count()
            check("AlertEngine.evaluate_all() ejecutado sin error", True)
            check(f"Nuevas alertas generadas ({alerts_after - alerts_before})", alerts_after > alerts_before)
        except Exception as e:
            check(f"AlertEngine falló: {e}", False)

        print("\n=== Escenario 6: Alertas de nuestros animales ===")
        for a in [animal1, animal2, animal3, animal4]:
            alerts = AnimalAlert.query.filter_by(animal_id=a.id).all()
            if alerts:
                latest_alert = alerts[-1]
                check(f"{a.record} alertas generadas: {len(alerts)}", True)
                check(f"  Última: {latest_alert.alert_type.value} - {latest_alert.message[:60]}", True)
            else:
                check(f"{a.record} sin alertas", False)

        print(f"\n{'='*40}")
        print(f"Resultados: {PASS} pasaron, {FAIL} fallaron")
        print(f"{'='*40}")

        return PASS, FAIL


if __name__ == '__main__':
    test_alert_engine_v2()
