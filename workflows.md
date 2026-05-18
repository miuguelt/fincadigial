# DevBrain Workflows — Villa Luz

## 1. Sesión de Desarrollo (Fluidez)
Antes de empezar a codificar, ejecutar el Guardián para asegurar que el entorno es correcto:
```bash
npm run health
```
Este comando verifica puertos (8092/3005) y conectividad de base de datos.

## 2. Validación de Datos
Si entras al sistema y las vistas están vacías, pobla el tenant actual:
```bash
python backend/seed_100.py
```

## 3. Flujo de Git (Audit-First)
1. **Audit:** Correr tests unitarios antes de cada commit.
   - Backend: `pytest`
   - Frontend: `npm test`
2. **Commit:** Mensajes atómicos siguiendo Conventional Commits.
3. **Push:** Solo si el SCORE del sistema es > 85% en `TEST_EVERYTHING_FINAL.py`.

## 4. Recuperación de Servicios (Fix)
Si la API no responde (401 o 500):
1. Verificar `backend/.env` (DB_PORT=5435).
2. Sincronizar secuencias: `python backend/fix_sequences.py`.
3. Reiniciar orquestador: `python backend/run.py`.

## 5. Deployment
- El proyecto es **Coolify-Ready**.
- Usar `docker-compose.yml` para ambientes de staging/prod.
