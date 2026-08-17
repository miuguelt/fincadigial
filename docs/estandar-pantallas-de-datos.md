# Estándar de pantallas de datos

**Versión:** 2.0 · **Fecha:** 2026-08-10 · **Ámbito:** `frontend/src`

Regla de la casa: **en una pantalla de datos manda la información, no el
encabezado.** Las tablas y rejillas deben poder ocupar todo el alto disponible
del viewport; los adornos ceden espacio, no al revés.

Este documento describe el estándar y dónde vive implementado. Complementa a
[`ui-style-system.md`](./ui-style-system.md), que cubre color, tipografía y
tokens.

---

## 1. Las cinco reglas

### 1.1 El encabezado se desplaza con los datos

El bloque de contexto (título, métricas, pestañas, filtros activos) va **dentro
del área con scroll**, no fijo encima. Al bajar, desaparece y la tabla se queda
con todo el alto.

Implementado con la prop `headerSlot` de `CRUDTable`. `AdminCRUDPage` la
alimenta automáticamente desde `config.customHeader`: **una pantalla CRUD no
tiene que hacer nada**, basta con declarar `customHeader`.

Excepciones, gestionadas por `usesScrollableHeader` en `AdminCRUDPage`:

| Caso | Comportamiento |
|---|---|
| Estado vacío | El encabezado se mantiene arriba (no hay datos que ganar). |
| Pantalla completa | El encabezado no se monta. |
| `renderGrouped` | La vista agrupada gestiona su propio scroll: encabezado arriba. |

### 1.2 La paginación flota sobre los datos

`CRUDPagination` con `floating` (su valor por defecto): `position: fixed`
centrado abajo, fuera del flujo, al 65 % de opacidad y opaco al pasar el cursor
o al enfocarlo con teclado. No consume una banda de ~65 px.

El contenedor con scroll reserva `pb-20 md:pb-24` para que la última fila no
quede debajo de la barra. **Si alguna vista deja de flotar la paginación, debe
quitar también ese colchón**, y al revés.

La barra flota a `bottom-7 sm:bottom-8` justamente para dejar libre la franja
donde flota la barra de desplazamiento horizontal de la tabla. Si se baja, la
tapa.

Se centra sobre el **área de contenido**, no sobre el viewport: usa
`--app-content-left`, la variable que publica `DashboardLayout` con el ancho que
reserva el menú lateral. Y se apaga con `--app-floating-opacity` /
`--app-floating-events` mientras el cajón del menú cubre la pantalla en móvil.

### 1.2a El selector de registros por página no miente

La lista de opciones incluye **siempre** el tamaño vigente. Con
`defaultLimit: 50` y opciones `[12, 24, 48, 96]`, el desplegable mostraba `12`
mientras la tabla traía 50 registros. Escalones por defecto: `[25, 50, 100,
200]`. La elección se recuerda por entidad en `localStorage`
(`crud:pageSize:<entidad>`).

### 1.2b Las barras de desplazamiento flotan

Las barras nativas siempre reservan pista: 10-14 px de ancho y de alto que se le
restan a la tabla. `overflow: overlay` habría resuelto esto, pero Chromium lo
eliminó y las barras de `::-webkit-scrollbar` siempre ocupan layout.

`FloatingScrollArea` (`shared/ui/FloatingScrollArea.tsx`) oculta la barra nativa
con la clase `.no-native-scrollbar` y **pinta el pulgar por encima del
contenido**, en posición absoluta. Coste de layout: cero. El pulgar está siempre
visible cuando hay desbordamiento, sube de contraste al pasar el puntero por la
caja o al desplazar, y se arrastra con el mouse en ambos ejes.

El scroll sigue siendo **nativo**: rueda, teclado, trackpad y gestos táctiles no
se tocan. Lo único propio es el pulgar.

Medido a 1440×700 en `/admin/tasks`: `offsetWidth - clientWidth = 0` y
`offsetHeight - clientHeight = 0`, es decir, ninguna pista reservada.

