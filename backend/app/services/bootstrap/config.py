"""Configuración del bootstrap sin credenciales embebidas."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Mapping

from app.models.finca import FarmType


class BootstrapConfigurationError(ValueError):
    """Indica que faltan variables o que una definición no es válida."""


@dataclass(frozen=True)
class FarmDefinition:
    name: str
    farm_type: FarmType
    department: str | None = None
    municipality: str | None = None
    address: str | None = None
    nit: str | None = None
    ica_registration: str | None = None
    territory_id: int | None = None


@dataclass(frozen=True)
class BootstrapSettings:
    enabled: bool
    admin_identification: int | None
    admin_email: str | None
    admin_password: str | None
    admin_fullname: str
    admin_phone: str
    farms: tuple[FarmDefinition, ...]
    include_demo_data: bool
    demo_password: str | None


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _farm_type(raw: object) -> FarmType:
    value = str(raw or FarmType.Tradicional.value).strip()
    try:
        return FarmType(value)
    except ValueError as exc:
        valid = ", ".join(item.value for item in FarmType)
        raise BootstrapConfigurationError(
            f"Tipo de finca inválido {value!r}; use uno de: {valid}."
        ) from exc


def _parse_farms(raw: str | None, env: Mapping[str, str]) -> tuple[FarmDefinition, ...]:
    if not raw or raw.strip() in ("", "[]"):
        raw = json.dumps(
            [
                {
                    "name": env.get("VILLALUZ_ADMIN_FARM_NAME", "Finca Villa Luz"),
                    "type": env.get("VILLALUZ_ADMIN_FARM_TYPE", "Tradicional"),
                    "department": env.get("VILLALUZ_ADMIN_FARM_DEPARTMENT", "Cundinamarca"),
                    "municipality": env.get("VILLALUZ_ADMIN_FARM_MUNICIPALITY", "Bogotá"),
                }
            ]
        )
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise BootstrapConfigurationError(
            "VILLALUZ_BOOTSTRAP_FINCAS_JSON debe ser un arreglo JSON válido."
        ) from exc
    if not isinstance(payload, list) or not payload:
        raise BootstrapConfigurationError(
            "VILLALUZ_BOOTSTRAP_FINCAS_JSON debe contener al menos una finca."
        )

    result: list[FarmDefinition] = []
    seen: set[str] = set()
    for item in payload:
        if not isinstance(item, dict) or not str(item.get("name", "")).strip():
            raise BootstrapConfigurationError(
                "Cada finca debe ser un objeto JSON con el campo 'name'."
            )
        name = str(item["name"]).strip()
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(
            FarmDefinition(
                name=name,
                farm_type=_farm_type(item.get("type")),
                department=item.get("department"),
                municipality=item.get("municipality"),
                address=item.get("address"),
                nit=item.get("nit"),
                ica_registration=item.get("ica_registration"),
                territory_id=item.get("territory_id"),
            )
        )
    return tuple(result)


def load_bootstrap_settings(
    env: Mapping[str, str] | None = None,
) -> BootstrapSettings:
    """Lee el contrato de entorno usado por el inicializador de Coolify.

    Los alias heredados se aceptan para desarrollo, pero producción exige las
    variables `VILLALUZ_ADMIN_*` explícitas y nunca genera contraseñas.
    """

    env = env or os.environ
    is_production = (env.get("FLASK_ENV") or env.get("FLASK_CONFIG", "")).lower() == "production"

    email = env.get("VILLALUZ_ADMIN_EMAIL") or env.get("ADMIN_EMAIL")
    password = env.get("VILLALUZ_ADMIN_PASSWORD") or env.get("ADMIN_PASSWORD") or (None if is_production else env.get("TEST_USER_PASSWORD"))

    # Auto-activar si se definieron credenciales de administrador o VILLALUZ_BOOTSTRAP_ENABLED es true
    has_creds = bool(str(email or "").strip() and str(password or "").strip())
    enabled = _as_bool(env.get("VILLALUZ_BOOTSTRAP_ENABLED"), default=has_creds)
    active = enabled or is_production and _as_bool(
        env.get("VILLALUZ_BOOTSTRAP_ON_PRODUCTION"), default=has_creds
    )
    if not active:
        return BootstrapSettings(False, None, None, None, "", "", tuple(), False, None)

    identification_raw = (
        env.get("VILLALUZ_ADMIN_IDENTIFICATION")
        or env.get("ADMIN_ID")
        or "1000000001"
    )

    required = {
        "VILLALUZ_ADMIN_EMAIL": email,
        "VILLALUZ_ADMIN_PASSWORD": password,
    }
    missing = [name for name, value in required.items() if not str(value or "").strip()]
    if missing:
        raise BootstrapConfigurationError(
            "Bootstrap habilitado, faltan credenciales del administrador: " + ", ".join(missing)
        )
    try:
        identification = int(str(identification_raw).strip())
    except ValueError as exc:
        raise BootstrapConfigurationError(
            "VILLALUZ_ADMIN_IDENTIFICATION debe ser un entero."
        ) from exc
    if identification <= 0:
        raise BootstrapConfigurationError("VILLALUZ_ADMIN_IDENTIFICATION debe ser positivo.")

    return BootstrapSettings(
        enabled=True,
        admin_identification=identification,
        admin_email=str(email).strip(),
        admin_password=str(password),
        admin_fullname=env.get("VILLALUZ_ADMIN_FULLNAME", "Administrador Villa Luz").strip(),
        admin_phone=env.get("VILLALUZ_ADMIN_PHONE", "3000000000").strip(),
        farms=_parse_farms(env.get("VILLALUZ_BOOTSTRAP_FINCAS_JSON"), env),
        include_demo_data=_as_bool(env.get("VILLALUZ_SEED_DEMO_DATA"), default=False),
        demo_password=env.get("VILLALUZ_DEMO_PASSWORD") or env.get("TEST_USER_PASSWORD"),
    )
