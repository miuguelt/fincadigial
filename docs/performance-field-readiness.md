# Rendimiento y operación rural de Villaluz

## Hallazgo principal

El calendario cargaba cada alerta como una tarjeta individual. En la finca medida,
una sola consulta retornaba 17.797 alertas y aproximadamente 3,35 MB de JSON. La
vista Agenda llegó a 285.258 nodos DOM y 17.806 tarjetas; Chrome dejaba de responder
antes de que el usuario pudiera cambiar de vista.

El problema no era la consulta SQL aislada (aproximadamente 7 ms en caché), sino la
combinación de volumen transferido, deserialización, reconciliación de React y pintura
del navegador.

## Cambios aplicados

- El calendario mensual entrega una tarjeta resumen por día y conserva los conteos
  reales por tipo y fecha.
- Al seleccionar un día se solicitan sólo sus alertas de prioridad alta o crítica,
  con un máximo de 50 tarjetas.
- La Agenda presenta resúmenes y tiene un límite incremental de 100 elementos como
  protección adicional.
- Las consultas GET pasan por la caché HTTP persistente en IndexedDB. Si no hay red,
  se reutilizan datos guardados hasta por 60 días y la interfaz informa que son datos
  locales.
- Las solicitudes simultáneas iguales se agrupan en una sola llamada.
- Redis vuelve a ser el backend real de Flask-Caching; antes se degradaba
  silenciosamente a memoria local por un argumento incompatible.
- Marcar todas las alertas usa un único `UPDATE` limitado a la finca activa. No carga
  cientos de miles de filas ni hace un `COMMIT` por alerta.
- El motor de alertas agrupa deduplicación en lotes de 250 animales, precarga reglas,
  escribe con una transacción por ciclo y emite un resumen de notificaciones por finca.
- La evaluación automática pasa de cada hora a cada seis horas por defecto y usa un
  lock de Redis para impedir ejecuciones superpuestas.
- El motor predictivo reutiliza alertas no resueltas por categoría en lugar de crear
  duplicados diarios.

## Resultado medido

| Vista | Antes | Después |
|---|---:|---:|
| Agenda: nodos DOM | 285.258 | 347 |
| Agenda: tarjetas | 17.806 | 6 resúmenes |
| Mes: nodos DOM | 18.313 | 1.217 |
| Mes: tarjetas del día | 1.161 | 50 máximo |
| Texto renderizado en Mes | 154.778 caracteres | 9.400 caracteres |

La reducción observada es de 99,88 % de nodos en Agenda y 93,35 % en Mes. El conteo
completo sigue visible; sólo se evita materializarlo todo a la vez.

## Base de datos

Las migraciones `perf001_runtime` y `perf002_calendar` añaden índices parciales para
alertas no leídas y consultas de calendario. Ya fueron aplicadas con la cuenta propietaria;
la base se encuentra en `perf002_calendar (head)` y la cuenta de runtime continúa siendo
`villaluz`, sin elevar sus permisos.

```powershell
$env:FLASK_APP='app'
python -m flask db current  # debe mostrar perf002_calendar (head)
```

No se deben marcar ni borrar las 460.769 alertas históricas como parte del despliegue;
esa limpieza es una decisión funcional separada. Antes del intento se creó un respaldo
verificado en `backend/backups/`.

## Criterios operativos para campo

- Abrir el calendario una vez con conexión para sembrar la caché del periodo visible.
- Los registros escritos sin señal continúan usando la cola offline ya existente.
- Mostrar siempre si el dato proviene del almacenamiento local y sincronizar al volver
  la red.
- Evitar pantallas que dependan de listas completas: conteo, resumen y detalle bajo
  demanda es el patrón obligatorio para alertas, animales y reportes masivos.
