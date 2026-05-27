# DevBrain Project Rules
- Encoding: UTF-8
- Pattern: Atomic Brick (Additive changes only)
- Documentation: Always update /docs
- Logging: All critical logs to /maintenance
- Standards: WCAG AA for UI, ES Modules for JS, PEP8 for Python
- DB_FIRST: IA genera contenido en desarrollo (APP_ENV=development) y lo guarda en PostgreSQL.
- NO_AI_RUNTIME: En produccion (APP_ENV=production), prohibido llamar a APIs de IA en runtime.
- LOCAL_PG: Desarrollo local siempre conecta a PostgreSQL local (Docker WSL). Nunca produccion.
- ENV_VARS: Obligatorio USE_AI_CONTENT_GENERATION, DATABASE_URL y PRODUCTION_DATABASE_URL.
