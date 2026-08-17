"""
Tests unitarios — Motor de Recomendaciones Agropecuarias (KB)
=============================================================
Validan que el RecomendacionMotor evalúa correctamente las reglas
de la base de conocimiento sin depender de red ni de IA externa.

Ejecutar:
    cd backend
    python -m pytest tests/test_knowledge_base.py -v
"""

import pytest


# ─── Fixtures de contexto de animal ──────────────────────────────────


def ctx_vaca_dias_abiertos(dias: int) -> dict:
    return {
        "age_in_days": 1200,
        "age_in_months": 40,
        "weight": 480.0,
        "is_pregnant": False,
        "is_lactating": True,
        "sexo": "Hembra",
        "status": "Vivo",
        "dias_desde_parto": dias,
        "dias_abiertos": dias,
        "dias_desde_control": 30,
        "ultimo_peso_control": 480.0,
        "pending_alerts_count": 0,
        "leche_promedio_7d": 8.0,
    }


def ctx_ternero(edad_dias: int, peso: float) -> dict:
    return {
        "age_in_days": edad_dias,
        "age_in_months": edad_dias // 30,
        "weight": peso,
        "is_pregnant": False,
        "is_lactating": False,
        "sexo": "Macho",
        "status": "Vivo",
        "dias_desde_parto": None,
        "dias_abiertos": 0,
        "dias_desde_control": 100,
        "ultimo_peso_control": peso,
        "pending_alerts_count": 0,
        "leche_promedio_7d": None,
    }


# ─── Importar el motor (usa app context simulado) ─────────────────────


@pytest.fixture(scope="session")
def motor():
    """Importa el motor sin necesitar contexto Flask completo."""
    import sys
    import os

    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from app.services.recommendation_engine import RecomendacionMotor

    return RecomendacionMotor


# ─── Tests de _evaluar_regla ─────────────────────────────────────────


class TestEvaluarRegla:
    """Prueba el evaluador de reglas individuales sin DB."""

    @pytest.fixture(autouse=True)
    def setup(self, motor):
        from app.models.knowledge_base import KBOperador

        self.motor = motor
        self.KBOperador = KBOperador

        class FakeRegla:
            def __init__(self, campo, op, valor, valor_max=None):
                self.campo_condicion = campo
                self.operador = op
                self.valor = str(valor) if valor is not None else None
                self.valor_max = str(valor_max) if valor_max is not None else None

        self.FakeRegla = FakeRegla

    def _regla(self, op, valor, valor_max=None):
        return self.FakeRegla("campo", op, valor, valor_max)

    def test_gt_true(self):
        r = self._regla(self.KBOperador.GT, 100)
        assert self.motor._evaluar_regla(r, 150) is True

    def test_gt_false(self):
        r = self._regla(self.KBOperador.GT, 100)
        assert self.motor._evaluar_regla(r, 50) is False

    def test_gte(self):
        r = self._regla(self.KBOperador.GTE, 120)
        assert self.motor._evaluar_regla(r, 120) is True

    def test_lt(self):
        r = self._regla(self.KBOperador.LT, 5)
        assert self.motor._evaluar_regla(r, 3) is True

    def test_between_inside(self):
        r = self._regla(self.KBOperador.BETWEEN, 90, 120)
        assert self.motor._evaluar_regla(r, 100) is True

    def test_between_outside(self):
        r = self._regla(self.KBOperador.BETWEEN, 90, 120)
        assert self.motor._evaluar_regla(r, 50) is False

    def test_eq_bool_true(self):
        r = self._regla(self.KBOperador.EQ, "True")
        assert self.motor._evaluar_regla(r, True) is True

    def test_eq_bool_false(self):
        r = self._regla(self.KBOperador.EQ, "True")
        assert self.motor._evaluar_regla(r, False) is False

    def test_is_null_with_none(self):
        r = self._regla(self.KBOperador.IS_NULL, None)
        assert self.motor._evaluar_regla(r, None) is True

    def test_is_null_with_value(self):
        r = self._regla(self.KBOperador.IS_NULL, None)
        assert self.motor._evaluar_regla(r, 5.0) is False

    def test_not_null(self):
        r = self._regla(self.KBOperador.NOT_NULL, None)
        assert self.motor._evaluar_regla(r, 42) is True

    def test_valor_none_returns_false(self):
        r = self._regla(self.KBOperador.GT, 100)
        assert self.motor._evaluar_regla(r, None) is False


# ─── Tests de _filtro_basico ─────────────────────────────────────────


