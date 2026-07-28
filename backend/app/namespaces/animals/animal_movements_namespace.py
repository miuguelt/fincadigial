from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime
from app.models.animal_movements import AnimalMovement, MovementType
from app.models.animals import Animals, AnimalStatus
from app.models.finca import Finca
from app.models.animalFields import AnimalFields
from app.models.livestock_summary import LivestockSummary
from app import db
from app.utils.namespace_helpers import _cache_clear
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
import logging

logger = logging.getLogger(__name__)

# Create a standard Flask-RESTX Namespace instead of create_optimized_namespace
# to avoid default CRUD route registration conflicts and control route registration.
animal_movements_ns = Namespace(
    'animal-movements',
    description='🇨🇴 Registro de Ventas y Traslados de Ganado (ICA/SINIGAN)',
    path='/animals/movements'
)

# Swagger models for requests
movement_post_model = animal_movements_ns.model('AnimalMovementPost', {
    'animal_id': fields.Integer(required=True, description='ID del animal a mover'),
    'tipo_movimiento': fields.String(required=True, choices=['Traslado_Interno', 'Venta_Traslado_Externo', 'Venta_En_Predio'], description='Tipo de movilización'),
    'fecha_movimiento': fields.String(required=True, description='Fecha del movimiento (YYYY-MM-DD)'),
    'finca_destino_id': fields.Integer(description='ID de la finca destino para traslados internos'),
    'finca_destino_externa': fields.String(description='Nombre del predio externo de destino'),
    'rpp_destino_externo': fields.String(description='Código RPP ICA del predio externo de destino (12 dígitos)'),
    'precio_venta': fields.Float(description='Monto financiero de la venta'),
    'comprador': fields.String(description='Nombre del comprador'),
    'comprador_nit': fields.String(description='NIT/Cédula del comprador'),
    'arete_sinigan': fields.String(description='Arete de identificación SINIGAN'),
    'guia_movilizacion': fields.String(description='Guía Sanitaria de Movilización Interna (GSMI) ICA'),
    'ruv_vacunacion': fields.String(description='Registro Único de Vacunación (RUV) contra Aftosa'),
    'placa_vehiculo': fields.String(description='Placa del vehículo transportador'),
    'nombre_conductor': fields.String(description='Nombre del transportador/conductor'),
    'cedula_conductor': fields.String(description='Cédula del transportador/conductor'),
    'precinto_seguridad': fields.String(description='Precinto de seguridad oficial colocado por el ICA'),
    'notes': fields.String(description='Observaciones')
})

