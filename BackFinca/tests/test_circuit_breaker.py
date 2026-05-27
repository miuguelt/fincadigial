"""
Tests unitarios para el circuit breaker del CortexService (Claude API).

Verifica que:
- Tras _CB_FAIL_THRESHOLD fallos, el circuito se abre.
- Mientras está abierto, devuelve mock sin llamar a la API.
- Tras un éxito, el circuito se cierra y el contador se resetea.
"""
import time
import pytest

import app.services.cortex_service as cs_mod


@pytest.fixture(autouse=True)
def reset_circuit():
    """Resetea el estado del circuit breaker antes y después de cada test."""
    cs_mod._circuit['failures'] = 0
    cs_mod._circuit['open_until'] = 0.0
    yield
    cs_mod._circuit['failures'] = 0
    cs_mod._circuit['open_until'] = 0.0


class TestCircuitBreaker:
    def test_circuito_cerrado_inicialmente(self):
        assert cs_mod._circuit_is_open() is False

    def test_fallo_incrementa_contador(self):
        cs_mod._circuit_record_failure()
        assert cs_mod._circuit['failures'] == 1
        assert cs_mod._circuit_is_open() is False  # Threshold es 3

    def test_abre_tras_threshold_fallos(self):
        for _ in range(cs_mod._CB_FAIL_THRESHOLD):
            cs_mod._circuit_record_failure()
        assert cs_mod._circuit_is_open() is True

    def test_open_until_se_establece(self):
        for _ in range(cs_mod._CB_FAIL_THRESHOLD):
            cs_mod._circuit_record_failure()
        assert cs_mod._circuit['open_until'] > time.time()

    def test_exito_cierra_circuito(self):
        for _ in range(cs_mod._CB_FAIL_THRESHOLD):
            cs_mod._circuit_record_failure()
        assert cs_mod._circuit_is_open() is True

        cs_mod._circuit_record_success()
        assert cs_mod._circuit['failures'] == 0
        assert cs_mod._circuit_is_open() is False

    def test_circuito_se_cierra_tras_cooldown(self):
        """Simula que el tiempo de cooldown expiró."""
        cs_mod._circuit['failures'] = cs_mod._CB_FAIL_THRESHOLD
        cs_mod._circuit['open_until'] = time.time() - 1  # Ya expiró
        assert cs_mod._circuit_is_open() is False

    def test_call_claude_usa_mock_con_circuito_abierto(self, app):
        """call_claude devuelve mensaje de no disponible cuando el circuito está abierto."""
        from app.services.cortex_service import CortexService, PromptRole
        import app.services.cortex_service as cs

        # Habilitar Ollama temporalmente para el test
        original_enabled = cs.OLLAMA_ENABLED
        cs.OLLAMA_ENABLED = True
        try:
            # Abrir el circuito manualmente
            cs._circuit['failures'] = cs._CB_FAIL_THRESHOLD
            cs._circuit['open_until'] = time.time() + 60

            result = CortexService.call_claude('Analiza el animal', role=PromptRole.ANALYST)
            assert result['model'] == 'unavailable'
            assert 'no está disponible' in result['text']
        finally:
            cs.OLLAMA_ENABLED = original_enabled
