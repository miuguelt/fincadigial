# VillaLuz

Monorepo de la plataforma de gestión de la finca Villa Luz. El código de producto tiene únicamente dos raíces: `backend/` y `frontend/`.

## Runtime canónico

- Windows nativo mediante `start-windows.ps1`.
- Backend Flask: `http://127.0.0.1:8092`.
- Frontend Vite: `http://127.0.0.1:3005`.
- PostgreSQL local: `127.0.0.1:5434`.
- Memurai/Redis local: `127.0.0.1:6380`.
- Backups: fuera del repositorio, por defecto en `Documentos/Backups/VillaLuz`.

La fuente operativa de arranque es `start-windows.ps1`; los valores de aplicación viven en `backend/config.py` y `frontend/vite.config.ts`. No se deben crear otra carpeta de backend, otra carpeta de frontend ni una carpeta `backups/` dentro del proyecto.

El procedimiento de respaldo y restauración está en
[`docs/operations/BACKUP_RUNBOOK.md`](docs/operations/BACKUP_RUNBOOK.md).

## Comandos habituales

```powershell
# Iniciar el entorno completo
pwsh -File .\start-windows.ps1 -Daemon

# Estado y detención
pwsh -File .\start-windows.ps1 -Status
pwsh -File .\start-windows.ps1 -Stop

# Higiene y validaciones rápidas
npm run hygiene
npm run modularity:changed
npm --prefix frontend run type-check
python -m compileall -q backend/app backend/maintenance backend/tests scripts
```

## Estructura

```text
backend/     API, dominio, tareas, migraciones y pruebas Python
frontend/    aplicación React/Vite/TypeScript y pruebas de interfaz
docs/        documentación técnica y operativa
scripts/     automatizaciones del proyecto
maintenance/ mantenimiento transversal
tests/       pruebas transversales
.devbrain/   contexto compacto para agentes y reglas del proyecto
_archive/    material local recuperable, ignorado por Git y por Codebase Memory
```

Los directorios generados (`node_modules`, entornos Python, logs, cobertura, `dist`, resultados de Playwright, cachés y bases locales) se mantienen fuera del contexto de la IA mediante `.cbmignore` y no deben versionarse.

## Contexto para trabajar con IA

Leer primero [.devbrain/context/project-context.yml](.devbrain/context/project-context.yml), luego la documentación específica. La guía de higiene está en [docs/architecture/PROJECT_HYGIENE.md](docs/architecture/PROJECT_HYGIENE.md) y la arquitectura en [ARCHITECTURE.md](ARCHITECTURE.md).

Antes de un commit, ejecutar `npm run hygiene`, las validaciones del área modificada y revisar `git status --short`. El commit es una decisión humana; este proyecto no debe auto-confirmar ni auto-publicar cambios.
