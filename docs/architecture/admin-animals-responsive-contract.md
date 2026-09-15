# Contrato responsive: inventario de animales

## Propósito

La pantalla `/admin/animals` debe permitir que el personal de la finca busque, filtre, cambie de vista y abra la ficha de un animal con la misma claridad desde un teléfono compacto hasta una pantalla de escritorio grande.

## Dirección visual y jerarquía

- Se conserva el sistema visual actual de Villa Luz: superficies claras, acento verde, tarjetas de animal con imagen y panel bento de datos.
- La jerarquía es: título y búsqueda, creación, selector de vista y filtros, tarjetas, paginación.
- En móvil los grupos se apilan y usan todo el ancho disponible; desde `sm` se reorganizan en filas sin imponer anchos mínimos al viewport.
- No se rediseñan los estados existentes de carga, vacío, error, selección o alertas.

## Componentes y tokens reutilizados

- `AdminCRUDPage`, `CRUDToolbar`, `AnimalsViewSwitcher`, `SmartFiltersToolbar`, `CRUDCardGrid` y `AnimalCard`.
- Breakpoints y tokens Tailwind existentes; no se introducen colores ni componentes paralelos.

## Criterios verificables

- Viewports: 320, 390, 768, 1440, 1920 y 2560 px.
- Sin desplazamiento horizontal ni contenido fuera del viewport.
- Búsqueda y acciones interactivas principales con objetivo mínimo de 44 × 44 px.
- Nombres de potrero y raza conservan palabras completas; pueden envolver, pero no se truncan silenciosamente.
- La tarjeta refluye sin solapamientos y mantiene visible su acción principal.
- La pantalla sigue siendo operable con teclado y a 200 % de zoom.
- Sin errores nuevos de consola y sin violaciones críticas de accesibilidad.
