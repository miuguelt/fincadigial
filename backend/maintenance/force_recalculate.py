import os
import sys

# Añadir el path del proyecto para poder importar app
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.livestock_summary import LivestockSummary

app = create_app("development")
with app.app_context():
    print("Recalculando resúmenes de fincas...")
    summaries = LivestockSummary.query.all()
    for s in summaries:
        print(f"Recalculando finca {s.finca_id}...")
        s.recalculate()
    db.session.commit()
    print("¡Hecho!")
