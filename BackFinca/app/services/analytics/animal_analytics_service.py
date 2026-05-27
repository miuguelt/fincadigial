from sqlalchemy import func
from app import db
from app.models.animals import Animals
from app.models.milk_production import MilkProduction
from app.models.treatment_medications import TreatmentMedications
from app.models.treatment_vaccines import TreatmentVaccines
from app.models.inventory import InventoryLot
from app.models.financial import Transaction, TransactionType, TransactionCategory
from app.models.system_content import SystemContent

def _get_milk_price():
    entry = SystemContent.get_by_key('param.milk_price_per_liter')
    if entry:
        try:
            return float(entry.content)
        except (ValueError, TypeError):
            pass
    return None

class AnimalAnalyticsService:
    @staticmethod
    @staticmethod
    def calculate_animal_roi(animal_id, price_per_liter=None):
        """
        Calcula la rentabilidad total de un animal específico.
        price_per_liter: Precio de leche desde BD por defecto.
        """
        if price_per_liter is None:
            price_per_liter = _get_milk_price()
        animal = Animals.query.get(animal_id)
        if not animal:
            return None

        # 1. INGRESOS
        # 1.1 Producción de Leche
        total_liters = db.session.query(func.sum(MilkProduction.liters)).filter_by(animal_id=animal_id).scalar() or 0
        milk_income = total_liters * price_per_liter

        # 1.2 Ingresos por Venta (si aplica)
        sale_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.animal_id == animal_id,
            Transaction.transaction_type == TransactionType.Income,
            Transaction.category == TransactionCategory.Animal
        ).scalar() or 0

        # 2. COSTOS
        # 2.1 Costo de Adquisición (Compra)
        purchase_cost = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.animal_id == animal_id,
            Transaction.transaction_type == TransactionType.Expense,
            Transaction.category == TransactionCategory.Animal
        ).scalar() or 0

        # 2.2 Costos Sanitarios (Medicamentos)
        med_costs = db.session.query(func.sum(TreatmentMedications.quantity * InventoryLot.unit_cost)).join(
            InventoryLot, TreatmentMedications.lot_id == InventoryLot.id
        ).filter(TreatmentMedications.treatments.has(animal_id=animal_id)).scalar() or 0

        # 2.3 Costos Sanitarios (Vacunas)
        vac_costs = db.session.query(func.sum(TreatmentVaccines.quantity * InventoryLot.unit_cost)).join(
            InventoryLot, TreatmentVaccines.lot_id == InventoryLot.id
        ).filter(TreatmentVaccines.treatments.has(animal_id=animal_id)).scalar() or 0

        # 3. RESULTADOS
        f_milk_income = float(milk_income or 0)
        f_sale_income = float(sale_income or 0)
        f_purchase_cost = float(purchase_cost or 0)
        f_med_costs = float(med_costs or 0)
        f_vac_costs = float(vac_costs or 0)

        total_income = f_milk_income + f_sale_income
        total_costs = f_purchase_cost + f_med_costs + f_vac_costs
        net_profit = total_income - total_costs

        roi_percentage = (net_profit / total_costs * 100) if total_costs > 0 else 0

        return {
            "animal_record": animal.record,
            "total_liters": total_liters,
            "milk_income": round(float(milk_income), 2),
            "sanitary_costs": round(float(med_costs + vac_costs), 2),
            "purchase_cost": round(float(purchase_cost), 2),
            "total_income": round(float(total_income), 2),
            "total_costs": round(float(total_costs), 2),
            "net_profit": round(float(net_profit), 2),
            "roi_percentage": round(float(roi_percentage), 2)
        }

    @staticmethod
    def get_top_profitable_animals(finca_id, limit=5):
        """Identifica los animales más rentables de la finca"""
        # Esta es una operación pesada, en producción se usaría una tabla materializada
        all_animals = Animals.query.filter_by(finca_id=finca_id, status='Vivo').all()
        roi_list = []
        for animal in all_animals:
            roi_data = AnimalAnalyticsService.calculate_animal_roi(animal.id)
            if roi_data:
                roi_list.append(roi_data)

        # Ordenar por utilidad neta descendente
        return sorted(roi_list, key=lambda x: x['net_profit'], reverse=True)[:limit]
