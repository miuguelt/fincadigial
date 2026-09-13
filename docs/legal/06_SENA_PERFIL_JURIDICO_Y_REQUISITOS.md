# Perfil jurídico y técnico SENA para VillaLuz

Fecha de corte: 10 de septiembre de 2026.

Este documento se activa porque VillaLuz se proyecta para uso del Servicio Nacional de Aprendizaje — SENA. El equipo informa que la aplicación ya fue aprobada por una directiva como producto técnico-pedagógico; esa aprobación debe documentarse y delimitarse. No autoriza por sí misma el uso del nombre, escudo, datos, sistemas o infraestructura del SENA, ni equivale automáticamente a autorización de producción con datos reales. Mientras no exista evidencia documental y aprobación operativa complementaria, VillaLuz debe operar únicamente con datos ficticios o anonimizados.

## 1. Calificación jurídica de la relación

### Aprobación pedagógica frente a autorización operativa

La aprobación de la solución como producto técnico-pedagógico acredita, si consta en acta o acto competente, que el SENA reconoce su utilidad formativa. Para desplegarla captando datos reales se requiere además formalizar responsable/encargado, finalidades, población, infraestructura, seguridad, archivo, retención, contratación y aceptación de producción. La [evidencia requerida y su formato](11_EVIDENCIA_APROBACION_SENA.md) queda definida en este repositorio.

El SENA es un establecimiento público del orden nacional, con personería jurídica, autonomía administrativa y patrimonio propio, adscrito al Ministerio del Trabajo. La relación no debe tratarse como una aplicación privada común.

## Interruptores técnicos de protección

El perfil Coolify queda preparado como despliegue provisional: `SENA_INSTITUTIONAL_MODE=provisional_not_authorized`, `LEGAL_RELEASE_APPROVED=false`, `AUTH_COOKIE_ONLY=true`, `VITE_USE_BEARER_AUTH=false`, `JWT_COOKIE_CSRF_PROTECT=true` y `DATA_COLLECTION_ENABLED=false`. Así puede levantarse para revisión técnica o datos sintéticos, pero no debe operar como servicio institucional de captación.

Solo después de la autorización operativa, el acta de liberación, el acuerdo de tratamiento y el cierre de la matriz se habilita `DATA_COLLECTION_ENABLED=true`; la aplicación seguirá exigiendo además el modo institucional autorizado y `LEGAL_RELEASE_APPROVED=true` para aceptar la salida.

La asignación de roles debe quedar así, salvo concepto jurídico distinto dentro del contrato:

| Rol | Asignación prevista | Evidencia necesaria |
|---|---|---|
| Responsable del tratamiento | SENA, si determina las finalidades y medios institucionales | contrato/convenio, política SENA y acta del dueño del proceso |
| Encargado del tratamiento | proveedor de VillaLuz y subcontratistas tecnológicos | cláusula o anexo de tratamiento de datos |
| Operador funcional | dependencia, regional o centro de formación autorizado | acto, designación o acta de puesta en operación |
| Proveedor de infraestructura | proveedor del VPS/Coolify/hosting que tenga acceso técnico | contrato, ubicación de datos, subencargados y SLA |
| Titulares | aprendices, instructores, funcionarios, contratistas, campesinos, veterinarios y demás usuarios autorizados | inventario de titulares y finalidades |

No se debe presentar a VillaLuz como plataforma oficial del SENA, ni usar marca, logo, dominios, integraciones o bases de datos institucionales, sin autorización escrita.

## 2. Normas y políticas adicionales que deben incorporarse

1. Ley 1581 de 2012, Decreto 1074 de 2015 y política de tratamiento de datos del SENA.
2. Acuerdo 009 de 2016 y Acuerdo 013 de 2019 del SENA, o la versión institucional vigente que los sustituya.
3. Política General de Seguridad de la Información y Protección de Datos del SENA.
4. Resolución 500 de 2021 de MinTIC y su Anexo MSPI vigente, incluida la actualización que el SENA determine aplicable.
5. Ley 1712 de 2014 y Resolución 1519 de 2020 para transparencia, seguridad digital, datos abiertos y accesibilidad web.
6. Ley 594 de 2000, instrumentos archivísticos y tabla de retención documental del SENA. Los registros institucionales no pueden borrarse únicamente porque el usuario pulse “eliminar cuenta”.
7. Ley 80 de 1993, Ley 1150 de 2007, Decreto 1082 de 2015, manual de contratación y lineamientos internos del SENA para adquirir o contratar la solución.
8. Ley 527 de 1999 para mensajes de datos, aceptación electrónica y trazabilidad.
9. Régimen de derechos de autor y licencias de software. El SENA debe aprobar el licenciamiento, titularidad, código entregable y componentes de terceros.
10. Reglas reforzadas para datos de menores de edad, si participan aprendices menores de 18 años.

## 3. Qué debe conseguirse antes de recibir datos del SENA

### A. Patrocinio institucional

Obtener de un centro, regional o dependencia del SENA:

- nombre del dueño del proceso;
- dependencia responsable;
- población objetivo;
- finalidad institucional concreta;
- alcance territorial;
- sistemas SENA con los que se integrará;
- clasificación de la información;
- autorización para piloto;
- responsable de seguridad, privacidad, archivo y contratación.

