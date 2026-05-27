"""
Configuraciones de alerta predeterminadas para ganadería bovina colombiana.

Estas plantillas se aplican como configs globales de finca (animal_id=None) y se evalúan
para TODOS los animales activos cada vez que corre AlertEngine.evaluate_all().

Dimensiones disponibles en _evaluate_custom():
  weight           → peso actual del animal (kg)
  age              → edad en meses
  status           → valor del enum AnimalStatus ('Vivo', 'Vendido', 'Muerto')
  sex              → valor del enum Sex ('Macho', 'Hembra')
  days_since_control → días desde el último control sanitario registrado
"""
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Plantillas globales: no requieren animal_id, aplican a toda la finca
# Formato: dimensión + operador + valor  (ej: ">30", "<80", "=Macho")
# ---------------------------------------------------------------------------

DEFAULT_GLOBAL_CONFIGS = [
    # ─── PESO MÍNIMO ─────────────────────────────────────────────────────────
    {
        'alert_type': 'Crecimiento',
        'dimension': 'weight',
        'condition_value': '<50',
        'message': '⚖️ Peso crítico (<50 kg): posible desnutrición o enfermedad. Evaluar urgente.',
        'priority': 'Crítica',
        'is_default': True,
    },
    {
        'alert_type': 'Crecimiento',
        'dimension': 'weight',
        'condition_value': '<80',
        'message': '⚖️ Bajo peso (<80 kg): revisar dieta, parasitismo o estado de salud.',
        'priority': 'Alta',
        'is_default': True,
    },
    {
        'alert_type': 'Crecimiento',
        'dimension': 'weight',
        'condition_value': '<150',
        'message': '⚖️ Peso por debajo de 150 kg: revisar desarrollo y curva de crecimiento.',
        'priority': 'Media',
        'is_default': True,
    },

    # ─── CONTROLES — umbrales de alerta por días sin revisión veterinaria ────
    {
        'alert_type': 'Salud',
        'dimension': 'days_since_control',
        'condition_value': '>120',
        'message': '⚕️ Sin control en más de 120 días. Revisar estado general del animal.',
        'priority': 'Alta',
        'is_default': True,
    },
    {
        'alert_type': 'Salud',
        'dimension': 'days_since_control',
        'condition_value': '>180',
        'message': '🚨 Sin control veterinario en más de 6 meses. Requiere atención prioritaria.',
        'priority': 'Crítica',
        'is_default': True,
    },

    # ─── TERNEROS — vigilancia especial primer año ────────────────────────────
    {
        'alert_type': 'Crecimiento',
        'dimension': 'age',
        'condition_value': '<3',
        'message': '🐮 Ternero recién nacido (<3 meses): confirmar calostro, onfalitis y primeras vacunas.',
        'priority': 'Alta',
        'is_default': True,
    },
    {
        'alert_type': 'Crecimiento',
        'dimension': 'weight',
        'condition_value': '<30',
        'message': '⚖️ Peso muy bajo (<30 kg): posible ternero con bajo peso al nacer. Revisión veterinaria urgente.',
        'priority': 'Crítica',
        'is_default': True,
    },

    # ─── EDAD PRODUCTIVA — novillas y toros ──────────────────────────────────
    {
        'alert_type': 'Reproducción',
        'dimension': 'age',
        'condition_value': '>24',
        'message': '🐄 Animal adulto (>24 meses): verificar que esté en plan reproductivo activo.',
        'priority': 'Baja',
        'is_default': True,
    },

    # ─── PESO MÁXIMO — posible sobrepeso en reproductoras ────────────────────
    {
        'alert_type': 'Crecimiento',
        'dimension': 'weight',
        'condition_value': '>700',
        'message': '⚖️ Peso elevado (>700 kg): revisar condición corporal. Sobrepeso reduce fertilidad.',
        'priority': 'Baja',
        'is_default': True,
    },

    # ─── DÍAS SIN CONTROL DE PESO ────────────────────────────────────────────
    {
        'alert_type': 'Crecimiento',
        'dimension': 'days_since_control',
        'condition_value': '>90',
        'message': '📊 Sin control de peso hace >90 días. Realizar pesaje para evaluar tendencia.',
        'priority': 'Media',
        'is_default': True,
    },

    # ─── EDAD REPRODUCTIVA — novillas listas para primer servicio ─────────────
    {
        'alert_type': 'Reproducción',
        'dimension': 'age',
        'condition_value': '>=18',
        'message': '🐄 Novilla en edad reproductiva (≥18 meses): evaluar condición para primer servicio.',
        'priority': 'Media',
        'is_default': True,
    },

    # ─── ANIMALES JÓVENES — monitoreo intensivo ──────────────────────────────
    {
        'alert_type': 'Crecimiento',
        'dimension': 'age',
        'condition_value': '<6',
        'message': ' Animal joven (<6 meses): monitoreo intensivo de crecimiento y vacunación.',
        'priority': 'Media',
        'is_default': True,
    },
]


def seed_default_configs_for_finca(finca_id: int, replace: bool = False) -> dict:
    """
    Siembra las configs globales predeterminadas para una finca.

    Args:
        finca_id: ID de la finca objetivo.
        replace: Si True, elimina configs anteriores is_default=True antes de insertar.

    Returns:
        dict con 'created', 'skipped', 'deleted'.
    """
    from app import db
    from app.models.alerts import AnimalAlertConfig, AlertType, AlertPriority

    result = {'created': 0, 'skipped': 0, 'deleted': 0}

    if replace:
        deleted = AnimalAlertConfig.query.filter_by(
            finca_id=finca_id, animal_id=None, is_default=True
        ).delete()
        db.session.commit()
        result['deleted'] = deleted

    for cfg in DEFAULT_GLOBAL_CONFIGS:
        # Evitar duplicados por (finca_id, dimension, condition_value)
        exists = AnimalAlertConfig.query.filter_by(
            finca_id=finca_id,
            animal_id=None,
            dimension=cfg['dimension'],
            condition_value=cfg['condition_value'],
        ).first()
        if exists:
            result['skipped'] += 1
            continue

        try:
            alert_type = AlertType(cfg['alert_type'])
            priority   = AlertPriority(cfg['priority'])
        except ValueError as e:
            logger.warning(f"Config inválida, omitiendo: {e}")
            continue

        obj = AnimalAlertConfig(
            animal_id=None,
            finca_id=finca_id,
            alert_type=alert_type,
            dimension=cfg['dimension'],
            condition_value=cfg['condition_value'],
            message=cfg['message'],
            priority=priority,
            is_active=True,
            is_default=True,
        )
        db.session.add(obj)
        result['created'] += 1

    db.session.commit()
    logger.info(
        f"[DefaultAlertConfigs] finca={finca_id} → "
        f"created={result['created']}, skipped={result['skipped']}, deleted={result['deleted']}"
    )
    return result


def seed_all_fincas() -> dict:
    """Aplica configs predeterminadas a TODAS las fincas registradas."""
    from app.models.finca import Finca
    total = {'created': 0, 'skipped': 0}
    for finca in Finca.query.all():
        r = seed_default_configs_for_finca(finca.id)
        total['created'] += r['created']
        total['skipped'] += r['skipped']
    return total
