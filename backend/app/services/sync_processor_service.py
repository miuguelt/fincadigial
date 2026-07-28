import logging
from datetime import datetime, UTC
from app import db
from app.models.sync import SyncOperation, SyncOperationStatus, SyncConflict
from app.models.animals import Animals
from app.models.control import Control

logger = logging.getLogger(__name__)

class SyncProcessorService:
    @classmethod
    def process_pending_operations(cls, finca_id=None):
        """
        Procesa las operaciones en estado PENDING y las aplica a la BD real.
        """
        query = SyncOperation.query.filter_by(status=SyncOperationStatus.PENDING)
        if finca_id:
            query = query.filter_by(finca_id=finca_id)

        # Ordenamos por logical_clock y fallback a created_at
        operations = query.order_by(
            SyncOperation.logical_clock.asc(),
            SyncOperation.created_at.asc()
        ).all()

        processed_count = 0
        conflicts_count = 0

        for op in operations:
            try:
                result = cls._process_single_operation(op)
                if result == "conflict":
                    conflicts_count += 1
                elif result == "applied":
                    processed_count += 1
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error procesando SyncOperation {op.operation_id}: {e}")

        return {"processed": processed_count, "conflicts": conflicts_count}

    @classmethod
    def _process_single_operation(cls, op: SyncOperation):
        entity_type = op.entity_type.lower()

        # Mapear a modelos
        Model = None
        if entity_type == "animals" or entity_type == "animal":
            Model = Animals
        elif entity_type == "control":
            Model = Control
        else:
            logger.warning(f"Entidad no soportada por el SyncProcessor: {entity_type}")
            # Lo marcamos rechazado porque no sabemos procesarlo
            op.status = SyncOperationStatus.REJECTED
            op.applied_at = datetime.now(UTC)
            return "rejected"

        payload = op.payload or {}

        # Buscar la entidad local si no es un CREATE puro sin ID previo
        local_entity = None
        if op.entity_id:
            # En Villaluz los offline IDs pueden ser negativos (ej: -15234), pero la BD usa int autoincrement.
            # Intentaremos buscar por ID si es numérico.
            # También para Animal, buscaremos por 'record' (número de chapa) si está disponible en payload.
            if str(op.entity_id).lstrip('-').isdigit() and int(op.entity_id) > 0:
                local_entity = Model.query.filter_by(id=int(op.entity_id), finca_id=op.finca_id).first()

            # Fallback para animal por "record" si no lo encontró
            if not local_entity and Model == Animals and payload.get("record"):
                local_entity = Model.query.filter_by(record=str(payload["record"]), finca_id=op.finca_id).first()

        operation_type = op.operation.lower()

        # Detectar conflictos (Actualización de una entidad que localmente tiene otro estado base)
        if operation_type in ["update", "delete"] and local_entity:
            # Nota: Villaluz no tiene un 'version' explícito en los modelos base actualmente,
            # pero asumimos que si updated_at es mayor al logical_clock o si la entidad ya no existe
            # hay un potencial conflicto. Generamos un SyncConflict para que el usuario decida.
            # Aquí simularemos un conflicto si base_version está presente y difiere.
            # Dado que el modelo BaseModel no tiene 'version', usaremos la presencia de un cambio reciente.

            # (Futuro: comparar hashes o campos). Por ahora creamos la actualización si se ve bien.
            # Vamos a generar un conflicto manual si el payload de update es sobre una entidad que fue modificada más tarde.
            if op.created_at_device and local_entity.updated_at and local_entity.updated_at > op.created_at_device:
                cls._create_conflict(op, local_entity)
                return "conflict"

        if operation_type == "create":
            # Filtrar payload para quitar IDs negativos
            clean_payload = {k: v for k, v in payload.items() if k != 'id' or (isinstance(v, int) and v > 0)}
            clean_payload['finca_id'] = op.finca_id

            # Evitar duplicados (Ej. record único en animales)
            if local_entity:
                # Ya existe, es un conflicto de duplicidad o actualización encubierta
                cls._create_conflict(op, local_entity)
                return "conflict"
            else:
                new_entity = Model.create(commit=False, **clean_payload)
                db.session.flush()
                # Actualizar el entity_id en la operación para rastreo
                op.entity_id = str(new_entity.id)

        elif operation_type == "update":
            if not local_entity:
                # Actualizar algo que no existe
                cls._create_conflict(op, None)
                return "conflict"
            else:
                clean_payload = {k: v for k, v in payload.items() if k not in ['id', 'finca_id']}
                local_entity.update(commit=False, **clean_payload)

        elif operation_type == "delete":
            if not local_entity:
                # Ya fue borrado, no es un conflicto, simplemente lo aceptamos
                pass
            else:
                local_entity.delete(commit=False)

        op.status = SyncOperationStatus.APPLIED
        op.applied_at = datetime.now(UTC)
        return "applied"

    @classmethod
    def _create_conflict(cls, op: SyncOperation, local_entity):
        """Genera un registro de conflicto para resolución manual"""
        op.status = SyncOperationStatus.CONFLICT
        conflict = SyncConflict(
            operation_id=op.operation_id,
            entity_type=op.entity_type,
            entity_id=str(local_entity.id) if local_entity else op.entity_id,
            local_payload=local_entity.to_namespace_dict() if local_entity else None,
            incoming_payload=op.payload,
            finca_id=op.finca_id
        )
        db.session.add(conflict)
