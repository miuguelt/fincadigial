# Trazabilidad de cumplimiento de tareas

## Decisión

Una tarea (`tasks`) se relaciona con cero o un `task_completion_records`:

```text
tasks 1 ───────── 0..1 task_completion_records
          task_completion_records.task_id (FK + UNIQUE)
```

El registro de cumplimiento guarda la evidencia operativa mínima: finca,
usuario que la realizó, fecha/hora y observaciones. La relación es uno a uno
para que repetir la acción de completar sea idempotente y no produzca filas
duplicadas.

La bitácora `activity_log` conserva además un evento `complete` con las
relaciones `task_id`, `completion_record_id` y `finca_id`. Así se separan dos
responsabilidades:

- `task_completion_records`: el registro de negocio que prueba el cumplimiento
  vigente de la tarea.
- `activity_log`: la auditoría de acciones y cambios, que puede crecer sin
  reemplazar la evidencia de negocio.

No se fuerza la tarea a `Registro Operativo` (ordeño, traslado, enfermedad,
tratamiento, finanzas o control): una labor también puede ser arreglar una
cerca, revisar un bebedero o limpiar un potrero. En el futuro, una tarea que
necesite vincular un registro de dominio podrá agregar una relación tipada sin
romper esta evidencia general.

## Contrato

- `POST /api/v1/tasks/{id}/complete`: marca la tarea como `Completada`, crea o
  actualiza su único registro y devuelve la evidencia guardada.
- `GET /api/v1/tasks/{id}/completion`: consulta la evidencia ligada.
- `PATCH`/`PUT /api/v1/tasks/{id}` siguen siendo compatibles; cualquier cambio
  a `Completada` también genera la evidencia.
- Una tarea `Cancelada` no puede completarse y responde `409`.
- La operación exige permiso `tasks:update`; la consulta exige `tasks:read`.
- El cliente conserva la operación en la cola offline y reenvía el mismo
  comando cuando recupera conectividad.

## Migración y consistencia

`task_completion001_records` crea la tabla, sus índices y la restricción única.
También vincula tareas históricas que ya estaban completadas usando su última
fecha disponible. El backend crea/actualiza tarea y evidencia dentro de la
misma transacción; el evento de auditoría se registra después, sin duplicar el
registro de negocio.

## Criterios verificables

- Dada una tarea asignada, al completarla existe exactamente una fila cuyo
  `task_id` es el de la tarea y contiene `completed_by` y `completed_at`.
- Al repetir la acción, se conserva el mismo `id` de evidencia y existe un
  solo evento `complete` para esa finalización.
- Una tarea cancelada no crea evidencia.
- `/admin/tasks` muestra el identificador `Registro #...` y el detalle muestra
  fecha, responsable y observaciones; una tarea abierta indica que el registro
  se generará al completarla.