> Las utilidades `scrollbar-thin` / `scrollbar-thumb-*` que había en el código
> **no hacían nada**: requieren el plugin `tailwind-scrollbar`, que no está
> instalado. No volver a usarlas.

### 1.2c La tabla llena el ancho disponible

`min-width` de la tabla es `max(100%, columnas × 140px)`. Con pocas columnas se
estira hasta el borde de la caja; con muchas desborda y aparece la barra
horizontal flotante. Un `min-width` fijo en línea pisaba la clase `min-w-full` y
dejaba media pantalla en blanco a la derecha.

### 1.3 El encabezado usa `DataScreenHeader`

`@/widgets/layout/DataScreenHeader` es el único encabezado de pantalla de datos.
Fija altura (~64 px el bloque de título), radios, sombras y separaciones.

```tsx
<DataScreenHeader
  leading={<Button variant="ghost" size="icon" onClick={volver}>…</Button>}
  actions={<Button>Exportar</Button>}
  icon={<HeartPulse className="h-5 w-5 text-white" />}
  iconClassName="from-purple-500 to-purple-600 shadow-purple-500/20"
  title={<>Salud y <span className="text-purple-500">Tratamientos</span></>}
  description="Monitoreo clínico, insumos aplicados y control de salud"
  metrics={
    <>
      <KPICard compact title="Total" value={total} icon="📋" />
      {/* … */}
    </>
  }
  metricsColumns={4}
>
  <SanidadTabs />
</DataScreenHeader>
```

Prohibido volver a escribir a mano el patrón `rounded-[2.5rem] p-6 sm:p-8
shadow-2xl` con `<h1 className="text-3xl">`: eso es el encabezado de landing,
no el de una pantalla de datos.

**Esto lo vigila el linter.** La regla `devbrain/no-legacy-screen-header`
(`frontend/eslint-plugin-devbrain.js`) marca como error cualquier `className`
que combine `rounded-[2.5rem]` con `sm:p-8`. Exige los dos tokens a propósito:
`rounded-[2.5rem]` a secas se sigue usando como radio decorativo en tarjetas y
barras, que no son encabezados de pantalla.

### 1.4 Las métricas de encabezado son `compact`

`<KPICard compact />` quita el sparkline (40 px) y la reserva del badge (22 px),
y baja el padding de `p-5` a `p-3`: ~180 px → ~70 px por tarjeta.

La variante completa (con sparkline) se reserva para los **dashboards de
analítica**, donde el KPI *es* el contenido: `DashboardExecutive`, `FieldsPage`,
`HerdHealthSection`.

### 1.5 Sin altura muerta en el layout

- `DashboardLayout` usa `py-2` en todos los breakpoints.
- `AppLayout` de una pantalla CRUD va con `pt-0 pb-0` y `h-full`.
- `AppLayout` **no** aplica canalón inferior cuando la página es de alto
  completo. Su `sm:pb-10` sobrevivía al `pb-0` que pasa la página —`twMerge` no
  fusiona clases de variantes distintas— y dejaba 40 px muertos bajo la tabla.
- La cadena `flex flex-col` → `flex-1 min-h-0` no se rompe en ningún nivel: un
  `min-h-0` que falte convierte el scroll interno en desbordamiento.

Medición a 1440×700 tras aplicar el estándar (`/admin/tasks`, `/vaccinations`,
`/treatments`): 9 px por debajo del área de datos —el canalón de página y el
borde—, frente a 49 px antes.

---

## 2. Dónde está implementado

