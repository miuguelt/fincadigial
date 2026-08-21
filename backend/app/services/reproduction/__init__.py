"""Módulo de reproducción bovina.

Contratos públicos:

- ``build_herd_kpis``: panel de indicadores reproductivos de una finca.
- ``build_service_units``: unidades de servicio resueltas por hembra.
- ``load_rules`` / ``CycleRules``: parámetros del ciclo configurables por finca.
- ``apply_event_effects`` / ``revert_event_effects``: sincronización del estado
  del animal y de sus registros derivados ante altas, ediciones y bajas.
- ``validate_event``: reglas de dominio previas a persistir un evento.
"""

from .cycle_rules import TARGETS, CycleRules, load_rules, status_for
from .female_metrics import FemaleMetrics, build_female_metrics
from .herd_kpis import build_herd_kpis
from .pregnancy_resolver import (
    ABORTED,
    CALVED,
    CONFIRMED,
    FAILED,
    PENDING,
    AnimalTimeline,
    ServiceUnit,
    build_service_units,
    load_timelines,
)
from .state_sync import apply_event_effects, resync_animal, revert_event_effects
from .validators import validate_event

__all__ = [
    "ABORTED",
    "CALVED",
    "CONFIRMED",
    "FAILED",
    "PENDING",
    "TARGETS",
    "AnimalTimeline",
    "CycleRules",
    "FemaleMetrics",
    "ServiceUnit",
    "apply_event_effects",
    "build_female_metrics",
    "build_herd_kpis",
    "build_service_units",
    "load_rules",
    "load_timelines",
    "resync_animal",
    "revert_event_effects",
    "status_for",
    "validate_event",
]
