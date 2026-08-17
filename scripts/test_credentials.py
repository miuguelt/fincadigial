"""Carga credenciales de pruebas desde el entorno, nunca desde el código."""

from __future__ import annotations

import os


_ROLE_PREFIXES = {
    "Administrador": "ADMIN",
    "Instructor": "INSTRUCTOR",
    "Aprendiz": "APPRENTICE",
    "Propietario": "OWNER",
    "Capataz": "FOREMAN",
    "Operario": "WORKER",
    "Veterinario": "VET",
}


def _role_suffix(role: str) -> str:
    """Traduce el rol al sufijo de sus variables de entorno."""

    try:
        return _ROLE_PREFIXES[role]
    except KeyError as exc:
        raise ValueError(f"Rol de prueba no soportado: {role}") from exc


def get_role_password(role: str) -> str:
    """Devuelve la contraseña de pruebas del rol o falla con instrucciones claras.

    El documento no se pide aquí: sale de ``app.utils.seed_identities``, que es la
    tabla canónica compartida con el seeder de arranque.
    """

    suffix = _role_suffix(role)
    password = os.getenv(f"VILLALUZ_E2E_{suffix}_PASSWORD") or os.getenv(f"E2E_{suffix}_PASS")

    if not password:
        raise RuntimeError(
            f"Falta la contraseña E2E para {role}. Define VILLALUZ_E2E_{suffix}_PASSWORD."
        )

    return password


def get_role_credentials(role: str) -> tuple[str, str]:
    """Devuelve ``(identificación, contraseña)`` o falla con instrucciones claras."""

    suffix = _role_suffix(role)
    identifier = os.getenv(f"VILLALUZ_E2E_{suffix}_ID") or os.getenv(f"E2E_{suffix}_ID")

    if not identifier:
        raise RuntimeError(
            f"Falta el documento E2E para {role}. Define VILLALUZ_E2E_{suffix}_ID."
        )

    return identifier, get_role_password(role)


def get_seed_password(variable: str = "VILLALUZ_SEED_ADMIN_PASSWORD") -> str:
    """Obtiene una contraseña de seed explícita y evita defaults inseguros."""

    password = os.getenv(variable) or os.getenv("ADMIN_PASSWORD")
    if not password:
        raise RuntimeError(f"Define {variable} o ADMIN_PASSWORD antes de ejecutar este seed.")
    return password
