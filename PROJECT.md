# Project: Villaluz UX & Livestock Operational Optimization

## Architecture
- **Monorepo Structure**: Frontend en React 18 + Vite + TypeScript (`frontend/`), Backend en Python 3.11 + Flask + SQLAlchemy (`backend/`), Scripts de higiene y despliegue en `scripts/`.
- **Runtime Nativo Windows**: PostgreSQL en `127.0.0.1:5434`, Memurai Redis en `127.0.0.1:6380`, MCP gateway en `127.0.0.1:8010`.
- **UI Architecture**: Componentes flotantes (`DialogContent`, `GenericModal`) bajo protocolo SSoT: padding perimetral obligatorio `p-6`, bordes `rounded-2xl`/`rounded-xl`, holgura `pr-9 sm:pr-10` en encabezados para despeje del botón `(X)`, objetivos táctiles móviles >= 44x44px.
- **Backend Architecture**: Modelos relacionales con validación y normalización atómica (`_validate_and_normalize`). Motores deterministas zootécnicos (ADG en control de peso y tiempos de retiro en tratamientos según Resolución ICA 068167). Cero dependencias de LLM en caliente.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SSoT Modal Padding & No p-0 | Saneamiento de padding `p-6` en modales (`FincaGpsModal`, `VeterinarianResponseDialog`, `DeletionBlockedDialog`, `BatchDeleteModal`, `ConfirmDialog`, `QuickActionsModal`, `GlobalUsersPage`) eliminando márgenes `mx-*` hijos | M1 | explorer_survey_1 |
| 2 | Header Close Button Safety Clearance | Adición de `pr-9 sm:pr-10` o `pr-14 sm:pr-16` en encabezados de modales masivos y operativos (`BatchWeightModal`, `BatchVaccinationModal`, `BatchReproductionModal`, `BatchFieldTransferModal`, `GanaderiaOperativaPage`) para evitar colisión con `(X)` | M1 | explorer_survey_1 |
| 3 | Mobile-First Touch Targets (>=44x44px) | Ajuste de tamaños táctiles móviles en `button.tsx`, `input.tsx`, `tabs.tsx`, `AnimalActionsPanel.tsx` y `CRUDModals.tsx` | M1 | explorer_survey_1 |
| 4 | Colombian Livestock Terminology (es-CO) | Reemplazo de términos foráneos ("Sujetos" -> "Animales/Cabezas", "Rancho Alegre" -> "Hacienda La Primavera", "Control de Biomasa" -> "Pesaje de Ganado", etc.) en 9 archivos y sincronización de tests | M1 | explorer_survey_1 |
| 5 | Mobile Usability Linter Compliance | Subsanación de 38 reglas de `devbrain/no-truncate` (usar `fit-clamp`) y `devbrain/no-tiny-text` (mínimo `text-[11px]`) | M1 | spec_miner_survey_3 |
| 6 | Deterministic Withdrawal End Date Calculation | Cálculo automático en `backend/app/models/treatments.py` de `withdrawal_end_date = treatment_date + timedelta(days=withdrawal_days)` cuando `withdrawal_days > 0` | M2 | explorer_survey_2 |
| 7 | Milk Withdrawal Protection Enforcement | Verificación de que `MilkProduction._validate_and_normalize` alerte y descarte leche producida bajo retiro sanitario activo | M2 | explorer_survey_2 |
| 8 | Monorepo Hygiene & Loose Files Clean-up | Reubicación/eliminación de archivos sueltos (`.coverage`, `frontend/test_mobile.png`, `frontend/vite.config.test.ts`) para pase limpio de `Test-VillaLuzProjectHygiene.ps1` | M2 | spec_miner_survey_3 |
| 9 | Single Detail Modal URL Navigation | Verificación de que `/admin/animals/:id` opera mediante `useAnimalDetails` con limpieza de URL y sin modales duplicados | M3 | explorer_survey_2 |
| 10 | Batch Weighing & ADG Calculation Suite | Pruebas integrales de pesaje por lotes (`BatchWeightModal.tsx` y `animals_namespace.py`) con cálculo determinista de Ganancia Diaria de Peso | M3 | explorer_survey_2 |
| 11 | E2E Testing Suite (Tiers 1-4) | Suite completa de pruebas E2E para inventario, sanidad, pesaje y alertas, emitiendo `TEST_READY.md` | E2E-Track | ORIGINAL_REQUEST |
| 12 | Final Verification & Forensic Audit | Aprobación de compuertas: `type-check`, `pytest`, `Test-VillaLuzProjectHygiene.ps1`, `deploy_check.py` (33/33) y Forensic Audit CLEAN | M3 | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Frontend SSoT Modales & Mobile Usability | Features 1, 2, 3, 4, 5 (Modales p-6, despeje (X), touch targets, terminología es-CO, linter móvil) | none | DONE |
| M2 | Backend Retiro Determinista & Higiene | Features 6, 7, 8 (Cálculo retiro en tratamientos, descarte de leche, limpieza de archivos sueltos) | none | DONE |
| E2E | E2E Testing Track | Feature 11 (Diseño de arnés y pruebas Tiers 1-4, publicación de `TEST_READY.md`) | none | DONE |
| M3 | Final E2E Pass & Forensic Audit | Features 9, 10, 12 (Pase 100% E2E tests, suite de pesaje/navegación, compuertas completas y Forensic Audit) | M1, M2, E2E | DONE |

## Interface Contracts
### Treatments ↔ MilkProduction (Sanidad y Descarte)
- En `Treatments._validate_and_normalize(data)`:
  - Si `data.get("withdrawal_days")` > 0 y `data.get("withdrawal_end_date")` es None:
    `data["withdrawal_end_date"] = parse_date(data["treatment_date"]) + timedelta(days=int(data["withdrawal_days"]))`
  - Garantiza que `MilkProduction._validate_and_normalize` detecte retiros activos con `withdrawal_end_date >= target_date`.

### DialogContent ↔ DialogHeader (SSoT Modales)
- `DialogContent`: `p-6`, `rounded-2xl` o `rounded-xl`, `max-h-[90dvh] overflow-y-auto`.
- `DialogHeader`: `pr-9 sm:pr-10` o `pr-14 sm:pr-16` para modales con badges superiores, evitando colisiones con botón `(X)` absoluto de 44x44px.

## Code Layout
- `frontend/src/shared/ui/`: Componentes base (dialog, button, input, tabs).
- `frontend/src/features/animal-bulk-actions/`: Modales masivos (BatchWeightModal, BatchVaccinationModal, etc.).
- `frontend/src/pages/dashboard/`: Páginas y vistas por rol (admin, campesino, etc.).
- `backend/app/models/`: Modelos SQLAlchemy con `_validate_and_normalize` (treatments.py, milk_production.py, control.py).
- `backend/app/namespaces/`: Endpoints REST Flask-RestX (health, animals).
- `backend/tests/`: Pruebas automatizadas pytest.
- `scripts/`: Scripts de validación y despliegue (Test-VillaLuzProjectHygiene.ps1, deploy_check.py).