class TestFiltroBasico:
    @pytest.fixture(autouse=True)
    def setup(self, motor):
        from app.models.knowledge_base import KBSexo

        self.motor = motor
        self.KBSexo = KBSexo

        class FakeRec:
            def __init__(self, sexo, edad_min=None, edad_max=None):
                self.sexo = sexo
                self.edad_min_dias = edad_min
                self.edad_max_dias = edad_max

        self.FakeRec = FakeRec

    def test_sexo_ambos_siempre_pasa(self):
        r = self.FakeRec(self.KBSexo.AMBOS)
        ctx = {"sexo": "Macho", "age_in_days": 500}
        assert self.motor._filtro_basico(r, ctx) is True

    def test_sexo_hembra_bloquea_macho(self):
        r = self.FakeRec(self.KBSexo.HEMBRA)
        ctx = {"sexo": "Macho", "age_in_days": 500}
        assert self.motor._filtro_basico(r, ctx) is False

    def test_edad_min_bloquea_joven(self):
        r = self.FakeRec(self.KBSexo.AMBOS, edad_min=730)
        ctx = {"sexo": "Macho", "age_in_days": 100}
        assert self.motor._filtro_basico(r, ctx) is False

    def test_edad_max_bloquea_viejo(self):
        r = self.FakeRec(self.KBSexo.AMBOS, edad_max=90)
        ctx = {"sexo": "Hembra", "age_in_days": 365}
        assert self.motor._filtro_basico(r, ctx) is False

    def test_edad_dentro_rango_pasa(self):
        r = self.FakeRec(self.KBSexo.AMBOS, edad_min=90, edad_max=240)
        ctx = {"sexo": "Hembra", "age_in_days": 150}
        assert self.motor._filtro_basico(r, ctx) is True


# ─── Tests de lógica de negocio ───────────────────────────────────────


class TestLogicaNegocio:
    """Valida reglas de negocio específicas del dominio ganadero."""

    @pytest.fixture(autouse=True)
    def setup(self, motor):
        from app.models.knowledge_base import KBOperador

        self.motor = motor
        self.KBOperador = KBOperador

        class FakeRegla:
            def __init__(self, campo, op, valor, valor_max=None):
                self.campo_condicion = campo
                self.operador = op
                self.valor = str(valor) if valor is not None else None
                self.valor_max = str(valor_max) if valor_max is not None else None

        self.FakeRegla = FakeRegla

    def test_dias_abiertos_120_es_critico(self):
        """Más de 120 días abiertos debe activar alerta ALTA."""
        r = self.FakeRegla("dias_abiertos", self.KBOperador.GT, 120)
        assert self.motor._evaluar_regla(r, 150) is True

    def test_dias_abiertos_60_no_es_critico(self):
        r = self.FakeRegla("dias_abiertos", self.KBOperador.GT, 120)
        assert self.motor._evaluar_regla(r, 60) is False

    def test_ternero_between_destete(self):
        """Ternero entre 200-250 días debe activar alerta de destete."""
        r = self.FakeRegla("age_in_days", self.KBOperador.BETWEEN, 200, 250)
        assert self.motor._evaluar_regla(r, 225) is True
        assert self.motor._evaluar_regla(r, 180) is False
        assert self.motor._evaluar_regla(r, 260) is False

    def test_leche_baja_activa_alerta(self):
        """Producción < 3L debe activar alerta de caída brusca."""
        r = self.FakeRegla("leche_promedio_7d", self.KBOperador.LT, 3)
        assert self.motor._evaluar_regla(r, 2.5) is True
        assert self.motor._evaluar_regla(r, 8.0) is False

    def test_leche_none_activa_is_null(self):
        """Leche sin registrar debe activar alerta IS_NULL."""
        r = self.FakeRegla("leche_promedio_7d", self.KBOperador.IS_NULL, None)
        assert self.motor._evaluar_regla(r, None) is True
        assert self.motor._evaluar_regla(r, 5.0) is False

    def test_animal_enfermo_activa_cuarentena(self):
        """Status = 'Enfermo' debe activar alerta de cuarentena."""
        r = self.FakeRegla("status", self.KBOperador.EQ, "Enfermo")
        assert self.motor._evaluar_regla(r, "Enfermo") is True
        assert self.motor._evaluar_regla(r, "Vivo") is False

    def test_multiple_alertas_activa_urgencia(self):
        """2+ alertas pendientes debe activar urgencia ALTA."""
        r = self.FakeRegla("pending_alerts_count", self.KBOperador.GTE, 2)
        assert self.motor._evaluar_regla(r, 3) is True
        assert self.motor._evaluar_regla(r, 1) is False
