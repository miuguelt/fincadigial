import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date

from app import db
from app.models.inventory import (
    InventoryLot,
    InventoryMovement,
    ProductType,
    MovementType,
)
from app.models.base_model import ValidationError
from app.utils.response_handler import APIResponse
from app.services.inventory_service import InventoryService, InventoryStockError

inventory_ns = Namespace(
    "inventory", description="📦 Gestión de Inventario de Medicamentos y Vacunas"
)

# --- Swagger models ---

lot_input_model = inventory_ns.model(
    "InventoryLotInput",
    {
        "product_type": fields.String(required=True, enum=["Medicamento", "Vacuna"]),
        "medication_id": fields.Integer(
            description="ID del medicamento (si product_type=Medicamento)"
        ),
        "vaccine_id": fields.Integer(
            description="ID de la vacuna (si product_type=Vacuna)"
        ),
        "lot_number": fields.String(required=True, description="Número de lote"),
        "quantity": fields.Float(required=True, description="Cantidad inicial"),
        "current_quantity": fields.Float(
            description="Cantidad actual (por defecto igual a quantity)"
        ),
        "unit": fields.String(
            required=True, description="Unidad de medida (ml, mg, dosis, etc.)"
        ),
        "expiry_date": fields.Date(required=True, description="Fecha de vencimiento"),
        "entry_date": fields.Date(description="Fecha de entrada"),
        "supplier": fields.String(description="Proveedor"),
        "unit_cost": fields.Float(description="Costo unitario"),
        "min_stock": fields.Integer(
            description="Stock mínimo para alerta (default: 5)"
        ),
        "notes": fields.String(description="Observaciones"),
    },
)

movement_input_model = inventory_ns.model(
    "InventoryMovementInput",
    {
        "lot_id": fields.Integer(required=True, description="ID del lote"),
        "movement_type": fields.String(
            required=True, enum=["Entrada", "Salida", "Ajuste", "Baja"]
        ),
        "quantity": fields.Float(
            required=True, description="Cantidad (siempre positivo)"
        ),
        "reference_type": fields.String(
            description="Tipo de referencia (treatment, vaccination, etc.)"
        ),
        "reference_id": fields.Integer(description="ID del registro referenciado"),
        "notes": fields.String(description="Observaciones"),
    },
)


# --- Helpers ---


def _parse_int_param(name, default=1, min_val=1):
    val = flask.request.args.get(name, default=default, type=int)
    return max(min_val, val or default)


def _current_actor_id():
    try:
        identity = get_jwt_identity()
        return int(identity) if identity else None
    except (TypeError, ValueError):
        return None


# --- Resources ---


@inventory_ns.route("/lots/")
class InventoryLotList(Resource):
    @jwt_required()
    @inventory_ns.doc(
        "list_lots",
        params={
            "page": "Página",
            "limit": "Registros por página",
            "product_type": "Medicamento | Vacuna",
            "medication_id": "Filtrar por medicamento ID",
            "vaccine_id": "Filtrar por vacuna ID",
            "search": "Buscar por número de lote o proveedor",
            "sort_by": "Campo de ordenamiento",
            "sort_order": "asc | desc",
        },
    )
    def get(self):
        """Listar lotes de inventario con filtros y paginación."""
        page = _parse_int_param("page", 1)
        limit = _parse_int_param("limit", 20)
        search = flask.request.args.get("search")
        sort_by = flask.request.args.get("sort_by", "expiry_date")
        sort_order = flask.request.args.get("sort_order", "asc")

        filters: dict[str, any] = {}
        for field in ["product_type", "medication_id", "vaccine_id"]:
            val = flask.request.args.get(field)
            if val:
                if field == "product_type":
                    try:
                        filters[field] = ProductType(val)
                    except ValueError:
                        return APIResponse.error(
                            f"product_type inválido: {val}", status_code=400
                        )
                else:
                    try:
                        filters[field] = int(val)
                    except (ValueError, TypeError):
                        return APIResponse.error(
                            f"Valor inválido para {field}", status_code=400
                        )

        query = InventoryLot.get_namespace_query(
            filters=filters,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=limit,
            include_relations=True,
        )
        result = InventoryLot.get_paginated_response(query, include_relations=True)
        return APIResponse.paginated_success(
            data=result["items"],
            page=result["page"],
            limit=result["limit"],
            total_items=result["total_items"],
            message="Lotes obtenidos",
        )

    @jwt_required()
    @inventory_ns.expect(lot_input_model)
    def post(self):
        """Crear nuevo lote de inventario."""
        data = inventory_ns.payload or {}
        if "current_quantity" not in data or data["current_quantity"] is None:
            data["current_quantity"] = data.get("quantity", 0)
        if "entry_date" not in data or not data["entry_date"]:
            data["entry_date"] = date.today().isoformat()

        try:
            lot = InventoryService.create_lot(data, actor_id=_current_actor_id())
        except ValidationError as e:
            return APIResponse.error(
                e.message, status_code=400, details={"errors": e.errors}
            )
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=lot.to_namespace_dict(include_relations=True),
            message="Lote creado",
            status_code=201,
        )


