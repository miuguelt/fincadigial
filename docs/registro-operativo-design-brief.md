# Contrato de diseño · Mi registro diario

## Resultado

- Producto/página: `/campesino/registro-operativo`.
- Usuario principal: campesino o trabajador de finca que registra la jornada desde un teléfono, posiblemente con poca señal.
- Trabajo principal: anotar en pocos pasos una labor de cultivo, un evento del ganado o un movimiento de dinero y comprobar después para qué sirvió el dato.
- Resultado observable: en la primera pantalla la persona identifica qué puede anotar, abre la opción correcta y entiende que el historial alimenta el resumen de producción, cuentas y sanidad.
- Medida inicial: completar el acceso a una opción de registro sin depender de términos administrativos; la medición real de tiempo y abandono queda como pregunta abierta porque no hay telemetría de uso disponible.
- Comportamiento que se conserva: APIs, formularios, cola sin conexión, historial, confirmación destructiva, sistema visual y rutas existentes.

## Contenido y datos

- Fuentes: labores agrícolas, ordeños, traslados, diagnósticos, tratamientos, controles y transacciones ya cargados por `useRegistroOperativo`.
- Jerarquía: propósito en lenguaje cotidiano → elección de lo que se quiere anotar → formulario → resumen calculado → historial y recuperación.
- Casos: carga, vacío, error recuperable, guardado pendiente, modo sin conexión y eliminación confirmada.
- Locale: español de Colombia; moneda, números y fechas en `es-CO`.
- Límites: el resumen depende de lo que se haya anotado y no reemplaza la valoración de un veterinario ni una contabilidad formal.

## Dirección visual

- Dirección: campesina, directa, sobria, táctil y confiable.
- Razón: la página se usa como herramienta de trabajo; las acciones deben dominar sobre la decoración y los resultados deben explicar su origen.
- Reutilización: tokens `vl-*`, `Button`, formularios y modales actuales, colores semánticos, iconos de la aplicación.
- Evitar: jerga como título principal, tarjetas decorativas sin acción, gradientes nuevos, texto esencial truncado y movimiento sin propósito.

## Patrones aplicados como hipótesis

1. `read-act-transfer-zones` (`verified-in-series`): separar claramente “anotar” de “ver cómo va la finca”. Beneficio esperado: el usuario distingue la acción inmediata del resultado. Riesgo: aumentar la longitud; se mitiga con orden móvil y columna lateral en escritorio.
2. `states-are-instruction` (`verified-in-series`): explicar carga, error, ausencia de registros, modo sin señal y eliminación. Beneficio esperado: la persona sabe qué pasó y cómo continuar. Riesgo: exceso de avisos; solo se muestran cuando aplican.
3. `traceability-visible-across-artifacts` (`verified-in-series`): declarar que los indicadores se calculan con lo anotado. Beneficio esperado: da una razón concreta para registrar cada jornada. Riesgo: interpretar el resumen como cifra oficial; se aclara su alcance.

## Responsive e interacción

- Móvil 320–767 px: propósito breve, acciones antes del resumen, botones táctiles de al menos 44 px y contenido apilado sin overflow horizontal.
- Tablet: acciones en cuadrícula y resumen en dos columnas.
- Escritorio 1440–2560 px: zona de registro principal y columna secundaria con resumen, sin estirar el contenido legible.
- Accesibilidad: objetivo WCAG 2.2 AA; HTML semántico, foco visible, nombres accesibles y operación por teclado.
- Rendimiento: no agregar dependencias ni medios; mantener LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 cuando existan métricas de campo.
- Pruebas: lógica del resumen, contenido visible, type-check, build, auditoría web y recorrido real a 320, 390, 768, 1440, 1920 y 2560 px.

## Preguntas abiertas

- No existe todavía telemetría que permita confirmar qué registro se usa más o dónde se abandona el formulario.
- La cantidad de diagnósticos abiertos depende de la cobertura y calidad de los registros históricos disponibles.
