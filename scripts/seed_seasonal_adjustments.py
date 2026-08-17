"""
Seed ajustes estacionales (SeasonalAdjustment) para fincas existentes.
Crea 12 registros por finca (meses 1-12). Idempotente.
Requiere ALLOW_SIMULATION_SCRIPTS=true
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app, db
from app.models.finca import Finca
from app.models.seasonal_adjustments import SeasonalAdjustment

# Colombia: diciembre-marzo = seca (bajo), abril-noviembre = lluvias (alto)
SEASONAL_PROFILES = {}
for m in range(1, 13):
    if m in (12, 1, 2, 3):
        SEASONAL_PROFILES[m] = dict(
            adg_multiplier=0.85,
            pasture_quality_index=0.4,
            milk_production_multiplier=0.8,
            heat_stress_risk="alto",
            description="Época seca: menor disponibilidad de pasto, estrés térmico",
        )
    elif m in (4, 5, 10, 11):
        SEASONAL_PROFILES[m] = dict(
            adg_multiplier=1.0,
            pasture_quality_index=0.55,
            milk_production_multiplier=0.95,
            heat_stress_risk="medio",
            description="Transición: condiciones regulares de pastoreo",
        )
    else:
        SEASONAL_PROFILES[m] = dict(
            adg_multiplier=1.15,
            pasture_quality_index=0.7,
            milk_production_multiplier=1.1,
            heat_stress_risk="bajo",
            description="Época de lluvias: abundante pasto, buenas condiciones",
        )


def seed_seasonal_adjustments():
    app = create_app("development")
    with app.app_context():
        fincas = Finca.query.all()
        if not fincas:
            print("No hay fincas registradas. Crea fincas primero.")
            return

        total = 0
        for finca in fincas:
            for month, profile in SEASONAL_PROFILES.items():
                existing = SeasonalAdjustment.query.filter_by(
                    finca_id=finca.id, month=month
                ).first()
                if existing:
                    continue
                sa = SeasonalAdjustment(
                    finca_id=finca.id,
                    month=month,
                    adg_multiplier=profile["adg_multiplier"],
                    pasture_quality_index=profile["pasture_quality_index"],
                    milk_production_multiplier=profile["milk_production_multiplier"],
                    heat_stress_risk=profile["heat_stress_risk"],
                    description=profile["description"],
                )
                db.session.add(sa)
                total += 1

        db.session.commit()
        print(f"Ajustes estacionales creados: {total} ({len(fincas)} fincas × 12 meses)")


if __name__ == "__main__":
    seed_seasonal_adjustments()
