from flask_restx import fields
from app.models.tasks import Tasks
from app.utils.namespace_helpers import create_optimized_namespace

# Crear el namespace optimizado para Tareas
tasks_ns = create_optimized_namespace(
    'tasks',
    '📅 Agenda Operativa y Tareas',
    Tasks
)

# Definir el modelo para Swagger (opcional, create_optimized_namespace ya genera uno base)
task_model = tasks_ns.model('Task', {
    'id': fields.Integer(readOnly=True),
    'title': fields.String(required=True, description='Título de la tarea'),
    'description': fields.String(description='Descripción detallada'),
    'status': fields.String(description='Estado (Pendiente, En Progreso, Completada, Cancelada)'),
    'priority': fields.String(description='Prioridad (Baja, Media, Alta, Urgente)'),
    'due_date': fields.DateTime(description='Fecha de vencimiento'),
    'animal_id': fields.Integer(description='ID del animal relacionado'),
    'field_id': fields.Integer(description='ID del potrero relacionado'),
    'assigned_to': fields.Integer(description='ID del usuario asignado'),
    'finca_id': fields.Integer(required=True, description='ID de la finca')
})
