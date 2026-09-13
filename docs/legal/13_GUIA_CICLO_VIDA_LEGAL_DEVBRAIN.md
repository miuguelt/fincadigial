# Guía de responsabilidad legal en el ciclo de vida DevBrain

## Propósito

Esta guía convierte las obligaciones legales y de responsabilidad técnica en actividades verificables del desarrollo. Se aplica a VillaLuz y sirve como modelo para cualquier proyecto que diseñe, capte, almacene, consulte, comparta, exporte o elimine datos.

No es una certificación ni reemplaza al abogado, al responsable del tratamiento, al oficial de privacidad, al área de contratación, al archivo, a seguridad de la información o al dueño institucional del proceso. DevBrain debe demostrar evidencia y detener la liberación cuando falte una decisión humana.

## Brechas encontradas en la guía anterior

| Brecha | Antes | Regla incorporada | Evidencia esperada |
|---|---|---|---|
| Activación por funcionalidad | Clasificaba P0-P3, pero no definía disparadores concretos | Cada cambio se clasifica por perfiles de datos y operación | `required_profiles` del manifiesto y revisión del cambio |
| Continuidad para IA | Había documentos, pero no un estado único de pendientes | Estado JSON ordenado por bloqueador, responsable y forma de obtener evidencia | `LEGAL_IMPLEMENTATION_STATE.json` |
| Inicio del ciclo de vida | La compuerta aparecía al final | Revisión legal desde requisitos y diseño | registro de impacto en el plan de la funcionalidad |
| Cambios posteriores | No quedaba claro cuándo repetir la revisión | Nueva revisión ante campos, endpoints, proveedores, región, IA, analítica, marca o licencia | fecha y motivo en el manifiesto |
| Entidades públicas | Existía una referencia SENA, pero no un flujo general | Perfil público con autorización de alcance, datos, hosting, marca, archivo y producción | matriz sectorial y actas |
| Evidencia | Se listaban documentos, sin contrato de calidad | Cada control necesita prueba operativa o documento verificable | ruta, hash, responsable, fecha y resultado |
| IA | No se definía qué podía afirmar o cambiar | La IA no inventa datos, no aprueba tratamiento y no cambia estados por intención | salida estructurada y revisión humana |
| Operación | Se cubría Coolify, pero faltaba ciclo de incidentes, DSAR y cambios | Operación recurrente y auditoría periódica | simulacros, tickets, backups y revisiones |

## Perfiles de impacto legal

Un proyecto puede tener más de un perfil. El perfil más exigente gobierna la liberación.

| Perfil | Se activa cuando | Controles adicionales mínimos |
|---|---|---|
| `personal_data` | Existe cuenta, contacto, identificador, actividad, foto o ubicación asociable | aviso, autorización cuando aplique, derechos, retención, seguridad y registro |
| `sensitive_data` | Salud, biometría, vida privada, menores u otra categoría de alta sensibilidad | necesidad reforzada, finalidad separada, acceso mínimo y revisión jurídica |
| `minors` | Puede participar una persona menor de edad | edad, representante, interés superior, lenguaje y publicación restringida |
| `geolocation` | Se capta ubicación precisa o trazas | necesidad, precisión mínima, acceso, retención y opción separada |
| `health_or_veterinary` | Registra salud humana, tratamientos o datos sanitarios de animales vinculados a personas | revisión sectorial, límites de decisión automatizada, acceso y trazabilidad |
| `education` | Gestiona aprendices, evidencias, desempeño o evaluación | propósito pedagógico, acceso de instructor, archivo y publicación controlada |
| `public_entity` | El cliente o dueño del proceso es una entidad pública | roles, contratación, archivo, transparencia, seguridad, accesibilidad y autorización institucional |
| `file_uploads` | Recibe imágenes, documentos, audio o video | archivos privados, tipo/tamaño, malware, URL temporal, borrado y backups |
| `offline_sync` | Copia datos en dispositivos o nodos sin conexión | cifrado local, expiración, firma, revocación, resolución de conflictos y borrado remoto |
| `cross_border_transfer` | Un proveedor, soporte, backup, telemetría o subencargado está fuera de Colombia | inventario de país, mecanismo aplicable, contrato y aprobación |
| `external_ai` | Se envían datos a un modelo o proveedor de IA | minimización, no enviar datos reales por defecto, proveedor, retención, entrenamiento y autorización |
| `payments` | Cobra, factura o maneja datos financieros | comercio electrónico, proveedor de pagos, antifraude, soporte y conciliación |
| `official_integration` | Se presenta como integrado con ICA, SENA, DIAN u otra autoridad | autorización, contrato, marca, seguridad y alcance técnico verificable |
| `open_source_or_brand` | Publica código, usa contribuciones o marcas de terceros | cadena de titularidad, licencia compatible, avisos, contribución y permiso de marca |

## Flujo obligatorio de DevBrain

### 1. Descubrimiento

Antes de crear una tabla, formulario, endpoint, integración, analítica o archivo, el agente debe preguntar al repositorio y al responsable:

