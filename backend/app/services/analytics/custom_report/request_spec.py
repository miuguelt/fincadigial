"""Validation of the custom report request.

Everything the operator can get wrong is rejected here, before a single query
runs, and with a message that says which filter failed. The endpoint only has
to turn a `ValueError` into a 400.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta

PERIOD_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "2y": 730,
}

# Nombres que la interfaz ha usado a lo largo del tiempo para la misma métrica.
METRIC_ALIASES = {
    "financial": "finance",
    "finanzas": "finance",
    "inventory": "inventory",
    "inventario": "inventory",
    "animals": "animals",
    "health": "health",
    "production": "production",
    "fields": "fields",
    "finance": "finance",
    "milk": "milk",
    "agriculture": "agriculture",
}

SUPPORTED_METRICS = set(METRIC_ALIASES.values())
SUPPORTED_GROUPS = {"breed", "field", "species", "month", "health_status"}

# "all" recorre todo el historial; esta es la fecha de arranque del sistema.
_EPOCH = date(2000, 1, 1)


@dataclass(frozen=True)
class ReportSpec:
    """Lo que se pidió, ya validado y normalizado."""

    period: str
    metrics: list[str]
    group_by: list[str]
    filters: dict
    start_date: date
    end_date: date
    animal_statuses: list = field(default_factory=list)
    animal_sexes: list = field(default_factory=list)
    breed_ids: list = field(default_factory=list)

    def wants(self, metric: str) -> bool:
        return metric in self.metrics

    def groups_by(self, group: str) -> bool:
        return group in self.group_by


def _as_list(value):
    return value if isinstance(value, list) else [value]


def parse_enum(enum_cls, value, label):
    """Acepta el valor, el nombre o la instancia del enum; falla nombrando el filtro."""
    parsed = []
    for item in _as_list(value):
        if isinstance(item, enum_cls):
            parsed.append(item)
            continue
        try:
            parsed.append(enum_cls(item))
            continue
        except (TypeError, ValueError):
            pass
        try:
            parsed.append(enum_cls[str(item)])
        except (KeyError, TypeError):
            raise ValueError(f"Filtro inválido para {label}: {item}") from None
    return parsed


def parse_int_filter(value, label):
    try:
        return [int(item) for item in _as_list(value)]
    except (TypeError, ValueError):
        raise ValueError(f"Filtro inválido para {label}") from None


def build_spec(payload: dict) -> ReportSpec:
    """Convierte el cuerpo de la petición en un `ReportSpec` o lanza `ValueError`."""
    from app.models.animals import AnimalStatus, Sex

    period = payload.get("period", "1y")
    if period not in (*PERIOD_DAYS, "all"):
        raise ValueError("Período de reporte inválido")

    raw_metrics = payload.get("metrics", ["animals"])
    raw_metrics = _as_list(raw_metrics)
    metrics = list(
        dict.fromkeys(METRIC_ALIASES.get(str(item), str(item)) for item in raw_metrics)
    )
    if not metrics or any(metric not in SUPPORTED_METRICS for metric in metrics):
        raise ValueError("La selección de métricas no es válida")

    group_by = list(dict.fromkeys(_as_list(payload.get("groupBy", []) or [])))
    if any(group not in SUPPORTED_GROUPS for group in group_by):
        raise ValueError("El agrupamiento seleccionado no es válido")

    filters = payload.get("filters", {}) or {}
    if not isinstance(filters, dict):
        raise ValueError("Los filtros del reporte no son válidos")

    today = date.today()
    start_date = (
        _EPOCH if period == "all" else today - timedelta(days=PERIOD_DAYS[period])
    )

    # `breeds_id` es el nombre actual; `breed_id` se mantiene por compatibilidad.
    breed_ids = (
        parse_int_filter(filters["breed_id"], "raza") if "breed_id" in filters else []
    )
    if "breeds_id" in filters:
        breed_ids = parse_int_filter(filters["breeds_id"], "raza")

    return ReportSpec(
        period=period,
        metrics=metrics,
        group_by=group_by,
        filters=filters,
        start_date=start_date,
        end_date=today,
        animal_statuses=parse_enum(AnimalStatus, filters["status"], "estado")
        if "status" in filters
        else [],
        animal_sexes=parse_enum(Sex, filters["sex"], "sexo")
        if "sex" in filters
        else [],
        breed_ids=breed_ids,
    )
