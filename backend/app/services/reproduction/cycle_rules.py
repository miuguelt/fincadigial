"""Parámetros y metas del ciclo reproductivo bovino.

Los valores por defecto siguen la práctica estándar de ganadería bovina en
trópico bajo colombiano. Cada finca puede sobreescribirlos con entradas
``param.reproduction.*`` en ``system_contents``.
"""

from dataclasses import dataclass, fields

_PARAM_PREFIX = "param.reproduction."


@dataclass(frozen=True)
class CycleRules:
    """Umbrales del ciclo reproductivo usados por todo el módulo."""

    gestation_days: int = 283
    estrous_cycle_days: int = 21
    heat_detection_min_days: int = 18
    heat_detection_max_days: int = 23
    #: Días post-parto antes de ofrecer el primer servicio.
    voluntary_waiting_days: int = 50
    #: Días antes del parto en que la vaca debe secarse.
    dry_off_days_before_birth: int = 60
    #: Ventana en la que un diagnóstico puede atribuirse a un servicio.
    diagnosis_min_days: int = 25
    diagnosis_max_days: int = 150
    #: Tolerancia del parto respecto a la fecha esperada de un servicio.
    birth_window_days: int = 25
    #: Días sin diagnóstico tras los que un servicio queda sin confirmar.
    service_confirmation_days: int = 45
    #: Edad mínima para el primer servicio de una novilla.
    first_service_age_months: int = 18
    #: Días abiertos por encima de los cuales la vaca es problema.
    max_days_open: int = 120

    @property
    def dry_off_gestation_day(self) -> int:
        return self.gestation_days - self.dry_off_days_before_birth


#: Metas de referencia del hato. Se exponen junto a cada indicador para que
#: la interfaz pueda semaforizar sin duplicar el criterio.
TARGETS = {
    "calving_interval_days": {"target": 400, "warn": 430, "direction": "lower"},
    "days_open": {"target": 100, "warn": 120, "direction": "lower"},
    "calving_to_first_service_days": {"target": 60, "warn": 85, "direction": "lower"},
    "services_per_conception": {"target": 1.8, "warn": 2.5, "direction": "lower"},
    "age_at_first_calving_months": {"target": 30, "warn": 36, "direction": "lower"},
    "conception_rate_pct": {"target": 50, "warn": 40, "direction": "higher"},
    "heat_detection_rate_pct": {"target": 60, "warn": 45, "direction": "higher"},
    "pregnancy_rate_pct": {"target": 25, "warn": 18, "direction": "higher"},
    "perinatal_mortality_pct": {"target": 3, "warn": 6, "direction": "lower"},
    "abortion_rate_pct": {"target": 2, "warn": 5, "direction": "lower"},
    "calving_complication_rate_pct": {"target": 5, "warn": 10, "direction": "lower"},
}


def load_rules(finca_id: int | None = None) -> CycleRules:
    """Construye las reglas del ciclo aplicando los overrides de la finca."""
    overrides: dict[str, int] = {}
    for field in fields(CycleRules):
        raw = _read_param(f"{_PARAM_PREFIX}{field.name}", finca_id)
        if raw is not None:
            overrides[field.name] = raw
    return CycleRules(**overrides)


def status_for(metric: str, value: float | None) -> str | None:
    """Semáforo de un indicador contra su meta: ``ok``, ``warn`` o ``bad``."""
    rule = TARGETS.get(metric)
    if rule is None or value is None:
        return None
    if rule["direction"] == "lower":
        if value <= rule["target"]:
            return "ok"
        return "warn" if value <= rule["warn"] else "bad"
    if value >= rule["target"]:
        return "ok"
    return "warn" if value >= rule["warn"] else "bad"


def _read_param(key: str, finca_id: int | None) -> int | None:
    from app.models.system_content import SystemContent

    try:
        entry = SystemContent.get_by_key(key, finca_id)
    except Exception:  # noqa: BLE001 — parámetro opcional, nunca debe romper KPIs
        return None
    if not entry or entry.content in (None, ""):
        return None
    try:
        return int(float(entry.content))
    except (TypeError, ValueError):
        return None
