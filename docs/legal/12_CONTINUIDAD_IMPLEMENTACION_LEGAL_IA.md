# Continuidad de la implementación legal para IA

Este archivo es la guía humana de continuidad. La fuente estructurada que debe leer primero cualquier agente es [LEGAL_IMPLEMENTATION_STATE.json](LEGAL_IMPLEMENTATION_STATE.json). El manifiesto que gobierna la compuerta es [COMPLIANCE_MANIFEST.json](COMPLIANCE_MANIFEST.json).

## Estado actual

VillaLuz está restringida a pruebas o a un despliegue provisional sin captación de datos personales reales. La aplicación puede seguir desarrollándose, pero no se debe interpretar la aprobación pedagógica reportada del SENA como autorización automática para abrir registros, manejar datos reales, alojar información institucional en un VPS o usar marca e integraciones oficiales.

El código ya contiene controles relevantes de contención: registro público bloqueable, consentimiento versionable, cookies protegidas, bloqueo de JWT en almacenamiento del navegador para producción, URLs firmadas para archivos y configuración de Coolify con recolección desactivada. Esos controles son evidencia técnica parcial; no sustituyen contratos, políticas, actas, responsables ni pruebas operativas.

## Dónde poner la aprobación del SENA

La copia redactada que pueda quedar en el repositorio debe estar exactamente en:

`docs/legal/evidence/sena-approval/ACTA_APROBACION_SENA_REDACTADA.pdf`

El original debe conservarlo la dependencia o secretaría institucional bajo control restringido. No se debe subir al repositorio el original si contiene cédulas, firmas, teléfonos, correos personales, deliberaciones o información que no sea necesaria para verificar la aprobación.

Para registrar la copia y calcular el hash que exige la compuerta:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Register-SenaApprovalEvidence.ps1 `
  -ApprovalFile docs/legal/evidence/sena-approval/ACTA_APROBACION_SENA_REDACTADA.pdf
```

El script actualiza los metadatos y el manifiesto con el hash. Aun así, una persona autorizada debe diligenciar el número, fecha, órgano competente y alcance real del acto; el script no puede crear una aprobación.

## Orden exacto para continuar

1. Abrir `LEGAL_IMPLEMENTATION_STATE.json` y trabajar únicamente los elementos `pending_blockers`.
2. Solicitar al SENA la identidad del responsable, dueño del proceso, canal de privacidad, dependencia, población, centros, regionales y dominio autorizado.
3. Obtener copia verificable del acta/acto y determinar si su alcance es pedagógico, piloto, uso interno o producción.
4. Formalizar roles responsable/encargado, instrucciones, subencargados, hosting, incidentes, backups, devolución y eliminación en contrato o anexo.
5. Aprobar política de privacidad, aviso, términos, inventario de datos, retención, procedimiento de titulares y registro de proveedores.
6. Resolver los perfiles condicionales: menores, geolocalización precisa, imágenes, biometría, datos de salud humana, analítica, IA e integraciones oficiales.
7. Cerrar MFA privilegiado, backup/restauración, simulacro de incidente, SBOM, escaneo de dependencias y revisión de propiedad intelectual/licencias.
8. Actualizar el manifiesto con hechos y evidencias. No cambiar `status` a `approved` antes del cierre humano.
9. Ejecutar:

```powershell
npm run legal:audit
npm run legal:release
```

10. Solo con la compuerta verde y el acta de liberación se puede cambiar el modo de Coolify a `contracted` o `production`, habilitar captación y publicar el dominio autorizado.

## Qué debe entregar cada continuación de IA

Toda continuación debe reportar: archivos leídos, evidencias que pudo comprobar, bloqueadores que permanecen, cambios realizados, pruebas ejecutadas, resultado de la compuerta y decisiones que solo puede tomar el SENA, jurídico, privacidad, contratación o infraestructura.

La IA no debe inventar actas, contratos, NIT, correos, hashes, proveedores, aprobaciones, población autorizada ni bases jurídicas. Cuando falte un dato, debe conservar el marcador y explicar cómo obtenerlo.

## Criterio de cierre

El proyecto queda listo para producción real solamente cuando:

- `npm run legal:release` termina sin bloqueadores;
- el manifiesto tiene responsable, alcance institucional y controles respaldados por evidencia;
- existe acta de liberación de producción, no solo aprobación pedagógica;
- el responsable/encargado y los proveedores están formalizados;
- política, aviso, términos, derechos y retención están publicados y probados;
- seguridad, backups, restauración e incidentes fueron probados;
- la propiedad intelectual, MIT, dependencias, marca SENA e integraciones tienen alcance escrito;
- Coolify usa dominio, secretos, red, backups y monitoreo aprobados.

Si cualquiera de esas condiciones falla, el veredicto correcto es “restringida a pruebas” o “bloqueada”, nunca “cumplimiento total”.
