# Borrado con integridad referencial explicada

Fecha: 2026-08-19

## Problema

Eliminar un animal desde `/admin/animals` no funcionaba y el usuario nunca sabía
por qué:

1. **Bloqueos falsos.** `OptimizedIntegrityChecker` solo reconocía la cascada de
   las relaciones listadas en `_namespace_relations`. Las demás (`animal_fields`,
   `animal_alerts`, `animal_alert_configs`, `animal_health_history`,
   `animal_production_metrics`, `genetic_improvements`, `movements`) se
   descubrían por barrido de claves foráneas y se marcaban `cascade=False`
   aunque el modelo declarara `cascade="all, delete-orphan"`. En la base real,
   BOV-004 quedaba bloqueado por `animal_fields` y `animal_alerts`, que sí se
   eliminan solas.
2. **Conteos falsos.** Las consultas usaban `EXISTS`, así que todo bloqueo
   informaba "1 registro" aunque hubiera 30.
3. **Fantasmas.** Los hijos con borrado lógico previo seguían contando como
   dependencias vigentes.
4. **Motivo invisible.** El 409 respondía "No se puede eliminar el registro por
   dependencias existentes", sin decir qué tabla ni cuántos registros.
5. **Error de la base de datos sin traducir.** El `DELETE` no capturaba
   `IntegrityError`: una violación de clave foránea salía como 500 "Error interno
   del servidor" con el SQL crudo en `details`.
6. **Sin cascada en el borrado lógico.** `BaseModel.delete()` es *soft delete*,
   así que ni las cascadas del ORM ni las reglas `ON DELETE` de PostgreSQL se
   disparaban: los hijos quedaban activos apuntando a un padre invisible.
7. **Imágenes destruidas en un borrado reversible.** `Animals.delete()` borraba
   el directorio de imágenes del animal incluso en borrado lógico, así que
   restaurarlo dejaba un animal sin fotos.
8. **Borrado masivo inexistente.** El botón BORRAR de la barra de selección solo
   mostraba el aviso "Use el botón de la barra flotante", y `/animals/bulk-delete`
   no verificaba integridad ni informaba qué animales no se pudieron eliminar.

## Decisión

Toda la lógica vive en `backend/app/utils/deletion/`, un módulo por
responsabilidad, y los llamadores quedan delgados.

| Archivo | Responsabilidad |
| --- | --- |
| `dependency_map.py` | Qué columnas apuntan al modelo y cómo se resuelve cada una (`cascade`, `keep`, `detach`, `block`). |
| `report.py` | Conteo real por dependencia y `DeletionReport` con el mensaje al operador. |
| `labels.py` | Nombres en español (tabla, singular con artículo, parentescos) y redacción de los mensajes. |
| `samples.py` | Muestras legibles de los registros que bloquean. |
| `sql.py` | Validación y citado de identificadores; filtro de borrados lógicos. |
| `cascade.py` | Propagación del borrado lógico a los hijos y su restauración. |
| `errors.py` | Traducción de `IntegrityError` (PostgreSQL/MySQL/SQLite) a un motivo entendible. |
| `responses.py` | Respuestas HTTP: 409 explicado y contrato de `/dependencies`. |
| `bulk.py` | Borrado por lote con resultado por registro. |

### Cómo se clasifica una dependencia

- `cascade`: la relación del ORM declara `delete` o `delete-orphan` (cualquier
  relación del modelo, no solo las de `_namespace_relations`), o —en borrado
  físico— la clave foránea tiene `ON DELETE CASCADE`.
- `detach`: en borrado físico, `ON DELETE SET NULL` / `SET DEFAULT`.
- `keep`: tablas puente de una relación *many-to-many*; el vínculo no impide
  eliminar.
- `block`: todo lo demás con filas vigentes. Es el único caso que produce 409.

El modo importa: en **borrado lógico** solo la cascada del ORM puede propagarse,
porque la fila sigue existiendo y las reglas `ON DELETE` nunca se disparan.

### Contratos

- `DELETE /api/v1/<recurso>/<id>` bloqueado → **409** con
  `error.code = "REFERENTIAL_INTEGRITY_BLOCKED"`, `message` en español con el
  desglose y `error.details` = `{can_delete, message, total_dependents, blocking[], cascading[], dependencies[]}`.
