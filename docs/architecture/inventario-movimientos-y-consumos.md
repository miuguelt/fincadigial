# Inventario: movimientos, consumos y vencimientos

**Fecha:** 2026-08-17
**Alcance:** lotes, movimientos, aplicaciones de medicamentos/vacunas y acciones de campo.

## Decisión operativa

Un lote representa un ingreso físico con una fecha de vencimiento. El saldo se
modifica únicamente mediante un movimiento; ningún formulario ni relación de
tratamiento resta `current_quantity` por su cuenta.

| Situación real de la finca | Movimiento | Efecto |
|---|---|---:|
| Llega un lote nuevo | `Entrada` inicial automática | `+cantidad` |
| Se usa en una aplicación o consumo rápido | `Salida` | `-cantidad` |
| Se pierde, se rompe o se vence y se retira | `Baja` | `-cantidad` |
| Se cuenta físicamente y no coincide | `Ajuste` | fija el saldo contado |

La cantidad de un movimiento siempre es positiva. `Ajuste` es la única
excepción semántica: su cantidad es el saldo final contado. Para eliminar la
ambigüedad, cada movimiento guarda `balance_before` y `balance_after`.

## Vencimientos

El vencimiento de la fecha no borra ni muta la base de datos automáticamente:
el producto puede seguir físicamente en la bodega y debe quedar trazable hasta
su retiro. Sin embargo, su `available_quantity` pasa a cero y no se permite
usarlo ni reingresarlo mediante `Salida` o `Entrada`. La acción **Dar de baja**
registra una `Baja` por vencimiento con todo el saldo físico restante.

Esto evita dos errores opuestos: consumir un producto vencido y perder el
registro físico por una tarea automática que nadie verificó en la finca.

## Tratamientos

Una aplicación puede guardar `lot_id` y `quantity`. Su creación genera la
`Salida` en la misma transacción; editarla revierte el consumo anterior y
aplica el nuevo; eliminarla devuelve el saldo mediante una `Entrada` de
reversión. Las operaciones masivas usan el mismo camino.

Si el operador todavía no conoce el lote o la cantidad exacta, la aplicación
puede quedar registrada sin descuento (`quantity = 0`). Cuando sí se cuenta el
producto aplicado, se selecciona el lote vigente y la cantidad decimal real
(ml, g, kg o dosis).

## Integridad y compatibilidad

- Las cantidades pasan de entero a `NUMERIC(12,3)` para no truncar consumos
  como `2.5 ml`.
- No se permite que el saldo quede negativo.
- Cada alta de lote deja una entrada inicial; un lote intacto sigue pudiéndose
  eliminar porque esa entrada es solo su apertura.
- La fuente única de escritura es `InventoryService`; la API conserva los
  tipos de movimiento existentes para no romper clientes actuales.
- La migración `inv002_inventory_ledger` actualiza bases existentes. Los lotes
  sembrados fuera de la API conservan su saldo, pero no se inventan movimientos
  históricos que no pueden reconstruirse con seguridad.

## Límite de consultas

Las rutas de escritura y operación permanecen en
`backend/app/namespaces/farm/inventory_namespace.py`. Las lecturas agregadas de
resumen y alertas viven en
`backend/app/namespaces/farm/inventory_insights_namespace.py`, registrado con
la misma ruta pública `/inventory` para conservar el contrato existente.

Esta separación evita que el route group principal siga creciendo por cambios
de presentación o análisis. Se descartó mantener todo en un solo archivo porque
ya superaba el límite de modularidad; tampoco se creó una capa de servicio para
dos lecturas que todavía comparten directamente el filtro de tenant y los
modelos de consulta.
