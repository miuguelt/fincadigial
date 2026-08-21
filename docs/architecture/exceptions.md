# Excepciones temporales de modularidad

Estas excepciones describen deuda existente; no autorizan agregar capacidades
nuevas a los archivos indicados ni elevar sus límites.

| Área | Archivo | Estado | Plan |
| --- | --- | --- | --- |
| Scripts | `scripts/cleanup_simulated_data.py` | 999 líneas, script legado de datos sintéticos | Separar preparación, ejecución y verificación antes de volver a usarlo en desarrollo normal. |
| Backend ops | `backend/maintenance/db_audit_and_seed.py` | 823 líneas, auditoría/seed histórica | Extraer auditoría de lectura y seed autorizado en comandos independientes. |
| Backend ops | `backend/maintenance/verify_data_integrity.py` | 409 líneas, verificación histórica | Separar verificadores por agregado y dejar un runner delgado. |
| Backend | `backend/app/utils/health_check.py` | 534 líneas, legado no funcionalmente dividido | Extraer checks por dependencia cuando se toque por una razón distinta. |
| Backend | `backend/app/services/alert_engine.py` | 914 líneas, motor legado | Separar reglas, evaluación y persistencia mediante seams probados. |
| Frontend | `frontend/src/widgets/admin-crud/ui/AdminCRUDPage.tsx` | 969 líneas, componente legado | Extraer coordinación de datos y secciones visuales antes de añadir UI. |
| Frontend | `frontend/src/pages/auth/login/index.tsx` | 548 líneas, flujo legado | Extraer validación, estado de sesión y presentación en cambios futuros. |
| Backend | `backend/app/models/animals.py` | 1113 líneas, modelo legado sobre el baseline | La identificación electrónica se extrajo a `electronic_id_mixin.py`; el archivo solo conserva el cableado. Siguientes seams: genealogía, métricas derivadas y operaciones por lote. |

Propietario: equipo VillaLuz/DevBrain. Revisión: cada cambio que toque uno de
estos archivos debe incluir una extracción o demostrar que no aumenta su
tamaño ni mezcla responsabilidades.

El inventario completo de archivos que ya superan el umbral se conserva en
`.devbrain/modularity-baseline.json`. Ese baseline no es permiso para crecer:
solo convierte la deuda existente en una línea de referencia reproducible. El
gate `npm run modularity:changed` falla si un archivo baseline crece o si una
capacidad nueva nace sobredimensionada. La reducción se hará por seams
verticales cuando cada archivo se toque por una razón funcional real.
