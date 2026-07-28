import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date, timedelta
from sqlalchemy import func, and_

from app import db
from app.models.inventory import InventoryLot, InventoryMovement, ProductType, MovementType
from app.models.base_model import ValidationError
from app.utils.response_handler import APIResponse

inventory_ns = Namespace('inventory', description='📦 Gestión de Inventario de Medicamentos y Vacunas')

# --- Swagger models ---

lot_input_model = inventory_ns.model('InventoryLotInput', {
    'product_type': fields.String(required=True, enum=['Medicamento', 'Vacuna']),
    'medication_id': fields.Integer(description='ID del medicamento (si product_type=Medicamento)'),
    'vaccine_id': fields.Integer(description='ID de la vacuna (si product_type=Vacuna)'),
    'lot_number': fields.String(required=True, description='Número de lote'),
    'quantity': fields.Integer(required=True, description='Cantidad inicial'),
    'current_quantity': fields.Integer(description='Cantidad actual (por defecto igual a quantity)'),
    'unit': fields.String(required=True, description='Unidad de medida (ml, mg, dosis, etc.)'),
    'expiry_date': fields.Date(required=True, description='Fecha de vencimiento'),
    'entry_date': fields.Date(description='Fecha de entrada'),
    'supplier': fields.String(description='Proveedor'),
    'unit_cost': fields.Float(description='Costo unitario'),
    'min_stock': fields.Integer(description='Stock mínimo para alerta (default: 5)'),
    'notes': fields.String(description='Observaciones'),
})

movement_input_model = inventory_ns.model('InventoryMovementInput', {
    'lot_id': fields.Integer(required=True, description='ID del lote'),
    'movement_type': fields.String(required=True, enum=['Entrada', 'Salida', 'Ajuste', 'Baja']),
    'quantity': fields.Integer(required=True, description='Cantidad (siempre positivo)'),
    'reference_type': fields.String(description='Tipo de referencia (treatment, vaccination, etc.)'),
    'reference_id': fields.Integer(description='ID del registro referenciado'),
    'notes': fields.String(description='Observaciones'),
})


# --- Helpers ---

def _parse_int_param(name, default=1, min_val=1):
    val = flask.request.args.get(name, default=default, type=int)
    return max(min_val, val or default)


def _apply_movement_to_lot(lot: InventoryLot, movement_type: MovementType, quantity: int):
    if movement_type in (MovementType.Salida, MovementType.Baja):
        if lot.current_quantity < quantity:
            raise ValidationError(
                f"Stock insuficiente: disponible {lot.current_quantity}, solicitado {quantity}",
                code="insufficient_stock"
            )
        lot.current_quantity -= quantity
    elif movement_type == MovementType.Entrada:
        lot.current_quantity += quantity
    elif movement_type == MovementType.Ajuste:
        lot.current_quantity = quantity


# --- Resources ---

@inventory_ns.route('/lots/')
class InventoryLotList(Resource):
    @jwt_required()
    @inventory_ns.doc('list_lots', params={
        'page': 'Página', 'limit': 'Registros por página',
        'product_type': 'Medicamento | Vacuna',
        'medication_id': 'Filtrar por medicamento ID',
        'vaccine_id': 'Filtrar por vacuna ID',
        'search': 'Buscar por número de lote o proveedor',
        'sort_by': 'Campo de ordenamiento',
        'sort_order': 'asc | desc',
    })
    def get(self):
        """Listar lotes de inventario con filtros y paginación."""
        page = _parse_int_param('page', 1)
        limit = _parse_int_param('limit', 20)
        search = flask.request.args.get('search')
        sort_by = flask.request.args.get('sort_by', 'expiry_date')
        sort_order = flask.request.args.get('sort_order', 'asc')

        filters: dict[str, any] = {}
        for field in ['product_type', 'medication_id', 'vaccine_id']:
            val = flask.request.args.get(field)
            if val:
                if field == 'product_type':
                    try:
                        filters[field] = ProductType(val)
                    except ValueError:
                        return APIResponse.error(f"product_type inválido: {val}", status_code=400)
                else:
                    try:
                        filters[field] = int(val)
                    except (ValueError, TypeError):
                        return APIResponse.error(f"Valor inválido para {field}", status_code=400)

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
            data=result['items'],
            page=result['page'],
            limit=result['limit'],
            total_items=result['total_items'],
            message='Lotes obtenidos',
        )

    @jwt_required()
    @inventory_ns.expect(lot_input_model)
    def post(self):
        """Crear nuevo lote de inventario."""
        data = inventory_ns.payload or {}
        if 'current_quantity' not in data or data['current_quantity'] is None:
            data['current_quantity'] = data.get('quantity', 0)
        if 'entry_date' not in data or not data['entry_date']:
            data['entry_date'] = date.today().isoformat()

        try:
            lot = InventoryLot.create(**data)
        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400, details={'errors': e.errors})
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=lot.to_namespace_dict(include_relations=True),
            message='Lote creado',
            status_code=201,
        )


