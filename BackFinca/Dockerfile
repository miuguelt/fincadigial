# ════════════════════════════════════════════════════════════════════════
# BACKEND — Multi-Stage Dockerfile (Producción)
# ════════════════════════════════════════════════════════════════════════
# Stage 1: Builder     → Instala dependencias con compiladores
# Stage 2: Production  → Solo el runtime, sin gcc ni herramientas de dev
#
# Resultado: imagen ~250MB vs ~600MB sin multi-stage
# ════════════════════════════════════════════════════════════════════════

# ── Stage 1: Dependencias ──────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Herramientas de compilación necesarias para psycopg2, gevent, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-prod.txt .

# Instalar en un directorio aislado para copiar al stage final
RUN pip install --no-cache-dir --prefix=/install -r requirements-prod.txt

# ── Stage 2: Producción ────────────────────────────────────────────────
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    FLASK_ENV=production

WORKDIR /app

# Solo runtime libs de sistema (sin gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar site-packages del builder
COPY --from=builder /install /usr/local

# Copiar el código fuente
COPY . .

# Usuario no-root para seguridad
RUN useradd --no-create-home --shell /bin/false appuser \
    && mkdir -p /app/static/uploads /app/maintenance /app/logs \
    && chown -R appuser:appuser /app

USER appuser

# Puerto de aplicación
EXPOSE 8081

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -fsS http://localhost:8081/api/v1/health || exit 1

# Comando por defecto (sobreescrito en docker-compose por los parámetros reales)
CMD ["gunicorn", \
     "--preload", \
     "--worker-class", "gevent", \
     "--workers", "2", \
     "--worker-connections", "200", \
     "--timeout", "120", \
     "--bind", "0.0.0.0:8081", \
     "wsgi:app"]
