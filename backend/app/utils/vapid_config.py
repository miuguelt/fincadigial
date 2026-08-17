"""
Configuración VAPID para Web Push
=================================

VAPID (Voluntary Application Server Identification) es el estándar
para autenticar servidores de aplicaciones en Web Push.

Este archivo gestiona las claves VAPID para enviar notificaciones push.

Uso:
    from app.utils.vapid_config import get_vapid_keys, generate_vapid_keys

    # Obtener claves existentes o generar nuevas
    keys = get_vapid_keys()

    # Generar nuevas claves (solo si es necesario rotar)
    new_keys = generate_vapid_keys()
"""

import os
import base64
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Nombres de variables de entorno
VAPID_PUBLIC_KEY_ENV = "VAPID_PUBLIC_KEY"
VAPID_PRIVATE_KEY_ENV = "VAPID_PRIVATE_KEY"
VAPID_CLAIMS_SUB_ENV = "VAPID_CLAIMS_SUB"  # Email del contacto


def get_vapid_keys() -> dict[str, str]:
    """
    Obtener las claves VAPID desde variables de entorno.
    Si no existen, genera nuevas claves automáticamente y las persiste en .env.
    """
    public_key = os.environ.get(VAPID_PUBLIC_KEY_ENV)
    private_key = os.environ.get(VAPID_PRIVATE_KEY_ENV)
    claims_sub = os.environ.get(VAPID_CLAIMS_SUB_ENV, "mailto:admin@fincavillaluz.com")

    if not public_key or not private_key:
        logger.info("VAPID Keys no detectadas. Iniciando generación automática...")
        try:
            new_keys = generate_vapid_keys()
            public_key = new_keys["public_key"]
            private_key = new_keys["private_key"]

            # Persistir en .env para futuros reinicios
            # Intentar encontrar el .env en la raíz del backend
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_root = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(backend_root, ".env")

            if os.path.exists(env_path):
                # Leer contenido para verificar si ya existen (doble chequeo)
                with open(env_path) as f:
                    content = f.read()

                if VAPID_PUBLIC_KEY_ENV not in content:
                    with open(env_path, "a") as f:
                        f.write(
                            f"\n# VAPID Keys (Generadas automáticamente el {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})\n"
                        )
                        f.write(f"{VAPID_PUBLIC_KEY_ENV}={public_key}\n")
                        f.write(f"{VAPID_PRIVATE_KEY_ENV}={private_key}\n")
                        f.write(f"{VAPID_CLAIMS_SUB_ENV}={claims_sub}\n")
                    logger.info(f"✅ VAPID Keys persistidas en {env_path}")
                else:
                    logger.info(
                        f"ℹ️ VAPID Keys ya existen en {env_path}, no se duplicaron."
                    )
            else:
                logger.warning(
                    f"⚠️ No se encontró .env en {env_path}, las llaves solo durarán esta sesión."
                )
        except Exception as e:
            logger.error(f"❌ Error generando VAPID Keys automáticamente: {e}")

    return {
        "public_key": public_key or "",
        "private_key": private_key or "",
        "claims_sub": claims_sub,
    }


def generate_vapid_keys() -> dict[str, str]:
    """
    Generar nuevas claves VAPID usando py-vapid.

    Esto requiere la librería py-vapid:
        pip install py-vapid

    Returns:
        Dict con las nuevas claves
    """
    try:
        from py_vapid import Vapid

        # Generar nuevo par de claves
        vapid = Vapid()
        vapid.generate_keys()

        # Exportar claves (son propiedades, no métodos en versiones recientes)
        private_key_obj = vapid.private_key
        public_key_obj = vapid.public_key

        # Obtener bytes crudos
        from cryptography.hazmat.primitives import serialization

        # Para la clave privada, necesitamos los bytes crudos del número privado
        private_key_bytes = private_key_obj.private_numbers().private_value.to_bytes(
            32, byteorder="big"
        )

        # Para la clave pública, necesitamos el formato sin comprimir X9.62 (65 bytes: 0x04 + X + Y)
        from cryptography.hazmat.primitives.asymmetric import ec

        public_key_bytes = public_key_obj.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )

        # Convertir a formato base64 URL-safe sin padding
        private_key_b64 = (
            base64.urlsafe_b64encode(private_key_bytes).decode("utf-8").rstrip("=")
        )
        public_key_b64 = (
            base64.urlsafe_b64encode(public_key_bytes).decode("utf-8").rstrip("=")
        )

        logger.info("Nuevas claves VAPID generadas exitosamente")

        return {
            "public_key": public_key_b64,
            "private_key": private_key_b64,
            "claims_sub": "mailto:admin@fincavillaluz.com",
        }

    except ImportError:
        logger.error("py-vapid no está instalado. Ejecuta: pip install py-vapid")
        raise RuntimeError("py-vapid no está instalado")


def save_vapid_keys_to_env(keys: dict[str, str]):
    """
    Guardar claves VAPID en variables de entorno (solo para sesión actual).

    Para persistencia permanente, agregar al archivo .env
    """
    os.environ[VAPID_PUBLIC_KEY_ENV] = keys["public_key"]
    os.environ[VAPID_PRIVATE_KEY_ENV] = keys["private_key"]
    os.environ[VAPID_CLAIMS_SUB_ENV] = keys["claims_sub"]
    logger.info("Claves VAPID configuradas en entorno")


def print_vapid_setup_instructions():
    """
    Imprimir instrucciones para configurar VAPID.
    """
    print("""
=== Configuración VAPID para Web Push ===

1. Generar claves VAPID:
   pip install py-vapid
   python -c "from vapid import Vapid; v = Vapid(); v.generate_keys(); print('Public:', v.public_key()); print('Private:', v.private_key())"

2. O usar openssl:
   openssl ecparam -genkey -name prime256v1 -noout -out vapid_private.pem
   openssl ec -in vapid_private.pem -pubout -out vapid_public.pem

3. Configurar en .env:
   VAPID_PUBLIC_KEY=tu_clave_publica_base64
   VAPID_PRIVATE_KEY=tu_clave_privada_base64
   VAPID_CLAIMS_SUB=mailto:admin@fincavillaluz.com

4. La clave pública debe usarse en el frontend para suscribirse:
   navigator.serviceWorker.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
   })

=========================================
""")


# Verificar configuración al importar
_vapid_keys = get_vapid_keys()
if not _vapid_keys["public_key"] or not _vapid_keys["private_key"]:
    logger.warning("=" * 60)
    logger.warning("CONFIGURACIÓN VAPID INCOMPLETA")
    logger.warning(
        "Las notificaciones push no funcionarán hasta que configures VAPID_KEYS"
    )
    logger.warning("Ver: app/utils/vapid_config.py para instrucciones")
    logger.warning("=" * 60)