@inventory_ns.route('/lots/<int:lot_id>')
class InventoryLotDetail(Resource):
    @jwt_required()
    def get(self, lot_id):
        """Obtener lote por ID."""
        lot = InventoryLot.get_by_id(lot_id, include_relations=True)
        if not lot:
            return APIResponse.error('Lote no encontrado', status_code=404)
        return APIResponse.success(data=lot.to_namespace_dict(include_relations=True))

    @jwt_required()
    @inventory_ns.expect(lot_input_model)
    def put(self, lot_id):
        """Actualizar lote (excepto current_quantity; usar movimientos)."""
        lot = InventoryLot.get_by_id(lot_id)
        if not lot:
            return APIResponse.error('Lote no encontrado', status_code=404)

        data = {k: v for k, v in (inventory_ns.payload or {}).items()
                if k != 'current_quantity'}
        try:
            lot.update(**data)
        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400, details={'errors': e.errors})
        return APIResponse.success(data=lot.to_namespace_dict(include_relations=True), message='Lote actualizado')

    @jwt_required()
    def delete(self, lot_id):
        """Eliminar lote (solo si no tiene movimientos)."""
        lot = InventoryLot.get_by_id(lot_id)
        if not lot:
            return APIResponse.error('Lote no encontrado', status_code=404)
        if lot.movements.count() > 0:
            return APIResponse.error(
                'No se puede eliminar: el lote tiene movimientos registrados',
                status_code=409,
            )
        lot.delete()
        return APIResponse.success(message='Lote eliminado')


@inventory_ns.route('/movements/')
class InventoryMovementList(Resource):
    @jwt_required()
    @inventory_ns.doc('list_movements', params={
        'page': 'Página', 'limit': 'Registros por página',
        'lot_id': 'Filtrar por lote ID',
        'movement_type': 'Entrada | Salida | Ajuste | Baja',
    })
    def get(self):
        """Listar movimientos de inventario."""
        page = _parse_int_param('page', 1)
        limit = _parse_int_param('limit', 20)

        filters = {}
        lot_id = flask.request.args.get('lot_id', type=int)
        if lot_id:
            filters['lot_id'] = lot_id
        mv_type = flask.request.args.get('movement_type')
        if mv_type:
            try:
                filters['movement_type'] = MovementType(mv_type)
            except ValueError:
                return APIResponse.error(f"movement_type inválido: {mv_type}", status_code=400)

        query = InventoryMovement.get_namespace_query(
            filters=filters,
            sort_by='created_at',
            sort_order='desc',
            page=page,
            per_page=limit,
            include_relations=True,
        )
        result = InventoryMovement.get_paginated_response(query, include_relations=True)
        return APIResponse.paginated_success(
            data=result['items'],
            page=result['page'],
            limit=result['limit'],
            total_items=result['total_items'],
            message='Movimientos obtenidos',
        )

    @jwt_required()
    @inventory_ns.expect(movement_input_model)
    def post(self):
        """Registrar movimiento y actualizar stock del lote."""
        data = inventory_ns.payload or {}
        lot_id = data.get('lot_id')
        quantity = data.get('quantity')
        mv_type_raw = data.get('movement_type')

        if not all([lot_id, quantity, mv_type_raw]):
            return APIResponse.error('lot_id, quantity y movement_type son requeridos', status_code=400)

        try:
            mv_type = MovementType(mv_type_raw)
        except ValueError:
            return APIResponse.error(f"movement_type inválido: {mv_type_raw}", status_code=400)

        lot = InventoryLot.get_by_id(lot_id)
        if not lot:
            return APIResponse.error('Lote no encontrado', status_code=404)

        try:
            qty_int = int(quantity)
            _apply_movement_to_lot(lot, mv_type, qty_int)

            actor_id = None
            try:
                identity = get_jwt_identity()
                if identity:
                    actor_id = int(identity)
            except Exception:
                pass

            movement = InventoryMovement(
                lot_id=lot_id,
                movement_type=mv_type,
                quantity=qty_int,
                reference_type=data.get('reference_type'),
                reference_id=data.get('reference_id'),
                notes=data.get('notes'),
                actor_id=actor_id,
                finca_id=lot.finca_id,
            )
            db.session.add(movement)
            lot.save()
            db.session.refresh(movement)

        except ValidationError as e:
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=movement.to_namespace_dict(include_relations=True),
            message='Movimiento registrado',
            status_code=201,
        )


