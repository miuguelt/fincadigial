from flask import request
from flask_restx import Resource, fields
from app.models.task_completion import TaskCompletionRecord
from app.models.tasks import TaskStatus, Tasks
from app.utils.response_handler import APIResponse
from app.utils.rbac import require_permission
from app.utils.namespace_helpers import create_optimized_namespace

# Crear el namespace optimizado para Tareas
tasks_ns = create_optimized_namespace("tasks", "📅 Agenda Operativa y Tareas", Tasks)

# Definir el modelo para Swagger (opcional, create_optimized_namespace ya genera uno base)
task_model = tasks_ns.model(
    "Task",
    {
        "id": fields.Integer(readOnly=True),
        "title": fields.String(required=True, description="Título de la tarea"),
        "description": fields.String(description="Descripción detallada"),
        "status": fields.String(
            description="Estado (Pendiente, En Progreso, Completada, Cancelada)"
        ),
        "priority": fields.String(description="Prioridad (Baja, Media, Alta, Urgente)"),
        "due_date": fields.DateTime(description="Fecha de vencimiento"),
        "animal_id": fields.Integer(description="ID del animal relacionado"),
        "field_id": fields.Integer(description="ID del potrero relacionado"),
        "assigned_to": fields.Integer(description="ID del usuario asignado"),
        "finca_id": fields.Integer(required=True, description="ID de la finca"),
        "completion_record_id": fields.Integer(
            readOnly=True, description="Registro persistente de cumplimiento"
        ),
    },
)

completion_input = tasks_ns.model(
    "TaskCompletionInput",
    {
        "notes": fields.String(
            required=False, description="Observaciones de la labor realizada"
        )
    },
)


@tasks_ns.route("/<int:task_id>/complete")
class TaskCompletionResource(Resource):
    """Comando idempotente para cerrar una tarea con trazabilidad."""

    @tasks_ns.doc(
        "complete_task",
        description="Marcar una tarea como completada y guardar su evidencia",
    )
    @tasks_ns.expect(completion_input, validate=False)
    @require_permission("tasks", "update")
    def post(self, task_id):
        task = Tasks.get_by_id(task_id)
        if task is None:
            return APIResponse.not_found("Tarea")

        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return APIResponse.validation_error(
                {"payload": "Se requiere un objeto JSON válido."}
            )

        notes = payload.get("notes")
        if notes is not None and not isinstance(notes, str):
            return APIResponse.validation_error(
                {"notes": "Las observaciones deben ser texto."}
            )
        if isinstance(notes, str):
            notes = notes.strip() or None
            if notes and len(notes) > 4000:
                return APIResponse.validation_error(
                    {"notes": "Las observaciones no pueden superar 4.000 caracteres."}
                )

        try:
            task.update(status=TaskStatus.COMPLETED, completion_notes=notes)
        except ValueError as exc:
            from app import db

            db.session.rollback()
            return APIResponse.conflict(str(exc))
        except Exception:
            from app import db

            db.session.rollback()
            raise

        record = TaskCompletionRecord.query.filter_by(
            task_id=task.id, finca_id=task.finca_id, is_deleted=False
        ).first()
        if record is None:
            return APIResponse.error(
                "No se pudo guardar el registro de cumplimiento.", status_code=500
            )

        from app.utils.cache_helpers import _cache_clear, _detail_cache_clear

        _cache_clear(Tasks.__name__)
        _detail_cache_clear(Tasks.__name__, task.id)

        return APIResponse.success(
            data=record.to_namespace_dict(),
            message="Tarea completada y registro guardado exitosamente",
        )


@tasks_ns.route("/<int:task_id>/completion")
class TaskCompletionDetailResource(Resource):
    """Consulta la evidencia persistente de una tarea."""

    @tasks_ns.doc(
        "get_task_completion",
        description="Consultar el registro de cumplimiento ligado a una tarea",
    )
    @require_permission("tasks", "read")
    def get(self, task_id):
        task = Tasks.get_by_id(task_id)
        if task is None:
            return APIResponse.not_found("Tarea")

        record = TaskCompletionRecord.query.filter_by(
            task_id=task.id, finca_id=task.finca_id, is_deleted=False
        ).first()
        if record is None:
            return APIResponse.not_found("Registro de cumplimiento")

        return APIResponse.success(
            data=record.to_namespace_dict(),
            message="Registro de cumplimiento consultado exitosamente",
        )
