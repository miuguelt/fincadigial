"""Market input contract, independent of HTTP and persistence."""
import hashlib
import json
import math
import re
from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

CATEGORIES = {"produce", "dairy", "animals", "seeds", "processed", "supplies", "other"}


class MarketError(Exception):
    def __init__(self, detail, status=400, field=None):
        super().__init__(detail)
        self.detail, self.status, self.field = detail, status, field


def today():
    return datetime.now(ZoneInfo("America/Bogota")).date()


def text_field(value, field, maximum, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise MarketError("Escribe un texto válido.", field=field)
    value = value.strip()
    if (required and not value) or len(value) > maximum:
        raise MarketError(f"Completa este campo (máximo {maximum} caracteres).", field=field)
    return value


def number_field(value, field, required=False, positive=False):
    if value is None or value == "":
        if required:
            raise MarketError("Ingresa una cantidad mayor que cero.", field=field)
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise MarketError("Ingresa un número válido.", field=field)
    if isinstance(value, bool) or not math.isfinite(result) or result < 0 or (positive and result == 0) or result > 1e12:
        raise MarketError("Ingresa un número dentro del rango permitido.", field=field)
    return result


def offer_payload(data):
    kind = data.get("offer_type", "sale")
    if not isinstance(kind, str) or kind not in {"sale", "purchase", "exchange"}:
        raise MarketError("Elige venta, compra o trueque.", field="offer_type")
    if data.get("community_visible") is not True:
        raise MarketError("Acepta compartir esta publicación con la comunidad.", field="community_visible")
    category = data.get("category", "other")
    if not isinstance(category, str) or category not in CATEGORIES:
        raise MarketError("Elige una categoría válida.", field="category")
    result = dict(offer_type=kind, category=category, community_visible=True, currency="COP")
    for field, maximum, required in [("product_name", 180, True), ("unit", 50, True),
                                     ("delivery_location", 240, True), ("notes", 2000, False),
                                     ("exchange_for", 500, kind == "exchange")]:
        result[field] = text_field(data.get(field), field, maximum, required)
    result["quantity"] = number_field(data.get("quantity"), "quantity", True, True)
    result["price"] = None if kind == "exchange" else number_field(data.get("price"), "price")
    raw_date = data.get("available_until") or (today() + timedelta(days=30)).isoformat()
    try:
        end = datetime.strptime(raw_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise MarketError("Ingresa una fecha válida.", field="available_until")
    if end < today() or end > today() + timedelta(days=366):
        raise MarketError("Elige una fecha entre hoy y el próximo año.", field="available_until")
    result["available_until"] = end
    phone = text_field(data.get("contact_phone"), "contact_phone", 30)
    digits = re.sub(r"[\s()+-]", "", phone)
    if digits and not re.fullmatch(r"(?:57)?3\d{9}", digits):
        raise MarketError("Ingresa un celular colombiano de 10 dígitos.", field="contact_phone")
    result["contact_phone"] = digits[-10:] if digits else None
    if "share_phone" in data and not isinstance(data["share_phone"], bool):
        raise MarketError("Selecciona si deseas compartir tu celular.", field="share_phone")
    result["share_phone"] = data.get("share_phone") is True and bool(digits)
    return result


def request_identity(key, payload):
    try:
        key = str(UUID(key))
    except (ValueError, TypeError, AttributeError):
        raise MarketError("Actualiza la página y vuelve a enviar la solicitud.", field="Idempotency-Key")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return key, digest


def require_version(actual, supplied):
    if isinstance(supplied, bool) or supplied != actual:
        raise MarketError("Hay cambios recientes. Actualiza y revisa antes de continuar.", 409)