| Pieza | Archivo |
|---|---|
| Encabezado estándar | `widgets/layout/DataScreenHeader.tsx` |
| Métrica compacta | `widgets/analytics/KPICard.tsx` (prop `compact`) |
| **Barras flotantes** | `shared/ui/FloatingScrollArea.tsx` + `.no-native-scrollbar` / `.floating-scroll-thumb` en `app/styles/index.css` |
| Encabezado dentro del scroll | `widgets/admin-crud/ui/CRUDTable.tsx` (prop `headerSlot`) |
| Orquestación y excepciones | `widgets/admin-crud/ui/AdminCRUDPage.tsx` (`usesScrollableHeader`) |
| Paginación flotante | `widgets/admin-crud/ui/CRUDPagination.tsx` (prop `floating`) |
| Tamaño de página y persistencia | `widgets/admin-crud/ui/AdminCRUDPage.tsx` (`DEFAULT_PAGE_SIZES`, `crud:pageSize:*`) |
| Alto del área de contenido | `widgets/dashboard-layout/DashboardLayout.tsx`, `widgets/layout/AppLayout.tsx` |
| Guarda de lint | `eslint-plugin-devbrain.js` (`no-legacy-screen-header`) |
| Pruebas del estándar | `src/tests/ui/dataScreenHeader.test.tsx` |

`OptimizedAdminCRUDPage.tsx` es una copia huérfana: ninguna pantalla la importa.
El componente vivo, el que exporta `widgets/admin-crud`, es `AdminCRUDPage.tsx`.

Encabezados ya migrados a `DataScreenHeader` (10 pantallas):

- `widgets/dashboard/treatments/PremiumTreatmentsHeader.tsx`
- `widgets/dashboard/animals/PremiumAnimalsHeader.tsx`
- `pages/dashboard/admin/animals/components/AnimalsHeaders.tsx` (Bento y Potreros)
- `pages/dashboard/admin/users/components/UsersBentoHeader.tsx`
- `pages/dashboard/admin/fields/index.tsx` (`PremiumFieldsHeader`)
- `pages/dashboard/admin/analytics/FieldsPage.tsx`
- `pages/dashboard/admin/analytics/ICADashboard.tsx`
- `pages/dashboard/admin/financial/index.tsx`
- `pages/dashboard/admin/reproduction/FertilityDashboard.tsx`
- `pages/dashboard/admin/reproduction/SirePerformance.tsx`

---

## 3. Cómo se aplica a una pantalla nueva

1. Si es una pantalla CRUD, usa `AdminCRUDPage`: heredas todo el estándar sin
   escribir una línea de layout.
2. Declara el encabezado como `config.customHeader` con `DataScreenHeader`.
3. Las métricas, siempre `<KPICard compact />`.
4. No añadas contenedores con altura fija ni `overflow` propios entre
   `AdminCRUDPage` y tu contenido.
5. Si la pantalla **no** es CRUD y muestra una lista larga, replica el patrón:
   un único contenedor con scroll que contenga encabezado + datos, `min-h-0` en
   toda la cadena flex y la paginación flotante.

---

## 4. Cómo revisarlo

`jsdom` no calcula layout, así que la comprobación va con un navegador real:

```bash
node frontend/scripts/verify-data-screens.mjs salida.png
```

Entra con el acceso de prueba «Admin», recorre `/admin/tasks`,
`/admin/vaccinations` y `/admin/treatments` a 1440×700, 320×700 y en modo
oscuro, y comprueba 16 invariantes: espacio muerto ≤ 12 px, pista de barra
nativa = 0 en ambos ejes, pulgar presente al desbordar, tabla llena el ancho,
arrastre vertical y horizontal, última fila alcanzable y no tapada por la
paginación, el pulgar no roba clics a las celdas, y ningún texto partido.
Devuelve `exit 1` si alguna falla, y deja capturas.

Requiere el entorno arriba: `pwsh -File start-windows.ps1 -Daemon` (con `pwsh`,
no `powershell`: el script exige PowerShell 7).

La revisión visual complementaria se hace con la ventana **corta a propósito**
(≈700 px de alto, que es un portátil al 150 % de escala):

- Al cargar deben verse al menos 5-6 filas sin desplazar.
- Al desplazar hacia abajo, el encabezado desaparece y sólo queda la cabecera
  de la tabla anclada arriba.
- La barra de paginación flota sobre las filas y no oculta la última.
- "Pantalla Completa" no muestra encabezado: sólo tabla y paginación.

Recuerda que la aplicación registra un *service worker*: para ver cambios de
estilo hay que recargar con `Ctrl+Shift+R`.
