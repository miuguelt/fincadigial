"""
Seed: Parámetros de configuración para AlertEngine v2 (system_contents).
Requiere ALLOW_SIMULATION_SCRIPTS=true
"""
import os, sys
if os.getenv('ALLOW_SIMULATION_SCRIPTS', '').lower() != 'true':
    print("ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app, db
from app.models.system_content import SystemContent

app = create_app('development')
with app.app_context():
    params = {
        'param.alert.breed_deviation_critical_pct': ('25', 'Desviación crítica vs estándar racial (%)'),
        'param.alert.breed_deviation_high_pct': ('15', 'Desviación alta vs estándar racial (%)'),
        'param.alert.breed_deviation_medium_pct': ('10', 'Desviación media vs estándar racial (%)'),
        'param.alert.adg_expected_default': ('0.5', 'ADG esperado por defecto (kg/día)'),
        'param.alert.adg_negative_threshold': ('0.05', 'Umbral ADG negativo (kg/día)'),
        'param.alert.adg_low_multiplier': ('0.4', 'Multiplicador ADG bajo (fracción del esperado)'),
        'param.alert.adg_medium_multiplier': ('0.6', 'Multiplicador ADG medio (fracción del esperado)'),
        'param.alert.bcs_trend_drop_points': ('1.5', 'Caída mínima BCS en 90d para alerta'),
        'param.alert.illness_weight_loss_pct': ('3', 'Pérdida de peso con enfermedad activa (%)'),
        'param.alert.lactation_loss_min_pct': ('5', 'Pérdida mínima en lactancia (%)'),
        'param.alert.lactation_loss_max_pct': ('10', 'Pérdida máxima en lactancia (%)'),
        'param.alert.projection_min_multiplier': ('0.9', 'Multiplicador proyección vs mínimo estándar'),
    }
    created = 0
    for key, (value, desc) in params.items():
        existing = SystemContent.get_by_key(key)
        if not existing:
            sc = SystemContent(key=key, content=value)
            db.session.add(sc)
            created += 1
            print(f'  Creado: {key}={value}')
    db.session.commit()
    print(f'\n{created} parámetros creados en system_contents.')
