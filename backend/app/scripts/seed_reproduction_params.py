"""Seed: Reproductive parameters in system_contents."""
import os, sys
sys.path.append(os.getcwd())

from app import create_app, db

app = create_app('development')
with app.app_context():
    params = [
        ('param.reproduction.gestation_days', '283', 'Días de gestación bovina estándar'),
        ('param.reproduction.heat_detection_min_days', '18', 'Días mínimos para ventana de detección de celo'),
        ('param.reproduction.heat_detection_max_days', '23', 'Días máximos para ventana de detección de celo'),
    ]

    for key, value, desc in params:
        existing = db.session.execute(
            db.text("SELECT 1 FROM system_contents WHERE key = :key"),
            {'key': key}
        ).first()
        if not existing:
            db.session.execute(
                db.text("INSERT INTO system_contents (key, content, category, content_type, is_active) VALUES (:key, :content, 'config', 'number', true)"),
                {'key': key, 'content': value}
            )
            print(f'  ✅ {key} = {value} ({desc})')
        else:
            print(f'  ⏭ {key} ya existe')

    db.session.commit()
    print('\n🐄 Parámetros reproductivos sembrados.')