@inventory_ns.route("/lots/<int:lot_id>")
class InventoryLotDetail(Resource):
    @jwt_required()
    def get(self, lot_id):
        """Obtener lote por ID."""
        lot = InventoryLot.get_by_id(lot_id, include_relations=True)
        if not lot:
            return APIResponse.error("Lote no encontrado", status_code=404)
        return APIResponse.success(data=lot.to_namespace_dict(include_relations=True))

    @jwt_required()
    @inventory_ns.expect(lot_input_model)
    def put(self, lot_id):
        """Actualizar lote (excepto current_quantity; usar movimientos)."""
        lot = InventoryLot.get_by_id(lot_id)
        if not lot:
            return APIResponse.error("Lote no encontrado", status_code=404)

        data = {
            k: v
            for k, v in (inventory_ns.payload or {}).items()
            if k != "current_quantity"
        }
        try:
            lot.update(**data)
        except ValidationError as e:
            return APIResponse.error(
                e.message, status_code=400, details={"errors": e.errors}
            )
        return APIResponse.success(
            data=lot.to_namespace_dict(include_relations=True),
            message="Lote actualizado",
        )

    @jwt_required()
    def delete(self, lot_id):
        """Eliminar lote (solo si no tiene movimientos)."""
        lot = InventoryLot.get_by_id(lot_id)
        if not lot:
            return APIResponse.error("Lote no encontrado", status_code=404)
        # The opening entry is part of the lot creation transaction and does
        # not by itself make an untouched lot undeletable.
        has_operational_movements = (
            lot.movements.filter(
                InventoryMovement.reference_type != "lot_entry"
            ).count()
            > 0
        )
        if has_operational_movements:
            return APIResponse.error(
                "No se puede eliminar: el lote tiene movimientos registrados",
                status_code=409,
            )
        lot.delete()
        return APIResponse.success(message="Lote eliminado")


@inventory_ns.route("/movements/")
class InventoryMovementList(Resource):
    @jwt_required()
    @inventory_ns.doc(
        "list_movements",
        params={
            "page": "Página",
            "limit": "Registros por página",
            "lot_id": "Filtrar por lote ID",
            "movement_type": "Entrada | Salida | Ajuste | Baja",
        },
    )
    def get(self):
        """Listar movimientos de inventario."""
        page = _parse_int_param("page", 1)
        limit = _parse_int_param("limit", 20)

        filters = {}
        lot_id = flask.request.args.get("lot_id", type=int)
        if lot_id:
            filters["lot_id"] = lot_id
        mv_type = flask.request.args.get("movement_type")
        if mv_type:
            try:
                filters["movement_type"] = MovementType(mv_type)
            except ValueError:
                return APIResponse.error(
                    f"movement_type inválido: {mv_type}", status_code=400
                )

        query = InventoryMovement.get_namespace_query(
            filters=filters,
            sort_by="created_at",
            sort_order="desc",
            page=page,
            per_page=limit,
            include_relations=True,
        )
        result = InventoryMovement.get_paginated_response(query, include_relations=True)
        return APIResponse.paginated_success(
            data=result["items"],
            page=result["page"],
            limit=result["limit"],
            total_items=result["total_items"],
            message="Movimientos obtenidos",
        )

    @jwt_required()
    @inventory_ns.expect(movement_input_model)
    def post(self):
        """Registrar movimiento y actualizar stock del lote."""
        data = inventory_ns.payload or {}
        lot_id = data.get("lot_id")
        quantity = data.get("quantity")
        mv_type_raw = data.get("movement_type")

        if not all([lot_id, quantity, mv_type_raw]):
            return APIResponse.error(
                "lot_id, quantity y movement_type son requeridos", status_code=400
            )

        try:
            mv_type = MovementType(mv_type_raw)
        except ValueError:
            return APIResponse.error(
                f"movement_type inválido: {mv_type_raw}", status_code=400
            )

        if not InventoryLot.get_by_id(lot_id):
            return APIResponse.error("Lote no encontrado", status_code=404)

        try:
            movement = InventoryService.register_movement(
                lot_id,
                mv_type,
                quantity,
                reference_type=data.get("reference_type"),
                reference_id=data.get("reference_id"),
                notes=data.get("notes"),
                actor_id=_current_actor_id(),
            )

        except InventoryStockError as e:
            return APIResponse.error(e.message, status_code=400)
        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=movement.to_namespace_dict(include_relations=True),
            message="Movimiento registrado",
            status_code=201,
        )


@inventory_ns.route("/lots/<int:lot_id>/dispose-expired")
class InventoryExpiredLotDisposal(Resource):
    @jwt_required()
    def post(self, lot_id):
        """Dar de baja el saldo físico de un lote vencido una sola vez."""
        if not InventoryLot.get_by_id(lot_id):
            return APIResponse.error("Lote no encontrado", status_code=404)
        try:
            movement = InventoryService.dispose_expired_lot(
                lot_id, actor_id=_current_actor_id()
            )
        except InventoryStockError as e:
            status = 404 if e.code == "lot_not_found" else 400
            return APIResponse.error(e.message, status_code=status)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)
        return APIResponse.success(
            data=movement.to_namespace_dict(include_relations=True),
            message="Lote vencido dado de baja",
            status_code=201,
        )


__all__ = (
    "inventory_ns",
    "InventoryLotList",
    "InventoryLotDetail",
    "InventoryMovementList",
    "InventoryExpiredLotDisposal",
)
