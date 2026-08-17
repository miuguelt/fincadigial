"""
ProjectionService (V2.0)
Motor de proyecciones y estimaciones del hato.
Todas las constantes provienen de la BD (system_contents).
No contiene datos simulados ni aleatorios.
"""

from typing import Any
from app.models.animals import Animals
from app.models.system_content import SystemContent


class ProjectionService:
    """
    Servicio de proyecciones matemáticas basadas en datos reales de la BD.
    Todos los parámetros provienen de la tabla system_contents.
    """

    @staticmethod
    def _get_config(key: str) -> Any:
        entry = SystemContent.get_by_key(key)
        if entry and entry.extra is not None:
            return entry.extra
        if entry and entry.content:
            try:
                return float(entry.content)
            except (ValueError, TypeError):
                return entry.content
        return None

    @staticmethod
    def project_weight_gain(animal_id: int, days_projected: int = 90) -> dict[str, Any]:
        """
        Proyecta el peso de un animal basado en su Ganancia Diaria de Peso (GDP) histórica.
        Si no hay datos suficientes, usa la GDP del estándar racial (BreedGrowthStandard).
        """
        animal = Animals.query.get(animal_id)
        if not animal:
            return {"error": "Animal no encontrado"}

        controls = animal.controls.limit(5).all()
        gdp_avg = None

        if len(controls) >= 2:
            first = controls[-1]
            last = controls[0]
            days_diff = (last.checkup_date - first.checkup_date).days
            weight_diff = last.weight - first.weight
            gdp_avg = weight_diff / max(days_diff, 1)

        if gdp_avg is None:
            from app.models.breed_growth_standards import BreedGrowthStandard

            if animal.breeds_id and animal.sex:
                _, _, adg = BreedGrowthStandard.get_expected_weight(
                    animal.breeds_id, animal.sex.value, animal.age_in_months or 6
                )
                gdp_avg = (
                    adg if adg else ProjectionService._get_config("param.gdp_default")
                )
            else:
                gdp_avg = ProjectionService._get_config("param.gdp_default")

        current_weight = animal.weight
        projected_weight = current_weight + (gdp_avg * days_projected)

        return {
            "animal_record": animal.record,
            "current_weight": round(current_weight, 2),
            "gdp_real": round(gdp_avg, 3),
            "projected_days": days_projected,
            "projected_weight": round(projected_weight, 2),
            "confidence": "Alta" if len(controls) >= 3 else "Media",
            "source": "BreedGrowthStandard" if len(controls) < 2 else "historical",
        }

    @staticmethod
    def project_field_capacity(
        field_area_m2: float, biomass_m2: float, animal_count: int
    ) -> dict[str, Any]:
        """
        Calcula cuántos días puede soportar un potrero la carga animal actual.
        Parámetros de consumo desde system_contents.
        """
        coef = ProjectionService._get_config("param.coef_aprovechamiento")
        consumo = ProjectionService._get_config("param.consumo_promedio_kg")

        total_biomass = field_area_m2 * biomass_m2
        consumable_biomass = total_biomass * coef
        daily_consumption = animal_count * consumo

        if daily_consumption == 0:
            return {"days": None, "status": "Sin animales"}

        days_capacity = consumable_biomass / daily_consumption

        return {
            "total_biomass_kg": round(total_biomass, 2),
            "daily_consumption_kg": daily_consumption,
            "estimated_days": round(days_capacity, 1),
            "alert": days_capacity < 3,
        }

    @staticmethod
    def project_milk_production(
        finca_id: int, months_projected: int = 3
    ) -> dict[str, Any]:
        """
        Proyecta la producción de leche basada en tendencia real desde MilkSummary.
        Factores estacionales desde BD (SeasonalAdjustment).
        """
        from app.models.extended_summaries import MilkSummary
        from app.models.seasonal_adjustments import SeasonalAdjustment

        summary = MilkSummary.get_for_finca(finca_id)

        avg_liters = (
            float(summary.avg_liters_per_animal)
            if summary and summary.avg_liters_per_animal
            else 0
        )
        total_active_cows = summary.total_animals if summary else 0

        current_monthly = avg_liters * total_active_cows * 30
        projected_total = current_monthly * months_projected

        sa = SeasonalAdjustment.get_current(finca_id)
        seasonal_mult = sa.milk_production_multiplier if sa else 1.0

        trend = "Estable"
        if seasonal_mult < 0.95:
            trend = "Estacionalidad negativa"
            projected_total *= seasonal_mult
        elif seasonal_mult > 1.05:
            trend = "Estacionalidad positiva"
            projected_total *= seasonal_mult

        return {
            "current_avg_liters_animal": round(avg_liters, 2),
            "projected_monthly_liters": round(current_monthly, 2),
            "total_projected_liters": round(projected_total, 2),
            "period_months": months_projected,
            "trend": trend,
            "seasonal_multiplier": round(seasonal_mult, 3),
        }

    @staticmethod
    def estimate_treatment_roi(animal_id: int, treatment_cost: float) -> dict[str, Any]:
        """
        Calcula el retorno de inversión estimado de un tratamiento médico.
        Usa precio por kilo desde system_contents.
        """
        animal = Animals.query.get(animal_id)
        if not animal:
            return {"error": "Animal no encontrado"}

        price_per_kg = ProjectionService._get_config("param.price_per_kg")
        weight_loss_avoided = ProjectionService._get_config("param.weight_loss_avoided")

        if price_per_kg is None or weight_loss_avoided is None:
            return {
                "error": "Faltan parámetros de configuración: price_per_kg o weight_loss_avoided no están configurados en system_contents"
            }

        benefit_value = weight_loss_avoided * price_per_kg
        roi_ratio = (benefit_value - treatment_cost) / (treatment_cost or 1)

        return {
            "treatment_cost": treatment_cost,
            "estimated_benefit_value": round(benefit_value, 2),
            "estimated_weight_saved_kg": weight_loss_avoided,
            "price_per_kg": price_per_kg,
            "roi_ratio": round(roi_ratio, 2),
            "verdict": "Altamente Recomendado" if roi_ratio > 2 else "Recomendado",
        }


projection_service = ProjectionService()
