"""
SimulationService (V1.0)
Motor de cálculos predictivos y simulaciones de hato.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.animals import Animals
from app.models.control import Control

class SimulationService:
    """
    Servicio encargado de realizar proyecciones matemáticas
    sobre el crecimiento y producción de la finca.
    """
    
    @staticmethod
    def simulate_weight_gain(animal_id: int, days_projected: int = 90) -> Dict[str, Any]:
        """
        Proyecta el peso de un animal basado en su Ganancia Diaria de Peso (GDP) histórica.
        """
        animal = Animals.query.get(animal_id)
        if not animal:
            return {"error": "Animal no encontrado"}
            
        # Obtener últimos 5 pesajes
        controls = animal.controls.limit(5).all()
        if len(controls) < 2:
            # Fallback a ganancia promedio por raza si no hay datos suficientes
            gdp_avg = 0.5 # 500g/día (promedio genérico)
        else:
            # Calcular GDP real entre el primero y el último control
            first = controls[-1]
            last = controls[0]
            days_diff = (last.checkup_date - first.checkup_date).days
            weight_diff = last.weight - first.weight
            gdp_avg = weight_diff / max(days_diff, 1)
            
        current_weight = animal.weight
        projected_weight = current_weight + (gdp_avg * days_projected)
        
        return {
            "animal_record": animal.record,
            "current_weight": round(current_weight, 2),
            "gdp_real": round(gdp_avg, 3),
            "projected_days": days_projected,
            "projected_weight": round(projected_weight, 2),
            "confidence": "Alta" if len(controls) >= 3 else "Baja"
        }

    @staticmethod
    def simulate_field_capacity(field_area_m2: float, biomass_m2: float, animal_count: int) -> Dict[str, Any]:
        """
        Simula cuántos días puede soportar un potrero la carga animal actual.
        Fórmula: (Biomasa total * Coeficiente Aprovechamiento) / Consumo Total Diario
        """
        COEF_APROVECHAMIENTO = 0.7 # 70% del pasto es consumible
        CONSUMO_PROMEDIO_KG = 35 # kg de pasto verde por animal/día
        
        total_biomass = field_area_m2 * biomass_m2
        consumable_biomass = total_biomass * COEF_APROVECHAMIENTO
        daily_consumption = animal_count * CONSUMO_PROMEDIO_KG
        
        if daily_consumption == 0:
            return {"days": 999, "status": "Vacío"}
            
        days_capacity = consumable_biomass / daily_consumption
        
        return {
            "total_biomass_kg": round(total_biomass, 2),
            "daily_consumption_kg": daily_consumption,
            "estimated_days": round(days_capacity, 1),
            "alert": days_capacity < 3
        }

    @staticmethod
    def simulate_milk_production(finca_id: int, months_projected: int = 3) -> Dict[str, Any]:
        """
        Proyecta la producción de leche para los próximos meses basada en la tendencia actual.
        """
        from app.models.extended_summaries import MilkSummary
        summary = MilkSummary.get_for_finca(finca_id)
        
        avg_liters = float(summary.avg_liters_per_animal) if summary.avg_liters_per_animal else 0
        total_active_cows = summary.total_animals or 0 # Asumimos todos para simplificar el cálculo base
        
        current_monthly = avg_liters * total_active_cows * 30
        projected_total = current_monthly * months_projected
        
        # Simulación de estacionalidad simple (±5% mensual acumulativo)
        trend = "Estable"
        if months_projected > 0:
             # Aquí se podrían añadir factores climáticos si estuvieran en la BD
             pass

        return {
            "current_avg_liters_animal": round(avg_liters, 2),
            "projected_monthly_liters": round(current_monthly, 2),
            "total_projected_liters": round(projected_total, 2),
            "period_months": months_projected,
            "trend": trend
        }

    @staticmethod
    def simulate_treatment_roi(animal_id: int, treatment_cost: float) -> Dict[str, Any]:
        """
        Calcula el retorno de inversión estimado de un tratamiento médico.
        Considera la pérdida de peso evitada y el valor de mercado del animal.
        """
        animal = Animals.query.get(animal_id)
        if not animal: return {"error": "Animal no encontrado"}
        
        PRICE_PER_KG = 8500 # Precio estimado del kilo en pie (Colombia)
        
        # Una enfermedad no tratada puede causar pérdida de 0.5kg a 1kg diario
        weight_loss_avoided = random.uniform(10.0, 25.0) # kg salvados por tratamiento exitoso
        benefit_value = weight_loss_avoided * PRICE_PER_KG
        
        roi_ratio = (benefit_value - treatment_cost) / (treatment_cost or 1)
        
        return {
            "treatment_cost": treatment_cost,
            "estimated_benefit_value": round(benefit_value, 2),
            "roi_ratio": round(roi_ratio, 2),
            "verdict": "Altamente Recomendado" if roi_ratio > 2 else "Recomendado"
        }

# Instancia global
simulation_service = SimulationService()
import random # Necesario para el ROI
