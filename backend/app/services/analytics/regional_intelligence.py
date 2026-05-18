from typing import Dict, Any, List
import random

class RegionalBenchmarkingService:
    @staticmethod
    def get_regional_averages() -> Dict[str, Any]:
        """Obtiene promedios simulados de la región (Santander - Vélez)."""
        return {
            "avg_milk_per_cow": 11.2, # Litros
            "avg_open_days": 135,     # Días
            "avg_calving_interval": 480, # Días
            "avg_meat_price_kg": 9200,   # COP
            "avg_milk_price_liter": 2100 # COP
        }

    @staticmethod
    def compare_with_region(farm_kpis: Dict[str, Any]) -> Dict[str, Any]:
        """Compara los KPIs de la finca con los promedios regionales."""
        averages = RegionalBenchmarkingService.get_regional_averages()
        
        comparison = {}
        # Comparación de Leche (si existe en los KPIs)
        if "avg_milk_per_cow" in farm_kpis:
            diff = ((farm_kpis["avg_milk_per_cow"] - averages["avg_milk_per_cow"]) / averages["avg_milk_per_cow"]) * 100
            comparison["milk_performance"] = {
                "label": "Producción de Leche",
                "farm": farm_kpis["avg_milk_per_cow"],
                "regional": averages["avg_milk_per_cow"],
                "percentage_diff": round(diff, 1),
                "is_above": diff > 0
            }
            
        # Comparación de Días Abiertos
        if "avg_open_days" in farm_kpis:
            diff = ((averages["avg_open_days"] - farm_kpis["avg_open_days"]) / averages["avg_open_days"]) * 100
            comparison["reproduction_performance"] = {
                "label": "Eficiencia Reproductiva (Días Abiertos)",
                "farm": farm_kpis["avg_open_days"],
                "regional": averages["avg_open_days"],
                "percentage_diff": round(diff, 1), # Mayor es mejor aquí si invertimos la lógica
                "is_above": farm_kpis["avg_open_days"] < averages["avg_open_days"]
            }
            
        return comparison

class DigitalAdvisorService:
    @staticmethod
    def generate_recommendations(finca_id: int) -> List[Dict[str, Any]]:
        """Genera recomendaciones basadas en datos."""
        # En producción real esto usaría un LLM o lógica experta
        recommendations = [
            {
                "id": 1,
                "title": "Optimización de Pastoreo",
                "body": "Tus vacas en el Potrero 4 tienen un DEL alto. Considera rotarlas al Potrero 1 para mejorar la calidad de la leche.",
                "type": "productivity",
                "impact": "Alto"
            },
            {
                "id": 2,
                "title": "Alerta de Insumos",
                "body": "El precio de la sal mineralizada ha subido un 5% en la región. Compra ahora para ahorrar en el próximo lote.",
                "type": "economy",
                "impact": "Medio"
            },
            {
                "id": 3,
                "title": "Venta Estratégica",
                "body": "Tienes 3 novillas que alcanzaron el peso ideal y no tienen tiempo de retiro. El mercado regional tiene precios altos esta semana.",
                "type": "market",
                "impact": "Muy Alto"
            }
        ]
        return recommendations
