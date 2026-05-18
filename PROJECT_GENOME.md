# 🧬 PROJECT GENOME: 4VillaLuz (Ecosistema Híbrido)

## 📌 Visión General
4VillaLuz es una plataforma integral de gestión agropecuaria diseñada para operar en entornos críticos (campo) con una arquitectura **Offline-First** y sincronización inteligente vía **P2P Mesh**.

## 🏗️ Arquitectura del Sistema
*   **Frontend:** `/frontend` (React + Vite + TailwindCSS + ShadcnUI).
*   **Backend:** `/backend` (Python Flask/Gunicorn) + Celery.
*   **Persistencia:**
    -   **PostgreSQL 16 (5432):** Motor principal (Multi-tenant, JSONB, GIS).
    -   **Redis (6379):** Caché, Colas de tareas y persistencia de sesiones.
*   **Inteligencia Híbrida (IA):**
    -   **GPU (RTX 4070):** Inferencia pesada (Gemma 2 9B / LLMs).
    -   **NPU (Intel AI Boost):** Embeddings semánticos y visión ligera.

## 🚀 Componentes Críticos
1.  **MeshMonitor.tsx:** Monitor de red P2P.
2.  **ProximitySyncService.ts:** Motor de sincronización.
3.  **villaluz_db_backup:** Respaldo automático.
4.  **DevBrain Gateway (:8010):** Orquestador unificado.

## 🧠 Base de Conocimiento Actualizada
*   **Modelo de datos auditado:** `docs/MODEL_RELATIONSHIPS.md`.
*   **Brechas rural-first/offline/mesh:** `docs/RURAL_FIRST_OFFLINE_MESH_GAP_ANALYSIS.md`.
*   **Nota técnica:** La PWA ya tiene cola offline y UI mesh, pero la disponibilidad real entre celulares en campo requiere `oplog` robusto, nodo local y/o transporte nativo (Nearby Connections, Wi-Fi Aware, Multipeer Connectivity). Web Bluetooth/WebRTC puro en navegador debe tratarse como fallback/prototipo, no como única capa crítica.

## 🗺️ Roadmap de Estabilización (Q2 2026)
- [x] Corrección de loop de reinicio en Backup DB.
- [x] Estabilización del Orquestador de Inicio.
- [x] Refactorización a Arquitectura FSD (/frontend, /backend).
- [x] Sincronización de Secretos con Vault de Windows.
- [x] Balanceo de Inteligencia IA (NPU Delegation).
- [x] Sincronización de puertos y motores DB (PostgreSQL 18 Standard).
- [x] Poblamiento masivo de datos para validación visual de vistas.
- [ ] Implementación de `Audit-PreCommit` via Git Hooks.
- [ ] Validación de accesibilidad WCAG AA (Fix DialogTitles).

## 🌊 Fluidez Operacional (DevBrain Self-Healing)
Para garantizar un trabajo fluido y entregas perfectas, el sistema se rige por la **Memoria Neuronal DevBrain**:
1.  **Protocolo Cero Errores:** Obligatoriedad de `npm run build` y auditoría de imports antes de cada entrega.
2.  **Aislamiento de Contexto:** Sincronización estricta entre Windows (Host), WSL (Runtime) y MCP (Audit).
3.  **Data Readiness:** Auto-seeding si el tenant está vacío.
4.  **Auth unificación:** Credenciales maestras `Villaluz2024!` unificadas en todo el ecosistema.

## 📡 Integración MCP (Multi-IDE)
El proyecto comparte reglas y estado entre **Windsurf, Cursor y Trae** mediante el archivo `STRATEGY.md` en el Neural Store local, asegurando que la inteligencia delegada en cualquier herramienta respete la integridad total del genoma.

## 🛠️ Reglas de Ingeniería (Protocolo DevBrain)
*   **Arquitectura:** Estándar FSD con carpetas `/frontend` y `/backend`.
*   **Logging:** Centralizado en `/maintenance/logs`.
*   **Secretos:** Vault Sync obligatorio via `Sync-DevBrainEnv.ps1`.
*   **Atomicidad:** "Ladrillo Atómico" - Cambios aditivos, nunca destructivos sin backup.
*   **YOLO Mode:** Ejecución autónoma con validación rigurosa post-cambio (Score 100% obligatorio).

---
*Este genoma es la fuente de verdad. Actualizar tras cada hito de arquitectura.*
