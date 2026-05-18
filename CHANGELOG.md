# Changelog — Finca Villa Luz

Todos los cambios notables del proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [1.2.0] — 2026-05-09

### ✅ Añadido
- **Motor de Conocimiento v2.0** — Base de Conocimiento expandida de 5 a 50+ reglas agropecuarias basadas en ICA/FEDEGAN/SENA (reproducción, sanidad, nutrición, manejo, genética, bienestar).
- **12 eventos de Calendario Sanitario** — incluyendo IBR, Leptospirosis, control de garrapatas, podología, vitaminas ADE y ecografía reproductiva.
- **`CalendarioSanitarioWidget`** — visualización de eventos pendientes por animal y por hato completo, con semáforo ICA (rojo = obligatorio).
- **`QuickMilk`** — formulario táctil rural-first para registro diario de producción lechera con soporte offline-queue automático. Ruta: `/quick/milk`.
- **`FieldReadyWidget`** — widget de "Modo Campo" en OperarioDashboard para pre-cargar datos antes de salir a campo sin señal (TTL 8h, IndexedDB).
- **`FieldReadyService`** — servicio de prefetch a IndexedDB con 9 endpoints críticos de campo.
- **Suite de tests unitarios KB** (`tests/test_knowledge_base.py`) — 22 tests para el `RecomendacionMotor` sin dependencia de BD.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — pipeline automático: pytest + TypeScript check + build + deploy_check en push a `main`/`develop`.
- **`docker-compose.coolify.yml`** — Compose de producción con PostgreSQL 16, Redis 7, backup diario, db-init idempotente y healthchecks completos.
- **`scripts/deploy_check.py`** — verificador pre-deploy de 29 checks (28/29 OK).
- **`offline.html`** — página fallback de Service Worker con auto-redirect al volver la señal.
- **`robots.txt`** — bloquea indexación de rutas privadas del dashboard.
- **`.dockerignore` backend** — excluye scripts de test y logs de la imagen Docker (~300MB menos).
- **Endpoint `GET /api/v1/knowledge_base/calendario/hato`** — calendario sanitario del hato completo.
- **Endpoint `GET /api/v1/knowledge_base/stats`** — estadísticas del motor de reglas para validar seed.
- **Rate limiting 60 req/min** en endpoints `/knowledge_base/*`.
- **Botón "Registrar Leche" 🥛** en OperarioDashboard (cyan).
- **Sección "Modo Campo"** en OperarioDashboard reemplaza el simple banner offline.
- **Widget "Calendario Sanitario del Hato"** en AdminDashboard (lazy-loaded).

### 🔧 Modificado
- **Backend `Dockerfile`** — Refactorizado a Multi-Stage (builder + production): usuario no-root `appuser`, imagen ~60% más liviana.
- **`frontend/nginx.conf`** — Hardened con headers de seguridad (CSP, X-Frame-Options, X-Content-Type-Options), caché diferenciada por tipo de asset y soporte SSE sin buffering.
- **`.gitignore`** — Añadido `.env.production` y `/backups/` para mayor seguridad.
- **`sw.ts`** — Añadido `/api/v1/knowledge_base` a la estrategia `StaleWhileRevalidate` del Service Worker.
- **`OperarioDashboard`** — Integrado `FieldReadyWidget` + botón QuickMilk + icono `Droplets`.
- **`AppRoutes.tsx`** — Registrada ruta `/quick/milk` con lazy loading.
- **`seed_knowledge_base.py` v2.0** — Expandido de 5 a 50+ reglas y de 4 a 12 calendarios. Totalmente idempotente.
- **`kb_namespace.py`** — Nuevos endpoints + rate limiting.
- **`AnimalModalContent.tsx`** — Integrado `AnimalRecommendationsWidget` en panel de animal.

### 🗑️ Descontinuado
- Banner simple "Estás sin señal" en OperarioDashboard (reemplazado por `FieldReadyWidget`).

---

## [1.1.0] — 2026-05-06

### ✅ Añadido
- **Motor de Recomendaciones Agropecuario** — Motor de reglas determinista (sin IA) basado en datos ICA/FEDEGAN.
- **`AnimalRecommendationsWidget`** — Widget de recomendaciones por animal con semáforo de urgencia (Inmediata/Alta/Media/Baja).
- **`AnimalModalContent`** — Modal de detalle de animal con pestaña de inteligencia veterinaria.
- **`offlineQueue`** — Cola offline con IndexedDB para mutaciones en campo sin señal.
- **`OnlineStatusIndicator`** — Indicador de estado de sincronización con conteo de operaciones pendientes.
- **Service Worker `sw.ts`** — Workbox con BackgroundSync, CacheFirst para assets y NetworkFirst para datos de campo.
- **Base de Conocimiento** — Modelos `KBRecomendacion`, `KBRegla`, `KBCalendario` en la BD.
- **Villa Luz Mesh Sync Protocol** — `ProximitySyncService` para sincronización P2P en red local.
- **`NodeCommunicationWidget`** — Alertas y mensajes entre nodos sin infraestructura celular.

---

## [1.0.0] — 2026-05-01

### ✅ Añadido
- Arquitectura inicial FSD (Feature-Sliced Design) en React + TypeScript.
- Backend FastAPI/Flask con 45+ modelos de datos y 60+ namespaces API.
- Autenticación JWT con roles (Administrador, Propietario, Veterinario, Instructor, Aprendiz, Operario).
- Módulos principales: Animales, Potreros, Tratamientos, Vacunaciones, Controles, Reproducción, Leche.
- Multi-tenancy con aislamiento por finca.
- Exportación de reportes PDF y Excel.
- Dashboard Campesino para extensionistas rurales.
- Sistema de Alertas automáticas (alert_engine).
