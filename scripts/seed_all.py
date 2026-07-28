"""
seed_all.py — Seed unificado: ejecuta TODOS los seeds en orden correcto.
Uso: ALLOW_SIMULATION_SCRIPTS=true python scripts/seed_all.py
"""
import sys
import os
import logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

logging.basicConfig(level=logging.INFO, format='%(message)s')
log = logging.getLogger('seed_all')


def _run(label, module_path):
    import importlib.util
    import importlib
    spec = importlib.util.spec_from_file_location("module", module_path)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        log.info(f"  ✅ {label}")
    except Exception as e:
        log.error(f"  ❌ {label}: {e}")


def main():
    log.info("=" * 60)
    log.info("SEED UNIFICADO - FINCA VILLA LUZ")
    log.info("=" * 60)

    base = os.path.join(os.path.dirname(__file__), '..')
    steps = [
        ("1. Parámetros climáticos", os.path.join(base, 'backend', 'app', 'scripts', 'seed_weather_params.py')),
        ("2. Parámetros reproductivos", os.path.join(base, 'backend', 'app', 'scripts', 'seed_reproduction_params.py')),
        ("3. Parámetros predictivos", os.path.join(base, 'backend', 'app', 'scripts', 'seed_predictive_params.py')),
        ("4. Thresholds de alertas", os.path.join(base, 'backend', 'app', 'scripts', 'seed_alert_params.py')),
        ("5. Estándares de crecimiento", os.path.join(base, 'scripts', 'seed_breed_growth_standards.py')),
        ("6. Ajustes estacionales", os.path.join(base, 'scripts', 'seed_seasonal_adjustments.py')),
        ("7. Curva de referencia genérica", os.path.join(base, 'scripts', 'seed_reference_curve.py')),
        ("8. Mapa de estado de potreros", os.path.join(base, 'scripts', 'seed_field_status_map.py')),
        ("9. Thresholds de alertas de crecimiento", os.path.join(base, 'scripts', 'seed_growth_alert_params.py')),
        ("10. Hitos de gestación y crecimiento", os.path.join(base, 'scripts', 'seed_reproduction_milestones.py')),
        ("11. Timeout de caché y JWT blocklist", os.path.join(base, 'scripts', 'seed_cache_config.py')),
        ("12. Roles admin y periodos", os.path.join(base, 'scripts', 'seed_config_extras.py')),
    ]

    for label, path in steps:
        _run(label, path)

    log.info("\n" + "=" * 60)
    log.info("SEED COMPLETADO")
    log.info("=" * 60)


if __name__ == '__main__':
    main()
