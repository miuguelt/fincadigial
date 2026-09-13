# Reglas mínimas de cumplimiento legal para software en Colombia

Versión 1.0 — 10 de septiembre de 2026

Estas reglas son una compuerta de ingeniería y gestión de riesgos. No sustituyen la revisión de un abogado colombiano ni convierten por sí solas un proyecto en "certificado" o jurídicamente inmune.

## 1. Regla de clasificación antes de programar

Todo proyecto debe declarar su perfil antes de captar datos:

- **P0 — Sin datos personales:** sitio informativo sin formularios, cuentas, analítica identificable ni archivos de usuarios.
- **P1 — Datos personales:** registro, autenticación, contacto, ubicación, fotografías, identificadores, actividad o trazas asociables a una persona.
- **P2 — Datos de alto riesgo o sector regulado:** menores, biometría, salud humana, datos financieros, geolocalización precisa, información laboral/educativa, animales vinculados a personas, pagos o decisiones automatizadas.
- **P3 — Servicio comercial, público o crítico:** cobro, comercio electrónico, entidad pública, proveedor de una entidad pública, interoperabilidad oficial, operación esencial o tratamiento masivo.

Se aplican todas las reglas del perfil más alto alcanzado. Nunca se deduce que un dato "no es sensible" solo porque la interfaz no lo llame así.

## 2. Documentos obligatorios de cada proyecto

Antes de producción debe existir, versionado y aprobado por el responsable:

1. Identidad del responsable: nombre legal, NIT o identificación, domicilio, correo de privacidad y encargado interno.
2. Inventario de datos, finalidades, base jurídica, origen, destinatarios, país de alojamiento, plazo de conservación y eliminación.
3. Aviso de privacidad visible antes de enviar el primer dato.
4. Política de tratamiento de datos completa y mecanismo de consultas, reclamos, actualización, rectificación, supresión y revocatoria.
5. Evidencia de autorización previa, expresa e informada cuando sea necesaria, con versión, fecha, finalidad, titular, medio y texto aceptado.
6. Términos de uso o contrato de servicio, incluyendo identidad del proveedor, alcance, precio si existe, soporte, cancelación, suspensión, propiedad intelectual, disponibilidad y límites legales.
7. Registro de encargados, subencargados, transferencias y transmisiones internacionales.
8. Matriz de retención, borrado, anonimización, copias de seguridad y restauración.
9. Plan de incidentes y evidencia de pruebas periódicas.
10. Registro de licencias de software, contenidos, marcas, fuentes, imágenes y asignaciones de derechos de los desarrolladores.

## 3. Reglas de captación

- La finalidad debe ser concreta, necesaria y separada por propósito.
- El registro esencial no puede quedar condicionado a marketing, geolocalización opcional, notificaciones no indispensables o cesiones no necesarias.
- Los consentimientos opcionales deben ser independientes y revocables.
- El formulario debe permitir acceder a la política y conservar la versión aceptada.
- Si hay menores, el proyecto necesita flujo de edad, representación legal, interés superior y control reforzado; no se resuelve con una casilla genérica.
- No se deben pedir datos que no sean necesarios para el servicio.

## 4. Reglas de almacenamiento y consulta

- Autenticación fuerte, autorización por rol y por organización o finca en cada operación del servidor.
- Cifrado en tránsito y, cuando el riesgo lo justifique, en reposo, copias y archivos.
- Separación estricta de ambientes, bases, cuentas de servicio y secretos.
- No almacenar tokens de larga duración en `localStorage` si pueden protegerse con cookies `HttpOnly`, `Secure`, `SameSite` y protección CSRF.
- Los archivos privados no pueden servirse desde rutas públicas; usar autorización, URL firmada de corta duración o un proxy que verifique permisos.
- Minimizar datos en registros, trazas, telemetría, errores y analítica.
- Definir retención y borrado real; el borrado lógico sin atención a copias, índices, exportaciones y archivos no equivale a supresión completa.
- Todos los accesos sensibles deben quedar auditados sin registrar secretos ni contenido innecesario.

