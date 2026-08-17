# Project Genome: VillaLuz

Ficha breve del sistema. La versión operativa para agentes está en `.devbrain/context/project-context.yml`.

## Propósito

Aplicación web para gestionar operaciones de la finca, usuarios, animales, analítica, tareas asíncronas y trabajo offline.

## Stack

- Backend: Flask, Flask-RESTX, SQLAlchemy, Celery y PostgreSQL.
- Frontend: React, TypeScript, Vite, Tailwind y Feature-Sliced Design.
- Runtime local: Windows-native con PostgreSQL y Memurai/Redis.
- Integración: API REST versionada, autenticación JWT, caché y capacidades offline.

## Límites canónicos

- `backend/`: API, dominio, migraciones y pruebas Python.
- `frontend/`: interfaz, rutas, features, widgets y pruebas de interfaz.
- `scripts/`, `maintenance/`, `tests/`: automatización, mantenimiento y pruebas transversales.
- `docs/`: documentación mantenible; informes históricos deben identificarse como tales.
- `.devbrain/`: contexto y reglas compactas para agentes.

## Escalabilidad

El backend sigue `namespace -> service -> model/repository -> DB`; el frontend sigue `pages -> widgets -> features -> entities -> shared`. Los archivos grandes heredados se dividen solo cuando existe cobertura suficiente y la excepción se registra en `docs/architecture/exceptions.md`.

## Higiene

Backups, logs, bases locales, entornos virtuales, dependencias, builds y resultados de pruebas viven fuera del commit y del índice de contexto. Ejecutar `npm run hygiene` antes de preparar cambios.
