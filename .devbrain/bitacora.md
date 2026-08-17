# Bitácora técnica de VillaLuz

Estado: activo. Última actualización: 2026-08-15.

La ficha compacta y vigente para agentes está en `.devbrain/context/project-context.yml`. Este archivo conserva solo decisiones operativas que conviene tener visibles:

- El producto tiene una sola raíz de backend (`backend/`) y una sola de frontend (`frontend/`).
- El desarrollo local es Windows-native: API en `8092`, Vite en `3005`, PostgreSQL en `5434` y Memurai/Redis en `6380`.
- `start-windows.ps1` es el launcher canónico. Los backups se escriben fuera del repositorio, en `Documentos/Backups/VillaLuz` o en `VILLALUZ_BACKUP_ROOT`.
- Los entornos Python, `node_modules`, logs, cobertura, builds, bases locales y resultados de pruebas son estado generado; no forman parte del contexto de la IA ni del commit.
- Las reglas de higiene están en `docs/architecture/PROJECT_HYGIENE.md` y las excepciones conocidas en `docs/architecture/exceptions.md`.

## Flujo de trabajo

1. Leer `.devbrain/context/project-context.yml` y la documentación del área modificada.
2. Trabajar dentro de `backend/`, `frontend/`, `scripts/`, `maintenance/`, `tests/` o `docs/` según corresponda.
3. Ejecutar `npm run hygiene` y las validaciones específicas antes de preparar el commit.
4. Actualizar esta ficha solo cuando cambie una decisión operativa; no usarla como depósito de logs, diagnósticos o sesiones completas.
