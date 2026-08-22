# ════════════════════════════════════════════════════════════════════════
# FINCA VILLA LUZ — Multi-Stage Production Dockerfile (Raíz)
# ════════════════════════════════════════════════════════════════════════
# Stage 1: Build Frontend (Vite + React SPA)
# Stage 2: Build Backend Dependencies (Python wheels)
# Stage 3: Runtime de Producción (Gunicorn + Gevent)
# ════════════════════════════════════════════════════════════════════════

# ── Stage 1: Frontend Build ───────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

ARG VITE_RUNTIME_ENV=production
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_FRONTEND_URL
ARG VITE_USE_BEARER_AUTH=true

ENV VITE_RUNTIME_ENV=${VITE_RUNTIME_ENV} \
    NODE_ENV=production \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_FRONTEND_URL=${VITE_FRONTEND_URL} \
    VITE_USE_BEARER_AUTH=${VITE_USE_BEARER_AUTH}

COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund --include=dev

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend Dependencies ─────────────────────────────────────
FROM python:3.11-slim AS backend-builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements-prod.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-prod.txt

# ── Stage 3: Production Runtime ───────────────────────────────────────
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    FLASK_ENV=production \
    PORT=8081

WORKDIR /app

# Dependencias mínimas de sistema para runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias de Python precompiladas
COPY --from=backend-builder /install /usr/local

# Copiar código fuente del backend
COPY backend/ /app/

# Copiar build del frontend (para fallback o servicio directo)
COPY --from=frontend-builder /app/frontend/dist /app/static/dist

# Crear directorios para uploads, mantenimiento y logs con permisos de usuario no-root
RUN useradd --no-create-home --shell /bin/false appuser \
    && mkdir -p /app/static/uploads /app/maintenance /app/logs \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -fsS http://localhost:8081/api/v1/health || exit 1

CMD ["gunicorn", \
     "--preload", \
     "--worker-class", "gevent", \
     "--workers", "2", \
     "--worker-connections", "200", \
     "--timeout", "120", \
     "--bind", "0.0.0.0:8081", \
     "wsgi:app"]
