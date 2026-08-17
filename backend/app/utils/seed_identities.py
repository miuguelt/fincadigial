"""Tabla canónica de identidades de los usuarios de prueba.

Fuente única para el seeder de arranque (`seed_users.ensure_test_users`), los
scripts de apoyo en `scripts/` y los botones "Perfiles de desarrollo" del login.
Cualquier consumidor que invente su propio documento o correo termina borrado por
la fase de limpieza del seeder, que elimina a quien ocupe un documento o correo
objetivo con datos distintos.

No importa modelos ni la base de datos: se puede leer desde cualquier script.
"""

import os


ID_ENV_VARS = {
    "Administrador": "ADMIN_ID",
    "Propietario": "TEST_USER_PROPRIETARIO_ID",
    "Capataz": "TEST_USER_CAPATAZ_ID",
    "Instructor": "TEST_USER_INSTRUCTOR_ID",
    "Aprendiz": "TEST_USER_APRENDIZ_ID",
    "Operario": "TEST_USER_OPERARIO_ID",
    "Veterinario": "TEST_USER_VETERINARIO_ID",
}

_DEFAULTS = {
    "Administrador": (1098, "admin@villaluz.co", "Administrador General"),
    "Propietario": (55555555, "propietario@villaluz.co", "Don Carlos Dueño"),
    "Capataz": (66666666, "capataz@villaluz.co", "Capataz Pedro"),
    "Instructor": (11111111, "instructor@sena.edu.co", "Instructor Jefe"),
    "Aprendiz": (22222222, "aprendiz@sena.edu.co", "Aprendiz SENA 1"),
    "Operario": (33333333, "operario@villaluz.co", "María Operaria"),
    "Veterinario": (44444444, "veterinario@villaluz.co", "Dr. Martínez Vet"),
}


def get_seed_identity(role: str) -> dict:
    """Devuelve la identidad canónica de un rol, resolviendo el entorno.

    El documento se toma de la variable de entorno del rol y siempre se devuelve
    como entero: la columna `identification` es numérica y compararla contra una
    cadena no encuentra al usuario.
    """
    try:
        default_id, default_email, fullname = _DEFAULTS[role]
    except KeyError as exc:
        raise ValueError(f"Rol de prueba no soportado: {role}") from exc

    raw_id = os.getenv(ID_ENV_VARS[role], str(default_id))
    try:
        identification = int(raw_id)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"{ID_ENV_VARS[role]} debe ser un número entero; se recibió {raw_id!r}."
        ) from exc

    email = default_email
    if role == "Administrador":
        email = os.getenv("ADMIN_EMAIL", default_email)

    return {
        "role": role,
        "identification": identification,
        "email": email,
        "fullname": fullname,
    }


def get_seed_identities() -> list[dict]:
    """Devuelve todas las identidades canónicas en el orden del seeder."""
    return [get_seed_identity(role) for role in _DEFAULTS]
