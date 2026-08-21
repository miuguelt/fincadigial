# Registro diario: animales en atención y reportes del periodo

Fecha: 2026-08-17

Alcance: `pages/dashboard/admin/control/`, `widgets/control/ControlEntryForm/`.

## Problema

La pestaña "Hoy" del registro diario avisaba «2 animales necesitan atención» y
ofrecía un botón «Ver animales» que saltaba a la pestaña "Salud", donde el
operario caía en el historial completo de revisiones — todas, sanas incluidas —
y tenía que reconstruir a mano cuáles eran esos dos. El dato existía en
`summarizeControls`, pero solo salía del módulo como un conteo.

Tres problemas de fondo:

1. **El conteo no era accionable.** Saber que hay dos animales enfermos sin
   saber cuáles no permite hacer nada en el potrero.
2. **La pestaña "Salud" cargaba los mismos controles tres veces.** La página los
   pedía en `useControlsSummary`, el `ControlDashboard` los volvía a pedir para
   sus tarjetas y el `AdminCRUDPage` los pedía otra vez para la tabla. Además
   `ControlDashboard` anidaba un segundo juego de pestañas dentro de la pestaña,
   con colores `gray-*`/`white` fijos que se rompían en modo oscuro.
3. **No había estadísticas.** Los números del día estaban, pero nada respondía
   «¿cómo vamos esta semana?» ni «¿a quién llevo un mes sin revisar?».

## Decisión

### Dirección de dependencias

```
index.tsx  (composición: pestañas, modales, estado de UI)
├── hooks/useControlsSummary  ──> hooks/controlSummary.utils   (puro)
│      └── expone attentionAnimals + controlRows
├── components/AttentionAnimalsPanel ──> AttentionAnimalRow ──> attentionAnimals.model (puro)
├── components/DailyWorkSection      (presentación)
├── components/ControlEntryModals    (presentación) ──> widgets/control, widgets/milk
└── reports/ReportsTab
       ├── reportPeriod.ts    (puro)  rango del periodo
       ├── milkReport.ts      (puro)  desglose diario → serie + máximos
       ├── controlReport.ts   (puro)  estado del hato, pesajes, olvidados
       ├── reportExport.ts    (puro)  texto plano y CSV
       ├── useMilkPeriodReport (I/O)  única petición nueva de la pestaña
       └── components/*       (presentación)
```

Toda la aritmética vive en módulos puros con pruebas propias; los componentes
solo formatean. Ningún módulo de `reports/` importa detalles de `components/` ni
al revés: comparten el tipo `ControlRecord` que publica `controlSummary.utils`.

### Qué se decidió y por qué

**El listado de animales sale de donde ya se calculaba.** `summarizeControls` ya
recorría el último control de cada animal para contar los que están en alerta;
ahora devuelve también la lista (`attentionAnimals`) con estado, días desde la
revisión y observación. No se agregó ninguna petición: es el mismo recorrido.

**Orden por gravedad y luego por antigüedad.** Dentro de la misma gravedad se
muestra primero el control más viejo. Un «Malo» reportado hace dos semanas sin
seguimiento es más urgente que uno reportado hoy; el orden inverso escondía
justamente los casos abandonados.

**`daysSinceCheck` puede ser `null`.** Cuando la fecha no es legible la interfaz
dice «Sin fecha de revisión» en vez de calcular un número falso.

**El día se toma de `getTodayColombia()`, no de `toISOString()`.** En UTC el día
cambia a las 7 p. m. hora local: los conteos «de hoy» y los «días sin revisión»
saltaban de fecha esa misma noche.

**Los reportes reutilizan `controlRows`.** El hook ya descarga hasta 1000
controles; la pestaña de reportes los recibe por props en vez de repetir la
consulta. La única petición nueva es el desglose diario de ordeño, y solo cuando
el operario abre la pestaña (Radix desmonta el contenido inactivo).

**Los periodos son los que el backend ya sirve.** «Últimos 7 días» usa
`summary/weekly` anclado al primer día del rango; «Mes en curso» usa
`summary/monthly` recortado a los días transcurridos. No se inventó una ventana
móvil de 30 días que habría exigido cinco llamadas.

**Se eliminó `ControlDashboard` de la pestaña "Salud".** Sus tarjetas duplicaban
las que ya están en "Hoy" y sus pestañas anidadas eran un nivel de navegación de
más en un celular. La pestaña ahora muestra el `AdminCRUDPage` directamente:
una petición menos y un nivel de anidación menos.

**El CSV se separa con punto y coma.** El decimal en Colombia es la coma; con
separador coma, Excel parte cada número en dos columnas.

### Interfaz nueva de `ControlEntryFormWidget`

