"""Seed: Growth alert thresholds in system_contents."""

import os
import sys

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app import create_app, db

app = create_app("development")
with app.app_context():
    params = [
        (
            "param.alert.breed_deviation_critical_pct",
            "25",
            "Desviación crítica vs estándar racial (%)",
        ),
        ("param.alert.breed_deviation_high_pct", "15", "Desviación alta vs estándar racial (%)"),
        ("param.alert.breed_deviation_medium_pct", "10", "Desviación media vs estándar racial (%)"),
        ("param.alert.adg_negative_threshold", "0.05", "ADG negativo absoluto (kg/día)"),
        ("param.alert.adg_low_multiplier", "0.4", "Multiplicador ADG bajo vs esperado"),
        ("param.alert.adg_medium_multiplier", "0.6", "Multiplicador ADG medio vs esperado"),
        ("param.alert.adg_expected_default", "0.5", "ADG esperado por defecto (kg/día)"),
        ("param.alert.projection_min_multiplier", "0.8", "Multiplicador mínimo proyección a 12m"),
        ("param.alert.illness_weight_loss_pct", "3", "Pérdida de peso con enfermedad activa (%)"),
        ("param.alert.lactation_loss_min_pct", "5", "Pérdida de peso mínima lactancia (%)"),
        ("param.alert.lactation_loss_max_pct", "10", "Pérdida de peso máxima lactancia (%)"),
        ("param.alert.bcs_trend_drop_points", "1.5", "Caída BCS en 90 días (puntos)"),
    ]

    for key, value, desc in params:
        exists = db.session.execute(
            db.text("SELECT id FROM system_contents WHERE key = :key"), {"key": key}
        ).fetchone()
        if not exists:
            db.session.execute(
                db.text(
                    "INSERT INTO system_contents (key, content, category, content_type) VALUES (:key, :content, :cat, :ct)"
                ),
                {"key": key, "content": value, "cat": "config", "ct": "number"},
            )
            print(f"  ✅ {key} = {value}")
        else:
            print(f"  ⏭ {key} ya existe")

    db.session.commit()
    print("\n Thresholds de crecimiento sembrados en system_contents.")
