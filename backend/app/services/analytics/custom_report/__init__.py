"""Custom analytical report, scoped to the active farm."""

from dataclasses import dataclass
from datetime import datetime

from .grouping import build_groupings
from .metric_sections import BUILDERS
from .request_spec import ReportSpec, build_spec

__all__ = ["build_custom_report", "build_spec", "ReportSpec"]


@dataclass
class ReportContext:
    """Lo que toda métrica necesita saber: qué finca, qué se pidió y cómo filtrar animales."""

    finca_id: int
    spec: ReportSpec

    def scoped_animals(self, query):
        """Aplica finca y filtros de animal.

        El predicado de finca se repite en cada consulta a propósito, como
        segunda barrera: el contexto de inquilino ya filtra, pero un reporte
        que se filtre mal deja ver datos de otra finca.
        """
        from app.models.animals import Animals

        query = query.filter(
            Animals.finca_id == self.finca_id, Animals.is_deleted.is_(False)
        )
        if self.spec.animal_statuses:
            query = query.filter(Animals.status.in_(self.spec.animal_statuses))
        if self.spec.animal_sexes:
            query = query.filter(Animals.sex.in_(self.spec.animal_sexes))
        if self.spec.breed_ids:
            query = query.filter(Animals.breeds_id.in_(self.spec.breed_ids))
        return query

    def rows_for_month(self, query) -> list:
        """Materializa filas sólo si el reporte agrupa por mes."""
        return query.all() if self.spec.groups_by("month") else []


def build_custom_report(payload: dict, finca_id: int) -> dict:
    """Arma el reporte pedido. Lanza `ValueError` si la petición no es válida."""
    spec = build_spec(payload)
    ctx = ReportContext(finca_id=finca_id, spec=spec)

    report = {
        "period": spec.period,
        "period_start": spec.start_date.isoformat(),
        "period_end": spec.end_date.isoformat(),
        "generated_at": datetime.now().isoformat(),
        "metrics_included": spec.metrics,
        "group_by": spec.group_by,
        "filters_applied": spec.filters,
        "summary": {},
        "details": {},
    }

    sections = {metric: BUILDERS[metric](ctx) for metric in spec.metrics}
    for section in sections.values():
        report["summary"].update(section.summary)
        if section.detail_key:
            report["details"][section.detail_key] = section.detail
        report["details"].update(section.extra_details)

    grouped = build_groupings(ctx, sections)
    if grouped:
        report["details"]["agrupaciones"] = grouped

    return report