## 5. Reglas para VPS, Docker y Coolify

- Publicar solo 80/443 y el puerto de administración estrictamente restringido; no publicar PostgreSQL, Redis, paneles ni almacenamiento.
- Usar TLS válido, red privada para base de datos y Redis, volúmenes persistentes separados y secretos gestionados por Coolify.
- No incluir secretos, contraseñas por defecto, respaldos ni archivos de usuarios en la imagen Docker.
- Aplicar actualizaciones del host, imágenes y dependencias; escanear vulnerabilidades y generar SBOM.
- Respaldos cifrados, fuera del VPS, con retención, control de acceso y prueba documentada de restauración.
- Monitorear disponibilidad, errores, accesos administrativos, saturación, almacenamiento y eventos de seguridad.
- Definir RTO/RPO, contacto de incidentes y procedimiento de aislamiento/revocación de credenciales.

## 6. Compuerta de liberación

Un proyecto queda **NO APTO PARA PRODUCCIÓN** si falta cualquiera de estos puntos:

- responsable identificado y contacto de privacidad;
- aviso/política visible y consentimiento trazable cuando aplique;
- exportación, corrección, supresión y revocatoria probadas;
- archivos privados protegidos;
- aislamiento de organizaciones o tenencias probado;
- secretos rotados y fuera del repositorio;
- respaldos cifrados y restauración probada;
- plan de incidentes y proveedores documentados;
- revisión de licencias y derechos de autor;
- aceptación electrónica conservada y términos publicados.

## 7. Ciclo de vida legal y continuidad para IA

La revisión no empieza en el despliegue. Debe ejecutarse en descubrimiento, diseño, implementación, verificación, liberación, operación y cambios posteriores. Un cambio activa reauditoría si agrega o modifica campos/endpoints, población, roles, proveedor, país, región, IA externa, analítica, geolocalización, archivos, pagos, integración oficial, marca, licencia, política, retención, contrato o autenticación.

El proyecto debe declarar los perfiles funcionales aplicables en `docs/legal/COMPLIANCE_MANIFEST.json`: datos personales o sensibles, menores, geolocalización, salud/veterinaria, educación, entidad pública, archivos, sincronización offline, transferencia internacional, IA externa, pagos, integración oficial y propiedad intelectual/marca.

El archivo `docs/legal/LEGAL_IMPLEMENTATION_STATE.json` es la memoria estructurada para que otra IA continúe: contiene veredicto, pendientes, responsables, cómo obtener evidencia, rutas, comandos y prohibiciones. No se deben inventar actas, contratos, identidades, hashes, proveedores, bases jurídicas o autorizaciones. La licencia MIT no autoriza por sí sola datos, marca SENA, hosting ni integraciones oficiales.

## 8. Regla de evidencia y decisión humana

Cada control debe asociarse a evidencia operativa o documental con fecha, responsable, ruta/enlace y, si aplica, hash. Un archivo con el nombre correcto o un valor `true` no es prueba suficiente. P2/P3, entidad pública, menores, datos sensibles, transferencias, IA externa, pagos e integraciones oficiales requieren revisión humana sectorial. El agente debe informar `PASS`, `WARN`, `BLOCKER`, riesgo residual y decisión pendiente sin afirmar certificación legal.

## Fuentes normativas de referencia

- Ley 1581 de 2012 y Decreto 1074 de 2015: protección de datos personales.
- Ley 1480 de 2011: protección del consumidor cuando el servicio se ofrece comercialmente.
- Ley 527 de 1999: mensajes de datos, comercio electrónico y aceptación electrónica.
- Ley 1273 de 2009: protección penal de la información y de los datos.
- Ley 23 de 1982, Ley 44 de 1993 y Decreto 1066 de 2015: derecho de autor y registro de software.
- Ley 576 de 2000 y reglas del ICA: cuando el producto procese información o servicios relacionados con medicina veterinaria, trazabilidad o movilización animal.
- Resolución MinTIC 500 de 2021 y sus modificaciones: referencia reforzada cuando el proyecto sea público o proveedor de una entidad pública.
