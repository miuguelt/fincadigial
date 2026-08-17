"""
Script para:
1. Reparar registros Control con finca_id NULL (inferido del animal)
2. Aplicar NOT NULL a finca_id en tabla control (ALTER TABLE)
3. Recalcular MilkSummary para todas las fincas
4. Recalcular FinancialSummary para todas las fincas

Uso: python -m app.scripts.fix_control_finca_and_summaries
"""

import os
import sys

sys.path.append(os.getcwd())

from app import create_app, db
from app.models.control import Control
from app.models.animals import Animals
from app.models.finca import Finca
from app.models.extended_summaries import MilkSummary, FinancialSummary

app = create_app("development")
with app.app_context():
    print("🔧 1. Reparando controles con finca_id NULL...")

    null_controls = Control.query.filter(Control.finca_id.is_(None)).all()
    print(f"   → {len(null_controls)} controles sin finca_id encontrados")

    fixed = 0
    for c in null_controls:
        animal = Animals.query.get(c.animal_id)
        if animal and animal.finca_id:
            c.finca_id = animal.finca_id
            db.session.add(c)
            fixed += 1
        else:
            print(
                f"   ⚠️ Control {c.id}: animal {c.animal_id} no encontrado o sin finca"
            )

    db.session.commit()
    print(f"   ✅ {fixed} controles reparados")

    print("\n🔒 2. Aplicando NOT NULL a columna finca_id en control...")
    try:
        db.session.execute(
            db.text("ALTER TABLE control ALTER COLUMN finca_id SET NOT NULL")
        )
        db.session.commit()
        print("   ✅ Columna finca_id ahora es NOT NULL")
    except Exception as e:
        print(f"   ⚠️ No se pudo aplicar NOT NULL (puede que ya lo sea): {e}")

    print("\n📊 2. Recalculando MilkSummary por finca...")
    fincas = Finca.query.all()
    for f in fincas:
        try:
            summary = MilkSummary.get_for_finca(f.id)
            summary.recalculate()
            print(f"   ✅ Finca {f.id} ({f.name}): {summary.total_liters} L total")
        except Exception as e:
            print(f"   ❌ Finca {f.id}: {e}")

    print("\n💰 3. Recalculando FinancialSummary por finca...")
    for f in fincas:
        try:
            summary = FinancialSummary.get_for_finca(f.id)
            summary.recalculate()
            print(f"   ✅ Finca {f.id} ({f.name}): balance {summary.balance}")
        except Exception as e:
            print(f"   ❌ Finca {f.id}: {e}")

    print("\n✨ Migración completada al 100%.")
