"""Agrega constraints faltantes (PostgreSQL compatible)."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app("development")

# PostgreSQL no soporta IF NOT EXISTS para CHECK constraints
# Usamos DO $$ block para verificar si existe antes de crear
constraints = [
    ("body_condition_scores", "ck_bcs_score", "CHECK (score >= 1 AND score <= 9)"),
    ("lactation_cycles", "ck_lactation_number", "CHECK (lactation_number > 0)"),
    ("production_targets", "ck_target_liters", "CHECK (target_liters > 0)"),
    ("animals", "ck_animal_weight", "CHECK (weight > 0)"),
    ("control", "ck_control_weight", "CHECK (weight IS NULL OR weight > 0)"),
    ("transactions", "ck_transaction_amount", "CHECK (amount > 0)"),
    ("milk_production", "ck_milk_liters", "CHECK (liters > 0)"),
]

with app.app_context():
    for table, name, definition in constraints:
        sql = text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = '{name}'
                ) THEN
                    EXECUTE 'ALTER TABLE {table} ADD CONSTRAINT {name} {definition}';
                END IF;
            END $$;
        """)
        try:
            db.session.execute(sql)
            db.session.commit()
            print(f"  ✅ {name}")
        except Exception as e:
            db.session.rollback()
            print(f"  ⚠️  {name}: {e}")

print("\n✅ Constraints aplicadas")
