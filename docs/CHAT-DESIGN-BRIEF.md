# Contrato de corrección del chat interno

## Resultado

- **Producto/pantallas:** personal de la finca, chat rápido, chat completo y alertas globales.
- **Usuario principal:** integrante autenticado de una finca, incluido personal multi-finca.
- **Trabajo principal:** iniciar y mantener una conversación privada con otro integrante activo de la finca sin perder mensajes durante cortes de red.
- **Éxito observable:** todo contacto válido muestra una acción de chat; un mensaje aparece en el receptor sin recargar, actualiza el contador y genera una alerta contextual; al abrirlo, el remitente recibe el estado leído.
- **Comportamiento que se conserva:** diseño actual, español de Colombia, adjuntos, nodo local, cola offline y navegación a `/chat`.

## Contenido y datos

- **Fuente de verdad:** `user_finca` para membresías activas, `chat_messages` para conversaciones, Redis/SSE para eventos y almacenamiento local únicamente como caché/bandeja de salida por usuario.
- **Jerarquía:** contacto y disponibilidad → conversación → contenido y hora → estado pendiente/entregado/leído → recuperación ante error u offline.
- **Límites:** no se habilita conversación entre usuarios que no compartan una finca activa; el botón permanece visible pero explica el motivo cuando está deshabilitado.
- **Locale:** `es-CO`; textos completos, sin truncar nombres o mensajes esenciales.

## Dirección visual

- **Dirección:** operativa, sobria, inmediata y accesible.
- **Reutilización:** `Button`, `Badge`, `ToastContext`, paneles y tokens existentes.
- **Patrón aplicado:** `states-are-instruction`; los estados pendiente, entregado, leído, offline, sin permiso y error deben ser explícitos y recuperables.
- **Evitar:** rediseño decorativo, nuevos sistemas de color, datos ficticios y botones que parezcan disponibles cuando el servidor los rechazará.

## Responsive y accesibilidad

- Prioridad móvil: conversación e input; lista/contactos mediante el comportamiento existente.
- Mantener operación por teclado, nombres accesibles, foco visible y regiones `aria-live` para actualizaciones asíncronas.
- Verificar 320, 390, 768, 1440, 1920 y 2560 px sin overflow horizontal y con nombres largos.

## Estados

- **Carga:** indicador existente mientras se consultan contactos o historial.
- **Vacío:** invitación clara a iniciar conversación.
- **Error:** conservar borrador/mensaje pendiente y ofrecer recuperación automática.
- **Éxito:** mensaje confirmado como entregado.
- **Deshabilitado:** usuario propio, inactivo o sin finca compartida, con explicación.
- **Offline:** mensaje persistido por usuario y reenviado con identificador idempotente.

## Contrato de calidad

- WCAG 2.2 AA como objetivo.
- Contratos tipados para mensajes y eventos.
- Pruebas backend de membresía, aislamiento, lectura e idempotencia; pruebas frontend de cola, eventos y contadores.
- Verificación en navegador de contactos, chat rápido/completo, consola, foco, alertas y responsive.
- Sin excepciones previstas.
