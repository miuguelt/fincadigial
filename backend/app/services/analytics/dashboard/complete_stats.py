"""Assembly of the full dashboard payload.

The screen must render even when a secondary block fails, so profitability and
the daily agenda are guarded on their own and the whole thing has a last-resort
shape: an empty dashboard is recoverable, a 500 is not.
"""

import logging
from datetime import UTC, datetime, timedelta

from .basic_stats import get_profitability_insights
from .daily_agenda import get_daily_operational_agenda
from .entity_counts import (
    animals_without_recent_care,
    catalog_counts,
    operational_counts,
    pending_work_counts,
)
from .herd_kpis import KPI_WINDOW_DAYS, VACCINATION_WINDOW_DAYS, health_trend, herd_kpis
from .numbers import as_float, to_stat

logger = logging.getLogger(__name__)

# Roles que ven la plata, los usuarios y la agenda completa.
ADMIN_ROLES = {"Administrador", "Propietario", "Capataz"}

_EMPTY_AGENDA = {"tareas_hoy": [], "alertas_criticas": []}


def _guarded(label, builder, fallback):
    """Ejecuta un bloque secundario; si falla, lo registra y sigue."""
    try:
        return builder()
    except Exception as error:
        logger.error("Error en el bloque «%s» del tablero: %s", label, error)
        return fallback


def _fallback_payload(error: Exception) -> dict:
    empty = to_stat(0)
    return {
        "animales_registrados": empty,
        "balance_total": empty,
        "produccion_leche_total": empty,
        "agenda_diaria": _EMPTY_AGENDA,
        "insights_rentabilidad": [],
        "error": str(error),
    }


def get_complete_stats(finca_id=None) -> dict:
    """Tablero completo de la finca activa."""
    from app.models.extended_summaries import FinancialSummary, MilkSummary
    from app.models.livestock_summary import LivestockSummary
    from app.utils.tenant_context import get_current_finca_id, get_current_user_role

    try:
        if finca_id is None:
            finca_id = get_current_finca_id()

        now = datetime.now(UTC)
        summary = LivestockSummary.get_for_finca(finca_id)
        catalogs = catalog_counts()
        counts = operational_counts(finca_id)
        pending = pending_work_counts(finca_id)
        care = animals_without_recent_care(
            finca_id,
            control_since=(now - timedelta(days=KPI_WINDOW_DAYS)).date(),
            vaccination_since=(now - timedelta(days=VACCINATION_WINDOW_DAYS)).date(),
        )
        kpis = herd_kpis(
            finca_id, summary, care["without_control"], care["without_vaccination"]
        )

        finance = FinancialSummary.get_for_finca(finca_id)
        milk = MilkSummary.get_for_finca(finca_id)

        profitability = _guarded(
            "rentabilidad", lambda: get_profitability_insights(finca_id), []
        )
        agenda = _guarded(
            "agenda diaria",
            lambda: get_daily_operational_agenda(finca_id),
            _EMPTY_AGENDA,
        )

        is_admin = get_current_user_role() in ADMIN_ROLES

        def admin_only(value):
            """Las cifras reservadas se envían en cero, no se omiten: la tarjeta existe igual."""
            return to_stat(value) if is_admin else to_stat(None)

        return {
            "animales_registrados": to_stat(summary.total_animals),
            "animales_activos": to_stat(summary.active_animals),
            "animales_enfermos": to_stat(summary.sick_animals),
            "usuarios_registrados": admin_only(counts["users"]),
            "usuarios_activos": admin_only(counts["active_users"]),
            "tratamientos_activos": to_stat(counts["treatments"]),
            "tratamientos_totales": to_stat(counts["treatments"]),
            "vacunas_aplicadas": to_stat(counts["vaccinations"]),
            "controles_realizados": to_stat(counts["controls"]),
            "campos_registrados": to_stat(counts["fields"]),
            "tareas_pendientes": admin_only(pending["pending_tasks"]),
            "alertas_sistema": to_stat(pending["unread_alerts"]),
            "balance_total": admin_only(as_float(finance.balance)),
            "ingresos_totales": admin_only(as_float(finance.total_income)),
            "gastos_totales": admin_only(as_float(finance.total_expense)),
            "produccion_leche": admin_only(milk.total_liters),
            "produccion_leche_total": admin_only(milk.total_liters),
            "promedio_leche": admin_only(milk.avg_liters_per_animal),
            "catalogo_vacunas": to_stat(catalogs.vaccines),
            "catalogo_medicamentos": to_stat(catalogs.medications),
            "catalogo_enfermedades": to_stat(catalogs.diseases),
            "catalogo_especies": to_stat(catalogs.species),
            "catalogo_razas": to_stat(catalogs.breeds),
            "catalogo_tipos_alimento": to_stat(catalogs.food_types),
            "animales_por_campo": to_stat(counts["animal_fields"]),
            "animales_por_enfermedad": to_stat(counts["animal_diseases"]),
            "mejoras_geneticas": to_stat(counts["genetic_improvements"]),
            "tratamientos_medicamentos": to_stat(counts["treatment_medications"]),
            "tratamientos_vacunas": to_stat(counts["treatment_vaccines"]),
            "insights_rentabilidad": profitability if is_admin else [],
            "agenda_diaria": agenda if is_admin else _EMPTY_AGENDA,
            "kpi_resumen": {
                "ventana_dias": KPI_WINDOW_DAYS,
                "cards": [
                    {
                        "id": "health_index",
                        "titulo": "Índice de Salud",
                        "valor": kpis.health_index,
                        "unidad": "%",
                        "cambio": 0.0,
                    },
                    {
                        "id": "vaccination_coverage",
                        "titulo": "Cobertura Vacunación",
                        "valor": kpis.vaccination_coverage,
                        "unidad": "%",
                        "cambio": 0.0,
                    },
                    {
                        "id": "control_compliance",
                        "titulo": "Cumplimiento Controles",
                        "valor": kpis.control_compliance,
                        "unidad": "%",
                        "cambio": 0.0,
                    },
                    {
                        "id": "herd_growth_rate",
                        "titulo": "Crecimiento del ganado",
                        "valor": kpis.herd_growth,
                        "unidad": "%",
                        "cambio": 0.0,
                    },
                ],
            },
            "health_trend": health_trend(finca_id, bool(summary.active_animals)),
            "operational_load": [
                {"name": "Vacunas", "val": counts["vaccinations"]},
                {"name": "Controles", "val": counts["controls"]},
                {"name": "Trat.", "val": counts["treatments"]},
                {"name": "Mueve", "val": counts["animal_fields"]},
            ],
        }
    except Exception as error:
        logger.error("Error grave armando el tablero: %s", error, exc_info=True)
        return _fallback_payload(error)
