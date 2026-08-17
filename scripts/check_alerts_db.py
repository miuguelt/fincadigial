import os
import sys

backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from app.models.system_content import SystemContent
from app.models.finca import Finca

app = create_app("development")
with app.app_context():
    print("--- Fincas ---")
    fincas = Finca.query.all()
    for f in fincas:
        print(f"Finca: {f.id} - {f.name}")

    print("\n--- Parametros en SystemContent (Growth) ---")
    keys_to_check = [
        "weight_loss_severe_pct",
        "weight_loss_high_pct",
        "breed_deviation_critical_pct",
        "breed_deviation_high_pct",
        "breed_deviation_medium_pct",
        "adg_expected_default",
        "adg_negative_threshold",
        "adg_low_multiplier",
        "adg_medium_multiplier",
        "projection_min_multiplier",
        "illness_weight_loss_pct",
        "lactation_loss_min_pct",
        "lactation_loss_max_pct",
        "bcs_critical",
        "bcs_high",
        "bcs_medium",
        "bcs_obese",
        "bcs_trend_drop_points",
    ]
    for key in keys_to_check:
        full_key = f"param.alert.{key}"
        sc = SystemContent.query.filter_by(key=full_key).first()
        print(f"{full_key}: {'[FOUND] ' + sc.content if sc else '[MISSING]'}")

    print("\n--- Recomendaciones de IA en SystemContent ---")
    recs = SystemContent.query.filter(SystemContent.key.like("recommendation.alert.%")).all()
    for r in recs:
        print(f"{r.key}: {r.content[:50]}...")
