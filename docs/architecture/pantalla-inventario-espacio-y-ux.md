# Pantalla de Inventario — aprovechamiento del espacio y estrategia de UI/UX

**Fecha:** 2026-08-17 · **Alcance:** `/admin/inventory` y el encabezado compartido de las pantallas CRUD.

## 1. Qué estaba roto (medido, no supuesto)

El encabezado de la pantalla pedía más ancho del que había. `PageHeader` pintaba el
slot de acciones con `shrink-0`, y ese slot contenía la barra `CRUDToolbar`
completa: búsqueda + botón *Nuevo* + el bloque personalizado de inventario
(chips de filtro **y** la guía de campo entera). Un bloque de ancho completo
dentro de una caja que no se encoge no tiene a dónde ceder: empuja el ancho del
encabezado más allá del viewport y deja al título —`flex-1 min-w-0`— en una
columna de una letra.

Medición del encabezado real renderizado (banco temporal, componentes de
producción con datos de ejemplo; `scrollWidth` frente a `clientWidth` de la caja):

| Ancho de caja | Antes: ancho pedido | Desborde | Cajas desbordadas | Después |
|---|---|---|---|---|
| 360 px | 1198 px | +840 px | 7 | 358 px · 0 |
| 390 px | 1208 px | +820 px | 7 | 388 px · 0 |
| 768 px | 1334 px | +568 px | 7 | 766 px · 0 |
| 1024 px | 1420 px | +398 px | 7 | 1022 px · 0 |
| 1280 px | 1505 px | +227 px | 7 | 1278 px · 0 |
| 1440 px | 1558 px | +120 px | 7 | 1438 px · 0 |

Consecuencias visibles en la captura del operador: título partido en cuatro
renglones encima de la caja de búsqueda, guía saliéndose por la derecha, barra
de scroll horizontal en toda la página, tarjetas de indicadores comprimidas y
`$ 364.000` partido como `$ 364.00` + `0` —una cifra rota a mitad de dígito,
que el estándar de texto de la casa prohíbe explícitamente.

Y el problema de fondo: **la tabla, que es la razón de la pantalla, no aparecía
en el primer pantallazo**. Encima de ella se apilaban título, búsqueda, chips,
guía abierta, intro de análisis, cinco indicadores, cuatro tarjetas de análisis
y las pestañas de sanidad.

## 2. Cambios aplicados

| Archivo | Cambio | Por qué |
|---|---|---|
| `widgets/layout/PageHeader.tsx` | Acciones: `shrink-0` → `min-w-0 sm:flex-[2] sm:justify-end` | Un slot ancho ya no puede empujar el encabezado fuera del viewport; la búsqueda recibe ~2/3 del ancho en vez de su ancho intrínseco |
| `widgets/admin-crud/ui/CRUDToolbar.tsx` | Nueva prop `toolbarPlacement: 'inline' \| 'row'` | `inline` (por defecto) conserva el comportamiento de las otras 6 pantallas con conmutadores cortos; `row` baja el bloque a una fila propia de ancho completo |
| `shared/types/crud.ts` · `AdminCRUDPage.tsx` | `config.toolbarPlacement` propagado | Contrato explícito, sin heurística de ancho |
| `inventory/useInventoryCrudConfig.tsx` | Chips → `customToolbar` con `row`; guía + análisis + pestañas → `customHeader` | Separa **control** (fijo, siempre visible) de **contexto** (viaja con el scroll de la tabla, §1.1 del estándar de pantallas de datos) |
| `InventoryInsights.tsx` | Detalle plegado por defecto (la clave de `localStorage` ahora guarda el estado abierto) | Devuelve ~500 px de alto a la tabla; la tira de indicadores sigue visible |
| `InventoryInsightsSummary.tsx` | Rejilla `auto-fit` con `minmax(min(100%, 190px), 1fr)` | Decide columnas por el ancho real disponible, no por el del viewport: 1 col a 360, 3 a 768, 4 a 1024, 5 desde 1280 |
| `InventoryInsightMetric.tsx` | Cifra dentro de `FitText` (`minScale 0.7`) + `min-w-0 flex-1` | La cifra se encoge antes de partirse; `$ 364.000` se mantiene en un renglón |
| `InventoryFarmerGuide.tsx` | Cabecera envolvible, `min-w-0`, rejilla interna `auto-fit` | Sin desborde a anchos estrechos |

