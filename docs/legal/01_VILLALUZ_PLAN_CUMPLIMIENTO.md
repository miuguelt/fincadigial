# Plan de cumplimiento de VillaLuz

Fecha de corte: 10 de septiembre de 2026. Este plan parte de una revisión estática del repositorio y no sustituye una prueba de penetración, una revisión contractual ni un concepto jurídico formal.

## Veredicto inicial

VillaLuz es una aplicación multi-tenant para gestión de fincas con usuarios, identificación, correo, teléfono, dirección, ubicación, fotos, archivos, chat, bitácoras, datos económicos y registros sanitarios/veterinarios. Por ello se clasifica provisionalmente como **P2** y puede pasar a **P3** si se ofrece con pagos, a entidades públicas/educativas, a menores, o como integración oficial.

**Estado:** no apta para captar datos reales y no apta para producción pública hasta completar los bloqueadores P0.

El equipo informa que existe aprobación directiva del SENA como producto técnico-pedagógico. Se reconoce como antecedente institucional pendiente de acta/acto verificable, delimitación de alcance y autorización independiente de tratamiento de datos reales y salida a producción.

Como la aplicación se proyecta para SENA, este plan debe leerse junto con el [perfil jurídico SENA](06_SENA_PERFIL_JURIDICO_Y_REQUISITOS.md), la [matriz de evidencias](08_MATRIZ_CUMPLIMIENTO_SENA.md), el [anexo contractual](09_ANEXO_CONTRACTUAL_SENA_DATOS_SOFTWARE.md) y el [procedimiento de alta institucional](10_PROCEDIMIENTO_ALTA_SENA.md).

## Progreso técnico documentado — 10 de septiembre de 2026

Se implementaron controles iniciales, todavía sujetos a validación jurídica, operativa y de seguridad:

- los registros públicos exigen aceptación separada de aviso de privacidad y términos, con versión, fecha UTC, hash del texto/purpose y fuente almacenados en `user_consents`;
- se publicaron rutas versionadas para los documentos legales (`/legal/privacidad` y `/legal/terminos`), aunque la identidad completa del responsable y los datos de contacto siguen pendientes;
- los archivos servidos por las rutas de imágenes requieren una URL firmada de corta duración y se entregan con `Cache-Control: private, no-store`;
- se añadieron pruebas automatizadas de consentimiento y de firma de URLs privadas;
- el CI dejó de ignorar los fallos de las pruebas backend.

Estos cambios reducen riesgos técnicos concretos, pero no equivalen a una autorización jurídica completa: el manifiesto de cumplimiento debe permanecer en `blocked` hasta cerrar la identidad del responsable, derechos de titulares, retención, proveedores/transferencias, aislamiento multi-tenant, respaldos, incidentes, secretos, IP y las pruebas de despliegue en Coolify.

## Plan por fases

### Fase 0 — Contención inmediata

1. Mantener el VPS en prueba o cerrado a datos reales.
2. Desactivar o proteger la exposición pública de `static/uploads` y cualquier URL de imágenes, chat, documentos, audio, certificados y ubicaciones.
3. Rotar secretos históricos y de producción; revisar la historia Git, no solo el estado actual.
4. No crear usuarios de demostración con cédulas, teléfonos, correos o datos veterinarios reales.
5. Aclarar que los registros de SINIGAN son auxiliares y no sustituyen la plataforma oficial del ICA.

### Fase 1 — Gobierno de datos

1. Definir persona natural o jurídica responsable, NIT, domicilio, correo de privacidad y responsable interno.
2. Completar el inventario de datos por tabla, campo, finalidad, base jurídica, origen, acceso, retención y borrado.
3. Reescribir la política para cubrir cuentas, ubicación, archivos, fotos, chat, notificaciones, analítica, soporte, credenciales profesionales, pagos y datos veterinarios.
4. Publicar un aviso corto en cada formulario y una política enlazada antes del envío.
5. Separar aceptación de términos, autorización de tratamiento, comunicaciones comerciales, ubicación, notificaciones y uso de fotos.
6. Implementar consulta, reclamo, actualización, corrección, exportación, supresión y revocatoria con trazabilidad.
7. Determinar si procede inscripción en RNBD según el tipo de responsable, activos y bases administradas; conservar el análisis aunque no resulte obligatoria.

### Fase 2 — Aplicación y seguridad

1. Sustituir tokens persistentes en `localStorage` por cookies protegidas o un diseño equivalente con rotación, revocación y protección CSRF.
2. Aplicar autorización de finca/organización en cada endpoint y prueba de intento de acceso cruzado.
3. Proteger archivos con autorización servidor a servidor o URLs firmadas; retirar rutas públicas genéricas.
4. Añadir MFA para administradores, bloqueo/limitación de intentos, recuperación segura y sesiones revocables.
5. Cifrar respaldos y archivos de alto riesgo; minimizar contenido en logs.
6. Firmar o autenticar paquetes offline; el PIN `1234` y los intercambios sin firma/cifrado no son aceptables para ubicación, sanidad o finanzas.
7. Corregir vulnerabilidades de dependencias, habilitar el fallo real del CI y añadir análisis de secretos, dependencias y contenedores.

### Fase 3 — Contrato y sector

1. Publicar términos de uso con identidad del proveedor, alcance de la licencia SaaS, disponibilidad, soporte, cobro, cancelación, suspensión, datos, contenidos subidos, propiedad intelectual, jurisdicción y mecanismo de cambios.
2. Formalizar contratos con proveedor de VPS, base de datos, correo, analítica, monitoreo, almacenamiento y soporte; documentar subencargados y países.
3. Si existe relación con SENA, institución educativa, entidad pública o menores, aprobar el instrumento contractual y controles adicionales antes de recibir datos.
4. Implementar controles de credenciales veterinarias: estado de verificación, autoridad, fecha de comprobación, evidencia y límites de uso.
5. Mantener leyenda expresa: la aplicación es apoyo de gestión; no es diagnóstico, fórmula, certificación oficial ni plataforma ICA/SINIGAN salvo autorización e integración documentada.

### Fase 4 — Operación Coolify

1. Configurar dominio, TLS, red privada, puertos mínimos y acceso SSH restringido.
2. Inyectar secretos únicamente desde Coolify; no usar valores por defecto.
3. Ejecutar base de datos y Redis sin publicación pública; aplicar mínimo privilegio.
4. Respaldar base y archivos fuera del VPS, cifrados, con retención y restauración probada.
5. Definir RPO/RTO, monitoreo, alertas, bitácora de accesos administrativos y rotación de credenciales.
6. Probar restauración, revocación, borrado de un titular, incidente de archivo y recuperación de una finca.

## Criterio de cierre

La liberación requiere evidencia de cada fase, aprobación del responsable del tratamiento y ejecución satisfactoria del control `Release`.