Se agregó `defaultAnimalId?: number`. Permite abrir «Registrar revisión» desde
una alerta concreta con el animal ya seleccionado. `ControlEntryModals` remonta
el formulario con `key={healthAnimalId}` porque `react-hook-form` conserva los
`defaultValues` del montaje anterior.

## Alternativas descartadas

- **Filtrar el CRUD de "Salud" por estado de alerta.** Habría reutilizado la
  tabla, pero el operario seguiría navegando a otra pestaña, esperando una
  carga y leyendo columnas pensadas para escritorio.
- **Un endpoint nuevo `/control/attention`.** No hace falta: el dato se deriva
  de controles que la página ya descarga, y un endpoint más habría que
  mantenerlo sincronizado con la misma regla de clasificación.
- **Ventana móvil de 30 días para el ordeño.** El backend agrupa por semana o
  por mes calendario; una ventana móvil exigía varias llamadas o un endpoint
  nuevo, sin beneficio real para quien piensa en «esta semana» y «este mes».

## Presupuesto y deuda

| Archivo | Líneas | Nota |
| --- | --- | --- |
| `index.tsx` | 274 | Baja de 325. Es composición; se extrajeron `DailyWorkSection` y `ControlEntryModals`. |
| `reports/ReportsTab.tsx` | 197 | Composición de la pestaña. |
| `reports/controlReport.ts` | 168 | Tres agregaciones sobre el mismo índice de último control por animal. |
| resto de archivos nuevos | < 105 | Dentro del presupuesto. |

Gate de modularidad sobre `pages/dashboard/admin/control`: 0 errores.

Deuda pendiente:

- `components/ControlDetailExpanded.tsx` (288 líneas) supera el presupuesto
  desde antes de este cambio.

## Limpieza de código muerto (mismo cambio)

La carpeta arrastraba un refactor anterior que nunca se conectó. Se eliminaron
24 archivos tras confirmar por grep que ninguno tenía consumidores — ni en
`src/`, ni en barrels, ni en pruebas, ni fuera de `src/`:

| Grupo | Archivos |
| --- | --- |
| Componentes sin consumidor | `ControlPageModals`, `DailyActionGrid`, `DailyOverview`, `ControlPageHeader`, `ControlSectionTabs`, `ControlCorralSection`, `ControlHistorySection` |
| Sin consumidor al caer los anteriores | `CorralPanel.tsx` (366 líneas), `hooks/useControlOptions.ts` |
| Ya sin consumidor | `hooks/useControlColumns.tsx` |
| Isla huérfana independiente | `components/corral-panel/` (14 archivos) |

`ControlPageModals` era el más peligroso: parecía la fuente viva de los modales
del panel, pero la viva es `ControlEntryModals.tsx`. Una IA que leyera la
carpeta editaba el muerto.

`components/corral-panel/` resultó ser una isla aparte: `CorralPanel.tsx` **no
la importaba** — solo trae `shared/ui`, `entities/animal` y `offlineQueue`. Eran
dos versiones del mismo panel, ninguna conectada. Con la carpeta se fue
`corralPayload.test.ts` y sus 6 pruebas de `buildCorralPayload`, que ejercitaban
código que ningún flujo de la aplicación alcanzaba.

### Qué se conservó y por qué

- **`controlPage.types.ts`**: `features/animal-bulk-actions/QuickAnimalTransferForm.tsx`
  importa de ahí el tipo `ControlOption`. El archivo sigue vivo aunque sus
  consumidores dentro de la carpeta hayan desaparecido.
- **`features/animal-bulk-actions/QuickAnimalTransferForm.tsx`**: queda sin
  consumidores al caer `ControlPageModals`, pero vive en otro módulo y su barrel
  lo exporta como API pública. No se tocó; queda anotado aquí.

Resultado del gate de modularidad sobre la carpeta: de 41 archivos a 17, 0
errores, y desaparece el aviso de `CorralPanel.tsx`.

## Verificación

- `npx vitest run` — 73 archivos, 349 pruebas, 1 omitida. (Antes de la limpieza:
  74 y 351; la diferencia son las 6 pruebas de código muerto que se fueron con
  `corral-panel/`, compensadas por pruebas nuevas de otra rama en curso.)
- `npm run type-check` — 0 errores que mencionen `admin/control` o cualquiera de
  los archivos eliminados.
- `npx eslint` sobre `pages/dashboard/admin/control` y `widgets/control` — 0
  errores, 0 avisos.
- `Test-DevBrainModularity.ps1 -Path .../control -FailOnViolations` — 0 errores.

Pruebas nuevas: `controlSummary.utils.test.ts` (lista de atención, orden por
gravedad, fecha ilegible), `AttentionAnimalsPanel.test.tsx`, `reportPeriod.test.ts`,
`milkReport.test.ts`, `controlReport.test.ts`, `reportExport.test.ts`,
`AdminControlPage.test.tsx` (integración: nombres visibles, animal preseleccionado).
