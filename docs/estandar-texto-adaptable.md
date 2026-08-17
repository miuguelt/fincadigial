# Estándar de texto adaptable

**Versión:** 1.0 · **Fecha:** 2026-08-10 · **Ámbito:** `frontend/src`

Regla de la casa: **una palabra nunca se parte a la mitad.** Si no cabe, lo que
cede es el tamaño de la letra, no la palabra. Truncar con puntos suspensivos
tampoco vale: el campesino tiene que poder leer «Enfermedad», no «Enfermed…».

Complementa a [`ui-style-system.md`](./ui-style-system.md) (color y tipografía) y
a [`estandar-pantallas-de-datos.md`](./estandar-pantallas-de-datos.md) (layout).

---

## 1. Por qué se partían las palabras

`app/styles/index.css` aplicaba a todos los títulos y párrafos:

```css
h1, h2, h3, h4, h5, h6, p, span, a {
  overflow-wrap: break-word;
  word-break: break-word;   /* ← el culpable */
}
```

`word-break: break-word` es el alias antiguo de `overflow-wrap: anywhere`, y
esa palabra clave **sí** reduce el ancho `min-content` del elemento a un solo
carácter. En un contenedor flex o grid eso significa que el navegador puede
encoger la caja por debajo de la palabra más larga: parte la palabra aunque
hubiera hueco de sobra en la tarjeta.

Ese era el origen de «Enfermed / ad» en las acciones rápidas del campesino.

`overflow-wrap: break-word` a secas mantiene `min-content` = palabra más larga.
El contenedor reserva ese ancho y la palabra solo se rompe cuando de verdad no
cabe. Es lo que hay ahora en la base.

## 2. Las cuatro herramientas

### 2.1 La base global — no hay que hacer nada

Todos los títulos y párrafos heredan ya `word-break: normal` y
`hyphens: manual`.

Esto ata donde el ancho se calcula a partir del contenido: **tablas con
`table-layout: auto`** (el grueso de las pantallas CRUD), columnas de grid
`auto`, `width: fit-content` e `inline-block`. Medido sobre una tabla de 300 px
con tres columnas:

| Celda | Antes | Ahora |
|---|---|---|
| «Establecimiento» | 82 px, 2 renglones (partida) | 98 px, 1 renglón |
| «Responsable del tratamiento» | 141 px, 2 renglones | 110 px, 2 renglones (corta en el espacio) |
| «Observaciones» | 77 px, 2 renglones (partida) | 92 px, 1 renglón |

**Donde no basta:** en flex y grid, `index.css` aplica `min-width: 0` a
`.flex > *` y `.grid > *` para evitar desbordes horizontales. Eso permite que
el elemento se encoja por debajo de su propia palabra más larga, así que en una
tarjeta estrecha la palabra se sigue partiendo por mucho que `word-break` sea
`normal`. Ese es justo el caso de las tarjetas de acción rápida, y ahí el que
resuelve es `<FitText>`.

### 2.2 `<FitText>` — la letra se ajusta al contenedor

Para títulos grandes en cajas estrechas (tarjetas, botones, encabezados
compactos), donde no basta con envolver:

```tsx
import { FitText } from '@/shared/ui/FitText';

<div className="flex-1 min-w-0">
  <FitText as="h3" className="text-xl md:text-2xl font-bold">
    {action.label}
  </FitText>
</div>
```

Conserva el tamaño de sus clases mientras el texto quepa. Cuando no cabe, lo
reduce lo justo para que ninguna palabra se parta y no se pase de `maxLines`.

| Prop | Por defecto | Para qué |
|---|---|---|
| `as` | `span` | Etiqueta a renderizar (`h1`…`h3`, `p`, `span`). |
| `maxLines` | `1` | Renglones permitidos antes de encoger. |
| `minScale` | `0.55` | Suelo de reducción. Por debajo se autoriza el corte. |

`maxLines` es la preferencia; que no se parta ninguna palabra es la regla. Si
el objetivo de renglones es inalcanzable —«Trasladar Ganado» en una columna de
100 px no cabe en una línea ni al 55 %— **no se encoge hasta el suelo para
nada**: se conserva el mayor tamaño en el que ninguna palabra se corta y el
texto envuelve por el espacio. Medido: 23 px en dos renglones, no 13 px en dos
renglones.