- qué dato se necesita;
- para qué finalidad concreta;
- quién es el responsable y quién opera por encargo;
- quiénes son los titulares;
- qué perfiles se activan;
- dónde estarán los datos y quién los provee;
- cuánto tiempo se conservarán;
- qué derechos y riesgos existen;
- si la funcionalidad usa entidad pública, marca, IA o información de terceros.

El resultado se registra en `docs/legal/COMPLIANCE_MANIFEST.json` y, si el proyecto aún no tiene estructura, se instala con `Install-ColombiaLegalCompliance.ps1`.

### 2. Planeación y diseño

La funcionalidad debe actualizar inventario, flujo de datos, roles, amenaza, autorización, retención, proveedor y evidencia. Una funcionalidad de alto impacto no puede entrar directamente a producción: debe quedar en estado `blocked` o `restricted` hasta la aprobación correspondiente.

El diseño debe escoger seguridad por defecto: minimización, cookies protegidas, autorización por rol y tenencia en el servidor, archivos privados, logs sin contenido sensible, secretos fuera del código, separación de ambientes, backups cifrados y borrado verificable.

### 3. Implementación

El agente debe convertir las decisiones en controles probables: validación de consentimientos, versión y hash de textos, endpoints de titulares, retención, auditoría, MFA, límites de carga, URL firmada, aislamiento multi-tenant, protección CSRF, rotación y configuración segura de Docker/Coolify.

No basta con un comentario, una pantalla o un campo booleano. La implementación debe tener pruebas negativas, evidencia de configuración y un responsable operativo.

### 4. Verificación

La verificación mínima es:

```powershell
npm run legal:audit
pwsh -NoProfile -ExecutionPolicy Bypass -File C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Test-DevBrainLegalLifecycle.ps1 -ProjectPath . -Mode Audit
```

Para una solicitud de liberación se agrega la suite del proyecto, pruebas de autorización y tenencia, escaneo de secretos, dependencias e imagen, revisión de licencias, backup/restauración, incidentes y evidencia humana.

### 5. Liberación

La liberación exige que el manifiesto esté aprobado, no existan controles críticos falsos, los documentos tengan versión y responsable, y el proveedor/entorno estén autorizados. Para VillaLuz la compuerta local es:

```powershell
npm run legal:release
```

Mientras el proyecto esté en desarrollo o provisional, Coolify debe conservar la recolección y creación pública desactivadas. El cambio de modo es una decisión de liberación, no un ajuste técnico menor.

### 6. Operación

El cumplimiento continúa después del despliegue: revisar accesos privilegiados, parches, logs, espacio, backups, restauración, certificados, incidentes, solicitudes de titulares, vencimiento de retención, proveedores y cambios de alcance. La periodicidad debe quedar aprobada por el responsable; como mínimo se recomienda revisión trimestral y revisión extraordinaria ante un disparador.

### 7. Cambio y reauditoría

La revisión legal se repite cuando cambie cualquiera de estos elementos:

- tabla, campo, formulario, endpoint, exportación o log que pueda contener datos;
- población, institución, regional, menor, aprendiz, finca o rol con acceso;
- proveedor, región, VPS, backup, correo, analítica, telemetría o subencargado;
- IA externa, biometría, geolocalización, pagos, archivos o publicación;
- marca, dominio, integración oficial, licencia, titularidad o contrato;
- retención, propósito, política, términos, consentimiento o forma de autenticación.

## Contrato de la IA

La IA debe leer primero el estado JSON, luego el manifiesto y la matriz sectorial. Debe clasificar el cambio, señalar los perfiles activados, actualizar pendientes y ejecutar la compuerta proporcional. No puede:

- inventar aprobaciones, contratos, responsables, NIT, correos, regiones, hashes o bases jurídicas;
- marcar `approved` porque el código compile;
- interpretar MIT como autorización de datos, marca o infraestructura;
- enviar datos reales a herramientas externas para “probar” una funcionalidad;
- ocultar un bloqueo con un aviso genérico;
- afirmar cumplimiento total sin evidencia y aprobación humana.

## Artefactos estándar que DevBrain debe exigir

Cada proyecto con impacto legal debe tener:

1. `rules/COLOMBIA_LEGAL_MINIMUM_RULES.md`.
2. `agents/colombia-legal-compliance-agent.md`.
3. `docs/legal/COMPLIANCE_MANIFEST.json`.
4. `docs/legal/LEGAL_IMPLEMENTATION_STATE.json`.
5. Inventario de datos y finalidades.
6. Registro de proveedores, subencargados y transferencias.
7. Política/aviso, derechos, retención e incidentes.
8. Evidencia de seguridad, licencias y continuidad.
9. Compuerta de auditoría y compuerta de liberación.

## Resultado para VillaLuz

La arquitectura de control está instalada, pero las aprobaciones humanas y la evidencia operativa siguen siendo bloqueadores. La siguiente IA debe continuar desde `LEGAL_IMPLEMENTATION_STATE.json`, no desde suposiciones ni desde la aprobación pedagógica aislada.