- `IntegrityError` de la base de datos → mismo 409 con `details.source = "database"`.
- `GET /<recurso>/<id>/dependencies` conserva `hasDependencies`, `canDelete`,
  `totalDependencies`, `message` y `dependencies[]`, ahora con `label`,
  `resolution`, conteo real y muestras; agrega `blocking[]`.
- `POST /animals/bulk-delete` responde `{deleted_ids, blocked[], missing_ids, cascade_total}`;
  cada bloqueado trae `label`, `message` y `blocking[]`.
- `app/utils/integrity_checker.py` queda como fachada de compatibilidad (mismo
  API heredado) delegando en este módulo: pasó de 874 a ~180 líneas.

### Frontend

| Archivo | Rol |
| --- | --- |
| `shared/api/deletion-error.ts` | Normaliza el error (ApiFetchError o axios) a `{isIntegrityBlock, message, detail, blocking[]}`. |
| `widgets/admin-crud/ui/DeletionBlockedDialog.tsx` | Muestra el motivo y los registros que bloquean; reemplaza el aviso pasajero. |
| `widgets/admin-crud/ui/hooks/useCrudDelete.ts` | Deriva el 409 al diálogo; los demás errores siguen en toast. |
| `shared/ui/common/ConfirmDialog.tsx` | `confirmDisabled`: no se puede confirmar un borrado que ya se sabe bloqueado. |
| `entities/animal/api/animalBulkDelete.service.ts` | Cliente de `bulk-delete` con eliminados y bloqueados separados. |
| `features/animal-bulk-actions/BatchDeleteModal.tsx` | Borrado masivo real desde la barra de selección, con resultado por animal. |

`useResourceCrud` pide `skipErrorToast` al eliminar para que el aviso genérico
del interceptor no compita con la explicación del diálogo.

## Consecuencias

- Un animal con controles, tratamientos, vacunaciones, alertas o asignaciones a
  potrero **se elimina**, y esos hijos quedan eliminados lógicamente con la misma
  marca de tiempo (`restore()` los recupera; los borrados antes del padre no).
- Un animal con producción de leche, eventos reproductivos, tareas, transacciones,
  condición corporal, ciclos de lactancia, metas de producción, registros SINIGÁN,
  crías o descendencia registrada **sigue bloqueado**, pero el usuario ve la lista
  con nombre, cantidad y ejemplos. Si el negocio decide que alguna de esas
  relaciones debe eliminarse con el animal, basta declarar la cascada en el modelo.
- Los mensajes son la única superficie donde se explica la integridad: se
  redactan en `labels.py`, no en los endpoints.
- El borrado lógico ya no borra las imágenes del animal en disco; solo lo hace
  `hard_delete=True`. Un animal restaurado conserva sus fotos, a cambio de que
  el disco guarde los archivos de los animales eliminados de forma reversible.

## Verificación

- `backend/tests/test_deletion_integrity.py` (13 pruebas): clasificación,
  conteos reales, fantasmas, cascada del borrado lógico, restauración,
  conservación de imágenes, 409 explicado, traducción de `IntegrityError`,
  `/dependencies`, `/batch-dependencies` y `bulk-delete`.
- `frontend`: `shared/api/deletion-error.test.ts`,
  `widgets/admin-crud/ui/hooks/useCrudDelete.test.tsx`,
  `entities/animal/api/animalBulkDelete.service.test.ts`.
- Comprobado además contra la base real (PostgreSQL 5434): BOV-004/005/006 pasan
  de bloqueados a eliminables con 34-37 registros en cascada; el animal 7252
  sigue bloqueado y ahora dice por qué (leche, eventos reproductivos, tareas,
  transacciones).

## Nota: `/dependencies` es exclusivo del borrado

`frontend/src/entities/animal/api/animalDependencies.service.ts` consultaba este
mismo endpoint esperando un resumen de genealogía (`father_id`, `mother_id`,
`children_as_father`, `children_as_mother`). Ese contrato nunca existió, así que
el servicio caía siempre en su valor por defecto y entregaba ceros en silencio:
el panel del árbol genealógico mostraba "Padre registrado: No" incluso con padre
registrado.

Se eliminó el servicio. El parentesco se deriva ahora del propio grafo del árbol
en `entities/animal/model/treeGenealogy.ts` (`from` = progenitor, `to` = cría en
`backend/app/utils/tree_builder.py`), que ya viaja en la respuesta de
`/animals/tree/ancestors` y `/animals/tree/descendants`: una consulta menos por
apertura del árbol y un resumen que no puede contradecir lo que se muestra.