@inventory_ns.route('/summary')
class InventorySummary(Resource):
    @jwt_required()
    def get(self):
        """Resumen de stock actual: total de lotes, por tipo, alertas."""
        from app.utils.tenant_context import apply_tenant_filter
        today = date.today()
        expiry_threshold = today + timedelta(days=30)

        lot_q = apply_tenant_filter(InventoryLot.query, InventoryLot)

        total_lots = lot_q.count()
        med_lots = lot_q.filter_by(product_type=ProductType.Medicamento).count()
        vac_lots = lot_q.filter_by(product_type=ProductType.Vacuna).count()

        expired = lot_q.filter(InventoryLot.expiry_date < today).count()
        expiring_soon = lot_q.filter(
            and_(InventoryLot.expiry_date >= today, InventoryLot.expiry_date <= expiry_threshold)
        ).count()

        low_stock_lots = [
            lot for lot in lot_q.all()
            if lot.is_low_stock and not lot.is_expired
        ]

        total_value_q = apply_tenant_filter(db.session.query(
            func.sum(InventoryLot.current_quantity * InventoryLot.unit_cost)
        ), InventoryLot)
        
        total_value = total_value_q.filter(InventoryLot.unit_cost.isnot(None)).scalar() or 0

        # Parte de ese valor que ya está inmovilizada en lotes vencidos.
        expired_value_q = apply_tenant_filter(db.session.query(
            func.sum(InventoryLot.current_quantity * InventoryLot.unit_cost)
        ), InventoryLot)
        expired_value = expired_value_q.filter(
            InventoryLot.unit_cost.isnot(None),
            InventoryLot.expiry_date < today,
        ).scalar() or 0

        movement_q = apply_tenant_filter(InventoryMovement.query, InventoryMovement)
        recent_movements = movement_q.order_by(
            InventoryMovement.created_at.desc()
        ).limit(5).all()

        return APIResponse.success(data={
            'total_lots': total_lots,
            'medication_lots': med_lots,
            'vaccine_lots': vac_lots,
            'expired_lots': expired,
            'expiring_soon_lots': expiring_soon,
            'low_stock_lots': len(low_stock_lots),
            'total_estimated_value': round(float(total_value), 2),
            'expired_value': round(float(expired_value), 2),
            'recent_movements': [m.to_namespace_dict(include_relations=True) for m in recent_movements],
        }, message='Resumen de inventario')


@inventory_ns.route('/alerts')
class InventoryAlerts(Resource):
    @jwt_required()
    @inventory_ns.doc('inventory_alerts', params={
        'expiry_days': 'Días para alerta de vencimiento (default: 30)',
        'limit': 'Máximo de lotes por grupo; los contadores siguen siendo totales',
    })
    def get(self):
        """Lotes con vencimiento próximo o stock bajo."""
        from app.utils.tenant_context import apply_tenant_filter
        today = date.today()
        expiry_days = flask.request.args.get('expiry_days', default=30, type=int)
        limit = flask.request.args.get('limit', type=int)
        expiry_threshold = today + timedelta(days=max(1, expiry_days))

        lot_q = apply_tenant_filter(InventoryLot.query, InventoryLot)

        expired = lot_q.filter(
            InventoryLot.expiry_date < today
        ).order_by(InventoryLot.expiry_date).all()

        expiring = lot_q.filter(
            and_(InventoryLot.expiry_date >= today, InventoryLot.expiry_date <= expiry_threshold)
        ).order_by(InventoryLot.expiry_date).all()

        low_stock = [lot for lot in lot_q.all() if lot.is_low_stock and not lot.is_expired]

        # El recorte es sólo de presentación: los contadores de summary siguen
        # reflejando el total real de lotes afectados.
        def _shown(lots):
            return lots[:limit] if limit and limit > 0 else lots

        return APIResponse.success(data={
            'expired': [lot.to_namespace_dict(include_relations=True) for lot in _shown(expired)],
            'expiring_soon': [lot.to_namespace_dict(include_relations=True) for lot in _shown(expiring)],
            'low_stock': [lot.to_namespace_dict(include_relations=True) for lot in _shown(low_stock)],
            'summary': {
                'expired_count': len(expired),
                'expiring_soon_count': len(expiring),
                'low_stock_count': len(low_stock),
            },
        }, message='Alertas de inventario')