**Requisito de layout:** el elemento tiene que recibir el ancho del contenedor,
no de su contenido. Dentro de un flex, el envoltorio necesita `flex-1 min-w-0`;
si el ancho depende del texto, la medida se realimenta y oscila.

**No pongas `font-size` en `style` inline.** El ajuste limpia `style.fontSize`
antes de cada medida —así no acumula reducciones al cruzar un breakpoint— y se
llevaría por delante ese valor. El tamaño base va siempre en clases.

`useFitText` (en `@/shared/hooks`) expone lo mismo como hook cuando hace falta
la `ref` en un componente que ya existe; `mergeRefs` reparte el nodo cuando el
componente además expone su propia `ref` (es lo que hace `CardTitle`).

### 2.2b Dónde está aplicado ya

No hay que añadirlo a mano en la mayoría de pantallas: va en los componentes
por los que pasa casi todo el texto de la web.

| Componente | Alcance | Qué ajusta |
|---|---|---|
| `CardTitle` (`shared/ui/card`) | 82 archivos | El `text-2xl` fijo del título de tarjeta. `maxLines={0}` lo desactiva. |
| `KPICard` | 13 archivos | Título, cifra y subtítulo. Antes los tres se **recortaban** con `truncate`. |
| `DataScreenHeader` | 12 archivos | Título y descripción de pantalla de datos. |
| `PageHeader` | 9 archivos | Título y descripción de página. |
| Acciones rápidas del campesino | 1 pantalla | El caso que originó el estándar. |

### 2.2c Rendimiento

Todos los `FitText` de la página comparten **un ResizeObserver y un lote por
frame** (`shared/lib/fitScheduler`). El lote separa las tres fases —invalidar,
leer, escribir— porque mezclarlas cuesta un reflow por nodo. Medido con 300
nodos:

| Operación | Coste |
|---|---|
| Medir 300 textos distintos (caché fría) | 12,7 ms — 42 µs/nodo |
| Medir 300 textos ya vistos (caché) | 2,9 ms |
| Tabla realista: 20 textos en 300 celdas | 3,5 ms |
| Alta de 300 nodos en el observador | 0,3 ms |
| Reflow por lotes vs intercalado | 15,3 ms vs 63,5 ms (**4,2×**) |

La primera versión medía con 10 llamadas a `measureText` por nodo y costaba
75 ms. Ahora mide **una sola vez** a 100 px y el resto es aritmética, porque el
ancho es exactamente lineal con el tamaño de letra y la suma de las palabras
coincide al 0,00 % con medir la cadena entera (verificado también con
`letter-spacing` de 1,5 px y 3 px).

El planificador usa `requestAnimationFrame` **con respaldo de temporizador**: en
una pestaña oculta el navegador no dispara rAF, y sin el respaldo el texto
montado en segundo plano se quedaría sin ajustar.

### 2.3 `.text-fluid-*` — ajuste sin JavaScript

Cuando el ancho lo manda un contenedor y no hace falta precisión al píxel:

```tsx
<div className="fit-container">
  <h3 className="text-fluid-lg font-bold">Trasladar Ganado</h3>
</div>
```

Escalan con `cqi` (ancho del contenedor), no con el viewport: dentro de una
rejilla de tarjetas es lo correcto, `vw` no lo es. Tamaños disponibles:
`text-fluid-sm`, `-base`, `-lg`, `-xl`. Requieren un ancestro con
`.fit-container` (`container-type: inline-size`).

### 2.4 `.fit-clamp` — donde la altura no puede crecer

El relevo de `truncate`, para celdas de tabla, listas y encabezados de diálogo:
sitios donde el texto **tiene** que caber en un renglón porque la caja no puede
crecer de alto. Mantiene ese compromiso, pero antes de perder texto encoge la
letra. Solo cuando ni al mínimo entra aparecen los puntos suspensivos.

```tsx
<td className="fit-clamp">{potrero.nombre}</td>
```

