from app import db
from datetime import datetime, timedelta
from sqlalchemy import func
from app.models.inventory import InventoryLot, InventoryMovement, MovementType
from app.models.medications import Medications
from app.models.vaccines import Vaccines

class InventoryAnalyticsService:
    @staticmethod
    def get_inventory_autonomy(finca_id):
        """
        Calcula la autonomía de inventario (días restantes) basándose en el consumo promedio.
        """
        today = datetime.now()
        thirty_days_ago = today - timedelta(days=30)

        # 1. Fetch lots and movements to calculate in Python since product_name is a property
        lots = db.session.query(InventoryLot).filter(
            InventoryLot.finca_id == finca_id,
            InventoryLot.is_deleted == False
        ).all()
        
        movements = db.session.query(InventoryMovement).join(
            InventoryLot, InventoryLot.id == InventoryMovement.lot_id
        ).filter(
            InventoryLot.finca_id == finca_id,
            InventoryMovement.movement_type == MovementType.Salida,
            InventoryMovement.created_at >= thirty_days_ago
        ).all()

        stock_map = {}
        unit_map = {}
        consumption_map = {}

        # Stock
        for lot in lots:
            name = lot.product_name or lot.lot_number
            if name not in stock_map:
                stock_map[name] = 0
                unit_map[name] = lot.unit
            stock_map[name] += lot.current_quantity

        # Consumption
        for mov in movements:
            name = mov.lot.product_name or mov.lot.lot_number
            if name not in consumption_map:
                consumption_map[name] = 0
            consumption_map[name] += mov.quantity

        results = []
        for name, stock in stock_map.items():
            consumed = consumption_map.get(name, 0)
            daily_avg = float(consumed) / 30.0
            stock_float = float(stock)
            
            days_left = None
            if daily_avg > 0:
                days_left = round(stock_float / daily_avg)
            
            # Determinar nivel de alerta
            status = 'stable'
            if days_left is not None:
                if days_left < 7: status = 'critical'
                elif days_left < 15: status = 'warning'
            elif stock_float == 0:
                status = 'critical'
                days_left = 0

            results.append({
                'product': name,
                'unit': unit_map.get(name, ''),
                'stock': stock_float,
                'daily_avg': round(daily_avg, 2),
                'days_left': days_left,
                'status': status
            })

        return results