Cómo conseguirlo: solicitar una reunión formal con el patrocinador del SENA y levantar un acta de alcance. El patrocinador debe remitir el caso a la Oficina de Sistemas, jurídica, protección de datos, seguridad de la información, archivo y contratación. Una aprobación verbal no es suficiente.

### B. Contrato o convenio

El expediente contractual debe definir como mínimo:

- objeto y alcance de VillaLuz;
- rol de SENA como responsable y del proveedor como encargado;
- instrucciones documentadas del tratamiento;
- datos y categorías de titulares;
- finalidades y prohibición de reutilización;
- confidencialidad y reserva;
- subencargados y autorización previa;
- ubicación física y lógica de los datos;
- soporte, disponibilidad, RPO y RTO;
- auditoría, evidencias y derecho de inspección;
- incidentes, tiempos de aviso y cooperación;
- retorno, migración, borrado y certificación de eliminación;
- propiedad del código, configuraciones, documentación y datos;
- continuidad, reversibilidad y salida de Coolify;
- tratamiento de ambientes de desarrollo y pruebas;
- accesibilidad, seguridad, pruebas y aceptación;
- uso autorizado de marca, nombre y logos del SENA.

Cómo conseguirlo: preparar el anexo contractual de este repositorio y entregarlo al área jurídica/contratación del SENA para que lo convierta en cláusulas contractuales o anexo técnico. No basta con publicar términos de uso en la aplicación.

### C. Aprobación tecnológica

Obtener aprobación escrita de la Oficina de Sistemas o área competente sobre:

- arquitectura Docker/Coolify;
- modelo de red;
- ubicación del VPS, base de datos y backups;
- autenticación y federación, si aplica;
- integración con sistemas oficiales;
- gestión de secretos;
- pruebas de penetración y vulnerabilidades;
- monitoreo y atención de incidentes;
- eliminación de datos de prueba;
- continuidad y recuperación.

Cómo conseguirlo: entregar el diagrama de arquitectura, threat model, matriz de datos, SBOM, informe de escaneo de imágenes, plan de backups y resultados de pruebas.

### D. Aprobación de privacidad

SENA debe aprobar o indicar cuál aviso, autorización y política institucional deben aparecer. VillaLuz no puede reemplazar la política oficial del SENA con un texto propio incompatible.

La casilla de consentimiento no sustituye el contrato, la competencia legal ni la instrucción documentada del SENA. Para cada finalidad, Jurídica y Privacidad deben definir si aplica una función legal/institucional, una autorización del titular u otra base válida. Las finalidades opcionales —por ejemplo comunicaciones comerciales, publicación de fotografías, ubicación precisa o analítica— deben mantenerse separadas y ser revocables.

El formulario debe separar, según corresponda:

- tratamiento necesario para la función institucional;
- comunicaciones opcionales;
- geolocalización;
- fotografías y publicación;
- notificaciones;
- analítica;
- integración o transferencia a terceros.

La aplicación debe conservar evidencia de la versión del aviso, texto/hash, fecha, origen, usuario, finalidad y revocatoria.

### E. Archivo y retención

El SENA debe determinar qué registros son documentos institucionales, cuál es su serie/subserie, tiempo de retención, disposición final y repositorio oficial. VillaLuz no debe convertirse por defecto en el archivo histórico oficial ni destruir registros sujetos a conservación.

Cómo conseguirlo: solicitar concepto del responsable de gestión documental y asociar cada tabla/evento a la TRD o instrumento archivístico aplicable. Para documentos oficiales, evaluar integración o transferencia al repositorio institucional autorizado, incluido el Archivo Electrónico SENA cuando corresponda.

## 4. Perfiles de riesgo de VillaLuz para SENA

| Tratamiento | Riesgo | Control obligatorio |
|---|---|---|
| Identificación, correo, teléfono y dirección | suplantación y exposición | minimización, cifrado, acceso por rol, logs y DSAR |
| Ubicación y geolocalización | seguimiento físico | finalidad específica, precisión mínima, base legal, retención corta |
| Fotos y archivos | exposición pública y metadatos | URLs firmadas, no indexación, antivirus, límites y borrado |
| Chat y asistencia | información sensible y reserva | acceso por necesidad, moderación, retención y exportación |
| Datos de aprendices menores | interés superior y autorización reforzada | verificación de edad, representante cuando corresponda, no perfiles comerciales |
| Datos veterinarios o de salud | posible dato sensible o información profesional | no diagnóstico automático, acceso restringido, advertencias y trazabilidad |
| Datos offline | pérdida o copia no controlada | cifrado, firma, expiración, bloqueo remoto y borrado seguro |
| Reportes e indicadores | reidentificación | agregación, anonimización y revisión antes de publicar |

## 5. Condiciones de lanzamiento SENA

No se puede declarar “aprobado” hasta tener: contrato/convenio, responsable identificado, concepto de privacidad, aprobación tecnológica, matriz de retención, pruebas de seguridad, auditoría de accesibilidad, plan de incidentes, backup restaurado, revisión de licencias, control de subencargados y acta de aceptación del piloto.
