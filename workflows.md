# DevBrain Workflows — Villa Luz

## 1. Sesión de Desarrollo (Fluidez)
Antes de empezar a codificar, ejecutar el Guardián para asegurar que el entorno es correcto:
```powershell
npm run health
```
Este comando verifica el frontend en 3005 y la conectividad local canónica.

## 2. Validación de Datos
Si entras al sistema y las vistas están vacías, pobla el tenant actual:
```powershell
python backend/maintenance/db_audit_and_seed.py --audit-only
```
El seed sintético solo se ejecuta con autorización explícita y sobre una base
de pruebas: `ALLOW_SIMULATION_SCRIPTS=true`.

## 3. Flujo de Git (Audit-First)
1. **Audit:** Correr tests unitarios antes de cada commit.
   - Backend: `npm run test:backend`
   - Frontend: `npm run test:frontend`
   - Estructura: `npm run hygiene`
2. **Commit:** Mensajes atómicos siguiendo Conventional Commits.
3. **Push:** Solo si el SCORE del sistema es > 85% en `TEST_EVERYTHING_FINAL.py`.

## 4. Recuperación de Servicios (Fix)
Si la API no responde (401 o 500):
1. Verificar `backend/.env` (PostgreSQL local en el puerto 5434).
2. Ejecutar la reparación específica documentada en `backend/maintenance/`.
3. Reiniciar el backend mediante el entrypoint Windows del proyecto.

## 5. Deployment
- El proyecto es **Coolify-Ready**.
- Usar `docker-compose.yml` para ambientes de staging/prod.
