"""Seed: Alert engine thresholds in system_contents."""
import os
import sys
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.system_content import SystemContent

app = create_app('development')
with app.app_context():
    params = [
        ('param.alert.control_days_critical', '90', 'Control venció crítico (días)'),
        ('param.alert.control_days_high', '60', 'Control venció alto (días)'),
        ('param.alert.control_days_medium', '30', 'Control venció medio (días)'),
        ('param.alert.ica_vaccine_days', '180', 'Vacuna ICA máxima (días)'),
        ('param.alert.weight_loss_severe_pct', '10', 'Pérdida de peso severa (%)'),
        ('param.alert.weight_loss_high_pct', '5', 'Pérdida de peso alta (%)'),
        ('param.alert.milk_drop_critical_pct', '20', 'Caída leche crítica (%)'),
        ('param.alert.milk_drop_high_pct', '15', 'Caída leche alta (%)'),
        ('param.alert.bcs_critical', '2', 'BCS crítico'),
        ('param.alert.bcs_high', '3', 'BCS alto'),
        ('param.alert.bcs_medium', '4', 'BCS medio'),
        ('param.alert.bcs_obese', '8', 'BCS obeso'),
        ('param.alert.somatic_cells_critical', '800000', 'Células somáticas críticas'),
        ('param.alert.somatic_cells_high', '400000', 'Células somáticas altas'),
        ('param.alert.somatic_cells_medium', '200000', 'Células somáticas media'),
    ]

    for key, value, desc in params:
        entry = SystemContent.query.filter_by(key=key).first()
        if not entry:
            # Use db directly since SystemContent might not have description
            db.session.execute(
                db.text("INSERT INTO system_contents (key, content, category, content_type) VALUES (:key, :content, :cat, :ct)"),
                {'key': key, 'content': value, 'cat': 'config', 'ct': 'number'}
            )
            print(f'  ✅ {key} = {value}')
        else:
            print(f'  ⏭ {key} ya existe')

    db.session.commit()
    print('\n⚙️ Thresholds de alertas sembrados en system_contents.')
