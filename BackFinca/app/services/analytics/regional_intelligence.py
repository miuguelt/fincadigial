from typing import Any
from app.models.system_content import SystemContent


class RegionalBenchmarkingService:
    @staticmethod
    def get_regional_averages() -> dict[str, Any]:
        entry = SystemContent.get_by_key('config.regional_averages')
        if entry and entry.extra:
            return entry.extra
        return {}

    @staticmethod
    def compare_with_region(farm_kpis: dict[str, Any]) -> dict[str, Any]:
        averages = RegionalBenchmarkingService.get_regional_averages()
        if not averages:
            return {}
        comparison = {}
        if "avg_milk_per_cow" in farm_kpis and "avg_milk_per_cow" in averages:
            diff = ((farm_kpis["avg_milk_per_cow"] - averages["avg_milk_per_cow"]) / averages["avg_milk_per_cow"]) * 100
            comparison["milk_performance"] = {
                "label": "Producción de Leche",
                "farm": farm_kpis["avg_milk_per_cow"],
                "regional": averages["avg_milk_per_cow"],
                "percentage_diff": round(diff, 1),
                "is_above": diff > 0
            }
        if "avg_open_days" in farm_kpis and "avg_open_days" in averages:
            diff = ((averages["avg_open_days"] - farm_kpis["avg_open_days"]) / averages["avg_open_days"]) * 100
            comparison["reproduction_performance"] = {
                "label": "Eficiencia Reproductiva (Días Abiertos)",
                "farm": farm_kpis["avg_open_days"],
                "regional": averages["avg_open_days"],
                "percentage_diff": round(diff, 1),
                "is_above": farm_kpis["avg_open_days"] < averages["avg_open_days"]
            }
        return comparison


class DigitalAdvisorService:
    @staticmethod
    def generate_recommendations(finca_id: int) -> list[dict[str, Any]]:
        entries = SystemContent.get_by_category('advisor_recommendation', finca_id=finca_id)
        if entries:
            return [
                {
                    "id": entry.id or (i + 1),
                    "title": entry.title or "Recomendación",
                    "body": entry.content,
                    "type": entry.content_type or "productivity",
                    "impact": entry.priority or "Medio",
                }
                for i, entry in enumerate(entries)
            ]
        return []