Verificación: 0 cajas desbordadas y 0 palabras partidas entre 360 y 1440 px;
`tsc --noEmit` limpio; 61 archivos de prueba / 297 pruebas en verde, incluida
`CRUDToolbar.test.tsx`, escrita antes del arreglo y roja hasta aplicarlo.

## 3. Estrategia — el resto del camino

El arreglo anterior es geometría. Lo que sigue es lo que convierte la pantalla
en una herramienta de trabajo. Ordenado por relación valor/costo.

### F2 · Una sola superficie de filtro (alto valor, bajo costo)

Hoy los mismos seis números se muestran dos veces con dos modelos de
interacción distintos: los chips (`Todos 8 · Vencidos 2 · Vencen pronto 0 ·
Stock bajo 2 · Medicamentos 6 · Vacunas 2`) y las tarjetas de indicadores
(`Lotes registrados 8`, `Lotes vencidos`, `Vencen pronto`, `Stock bajo`), estas
últimas también clicables con el texto «Ver en la tabla». El operador no puede
saber cuál manda ni si son lo mismo.

Propuesta: **los chips son el control, los indicadores son la lectura**. Las
tarjetas dejan de filtrar y pasan a explicar (valor inmovilizado, tendencia,
autonomía en días); el estado de filtro vive en un solo sitio, siempre visible,
y se refleja en el título de la tabla («8 lotes · filtro: vencidos»). Elimina
una ambigüedad y ~200 px de alto duplicado.

### F3 · Presupuesto de chrome

Regla operativa para esta familia de pantallas: **el chrome fijo por encima de
la tabla no supera el 30 % del alto útil**; a 900 px de viewport son ~270 px
—título+búsqueda (56) + chips (40) + margen—. Todo lo demás es contexto y viaja
con el scroll o se pide. La guía de campo pasa de banner permanente a
onboarding con «Entendido, no mostrar más» y un acceso discreto («¿Cómo
reabastecer?») junto al título; hoy se cierra pero vuelve a costar espacio en la
primera visita de cada dispositivo.

### F4 · Tareas antes que datos

La pantalla responde bien a «qué tengo» y mal a «qué hago esta semana».
Sugerido: una franja de trabajo pendiente por encima de la tabla —«2 lotes
vencidos: dar de baja» / «2 por debajo del mínimo: reponer»— donde cada renglón
es una acción, no un número. Reutiliza `InventoryAlertsCard`, que ya calcula
esos grupos, y convierte el análisis en un flujo en vez de un tablero de
lectura.

### F5 · Campo y móvil (320–390 px)

Es donde de verdad se usa. Chips en fila con scroll horizontal y `scroll-snap`
en vez de envolver en tres renglones; tabla → tarjetas con las dos acciones
reales (*Entrar stock*, *Nuevo lote*) como botones de ≥ 44 px; indicadores en
carrusel de una columna. Verificar a 320, 390, 768, 1440, 1920 y 2560 px y con
zoom al 200 %.

### F6 · Que no vuelva a pasar

El desborde vivió meses porque nada lo medía. `src/dev/overflowScan.ts` ya
existe y detecta exactamente esto (`__vlScan`): falta convertirlo en una prueba
de Playwright que recorra las pantallas administrativas a los seis anchos y
falle si aparece una caja desbordada, una palabra partida o texto bajo 11 px.
Es la única forma de que un presupuesto de espacio sea real.

### Cómo se sabrá que funcionó

Filas visibles sin hacer scroll a 1440 px (hoy: 0); pantallazos hasta la primera
acción útil; desbordes detectados por el escáner = 0; y en campo, tiempo hasta
registrar una entrada de stock.

## 4. Contrato de la prop nueva

`toolbarPlacement` no adivina: `inline` es el valor por defecto y no cambia
ninguna pantalla existente (`animals`, `fields`, `users`, `control`,
`milk_production` pasan controles cortos). Una pantalla que ponga un bloque
ancho en `customToolbar` debe declarar `row`; si no, vuelve a competir por el
ancho de la búsqueda.
