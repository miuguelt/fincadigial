import enum
import os
import logging
import time
import requests

logger = logging.getLogger(__name__)

_CB_FAIL_THRESHOLD = 3
_CB_OPEN_SECONDS = 30
_CB_TIMEOUT = 30

_circuit: dict = {"failures": 0, "open_until": 0.0}
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "false").lower() == "true"


def _circuit_is_open() -> bool:
    return (
        _circuit["failures"] >= _CB_FAIL_THRESHOLD
        and time.time() < _circuit["open_until"]
    )


def _circuit_record_failure() -> None:
    _circuit["failures"] += 1
    if _circuit["failures"] >= _CB_FAIL_THRESHOLD:
        _circuit["open_until"] = time.time() + _CB_OPEN_SECONDS
        logger.warning("Ollama API circuit breaker ABIERTO")


def _circuit_record_success() -> None:
    if _circuit["failures"] > 0:
        logger.info("Ollama API circuit breaker CERRADO")
    _circuit["failures"] = 0
    _circuit["open_until"] = 0.0


_SYSTEM_GANADERO = """Eres el Asistente Ganadero Inteligente de Finca Villa Luz.
Tu especialidad es la ganadería bovina en Colombia.
REGLAS:
1. Responde siempre en español.
2. Basa tus análisis en los datos proporcionados.
3. Formato: Markdown.
4. Sé directo y técnico.
"""


class PromptRole(enum.Enum):
    ASSISTANT = "Asistente Ganadero Inteligente"
    ANALYST = "Analista de Datos Veterinarios"
    MANAGER = "Gerente de Finca"


class CortexService:
    """
    Servicio de contenido del sistema.
    Todas las respuestas se obtienen de la tabla `system_contents`.
    Ollama solo se usa si OLLAMA_ENABLED=true y no hay contenido en DB.
    """

    @staticmethod
    def assemble_prompt(
        target_object, role=PromptRole.ASSISTANT, spec=None, action=None
    ):
        if hasattr(target_object, "to_ai_context"):
            context = target_object.to_ai_context()
        elif isinstance(target_object, list):
            context = "Contexto del ganado:\n" + "\n".join(
                [
                    obj.to_ai_context()
                    for obj in target_object
                    if hasattr(obj, "to_ai_context")
                ]
            )
        else:
            context = str(target_object)

        role_desc = role.value if hasattr(role, "value") else str(role)
        spec_text = (
            spec or "Respuesta clara, profesional y basada en los datos proporcionados."
        )
        action_text = (
            action or "Analiza el estado actual y sugiere los siguientes pasos."
        )

        return f"""SISTEMA: {_SYSTEM_GANADERO}
ROL: {role_desc}
CONTEXTO:
{context}
ESPECIFICACIÓN:
{spec_text}
ACCIÓN:
{action_text}
"""

    @staticmethod
    def generate_insight_request(analytics_data):
        return f"""Analiza los siguientes KPIs ganaderos y genera:
- 3 puntos clave observados
- 1 recomendación urgente
- 1 alerta preventiva

DATOS:
{analytics_data}
"""

    @staticmethod
    def call_claude(
        prompt: str, role: PromptRole = PromptRole.ANALYST, max_tokens: int = 500
    ) -> dict:
        """
        Obtiene contenido del sistema desde la BD.
        Busca en `system_contents` por key basada en el rol y el tipo de prompt.
        Si OLLAMA_ENABLED=true, intenta Ollama como fallback.
        No retorna contenido hardcodeado ni simulado.
        """
        from app.models.system_content import SystemContent

        content_key = _prompt_to_key(prompt, role)
        entry = SystemContent.get_by_key(content_key)

        if entry:
            logger.info("Contenido servido desde DB: key=%s", content_key)
            return {
                "text": entry.content,
                "model": "db",
                "usage": {},
            }

        if OLLAMA_ENABLED:
            return CortexService._call_ollama(prompt, role, max_tokens)

        logger.warning(
            "No hay contenido en DB para key=%s y OLLAMA deshabilitado.", content_key
        )
        return None

    @staticmethod
    def _call_ollama(prompt: str, role: PromptRole, max_tokens: int) -> dict:
        if _circuit_is_open():
            logger.warning(
                "Ollama circuit breaker activo — no hay contenido disponible"
            )
            return {
                "text": "El servicio de análisis no está disponible momentáneamente. Intente más tarde.",
                "model": "unavailable",
                "usage": {},
            }

        try:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"num_predict": max_tokens, "temperature": 0.3},
            }
            response = requests.post(OLLAMA_URL, json=payload, timeout=_CB_TIMEOUT)
            response.raise_for_status()
            result = response.json()
            text = result.get("response", "")
            _circuit_record_success()
            return {
                "text": text,
                "model": f"local-{OLLAMA_MODEL}",
                "usage": {"total_duration": result.get("total_duration", 0)},
            }
        except Exception as e:
            logger.error("Error llamando Ollama: %s", e)
            _circuit_record_failure()
            return {
                "text": "El servicio de análisis no está disponible momentáneamente.",
                "model": "unavailable",
                "usage": {},
            }


def _prompt_to_key(prompt: str, role: PromptRole) -> str:
    if "genera una RECOMENDACIÓN TÉCNICA PROFESIONAL" in prompt:
        return "recommendation.alert.generic"
    if "Analiza la salud y crecimiento de este lote" in prompt:
        return "insight.predictive.batch_analysis"
    if "detecta anomalías críticas" in prompt.lower():
        return "insight.predictive.anomaly"
    if "Salud" in prompt or "health" in prompt.lower():
        return "insight.health_warning"
    if "KPIs" in prompt or "productividad" in prompt.lower():
        return "insight.productivity_opt"
    if "Celo" in prompt:
        return "recommendation.heat_cycle"
    return "insight.general_status"
