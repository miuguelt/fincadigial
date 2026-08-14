# Aprendizaje verificable de interfaz

## Chat interno — 2026-08-12

- **Patrón aplicado:** `states-are-instruction` (`verified-in-series`). Se eligió porque un chat de campo necesita explicar pendiente, entregado, leído, offline y sin permiso; ocultar esas diferencias produjo acciones desaparecidas y falsa sensación de tiempo real.
- **Fuente:** catálogo canónico de patrones DevBrain y comportamiento observado en `/admin/users` y `/chat`.
- **Beneficio esperado:** el personal entiende quién está disponible, qué ocurrió con cada mensaje y cómo se recuperará ante un corte.
- **Riesgo controlado:** exceso de indicadores. Se limita a iconos compactos con nombre accesible y explicación mediante título/estado visible.
- **Evidencia inicial:** 29 perfiles visibles, 8 contactos devueltos por la consulta heredada y contrato SSE incompatible entre backend y frontend.
- **Decisión de promoción:** ninguna. Es una aplicación de un patrón existente, no evidencia nueva suficiente para modificar el catálogo global.
- **Resultado verificado:** 29/29 perfiles muestran una acción de chat; 17 están habilitadas por membresía activa compartida y 12 quedan deshabilitadas con una explicación concreta (incluido el perfil propio).
- **Evidencia responsive:** conversación comprobada en 320, 390, 768, 1440, 1920 y 2560 px sin desbordamiento horizontal; en móvil se retiró la acción flotante global que cubría el botón de envío.
- **Evidencia funcional:** 4 pruebas backend y 9 frontend en verde, compilación de producción correcta, SSE conectado y consola del navegador sin errores ni advertencias.
- **Resultado del patrón:** `states-are-instruction` eliminó la ambigüedad de “botón desaparecido” y convirtió restricciones reales de seguridad en estados visibles y comprensibles.
