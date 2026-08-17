"""Number shaping shared by the dashboard.

Every figure that reaches the screen passes through here, so a `Decimal` from a
`Numeric` column, a `None` from an empty aggregate and a division by zero all
end up as a plain number instead of breaking the serializer.
"""

# Tope de variación porcentual: sin él, pasar de 0 a 5 muestra "+500 %" y la
# tarjeta deja de decir nada útil.
DEFAULT_CHANGE_CAP = 999.0


def safe_round(value, precision=0):
    """Redondea a `precision` decimales; `None` y lo no numérico valen 0."""
    if value is None:
        return 0.0
    try:
        if precision == 0:
            return round(float(value))
        factor = 10**precision
        return round(float(value) * factor) / float(factor)
    except (ValueError, TypeError):
        return 0.0


def percentage_change(current_value, previous_value, cap=DEFAULT_CHANGE_CAP):
    """Variación porcentual entre dos periodos, acotada."""
    current = current_value or 0
    previous = previous_value or 0
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    try:
        change = ((float(current) - float(previous)) / float(previous)) * 100
        if cap is not None:
            change = max(min(change, float(cap)), -float(cap))
        return safe_round(change, 1)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0.0


def to_stat(value, current_total=None, previous_total=None) -> dict:
    """Envuelve una cifra con su variación y su tendencia, como espera la interfaz."""
    clean = value if value is not None else 0
    return {
        "valor": clean,
        "cambio_porcentual": percentage_change(current_total, previous_total)
        if current_total is not None
        else 0,
        "tendencia": {
            "periodo_actual": current_total if current_total is not None else clean,
            "periodo_anterior": previous_total if previous_total is not None else clean,
        },
    }


def as_float(value, default=0.0) -> float:
    """Convierte a `float` un `Decimal` de SQLAlchemy o lo que venga vacío."""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default
