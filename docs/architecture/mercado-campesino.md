# Mercado campesino: publicaciones y acuerdos directos

## 01_PLAN y 02_PRD

Mejorar el módulo existente como punto de encuentro entre productores registrados. La plataforma conserva publicaciones, conversaciones y acuerdos; las personas coordinan pago y entrega. No crea cobros, pedidos financieros ni garantías de cumplimiento.

Criterios de aceptación (Dado / Cuando / Entonces):

- Dado un usuario activo con finca, cuando publica una venta, compra o trueque y acepta compartirla, entonces otros usuarios activos pueden encontrar exclusivamente su ficha pública. Una publicación anterior no adquiere visibilidad comunitaria automáticamente.
- Dado un formulario vacío, cantidades no positivas, números no finitos, fecha vencida o trueque sin producto solicitado, cuando se envía, entonces el servidor rechaza con 400 y señala el campo.
- Dado otro autor, cuando intenta cambiar una publicación o consultar una conversación ajena, entonces recibe 403/404 sin datos privados. La pertenencia a una finca se comprueba en base de datos.
- Dada una publicación activa, cuando una persona inicia dos veces una conversación, entonces obtiene la misma conversación. Cada envío conserva una clave idempotente y los reintentos no duplican mensajes.
- Dada una conversación, cuando una persona propone condiciones y la otra acepta, entonces el historial conserva ambas acciones y las condiciones. El proponente no puede aceptar su propia propuesta.
- Dado un acuerdo aceptado, cuando solo una persona confirma la entrega, entonces queda pendiente la otra. Solo dos confirmaciones producen el estado completado. Cancelar o bloquear conserva el historial.
- Dadas versiones desactualizadas o acciones simultáneas incompatibles, cuando se intenta cambiar el estado, entonces se rechaza con 409 y se solicita actualizar.
- Dada una publicación pausada, cerrada o vencida, cuando alguien intenta iniciar contacto nuevo, entonces no se crea una conversación.
- Dado un teléfono no compartido, cuando otra persona explora una publicación, entonces ese teléfono no aparece en la respuesta. Solo se puede compartir voluntariamente con interlocutores.
- Dada una conexión interrumpida, cuando falla un envío, entonces el texto permanece y nunca aparece como confirmado.

## 03_USER_FLOWS

Explorar → buscar producto o municipio/vereda → filtrar Venta / Compra / Trueque y categoría → ver publicación → escribir al productor → conversación privada → proponer cantidad, valor o trueque, lugar y fecha → aceptar → coordinar el intercambio → confirmación de cada participante.

Mis publicaciones → publicar / editar / pausar / cerrar / reactivar. Mis intercambios → pendientes y conversaciones anteriores. Seguridad → reportar publicación y bloquear contacto; moderación restringida al administrador del sistema.

Estados de interfaz: carga con esqueletos, vacío con acción contextual, éxito anunciado y error visible con reintento. Formularios conservan contenido tras errores. Navegación y formularios desde 320 px, controles de al menos 44 px.

## 04_TRD

Separación por capacidad en `backend/app/marketplace/` y `frontend/src/features/marketplace/`. El modelo existente MarketOffer se extrae de campesino.py conservando su importación compatible. Rutas específicas reemplazan el CRUD genérico para cerrar vías de escritura sin autoría. UUID en contratos externos; claves internas existentes se conservan.

La comunidad comparte solo publicaciones con consentimiento expreso. Conversaciones y eventos se autorizan por participante; la finca se valida al acceder y al publicar. Los nuevos datos no pasan por el chat general, que permanece limitado a la misma finca. Las escrituras usan transacciones, bloqueo de fila, versión e idempotencia persistente. El cliente utiliza el transporte e invalidación centralizados, evita cola offline y revalida al volver a la pantalla y periódicamente mientras está visible.

## 05_SQL

Migración aditiva y reversible: identificador público, visibilidad comunitaria, categoría, producto solicitado y consentimiento de contacto en market_offers; tablas para conversaciones, eventos y reportes. Respaldo previo obligatorio antes de aplicar en PostgreSQL. No se reasigna autoría histórica. No se expone información de otras fincas por los serializadores genéricos.

## 06_STITCH y diseño

Estilo: tarjetas de producto con jerarquía Material Design, superficies sólidas del tema y acento verde agrícola. Encabezado útil, navegación de tres espacios, filtros que se reorganizan por ancho, precio y unidad completos. El contenido proviene de la base de datos; sin publicaciones ficticias.

## 07_AISTUDIO y límites

Implementación en React/TypeScript y Flask/SQLAlchemy existentes, sin incorporar servicios externos. Fotos y adjuntos requieren un flujo de almacenamiento y moderación específico y quedan fuera de esta entrega; la ficha admite descripción detallada. No se muestran calificaciones, verificaciones personales ni garantías inventadas.