@animal_movements_ns.route('/')
class AnimalMovementsResource(Resource):
    """Resource to handle listing and registering movements"""

    @animal_movements_ns.doc('list_movements', description='Listar el historial de movimientos de la finca activa', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.validation_error('Contexto de finca no establecido')

            page = flask.request.args.get('page', default=1, type=int)
            limit = flask.request.args.get('limit', default=20, type=int)

            # Apply tenant isolation: get movements originating or destined to the active finca
            query = AnimalMovement.query.filter(
                (AnimalMovement.finca_origen_id == finca_id) | 
                (AnimalMovement.finca_destino_id == finca_id)
            ).order_by(AnimalMovement.fecha_movimiento.desc(), AnimalMovement.created_at.desc())

            pagination = query.paginate(page=page, per_page=limit, error_out=False)
            items = [item.to_namespace_dict() for item in pagination.items]

            return APIResponse.paginated_success(
                data=items,
                page=page,
                limit=limit,
                total_items=pagination.total,
                message='Historial de movimientos obtenido exitosamente'
            )
        except Exception as e:
            logger.error(f"Error listing movements: {str(e)}")
            return APIResponse.error(f"Error al listar movimientos: {str(e)}")

    @animal_movements_ns.doc('register_movement', description='Registrar una venta y/o traslado de animal bajo normativas del ICA', security=['Bearer'])
    @animal_movements_ns.expect(movement_post_model)
    @jwt_required()
    def post(self):
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.validation_error('Contexto de finca no establecido')

            data = flask.request.get_json() or {}
            
            # 1. Basic validation
            animal_id = data.get('animal_id')
            tipo_mov_str = data.get('tipo_movimiento')
            fecha_mov_str = data.get('fecha_movimiento')

            if not animal_id:
                return APIResponse.validation_error({'animal_id': 'Se requiere el ID del animal'})
            if not tipo_mov_str or tipo_mov_str not in ['Traslado_Interno', 'Venta_Traslado_Externo', 'Venta_En_Predio']:
                return APIResponse.validation_error({'tipo_movimiento': 'Tipo de movimiento inválido'})
            if not fecha_mov_str:
                return APIResponse.validation_error({'fecha_movimiento': 'Se requiere la fecha del movimiento'})

            # Parse fecha_movimiento
            try:
                fecha_movimiento = datetime.strptime(fecha_mov_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.validation_error({'fecha_movimiento': 'Formato de fecha inválido. Usar YYYY-MM-DD'})

            # 2. Get animal and check ownership
            animal = Animals.query.get(animal_id)
            if not animal or animal.is_deleted:
                return APIResponse.error('Animal no encontrado', status_code=404)
            if animal.finca_id != finca_id:
                return APIResponse.error('El animal no pertenece a la finca activa', status_code=403)

            # 3. Check animal status (must be Vivo)
            if animal.status != AnimalStatus.Vivo:
                return APIResponse.validation_error(f'El animal no se puede mover/vender porque su estado actual es {animal.status.value}')

            tipo_movimiento = MovementType(tipo_mov_str)

            # 4. Movement specific validations
            finca_destino_id = data.get('finca_destino_id')
            finca_destino_externa = data.get('finca_destino_externa')
            rpp_destino_externo = data.get('rpp_destino_externo')
            guia_movilizacion = data.get('guia_movilizacion')

            if tipo_movimiento == MovementType.Traslado_Interno:
                if not finca_destino_id:
                    return APIResponse.validation_error({'finca_destino_id': 'Se requiere la finca de destino para un traslado interno'})
                if finca_destino_id == finca_id:
                    return APIResponse.validation_error({'finca_destino_id': 'La finca de destino no puede ser la misma finca de origen'})
                
                finca_destino = Finca.query.get(finca_destino_id)
                if not finca_destino or not finca_destino.is_active:
                    return APIResponse.error('La finca de destino no existe o está inactiva', status_code=400)
                
                if not guia_movilizacion:
                    return APIResponse.validation_error({'guia_movilizacion': 'La Guía Sanitaria de Movilización (GSMI) del ICA es obligatoria para trasladar animales'})

            elif tipo_movimiento == MovementType.Venta_Traslado_Externo:
                if not finca_destino_externa:
                    return APIResponse.validation_error({'finca_destino_externa': 'Se requiere el nombre del predio pecuario de destino'})
                if not guia_movilizacion:
                    return APIResponse.validation_error({'guia_movilizacion': 'La Guía Sanitaria de Movilización (GSMI) del ICA es obligatoria para transporte por carretera'})
                if rpp_destino_externo:
                    rpp_clean = str(rpp_destino_externo).strip()
                    if not rpp_clean.isdigit() or len(rpp_clean) != 12:
                        return APIResponse.validation_error({'rpp_destino_externo': 'El código RPP del predio destino ante el ICA debe contener exactamente 12 dígitos numéricos'})

            # 5. DB execution inside transaction context
            try:
                # Active field removal
                active_fields = AnimalFields.query.filter_by(animal_id=animal.id, removal_date=None).all()
                for af in active_fields:
                    af.removal_date = fecha_movimiento
                    db.session.add(af)

                # Record SINIGAN registration if provided
                arete_sinigan = data.get('arete_sinigan')
                if arete_sinigan:
                    from app.models.sinigan_registrations import SiniganRegistrations
                    reg = SiniganRegistrations.query.filter_by(animal_id=animal.id).first()
                    if reg:
                        reg.arete_sinigan = arete_sinigan
                        reg.guia_movilizacion = guia_movilizacion
                        reg.fecha_registro = fecha_movimiento
                        db.session.add(reg)
                    else:
                        SiniganRegistrations.create(
                            finca_id=finca_id,
                            animal_id=animal.id,
                            arete_sinigan=arete_sinigan,
                            fecha_registro=fecha_movimiento,
                            predio_origen=animal.finca.name if animal.finca else 'Origen',
                            guia_movilizacion=guia_movilizacion,
                            notes=data.get('notes') or 'Registro automático por movimiento'
                        )

                # Financial Transaction
                precio_venta = data.get('precio_venta')
                comprador = data.get('comprador')
                comprador_nit = data.get('comprador_nit')
                
                if precio_venta and float(precio_venta) > 0:
                    from app.models.financial import Transaction, TransactionType, TransactionCategory
                    Transaction.create(
                        finca_id=finca_id,
                        animal_id=animal.id,
                        transaction_type=TransactionType.Income,
                        category=TransactionCategory.Animal,
                        amount=precio_venta,
                        date=fecha_movimiento,
                        description=f"Venta de animal {animal.record} - Comprador: {comprador or 'N/A'}"
                    )

                # Process state changes and summary updates
                if tipo_movimiento == MovementType.Traslado_Interno:
                    # Perform transfer
                    animal.finca_id = finca_destino_id
                    db.session.add(animal)
                else: # External transfer or local sale (removal from current herd)
                    animal.status = AnimalStatus.Vendido
                    animal.sale_date = fecha_movimiento
                    animal.exit_date = fecha_movimiento
                    animal.exit_reason = f"Venta a {comprador or 'Comprador externo'}"
                    db.session.add(animal)
                
                # Flush changes to the DB so count query is accurate
                db.session.flush()

                # Recalculate summaries to avoid self-healing and incremental duplication
                summary_origen = LivestockSummary.get_for_finca(finca_id)
                summary_origen.recalculate()
                
                if tipo_movimiento == MovementType.Traslado_Interno:
                    summary_destino = LivestockSummary.get_for_finca(finca_destino_id)
                    summary_destino.recalculate()

                # Create Movement Audit Log
                movement = AnimalMovement(
                    animal_id=animal.id,
                    finca_origen_id=finca_id,
                    finca_destino_id=finca_destino_id if tipo_movimiento == MovementType.Traslado_Interno else None,
                    finca_destino_externa=finca_destino_externa if tipo_movimiento == MovementType.Venta_Traslado_Externo else None,
                    rpp_destino_externo=rpp_destino_externo if tipo_movimiento == MovementType.Venta_Traslado_Externo else None,
                    tipo_movimiento=tipo_movimiento,
                    fecha_movimiento=fecha_movimiento,
                    precio_venta=precio_venta,
                    comprador=comprador,
                    comprador_nit=comprador_nit,
                    arete_sinigan=arete_sinigan,
                    guia_movilizacion=guia_movilizacion,
                    ruv_vacunacion=data.get('ruv_vacunacion'),
                    placa_vehiculo=data.get('placa_vehiculo'),
                    nombre_conductor=data.get('nombre_conductor'),
                    cedula_conductor=data.get('cedula_conductor'),
                    precinto_seguridad=data.get('precinto_seguridad'),
                    notes=data.get('notes')
                )
                db.session.add(movement)
                
                db.session.commit()

                # Clear all related caches
                _cache_clear('Animals')
                _cache_clear('Transaction')
                _cache_clear('LivestockSummary')
                _cache_clear('AnimalFields')
                _cache_clear('AnimalMovement')
                _cache_clear('Fields')
                _cache_clear('Field')

                # Log activity in global log
                try:
                    from app.models.activity_log import ActivityLog
                    ActivityLog.create(
                        action='transfer' if tipo_movimiento == MovementType.Traslado_Interno else 'sale',
                        entity='Animals',
                        title=f"Traslado/Venta de {animal.record}",
                        description=f"Movimiento {tipo_movimiento.value} registrado. GSMI: {guia_movilizacion or 'N/A'}",
                        animal_id=animal.id,
                        finca_id=finca_id
                    )
                    db.session.commit()
                except Exception as log_err:
                    logger.warning(f"Failed to write movement to ActivityLog: {log_err}")

                return APIResponse.success(
                    data=movement.to_namespace_dict(),
                    message=f"Movimiento registrado exitosamente para el animal {animal.record}"
                )

            except Exception as tx_err:
                db.session.rollback()
                logger.error(f"Transaction failed: {str(tx_err)}")
                raise tx_err

        except Exception as e:
            logger.error(f"Error registering movement: {str(e)}")
            return APIResponse.error(f"Error al registrar movimiento: {str(e)}")


@animal_movements_ns.route('/animal/<int:animal_id>')
class AnimalMovementsByAnimalResource(Resource):
    """Resource to query movements for a specific animal"""

    @animal_movements_ns.doc('list_animal_movements', description='Listar el historial de movimientos de un animal específico', security=['Bearer'])
    @jwt_required()
    def get(self, animal_id):
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.validation_error('Contexto de finca no establecido')

            # Verify ownership
            animal = Animals.query.get(animal_id)
            if not animal or animal.is_deleted:
                return APIResponse.error('Animal no encontrado', status_code=404)
            
            # The animal must currently be in the finca or have a movement history associated with this finca
            query = AnimalMovement.query.filter_by(animal_id=animal_id).filter(
                (AnimalMovement.finca_origen_id == finca_id) | 
                (AnimalMovement.finca_destino_id == finca_id)
            ).order_by(AnimalMovement.fecha_movimiento.desc(), AnimalMovement.created_at.desc())

            movements = query.all()
            return APIResponse.success(
                data=[m.to_namespace_dict() for m in movements],
                message='Historial de movimientos del animal obtenido exitosamente'
            )
        except Exception as e:
            logger.error(f"Error getting movements for animal {animal_id}: {str(e)}")
            return APIResponse.error(f"Error al obtener movimientos del animal: {str(e)}")
