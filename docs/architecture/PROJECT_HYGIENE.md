# Higiene y crecimiento del proyecto VillaLuz

## Decisión

VillaLuz mantiene una sola aplicación frontend y una sola aplicación backend:

```text
villaluz/
├── backend/       # Flask, modelos, namespaces, migraciones y pruebas backend
├── frontend/      # React/Vite, features, widgets y pruebas frontend
├── scripts/       # automatización reproducible del repositorio
├── docs/          # decisiones, guías y documentación viva
├── e2e/           # pruebas end-to-end compartidas
├── maintenance/   # logs y estados de ejecución locales
├── test-results/  # salidas regenerables de pruebas
└── _archive/      # cuarentena local, nunca fuente de runtime
```

La raíz solo contiene configuración, documentación de entrada, composición y
entrypoints. No se crean allí scripts de diagnóstico, resultados, logs,
backups, bases SQLite, archivos comprimidos ni copias de `backend/` o
`frontend/`.

## Reglas operativas

1. El código de producto vive en `backend/app`, `frontend/src` y sus pruebas
   cercanas. Una capacidad nueva se agrega en su vertical slice, no en un
   archivo utilitario global.
2. Los scripts de operación permanentes viven en `scripts/` o
   `backend/maintenance/`, con nombre que indique su propósito. Un script
   temporal se mueve a `_archive/cleanup-YYYY-MM-DD/` al terminar.
3. Los reportes y salidas de pruebas se escriben bajo `test-results/` o
   `maintenance/`; nunca se escriben relativos al directorio actual.
4. Los logs del backend usan `maintenance/security.log` u otro destino
   configurado. No se versionan logs, PIDs, bases locales ni volcados.
5. Los backups de código y base de datos viven fuera del repositorio, por
   ejemplo `C:\Users\<usuario>\Documents\Backups\VillaLuz`. Una restauración
   se hace primero a una carpeta externa de inspección; nunca a
   `restored_*` dentro del proyecto.
6. Antes de mover un módulo se actualizan referencias, scripts y documentación
   activa; después se ejecutan importación/compilación, pruebas afectadas,
   higiene y modularidad.

## Copias de seguridad sin conflicto

- Código: Git remoto y etiquetas de release; no snapshots completos dentro del
  árbol de trabajo.
- Base de datos: dumps PostgreSQL versionados por fecha en almacenamiento
  externo, cifrados y con checksum. Nunca mezclar dumps con el código fuente.
- Secretos: Credential Manager/secret store o `.env` ignorado; nunca entran en
  backups compartidos sin cifrado.
- Retención sugerida: diarios 14-30 días, semanales 8-12 semanas y mensuales
  6-12 meses.
- Restauración: prueba mensual de un backup en una carpeta externa y registro
  de fecha, origen, checksum y resultado.

## Control automático

Ejecutar desde la raíz:

```powershell
pwsh -File scripts/Test-VillaLuzProjectHygiene.ps1 -FailOnViolations
npm run modularity:changed
```

El primer control bloquea raíces duplicadas, archivos sueltos y referencias a
los nombres históricos `BackFinca` y `VillaLuzFront`. El segundo usa
`.devbrain/modularity-baseline.json` como fotografía versionada de la deuda
existente: permite mantener el legado estable, pero bloquea cualquier archivo
sobredimensionado que crezca. Las excepciones se reducen por seams, no mediante
fragmentación artificial.
