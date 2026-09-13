# Matriz de cumplimiento y evidencias SENA

La columna “cómo se obtiene” indica el trámite o responsable que debe producir la evidencia. La existencia de una plantilla no equivale a cumplimiento.

| ID | Requisito | Dónde se implementa | Evidencia que falta | Cómo se obtiene | Responsable | Estado |
|---|---|---|---|---|---|---|
| SENA-01 | Patrocinio institucional | proyecto y contrato | acta de alcance | reunión con dependencia SENA y acta firmada | SENA + proveedor | Bloqueado |
| SENA-02 | Rol responsable/encargado | manifest y contrato | anexo de tratamiento | revisión jurídica y firma contractual | Jurídica SENA | Bloqueado |
| SENA-03 | Política de privacidad aprobada | `/legal/privacidad` | texto aprobado y correo oficial | entregar borrador a privacidad SENA | SENA privacidad | Bloqueado |
| SENA-04 | Consentimientos y bases legales | `user_consents` | matriz por finalidad | aprobar finalidades y textos | SENA privacidad | Parcial |
| SENA-05 | Derechos de titulares | backend y soporte | endpoints, formulario y SLA | implementar y probar DSAR | proveedor + SENA | Bloqueado |
| SENA-06 | Menores | registro y control de edad | procedimiento de representante | concepto jurídico y diseño aprobado | Jurídica SENA | Bloqueado |
| SENA-07 | Retención/archivo | DB, uploads y logs | TRD/retención/disposición | concepto de gestión documental | Archivo SENA | Bloqueado |
| SENA-08 | MSPI y riesgo | infraestructura y CI | matriz de riesgo, SoA, plan de tratamiento | revisión Oficina de Sistemas | Seguridad SENA | Bloqueado |
| SENA-09 | Accesibilidad AA | frontend | auditoría WCAG 2.1 AA y declaración | pruebas automatizadas + manuales | proveedor + SENA | Bloqueado |
| SENA-10 | Transparencia | portal y documentos | sección institucional aprobada | validar publicación con SENA | SENA comunicaciones | Bloqueado |
| SENA-11 | Contratación pública | SECOP/expediente | estudio previo, CDP, contrato | proceso contractual SENA | Contratación SENA | Bloqueado |
| SENA-12 | Proveedores/subencargados | Coolify, VPS, correo | registro, DPA, países | pedir contratos y ubicaciones | proveedor + SENA | Bloqueado |
| SENA-13 | Backups y continuidad | Coolify/VPS | restore test, RPO/RTO | configurar y levantar acta de prueba | proveedor + SENA | Bloqueado |
| SENA-14 | Incidentes | backend/operación | runbook y simulacro | ejercicio documentado | Seguridad SENA | Bloqueado |
| SENA-15 | Propiedad intelectual | repo, SBOM y contrato | licencias, cesiones y código entregable | auditoría de dependencias y contrato | Jurídica + proveedor | Bloqueado |
| SENA-16 | Marca e integración | frontend/API | autorización escrita | solicitud institucional específica | SENA + proveedor | Bloqueado |
| SENA-17 | Aceptación piloto | release gate | acta UAT y acta de seguridad | pruebas con datos sintéticos | dueño del proceso | Bloqueado |

## Regla de cierre

Cada fila debe tener archivo, acta, contrato o registro con fecha, responsable y enlace a evidencia. No se debe cambiar `status` a `approved` por decisión del desarrollador.

