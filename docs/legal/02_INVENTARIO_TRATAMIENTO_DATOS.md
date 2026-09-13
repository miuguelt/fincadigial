# Inventario inicial de tratamiento de datos — VillaLuz

Este inventario es una base para completar y aprobar. “Por confirmar” es un bloqueo de gobierno, no una autorización para desplegar.

| Categoría | Ejemplos observados | Finalidad que debe definirse | Riesgo | Retención/borrado |
|---|---|---|---|---|
| Identificación y cuenta | identificación, nombre, correo, teléfono, dirección, rol, estado | autenticación, administración y soporte | alto | por definir |
| Organización/finca | finca, ubicación, productores y responsables | operación multi-tenant | alto | por definir |
| Ubicación | latitud, longitud, precisión, método, fecha | operación de campo y trazabilidad | alto | por definir y minimizar |
| Profesionales | tarjeta, autoridad, ICA, póliza, universidad, verificación | validar rol y credenciales | alto | por definir |
| Archivos e imágenes | avatar, fotos de finca/animales, adjuntos, audio, certificados | gestión documental y soporte | alto | por definir; acceso privado |
| Comunicaciones | mensajes de chat, destinatarios, lectura | colaboración y soporte | alto | por definir |
| Auditoría | actor, acción, entidad, IP/metadatos si se agregan | seguridad, trazabilidad y soporte | medio/alto | por definir |
| Sanidad animal | tratamientos, vacunación, enfermedad, peso, observaciones | historial pecuario y apoyo veterinario | alto | por definir; separar de persona |
| Económico | costos, inventarios, ventas o pagos si se habilitan | gestión financiera | alto | por definir |
| Offline/dispositivos | nodos, PIN, paquetes, colas y metadatos | continuidad rural y sincronización | alto | por definir; cifrado |
| Telemetría | errores, analítica, notificaciones, Sentry si aplica | seguridad y mejora | medio/alto | minimizar y anonimizar |

## Campos que faltan completar

- Responsable y NIT.
- Fuente de cada dato y autorización aplicable.
- Base jurídica por finalidad.
- Usuarios autorizados y roles que pueden consultar cada categoría.
- Proveedores, países y transferencias/transmisiones.
- Plazo de conservación, respaldo y destrucción.
- Procedimiento de exportación, corrección, supresión y revocatoria.
- Tratamiento de menores, imágenes y datos biométricos si llegaran a habilitarse.
