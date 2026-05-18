# Arquitectura del Sistema — Finca Villa Luz

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 |
| Estado | Redux + React Query + CacheContext propio |
| Router | React Router v6 |
| Backend | Flask 3 + Flask-RESTX + SQLAlchemy |
| Auth | JWT (cookies + headers), roles: Administrador / Instructor / Aprendiz |
| Cache | Redis (Caché & SSE) |
| DB dev | PostgreSQL 18 (Puerto 5435) |
| DB prod | PostgreSQL 18 (Coolify Ready) |
| ML | scikit-learn local (`services/ml/`) + LLM via CortexService |
| Push | Firebase Cloud Messaging (`push_notification_service.py`) |
| PWA | Vite-plugin-pwa + Service Worker custom (`public/service-worker.js`) |

## Puertos locales

| Servicio | Puerto |
|---|---|
| Backend | http://localhost:8092 |
| Frontend | https://localhost:3005 |
| Redis | 127.0.0.1:6380 (WSL/Docker) |

## Arranque

```bash
# Backend
cd backend && ./venv_win/Scripts/python.exe wsgi.py

# Frontend
cd frontend && npm run dev -- --host
```

---

## Estructura Backend (`backend/`)

```
backend/
  app/
    __init__.py            ← create_app() factory
    extensions/            ← db, jwt, cache, migrate (init_extensions)
    models/                ← SQLAlchemy models (base_model.py heredado por todos)
    namespaces/            ← Flask-RESTX namespaces agrupados por dominio
      analytics/           ← 8 sub-namespaces analytics (dashboard, animals, alerts…)
      animals/             ← animals, breeds, reproduction, animal_fields, animal_images
      core/                ← activity, alerts, api_docs, chat, location, public, security
      farm/                ← fields, food_types, inventory
      finanzas/            ← analytics(legacy), exports, multi_finca, regulatory_reports
      health/              ← health endpoints
      users/               ← auth, users, push_notifications, user_preferences, membership
    api/
      namespaces/          ← ml_namespace.py (única excepción — unificar a namespaces/)
    services/              ← Lógica de negocio separada del routing
      analytics/           ← dashboard_service, medical_service, prediction_service, production_service
      ml/                  ← milk_prediction_service
      alert_engine.py
      cortex_service.py
      push_notification_service.py
      predictive_engine_service.py
      (otros servicios…)
    utils/                 ← Helpers transversales
    controllers/           ← (pendiente consolidar con services)
    tasks/                 ← Tareas asíncronas / Celery
    templates/             ← Plantillas Jinja2 (emails, reportes PDF)
  config.py                ← Configuraciones por entorno
  migrations/
  tests/
  wsgi.py / run.py
```

### Capas Backend (flujo obligatorio)

```
Request → Namespace Route → Service → Model/Repository → DB
                                  ↓
                             Response (APIResponse)
```

- **Namespace/Route**: solo recibe request, valida con schema inline, llama service, retorna respuesta
- **Service**: lógica de negocio, NO accede DB directamente
- **Model**: acceso a datos SQLAlchemy

> **Deuda técnica activa:**
> - `namespaces/finanzas/analytics_namespace.py` (1989L) — monolito legacy. Migrar gradualmente a `namespaces/analytics/*`
> - `app/api/namespaces/ml_namespace.py` — outlier, mover a `namespaces/`
> - Faltan `schemas.py` y `repository.py` explícitos por namespace
> - Queries SQLAlchemy directas en 15 namespace files (126 ocurrencias)

---

## Estructura Frontend (`frontend/src/`)

Sigue **Feature-Sliced Design (FSD)**:

