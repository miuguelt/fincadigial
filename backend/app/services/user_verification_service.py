"""
Servicio SSoT para gestionar la configuración de verificación de nuevos usuarios.

Almacena la preferencia en la tabla system_contents (clave: 'config.require_user_verification')
para evitar configuraciones hardcodeadas y respetar el principio de SSoT.
"""

import logging
from app import db
from app.models.system_content import SystemContent

logger = logging.getLogger(__name__)

CONFIG_KEY = "config.require_user_verification"


def is_user_verification_required() -> bool:
    """
    Retorna True si el sistema requiere que los nuevos usuarios registrados
    pasen por una aprobación previa manual de un administrador antes de iniciar sesión.

    Por defecto retorna False (auto-aprobación inmediata para fase de inicio / lanzamiento).
    """
    try:
        entry = SystemContent.get_by_key(CONFIG_KEY)
        if entry and entry.content is not None:
            val = str(entry.content).strip().lower()
            return val in ("true", "1", "yes", "si")
        return False
    except Exception as e:
        logger.warning(f"Error consultando {CONFIG_KEY}, asumiendo False: {e}")
        return False


def set_user_verification_required(required: bool) -> bool:
    """
    Actualiza la configuración de verificación de usuarios en la base de datos.
    """
    try:
        val_str = "true" if required else "false"
        entry = SystemContent.get_by_key(CONFIG_KEY)
        if entry:
            entry.content = val_str
            entry.is_active = True
        else:
            entry = SystemContent(
                key=CONFIG_KEY,
                category="config",
                content_type="boolean",
                title="Requerir verificación de nuevos usuarios",
                content=val_str,
                is_active=True,
            )
            db.session.add(entry)
        db.session.commit()
        logger.info(f"Configuración {CONFIG_KEY} actualizada a: {val_str}")
        return True
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error actualizando {CONFIG_KEY}: {e}", exc_info=True)
        raise e
