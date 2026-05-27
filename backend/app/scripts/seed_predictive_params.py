import os, sys
sys.path.append(os.getcwd())

from app import create_app, db

app = create_app('development')
with app.app_context():
    params = [
        ('param.predictive.weight_loss_pct', '10'),
        ('param.predictive.control_overdue_days', '90'),
        ('param.predictive.adg_low', '0.1'),
        ('param.predictive.adg_min', '0.01'),
        ('param.predictive.heat_detection_age_months', '15'),
        ('param.predictive.heat_window_start', '19'),
        ('param.predictive.no_weight_days', '45'),
        ('param.predictive.stagnant_adg', '0.05'),
        ('param.predictive.market_ready_pct', '0.9'),
        ('param.alert.open_days_critical', '120'),
        ('param.alert.open_days_warning', '90'),
    ]

    for key, value in params:
        existing = db.session.execute(
            db.text("SELECT 1 FROM system_contents WHERE key = :key"),
            {'key': key}
        ).first()
        if not existing:
            db.session.execute(
                db.text("INSERT INTO system_contents (key, content, category, content_type) VALUES (:key, :content, 'config', 'number')"),
                {'key': key, 'content': value}
            )
            print(f'  ✅ {key} = {value}')
        else:
            print(f'  ⏭ {key} ya existe')

    db.session.commit()
    print('\n✅ Parámetros predictivos sembrados.')
