"""
Motor de Recomendaciones Agropecuarias — Sin dependencia de IA externa.

Evalúa las reglas de la base de conocimiento contra los datos reales
de un animal y devuelve recomendaciones ordenadas por urgencia.

Fuentes de datos de los campos calculados:
  - El modelo Animals y sus relaciones (controles, vacunaciones, reproducción, leche)
  - Calculados en tiempo real al momento de la consulta
"""

from __future__ import annotations
import logging
from datetime import date, datetime, timezone
from typing import Any

from app import db
from app.models.knowledge_base import KBRecomendacion, KBRegla, KBCalendario, KBOperador, KBUrgencia, KBSexo

logger = logging.getLogger(__name__)

# Orden de urgencia para ranking
_URGENCIA_ORDEN = {
    KBUrgencia.INMEDIATA.value: 0,
    KBUrgencia.ALTA.value:      1,
    KBUrgencia.MEDIA.value:     2,
    KBUrgencia.BAJA.value:      3,
}


class RecomendacionMotor:
    """
    Motor de reglas para la base de conocimiento agropecuaria.
    Diseñado para ejecutarse en VPS sin dependencia de APIs de IA externas.
    """

    # ──────────────────────────────────────────────────────────────────────────
    # Punto de entrada principal
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def para_animal(cls, animal_id: int, max_results: int = 10) -> list[dict]:
        """
        Evalúa todas las recomendaciones activas contra el animal dado.
        Devuelve lista ordenada por urgencia, sin duplicados.
        """
        from app.models.animals import Animals
        animal = Animals.query.get(animal_id)
        if not animal:
            return []

        contexto = cls._construir_contexto(animal)
        recomendaciones_activas = KBRecomendacion.query.filter_by(activo=True).all()
        resultados = []

        for rec in recomendaciones_activas:
            # Filtro rápido por sexo y edad
            if not cls._filtro_basico(rec, contexto):
                continue
            # Evaluar todas las reglas de esta recomendación
            if cls._evaluar_reglas(rec.reglas, contexto):
                d = rec.to_dict()
                d['animal_id'] = animal_id
                d['contexto_aplicado'] = cls._resumen_contexto(contexto)
                resultados.append(d)

        # Ordenar por urgencia
        resultados.sort(key=lambda r: _URGENCIA_ORDEN.get(r['urgencia'], 99))
        return resultados[:max_results]

    @classmethod
    def calendario_para_animal(cls, animal_id: int) -> list[dict]:
        """
        Devuelve los eventos del calendario sanitario pendientes para el animal,
        basados en su edad y el historial de vacunaciones registrado.
        """
        from app.models.animals import Animals
        from app.models.vaccinations import Vaccinations

        animal = Animals.query.get(animal_id)
        if not animal:
            return []

        edad_dias = animal.age_in_days or 0
        sexo = animal.sex.value if animal.sex else 'Ambos'

        eventos = KBCalendario.query.filter_by(activo=True).all()
        pendientes = []

        for evento in eventos:
            # Filtro de sexo
            if evento.sexo.value not in ('Ambos', sexo):
                continue
            # Filtro de rango de edad
            if evento.edad_inicio_dias and edad_dias < evento.edad_inicio_dias:
                continue
            if evento.edad_fin_dias and edad_dias > evento.edad_fin_dias:
                continue

            # Verificar si ya fue aplicado recientemente
            if evento.frecuencia_dias and evento.frecuencia_dias > 0:
                ultima = (Vaccinations.query
                          .filter_by(animal_id=animal_id)
                          .order_by(Vaccinations.vaccination_date.desc())
                          .first())
                if ultima:
                    dias_desde = (date.today() - ultima.vaccination_date).days
                    if dias_desde < evento.frecuencia_dias:
                        continue  # Aún no vence

            d = evento.to_dict()
            d['animal_id'] = animal_id
            d['edad_actual_dias'] = edad_dias
            pendientes.append(d)

        return pendientes

    @classmethod
    def recomendaciones_por_categoria(cls, categoria: str) -> list[dict]:
        """Devuelve todas las recomendaciones de una categoría (para listados de referencia)."""
        from app.models.knowledge_base import KBCategoria
        try:
            cat = KBCategoria(categoria)
        except ValueError:
            return []
        recs = KBRecomendacion.query.filter_by(categoria=cat, activo=True).all()
        return [r.to_dict() for r in recs]

    # ──────────────────────────────────────────────────────────────────────────
    # Construcción del contexto del animal
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _construir_contexto(cls, animal) -> dict[str, Any]:
        """
        Reúne todos los valores calculados del animal en un dict plano.
        Captura excepciones individuales para que un fallo parcial
        no bloquee toda la evaluación.
        """
        ctx: dict[str, Any] = {}

        # Campos directos
        ctx['age_in_days']   = animal.age_in_days or 0
        ctx['age_in_months'] = animal.age_in_months or 0
        ctx['weight']        = float(animal.weight or 0)
        ctx['is_pregnant']   = bool(animal.is_pregnant)
        ctx['is_lactating']  = bool(animal.is_lactating)
        ctx['sexo']          = animal.sex.value if animal.sex else 'Ambos'
        ctx['status']        = animal.status.value if animal.status else ''

        # Días desde último parto
        try:
            if animal.last_calving_date:
                ctx['dias_desde_parto'] = (date.today() - animal.last_calving_date).days
            else:
                ctx['dias_desde_parto'] = None
        except Exception:
            ctx['dias_desde_parto'] = None

        # Días abiertos (sin preñez tras parto)
        try:
            if ctx['dias_desde_parto'] and not animal.is_pregnant:
                ctx['dias_abiertos'] = ctx['dias_desde_parto']
            else:
                ctx['dias_abiertos'] = 0
        except Exception:
            ctx['dias_abiertos'] = 0

        # Días desde último control de peso
        try:
            ultimo_control = animal.controls.first()
            if ultimo_control:
                ctx['dias_desde_control'] = (date.today() - ultimo_control.checkup_date).days
                ctx['ultimo_peso_control'] = float(ultimo_control.weight or animal.weight)
            else:
                ctx['dias_desde_control'] = 9999
                ctx['ultimo_peso_control'] = float(animal.weight or 0)
        except Exception:
            ctx['dias_desde_control'] = 9999
            ctx['ultimo_peso_control'] = float(animal.weight or 0)

        # Alertas activas
        try:
            ctx['pending_alerts_count'] = animal.pending_alerts_count
        except Exception:
            ctx['pending_alerts_count'] = 0

        # Producción de leche (promedio 7 días)
        try:
            from app.models.milk_production import MilkProduction
            from datetime import timedelta
            semana_atras = date.today() - timedelta(days=7)
            registros = MilkProduction.query.filter(
                MilkProduction.animal_id == animal.id,
                MilkProduction.date >= semana_atras
            ).all()
            if registros:
                ctx['leche_promedio_7d'] = sum(r.quantity for r in registros) / len(registros)
            else:
                ctx['leche_promedio_7d'] = None
        except Exception:
            ctx['leche_promedio_7d'] = None

        return ctx

    # ──────────────────────────────────────────────────────────────────────────
    # Evaluación de reglas
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _filtro_basico(cls, rec: KBRecomendacion, ctx: dict) -> bool:
        """Filtro rápido antes de evaluar reglas individuales."""
        sexo_animal = ctx.get('sexo', 'Ambos')
        if rec.sexo.value not in ('Ambos', sexo_animal):
            return False
        edad = ctx.get('age_in_days', 0)
        if rec.edad_min_dias and edad < rec.edad_min_dias:
            return False
        if rec.edad_max_dias and edad > rec.edad_max_dias:
            return False
        return True

    @classmethod
    def _evaluar_reglas(cls, reglas: list[KBRegla], ctx: dict) -> bool:
        """
        Devuelve True si TODAS las reglas de la recomendación son satisfechas.
        Una recomendación sin reglas siempre aplica (recomendación global).
        """
        if not reglas:
            return True  # Sin restricciones → aplica siempre

        for regla in reglas:
            valor_ctx = ctx.get(regla.campo_condicion)
            if not cls._evaluar_regla(regla, valor_ctx):
                return False
        return True

    @classmethod
    def _evaluar_regla(cls, regla: KBRegla, valor_ctx: Any) -> bool:
        """Evalúa una regla individual contra un valor del contexto."""
        op = regla.operador

        # Operadores de nulidad
        if op == KBOperador.IS_NULL:
            return valor_ctx is None
        if op == KBOperador.NOT_NULL:
            return valor_ctx is not None

        if valor_ctx is None:
            return False  # No se puede comparar si el valor no existe

        try:
            # Conversión numérica cuando el valor es número
            if isinstance(valor_ctx, bool):
                val_ref = regla.valor.lower() in ('true', '1', 'si', 'yes')
                return cls._comparar(op, valor_ctx, val_ref)

            v_num = float(valor_ctx)
            ref   = float(regla.valor)

            if op == KBOperador.BETWEEN:
                ref_max = float(regla.valor_max)
                return ref <= v_num <= ref_max

            return cls._comparar(op, v_num, ref)

        except (ValueError, TypeError):
            # Comparación de strings
            return cls._comparar(op, str(valor_ctx).lower(), str(regla.valor).lower())

    @staticmethod
    def _comparar(op: KBOperador, a: Any, b: Any) -> bool:
        if op == KBOperador.GT:  return a > b
        if op == KBOperador.GTE: return a >= b
        if op == KBOperador.LT:  return a < b
        if op == KBOperador.LTE: return a <= b
        if op == KBOperador.EQ:  return a == b
        if op == KBOperador.NEQ: return a != b
        return False

    @staticmethod
    def _resumen_contexto(ctx: dict) -> str:
        """Genera un string legible del contexto para depuración."""
        partes = []
        if ctx.get('age_in_months'):
            partes.append(f"{ctx['age_in_months']} meses")
        if ctx.get('weight'):
            partes.append(f"{ctx['weight']} kg")
        if ctx.get('dias_abiertos'):
            partes.append(f"{ctx['dias_abiertos']} días abiertos")
        return ', '.join(partes) or 'datos básicos'
