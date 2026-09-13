# Expediente de aprobación institucional SENA

Esta carpeta contiene únicamente la copia pública o redactada de la evidencia
institucional. No debe contener el original firmado si incluye firmas,
identificaciones, teléfonos, correos personales, datos reservados o anexos
restringidos.

## Ubicación exacta de la copia que puede versionarse

Guardar la copia redactada con este nombre:

`docs/legal/evidence/sena-approval/ACTA_APROBACION_SENA_REDACTADA.pdf`

Guardar junto a ella el registro de metadatos:

`docs/legal/evidence/sena-approval/metadata.json`

El original no público debe permanecer bajo custodia del SENA o del sistema
institucional de gestión documental autorizado. En el repositorio solo se
registra su referencia, alcance y el hash SHA-256 de la copia redactada.

## Cómo registrarlo

Desde la raíz del proyecto, después de obtener y redactar la copia, ejecutar:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\Register-SenaApprovalEvidence.ps1 `
  -ApprovalFile "C:\ruta\ACTA_APROBACION_SENA_REDACTADA.pdf" `
  -DocumentType "Acta de comité/directiva" `
  -DocumentNumber "<NUMERO_REAL>" `
  -ApprovalDate "<FECHA_ISO>" `
  -ApprovalBody "<ORGANO_QUE_APROBO>" `
  -Scope "Producto técnico-pedagógico; indicar expresamente si autoriza piloto o producción" `
  -OriginalLocation "<RADICADO_O_REPOSITORIO_INSTITUCIONAL>"
```

El script rechaza archivos que no parezcan redactados, copia la evidencia al
nombre canónico, calcula el hash y actualiza `docs/legal/COMPLIANCE_MANIFEST.json`.

La presencia del acta no sustituye la autorización de producción con datos
personales reales, el acuerdo de tratamiento, la aprobación de seguridad, ni
la aceptación formal del entorno VPS/Coolify.
