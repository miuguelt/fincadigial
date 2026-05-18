import enum
import os
import logging
import time
import requests
import json
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Circuit breaker para Ollama API (Local)
# Abre el circuito tras 3 fallos consecutivos durante 30 s.
# ---------------------------------------------------------------------------
_CB_FAIL_THRESHOLD = 3
_CB_OPEN_SECONDS   = 30
_CB_TIMEOUT        = 30  # segundos para generación local

_circuit: dict = {'failures': 0, 'open_until': 0.0}
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2')

def _circuit_is_open() -> bool:
    return _circuit['failures'] >= _CB_FAIL_THRESHOLD and time.time() < _circuit['open_until']


def _circuit_record_failure() -> None:
    _circuit['failures'] += 1
    if _circuit['failures'] >= _CB_FAIL_THRESHOLD:
        _circuit['open_until'] = time.time() + _CB_OPEN_SECONDS
        logger.warning(
            'Ollama API circuit breaker ABIERTO — %d fallos consecutivos. '
            'Próximo reintento en %ds.',
            _circuit['failures'], _CB_OPEN_SECONDS,
        )


def _circuit_record_success() -> None:
    if _circuit['failures'] > 0:
        logger.info('Ollama API circuit breaker CERRADO (éxito tras %d fallos).', _circuit['failures'])
    _circuit['failures'] = 0
    _circuit['open_until'] = 0.0


# Sistema estable para prompts locales
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
    ANALYST   = "Analista de Datos Veterinarios"
    MANAGER   = "Gerente de Finca"

class CortexService:
    """
    Servicio para orquestar llamadas a Ollama (Local) usando el método CREA.
    Eliminada la dependencia de ANTHROPIC_API_KEY.
    """

    @staticmethod
    def assemble_prompt(target_object, role=PromptRole.ASSISTANT, spec=None, action=None):
        """Ensambla prompt CREA."""
        if hasattr(target_object, 'to_ai_context'):
            context = target_object.to_ai_context()
        elif isinstance(target_object, list):
            context = "Contexto del hato:\n" + "\n".join(
                [obj.to_ai_context() for obj in target_object if hasattr(obj, 'to_ai_context')]
            )
        else:
            context = str(target_object)

        role_desc  = role.value if hasattr(role, 'value') else str(role)
        spec_text  = spec   or "Respuesta clara, profesional y basada en los datos proporcionados."
        action_text = action or "Analiza el estado actual y sugiere los siguientes pasos."

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
        """Prepara datos de analytics para análisis IA."""
        return f"""Analiza los siguientes KPIs ganaderos y genera:
- 3 puntos clave observados
- 1 recomendación urgente
- 1 alerta preventiva

DATOS:
{analytics_data}
"""

    @staticmethod
    def call_claude(prompt: str, role: PromptRole = PromptRole.ANALYST, max_tokens: int = 500) -> dict:
        """
        Mantenemos el nombre 'call_claude' por compatibilidad pero ahora usa Ollama localmente.
        """
        # Circuit breaker
        if _circuit_is_open():
            logger.warning('Ollama circuit breaker activo — devolviendo mock')
            return CortexService._mock_response(prompt, role)

        try:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.3
                }
            }
            
            response = requests.post(OLLAMA_URL, json=payload, timeout=_CB_TIMEOUT)
            response.raise_for_status()
            result = response.json()
            
            text = result.get('response', '')
            _circuit_record_success()

            return {
                'text':        text,
                'model':       f'local-{OLLAMA_MODEL}',
                'cached':      False,
                'mock':        False,
                'usage':       {'total_duration': result.get('total_duration', 0)},
            }

        except Exception as e:
            logger.error('Error llamando Ollama: %s', e)
            _circuit_record_failure()
            return CortexService._mock_response(prompt, role)

    @staticmethod
    def _mock_response(prompt: str, role: PromptRole) -> dict:
        """Respuesta mock de respaldo local."""
        return {
            'text':   "Análisis local: El hato muestra estabilidad. Se recomienda seguir el plan sanitario vigente.",
            'model':  'local-fallback',
            'cached': False,
            'mock':   True,
            'usage':  {},
        }