No hace falta importar nada ni envolver en `<FitText>`: `fitAutoRegistry` da de
alta cada `.fit-clamp` en cuanto entra en el DOM, y lo vuelve a medir cuando le
cambia el texto. Arranca una sola vez desde `app/main.tsx`.

Cuánto texto se gana frente a `truncate`, medido:

| Contenido | Caja / base | `truncate` | `.fit-clamp` |
|---|---|---|---|
| Potrero La Esperanza Alta | 160 px / 16 px | 21 de 25 caracteres | **25 de 25**, entero |
| Mejoramiento genético del hato lechero | 120 px / 14 px | 16 de 38 | **22 de 38** |
| Vacunación contra fiebre aftosa — lote 3 | 140 px / 12 px | 25 de 40 | **27 de 40** |
| Juan Sebastián Martínez | 100 px / 14 px | 15 de 23 | **18 de 23** |

**Suelo de legibilidad: 11 px.** Un `minScale` relativo no basta —sobre un
`text-xs` de 12 px, el 62 % son 7,4 px, ilegibles a pleno sol con el celular en la
mano, que es como se usa esta aplicación—. Por debajo de 11 px se prefiere
recortar antes que seguir encogiendo. El suelo es absoluto y vale para todo el
sistema, también para `<FitText>`.

### 2.5 `.break-anywhere` — la escotilla explícita

Único caso en que sí se parte a la brava: cadenas sin espacios que no son
lenguaje natural — identificadores, hashes, tokens, URLs, correos.

```tsx
<td className="font-mono break-anywhere">{invitation.token}</td>
```

## 3. Cómo se enforza

`devbrain/no-mid-word-break` (en `eslint-plugin-devbrain.js`, nivel `error`)
rechaza:

- la clase `break-all` en `className`;
- `wordBreak: 'break-word' | 'break-all'` en estilos en línea.

El mensaje remite a este documento. La escotilla es `.break-anywhere`, que se
pide a propósito y se ve en la revisión.

## 3b. `truncate` está retirado

La utilidad `truncate` ya no se usa en `frontend/src`: sus **196 apariciones en
100 archivos** son ahora `.fit-clamp` (§2.5). No quedan usos; si aparece uno
nuevo, es una regresión.

El cambio fue una sustitución de clase, sin tocar la estructura del JSX, porque
`.fit-clamp` se da de alta solo en el planificador (`fitAutoRegistry`). Se
comprobó antes que las 196 apariciones estaban todas dentro de `className`, y
que ninguna convivía con `line-clamp-*` ni con `whitespace-normal`, que habrían
entrado en conflicto con el renglón único.

## 4. Decisiones y su porqué

**Medición sobre `<canvas>`, no sobre el DOM.** `computeFitScale`
(`shared/lib/textFit.ts`) mide con `measureText`, sin tocar el layout. Medir
escribiendo `font-size` y leyendo `scrollWidth` dentro de un `ResizeObserver`
provoca el bucle clásico *ResizeObserver loop completed with undelivered
notifications*.

**El tamaño se reinicia antes de cada medida.** El planificador limpia
`style.fontSize` y vuelve a leer el computado. Sin eso, al cruzar un breakpoint
(`text-xl` → `md:text-2xl`) se acumularían reducciones y el texto se quedaría
pequeño para siempre. Es también la razón de que un `font-size` inline sea
incompatible con el ajuste.

**El observador solo reacciona al ancho.** El alto lo cambia el propio ajuste;
reaccionar a él realimentaría el bucle. Además, si el ancho no ha cambiado desde
la última medida, no se recalcula nada.

**Se recalcula al cargar las webfonts.** Las métricas cambian cuando llega la
fuente real; `document.fonts.ready` dispara un remedido.

**Margen del 2 %** entre la medida del canvas y el layout real: `letter-spacing`
y el subpixel no coinciden exactamente. Si aun así se pasa, el texto envuelve
por palabras — nunca desborda ni se parte.

**Si ni al mínimo cabe** la palabra más larga, el hook marca
`data-fit-overflow="break"` y la CSS autoriza `overflow-wrap: anywhere`. Antes
desbordar la tarjeta que quedarse ilegible.
