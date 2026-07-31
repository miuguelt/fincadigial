# Villa Luz — sistema visual global

## Principios

- Legibilidad y contraste primero: texto oscuro sobre superficies claras y texto blanco solo sobre colores sólidos oscuros.
- Una sola jerarquía: título de página, descripción, sección, contenido y acción primaria.
- Mobile-first: controles con área táctil mínima de 44 px y formularios que no provoquen zoom en iOS.
- La interfaz operativa debe ser sobria y rápida: sin gradientes decorativos en controles, sin glassmorphism como superficie principal y con animaciones breves.

## Tokens

- Primario: verde Villa Luz (`primary`), reservado para acciones principales, navegación activa y estados saludables.
- Neutros: `background` para la página, `card`/`surface` para paneles, `border` para separación y `foreground`/`muted-foreground` para texto.
- Semánticos: `success`, `warning`, `danger` e `info`. Los badges semánticos usan color sólido y texto de alto contraste.
- Radios: `md` para controles, `lg` para cards y `xl` para modales; evitar radios distintos sin una razón funcional.
- Espaciado: `--space-page-*` para páginas, `--space-section` entre bloques y `--space-card-pad` dentro de cards.

## Primitivas compartidas

- `Button`: acción primaria sólida; `secondary` y `outline` siempre tienen superficie y borde visibles.
- `Input`/`Textarea`: superficie sólida, borde visible, foco con anillo primario.
- `vl-page`, `vl-page-container`, `vl-page-header`, `vl-card`, `vl-tabs`, `vl-tab` y `vl-status-*`: clases de composición para vistas nuevas.
- `DialogContent`: modal sólido con overlay oscuro; el contenido debe mantener encabezado, cuerpo desplazable y acciones claramente separadas.

## Regla para nuevas vistas

Toda vista nueva debe reutilizar los tokens y primitivas anteriores. Las clases con `bg-gradient-*`, `backdrop-blur-*`, `bg-white/*` o radios mayores que `rounded-xl` requieren una justificación funcional y no deben usarse en controles.
