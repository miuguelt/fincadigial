# Estándar base de cumplimiento para proyectos de software en Colombia

Este documento es una plantilla reutilizable para cualquier proyecto del espacio de trabajo. El proyecto debe copiarla y completar su manifiesto; las obligaciones concretas dependen del sector, el tipo de usuario, la escala y el contrato. La guía se complementa con [13_GUIA_CICLO_VIDA_LEGAL_DEVBRAIN.md](13_GUIA_CICLO_VIDA_LEGAL_DEVBRAIN.md), que define cuándo debe repetirse la revisión y qué debe hacer la IA.

## Perfil del proyecto

| Campo | Valor requerido |
|---|---|
| Perfil | P0 / P1 / P2 / P3 |
| Responsable del tratamiento | Nombre legal y NIT |
| Encargado técnico | Persona o empresa |
| Países de tratamiento | Colombia y países de proveedores |
| Datos de menores | Sí / No / No aplica, con justificación |
| Geolocalización precisa | Sí / No |
| Pagos | Sí / No |
| Sector regulado | Sí / No, indicar cuál |
| Fecha de revisión | AAAA-MM-DD |
| Aprobador | Nombre y cargo |

## Perfiles que activan controles reforzados

El proyecto debe declarar todos los perfiles aplicables, no solo un nivel general. Como mínimo se deben revisar `personal_data`, `sensitive_data`, `minors`, `geolocation`, `health_or_veterinary`, `education`, `public_entity`, `file_uploads`, `offline_sync`, `cross_border_transfer`, `external_ai`, `payments`, `official_integration` y `open_source_or_brand`. Un cambio de perfil obliga a repetir la revisión antes de desplegar.

## Evidencias mínimas

- Inventario de datos y finalidades.
- Aviso de privacidad y política publicada.
- Registro de autorizaciones y revocatorias.
- Términos de uso o contrato.
- Flujo de derechos de titulares.
- Registro de encargados y transferencias.
- Matriz de retención y borrado.
- Modelo de amenaza y pruebas de autorización/tenencia.
- Inventario de secretos y rotación.
- Inventario de licencias y derechos.
- Respaldo cifrado y restauración probada.
- Registro de incidentes y simulacro.
- Estado de continuidad para IA, con pendientes, responsables, evidencia requerida y orden de reanudación.
- Matriz de perfiles funcionales y disparadores de reauditoría.
- Evidencia de accesibilidad, archivo, continuidad, SBOM/escaneo y cadena de titularidad cuando correspondan.

## Regla de evidencia

No se marca “cumple” porque exista un archivo con el título correcto. Cada control debe tener evidencia operativa: pantalla, endpoint, prueba automatizada, contrato, registro, configuración o acta de aprobación, sin almacenar datos reales innecesarios.

## Perfil de entidad pública

Si el proyecto se presta al SENA o a otra entidad pública, este estándar no es suficiente por sí solo. Debe activarse una matriz sectorial con roles responsable/encargado, contratación estatal, política institucional de datos, MSPI, accesibilidad, transparencia, archivo, menores y autorización de marca/integraciones. Para VillaLuz, la matriz aplicable es [06_SENA_PERFIL_JURIDICO_Y_REQUISITOS.md](06_SENA_PERFIL_JURIDICO_Y_REQUISITOS.md) y la liberación se controla con [08_MATRIZ_CUMPLIMIENTO_SENA.md](08_MATRIZ_CUMPLIMIENTO_SENA.md).

## Ciclo de vida y compuertas

La responsabilidad legal se revisa en descubrimiento, diseño, implementación, verificación, liberación, operación y cambios posteriores. La compuerta de liberación no debe ser el primer momento de análisis. Se debe reauditar cuando se agregue un campo o endpoint, cambie la población, aparezca un proveedor o país nuevo, se use IA/analítica/geolocalización/archivos, se publique una integración oficial o se cambie licencia, marca, política, retención o contrato.

Todo proyecto debe conservar un estado estructurado en `docs/legal/LEGAL_IMPLEMENTATION_STATE.json`. Ese archivo no reemplaza la evidencia: le permite a otra IA reanudar el trabajo sin perder los bloqueadores, responsables, rutas y comandos.
