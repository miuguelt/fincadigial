"""Seed: Curva de referencia genérica bovina en system_contents."""
import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app, db
from app.models.system_content import SystemContent

REFERENCE_POINTS = [
    {"age": 0, "weight": 35}, {"age": 1, "weight": 52}, {"age": 2, "weight": 70},
    {"age": 3, "weight": 90}, {"age": 4, "weight": 110}, {"age": 5, "weight": 132},
    {"age": 6, "weight": 155}, {"age": 7, "weight": 172}, {"age": 8, "weight": 187},
    {"age": 9, "weight": 200}, {"age": 10, "weight": 212}, {"age": 11, "weight": 222},
    {"age": 12, "weight": 232}, {"age": 15, "weight": 262}, {"age": 18, "weight": 290},
    {"age": 21, "weight": 318}, {"age": 24, "weight": 345}, {"age": 30, "weight": 390},
    {"age": 36, "weight": 430}, {"age": 48, "weight": 475}, {"age": 60, "weight": 500},
]

app = create_app('development')
with app.app_context():
    entry = SystemContent.get_by_key('reference_curve.generic')
    if not entry:
        db.session.execute(
            db.text(
                "INSERT INTO system_contents (key, content, category, content_type, extra) "
                "VALUES (:key, :content, :cat, :ct, :extra)"
            ),
            {
                'key': 'reference_curve.generic',
                'content': 'Curva de referencia bovina genérica (edad meses → peso kg)',
                'cat': 'reference',
                'ct': 'json',
                'extra': REFERENCE_POINTS,
            }
        )
        print('  ✅ reference_curve.generic creado')
    else:
        entry.extra = REFERENCE_POINTS
        print('  ✅ reference_curve.generic actualizado')

    db.session.commit()
    print('\n Curva de referencia genérica lista en system_contents.')