```
src/
  app/           ← Providers, routes, estilos globales
    providers/   ← AuthenticationContext, CacheContext, ToastContext
    routes/      ← React Router config
  entities/      ← Modelos de dominio puros (sin UI de negocio)
    {recurso}/
      api/       ← fetch del recurso
      model/     ← tipos TypeScript
      lib/       ← utilidades del dominio
      ui/        ← componentes presentacionales del recurso
  features/      ← Casos de uso / acciones del usuario
    {feature}/
      api/       ← llamadas API específicas del feature
      ui/        ← componentes del feature
      hooks/     ← hooks del feature
  widgets/       ← Bloques de UI compuestos (combinan entities + features)
    admin-crud/  ← CRUD genérico (FSD, 726L — versión canonical)
    analytics/
    dashboard/   ← Modales y menús de animales, tratamientos, etc.
  pages/         ← Vistas completas (una por ruta)
    auth/
    dashboard/
      admin/
      instructor/
      apprentice/
      user/
  shared/        ← Código sin dependencias de negocio
    api/
      client.ts          ← Axios client central
      apiFetch.ts        ← Wrapper fetch offline-aware
      offline/           ← IndexedDB v2, offlineQueue, BackgroundSync
      cache/             ← CacheContext helpers
      generated/         ← swaggerTypes.ts (auto-generado, no editar)
    hooks/               ← Hooks reutilizables globales
    ui/                  ← Componentes UI genéricos
      common/            ← componentes UI genéricos (AdminCRUDPage legacy eliminado 2026-04-29)
    constants/           ← Enums, strings
    config/              ← queryConfig, staleTime
    types/               ← Tipos compartidos
    lib/                 ← offline-db.ts (IndexedDB), utils
  components/    ← (legacy pre-FSD — migrar a entities/widgets/shared)
```

### Capas Frontend (flujo obligatorio FSD)

```
pages → widgets → features → entities → shared
```

- Capa superior puede importar capas inferiores, nunca al revés
- `eslint-plugin-boundaries` v6 enforza esto (0 violaciones activas)

> **Deuda técnica activa (actualizado 2026-04-29):**
> - `shared/api/client.ts` (1205L) — Axios client central. **ALTO RIESGO.** Solo dividir con tests de integración.
> - `shared/hooks/useResource.ts` (966L) — Hook central monolítico. **ALTO RIESGO.** No dividir sin tests.
> - `widgets/dashboard/components/AnimalActionModalInstance.tsx` (831L) — CRUD modal. Aceptable por complejidad de dominio.
> - `namespaces/finanzas/analytics_namespace.py` frontend-side legacy (monolito en deprecación progresiva).
>
> **Resuelto en refactor/architecture-cleanup (2026-04-29):**
> - ✅ `shared/ui/common/AdminCRUDPage.tsx` (2844L) — **ELIMINADO** (dead code, ya migrado a widgets/admin-crud)
> - ✅ `UserProfile.tsx` — dividido: schemas, BubbleMessage, PasswordLiveRequirements, useUserActivityData
> - ✅ `AnimalModalContent.tsx` — extraídos DetailField, RelatedDataSection
> - ✅ `AnimalActionsMenu.tsx` — extraídos types, AnimalActionModalInstance, renderListItem

---

## Integración Frontend ↔ Backend

| Aspecto | Estado |
|---|---|
| Nomenclatura | Backend `snake_case` → Frontend `camelCase` via `responseNormalizer.ts` |
| Auth | JWT en cookie HttpOnly + header `X-CSRF-TOKEN` |
| Offline | `apiFetch.ts` → IndexedDB queue → Background Sync SW |
| Errores | `error-parser.ts` centralizado |
| CORS | Flask-CORS configurado en `create_app()` |
| Compresión | flask-compress activo (~70% reducción JSON) |

### Endpoints críticos

| Recurso | Endpoint correcto |
|---|---|
| Dashboard completo | `GET /api/v1/analytics/dashboard/complete` |
| Dashboard básico | `GET /api/v1/analytics/dashboard` *(tiene bug conocido de ceros)* |
| Animales stats | `GET /api/v1/analytics/animals/statistics` |
| AI insights | `GET /api/v1/analytics/ai/insights` |
| Live stream | `GET /api/v1/analytics/live/stream` |
| Predicciones | `GET /api/v1/analytics/predictions/` |
| Food types | `GET /api/v1/food_types` *(underscore)* |
| Route admin | `GET /api/v1/route-administrations` *(guion)* |
