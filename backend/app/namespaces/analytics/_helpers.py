# _helpers.py - Utilidades de cálculo para analítica
from app.utils.tenant_context import apply_tenant_filter


def _tf(query, model_class):
    """Helper local para aplicar filtro de tenant de forma concisa."""
    return apply_tenant_filter(query, model_class)


def _round(val, precision=0):
    """Helper para redondeo seguro con manejo de Nones."""
    if val is None:
        return 0.0
    try:
        if precision == 0:
            return round(float(val))
        factor = 10**precision
        return round(float(val) * factor) / float(factor)
    except (ValueError, TypeError):
        return 0.0


def calculate_percentage_change(current_value, previous_value, cap=999.0):
    """Calcula variaciones porcentuales controlando desbordes."""
    current = current_value or 0
    previous = previous_value or 0
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    try:
        current_f = float(current)
        prev_f = float(previous)
        change = (current_f - prev_f) / prev_f * 100
    except Exception:
        return 0.0
    if cap is not None:
        max_change = float(cap)
        if change > max_change:
            change = max_change
        elif change < -max_change:
            change = -max_change
    return _round(change, 1)


def safe_percentage(part, whole, precision=1):
    """Calcula porcentajes evitando divisiones por cero."""
    if not whole:
        return 0.0
    try:
        return _round(float(part) / float(whole) * 100, precision)
    except Exception:
        return 0.0


def percentage_point_delta(current_value, previous_value):
    """Diferencia en puntos porcentuales entre periodos."""
    current = float(current_value or 0)
    previous = float(previous_value or 0)
    return _round(current - previous, 1)
