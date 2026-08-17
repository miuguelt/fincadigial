from app import db
from datetime import datetime, timedelta
from app.models.inventory import InventoryLot, InventoryMovement, MovementType

#: Ventana de consumo con la que se promedia la salida diaria.
WINDOW_DAYS = 30


class InventoryAnalyticsService:
    @staticmethod
    def get_inventory_autonomy(finca_id):
        """
        Calcula la autonomía de inventario (días restantes) basándose en el consumo promedio.
        """
        today = datetime.now()
        thirty_days_ago = today - timedelta(days=WINDOW_DAYS)

        # 1. Fetch lots and movements to calculate in Python since product_name is a property
        lots = (
            db.session.query(InventoryLot)
            .filter(InventoryLot.finca_id == finca_id, InventoryLot.is_deleted == False)
            .all()
        )

        movements = (
            db.session.query(InventoryMovement)
            .join(InventoryLot, InventoryLot.id == InventoryMovement.lot_id)
            .filter(
                InventoryLot.finca_id == finca_id,
                InventoryMovement.movement_type == MovementType.Salida,
                InventoryMovement.created_at >= thirty_days_ago,
            )
            .all()
        )

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
            daily_avg = float(consumed) / float(WINDOW_DAYS)
            stock_float = float(stock)

            days_left = None
            if daily_avg > 0:
                days_left = round(stock_float / daily_avg)

            # Determinar nivel de alerta. 'depleted' se distingue de 'critical'
            # porque no queda nada que administrar, no es que se acabe pronto.
            if stock_float == 0:
                status = "depleted"
                days_left = 0
            elif days_left is not None and days_left < 7:
                status = "critical"
            elif days_left is not None and days_left < 15:
                status = "warning"
            else:
                status = "stable"

            results.append(
                {
                    "product": name,
                    "unit": unit_map.get(name, ""),
                    "stock": stock_float,
                    "daily_avg": round(daily_avg, 2),
                    "days_left": days_left,
                    "status": status,
                }
            )

        # Los más urgentes primero: agotados, luego los de menor autonomía.
        results.sort(key=lambda r: (r["days_left"] is None, r["days_left"] or 0))

        return {
            "items": results,
            "total_groups": len(results),
            "window_days": WINDOW_DAYS,
        }
