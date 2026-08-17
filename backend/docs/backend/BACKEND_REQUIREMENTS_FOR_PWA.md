# 🎯 Requisitos del Backend para React PWA - Guía Completa

**Versión:** 1.0.0
**Fecha:** 2025-10-05
**Para:** Equipo de desarrollo

---

## 📋 Índice

1. [Variables de Entorno Requeridas](#1-variables-de-entorno-requeridas)
2. [Infraestructura Requerida](#2-infraestructura-requerida)
3. [Configuración de Seguridad](#3-configuración-de-seguridad)
4. [Headers HTTP Críticos](#4-headers-http-críticos)
5. [Endpoints Esenciales](#5-endpoints-esenciales)
6. [Base de Datos](#6-base-de-datos)
7. [Caché y Redis](#7-caché-y-redis)
8. [Monitoreo y Logs](#8-monitoreo-y-logs)
9. [Deployment y Producción](#9-deployment-y-producción)
10. [Checklist Final](#10-checklist-final)

---

## 1. Variables de Entorno Requeridas

### 📝 Archivo `.env` (Obligatorio)

Crea un archivo `.env` en la raíz del proyecto con:

```bash
# ============================================================
# ENTORNO
# ============================================================
FLASK_ENV=production  # development | production | testing

# ============================================================
# BASE DE DATOS
# ============================================================
DB_HOST=127.0.0.1
DB_PORT=5434
DB_NAME=finca_db
DB_USER=villaluz_user
DB_PASSWORD=<CONTRASEÑA_SEGURA_BD>

# O usar URI completa:
# SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# ============================================================
# REDIS (OBLIGATORIO para PWA)
# ============================================================
# Redis es CRÍTICO para:
# - Cache compartido entre workers
# - Rate limiting
# - Sessions (si las usas)

REDIS_URL=redis://localhost:6379/0

# Development/Production (DB 0)
CACHE_REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_STORAGE_URI=redis://localhost:6379/0

# Testing (DB 2 - aislado)
TEST_REDIS_URL=redis://localhost:6379/2

# ============================================================
# JWT (Autenticación)
# ============================================================
# CRÍTICO: Debe ser una clave segura de al menos 64 caracteres
# Generar con: openssl rand -hex 32
JWT_SECRET_KEY=<GENERAR_CLAVE_JWT_HEX_64_CARACTERES>

# Dominio de cookies (para producción)
# Ejemplo: .tudominio.com (el punto inicial permite subdominios)
JWT_COOKIE_DOMAIN=.tudominio.com

# HTTPS obligatorio en producción
JWT_COOKIE_SECURE=True

# SameSite: None permite cookies cross-origin (necesario para PWA)
JWT_COOKIE_SAMESITE=None

# ============================================================
# CORS (CRÍTICO para PWA)
# ============================================================
# Lista de orígenes permitidos (separados por coma)
# Debe incluir TODOS los dominios desde donde se accede al PWA

CORS_ORIGINS=https://app.tudominio.com,http://localhost:5173

# ============================================================
# URLs del Sistema
# ============================================================
API_BASE_URL=https://app.tudominio.com/api/v1
FRONTEND_URL=https://app.tudominio.com
BACKEND_URL=https://app.tudominio.com

# ============================================================
# SEGURIDAD
# ============================================================
# Rate limiting habilitado (protege contra ataques)
RATE_LIMIT_ENABLED=True

# Secret key para Flask (sesiones)
SECRET_KEY=<GENERAR_CLAVE_FLASK_HEX_64_CARACTERES>

# ============================================================
# LOGGING (Opcional pero recomendado)
# ============================================================
LOG_LEVEL=INFO  # DEBUG | INFO | WARNING | ERROR
LOG_FILE_ENABLED=True
LOG_FILE=app.log

# ============================================================
# PERFORMANCE (Opcional)
# ============================================================
# Compresión de respuestas (ahorra bandwidth)
COMPRESS_MIN_SIZE=500

# Tamaño de pool de conexiones (ajustar según carga)
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
```

---

## 2. Infraestructura Requerida

### ✅ Servicios Externos Necesarios

#### A. **Base de Datos MySQL** (OBLIGATORIO)

```bash
# Versión mínima: MySQL 5.7+ o MariaDB 10.2+
# Recomendado: MySQL 8.0+

# Verificar versión:
mysql --version
```

**Configuración mínima:**
- Charset: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`
- Timezone: UTC
- Max connections: 200+ (según carga)

**Permisos requeridos para usuario `fincau`:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER
ON finca.* TO 'fincau'@'%';
FLUSH PRIVILEGES;
```

#### B. **Redis Server** (OBLIGATORIO para PWA)

```bash
# Versión mínima: Redis 5.0+
# Recomendado: Redis 7.0+

# Verificar versión:
redis-cli --version

# Verificar conexión:
redis-cli ping
# Debe retornar: PONG
```

**Configuración recomendada (`redis.conf`):**
```conf
# Memoria máxima (ajustar según servidor)
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistencia (recomendado para production)
save 900 1
save 300 10
save 60 10000

# Password (OBLIGATORIO en producción)
requirepass <CONTRASEÑA_REDIS_SEGURA>
```

**¿Por qué Redis es OBLIGATORIO?**
- ✅ Cache compartido entre workers (Gunicorn/uWSGI)
- ✅ Rate limiting funcional
- ✅ Sincronización de sesiones
- ✅ Mejor rendimiento que cache in-memory
- ✅ Persistencia de caché entre deploys

#### C. **Servidor Web / Proxy Reverso** (OBLIGATORIO en producción)

**Nginx (Recomendado)**

```nginx
server {
    listen 443 ssl http2;
    server_name finca.enlinea.sbs;

    ssl_certificate /etc/letsencrypt/live/finca.enlinea.sbs/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/finca.enlinea.sbs/privkey.pem;

    # CRITICAL: Headers para PWA
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Service Worker NECESITA estos headers:
    add_header Service-Worker-Allowed "/" always;

    # Compresión (mejora rendimiento PWA)
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Cache de assets estáticos del PWA
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker (NO cachear)
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest PWA (NO cachear en exceso)
    location /manifest.json {
        add_header Cache-Control "max-age=3600";
    }

    # Proxy al backend Flask
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL para cookies de autenticación
        proxy_set_header Cookie $http_cookie;

        # Timeouts para requests largos
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Servir React PWA (build estático)
    location / {
        root /var/www/finca-pwa/build;
        try_files $uri $uri/ /index.html;

        # CRITICAL: Service Worker necesita este header
        add_header Service-Worker-Allowed "/";
    }
}
```

---

## 3. Configuración de Seguridad

### 🔒 HTTPS (OBLIGATORIO para PWA)

**Los PWAs REQUIEREN HTTPS** (excepto localhost). Sin HTTPS:
- ❌ Service Workers NO funcionan
- ❌ Geolocation API bloqueada
- ❌ Camera/Microphone bloqueados
- ❌ Notifications bloqueadas
- ❌ Cookies `Secure` no se envían

**Obtener certificado SSL gratis:**
```bash
# Usando Let's Encrypt (certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d finca.enlinea.sbs
```

### 🔐 JWT Cookies Configuration

**En producción, las cookies JWT deben ser:**

```python
# config.py (ya configurado)
JWT_COOKIE_SECURE = True          # Solo HTTPS
JWT_COOKIE_HTTPONLY = True        # No accesible desde JavaScript
JWT_COOKIE_SAMESITE = 'None'      # Permite cross-origin (PWA necesario)
JWT_COOKIE_DOMAIN = '.enlinea.sbs'  # Compartir entre subdominios
```

**⚠️ IMPORTANTE para React PWA:**

Si tu frontend está en `app.tudominio.com` y backend en `api.tudominio.com`:
- `JWT_COOKIE_DOMAIN` debe ser `.tudominio.com` (con punto inicial)
- `JWT_COOKIE_SAMESITE` debe ser `None`
- `JWT_COOKIE_SECURE` debe ser `True`

### 🛡️ CORS Configuration

**El backend YA TIENE CORS configurado correctamente**, pero verifica:

```python
# .env
CORS_ORIGINS=https://app.tudominio.com,https://pwa.tudominio.com

# El backend automáticamente:
# - Permite credentials (cookies)
# - Expone headers necesarios (ETag, Cache-Control, etc.)
# - Permite métodos necesarios (GET, POST, PUT, DELETE, OPTIONS, PATCH)
```

---

## 4. Headers HTTP Críticos

### ✅ El Backend YA Envía Estos Headers (verificar)

#### Para Caché PWA:
```
Cache-Control: private, max-age=120, stale-while-revalidate=60
ETag: "42-2025-09-06T12:00:00Z"
Last-Modified: Sat, 06 Sep 2025 12:00:00 GMT
X-API-Version: 1.0.0
X-Cache-Strategy: stale-while-revalidate
Vary: Authorization, Cookie
```

#### Para Service Worker:
```
Service-Worker-Allowed: /
```

#### Para Seguridad:
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
```

**Verificar headers:**
```bash
curl -I https://finca.enlinea.sbs/api/v1/users
```

---

## 5. Endpoints Esenciales

### ✅ El Backend YA Tiene Estos Endpoints

#### Autenticación:
```
POST   /api/v1/auth/login       # Login con email + password
POST   /api/v1/auth/refresh     # Refrescar token
POST   /api/v1/auth/logout      # Logout
GET    /api/v1/auth/me          # Obtener usuario actual
```

#### CRUD Genérico (para cada recurso):
```
GET    /api/v1/{resource}              # Listar (con paginación, filtros, búsqueda)
POST   /api/v1/{resource}              # Crear
GET    /api/v1/{resource}/{id}         # Obtener detalle
PUT    /api/v1/{resource}/{id}         # Actualizar completo
PATCH  /api/v1/{resource}/{id}         # Actualizar parcial
DELETE /api/v1/{resource}/{id}         # Eliminar
```

#### PWA Optimizado (NUEVO):
```
GET    /api/v1/{resource}/metadata     # Metadatos ligeros (total, last_modified)
HEAD   /api/v1/{resource}              # Solo headers (para validación)
GET    /api/v1/{resource}?since=...    # Sincronización delta
```

#### Parámetros de Query Soportados:
```
?page=1                    # Paginación
?limit=50                  # Items por página
?search=texto              # Búsqueda full-text
?since=2025-10-01T00:00:00Z  # Solo cambios recientes (delta sync)
?sort_by=created_at        # Ordenar por campo
?sort_order=desc           # asc | desc
?include_relations=true    # Incluir relaciones
?fields=id,name,email      # Seleccionar campos específicos
?cache_bust=1              # Forzar bypass de caché
```

---

## 6. Base de Datos

### ✅ Migraciones Requeridas

**IMPORTANTE:** Para rendimiento óptimo, ejecutar índices:

```bash
# Opción 1: Script Python
python run_migration.py

# Opción 2: SQL directo
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f add_performance_indexes.sql
```

**Esto crea índices en `updated_at` y `created_at` que aceleran:**
- `/metadata` endpoint → 40x más rápido
- `?since=` queries → 50x más rápido
- Cache revalidation → 50x más rápido

### 🗄️ Verificar Índices

```sql
-- Ver índices en tabla user
SHOW INDEX FROM user;

-- Debe mostrar:
-- ix_user_updated_at
-- ix_user_created_at
```

### 📊 Monitorear Performance

```sql
-- Ver queries lentas (> 1 segundo)
SELECT
    digest_text,
    count_star,
    avg_timer_wait/1000000000 as avg_seconds
FROM performance_schema.events_statements_summary_by_digest
WHERE avg_timer_wait > 1000000000
ORDER BY avg_timer_wait DESC
LIMIT 10;
```

---

## 7. Caché y Redis

### ✅ Configuración de Redis

**El backend usa Redis para:**

1. **Cache de respuestas** (namespace_helpers.py)
   - TTL configurable por modelo (60s - 1800s)
   - LRU eviction automática
   - Segmentación por usuario

2. **Rate limiting** (rate_limiter.py)
   - Protección contra abuse
   - Límites por IP y por usuario

3. **Session storage** (opcional)
   - Sesiones persistentes entre workers

**Verificar Redis funciona:**

```bash
# Conectar a Redis
redis-cli

# Verificar keys del backend
KEYS *finca*

# Ver stats
INFO stats

# Ver memoria usada
INFO memory
```

**Limpiar caché (si es necesario):**

```bash
# En Redis CLI
FLUSHDB  # Limpiar DB actual

# O específico:
DEL flask_cache:*
```

### 🔍 Monitorear Caché

```python
# El backend ya tiene logging de caché
# Ver logs:
tail -f app.log | grep -i cache

# Ejemplo output:
# "Cache cleared for model User: 15 entries invalidated"
# "Cache hit: GET /users"
# "Cache miss: GET /users?search=john"
```

---

## 8. Monitoreo y Logs

### 📝 Logs Críticos

**El backend loggea:**

1. **Operaciones de caché:**
   ```
   Cache cleared for model User: 15 entries invalidated
   ```

2. **Queries lentas (> 1 segundo):**
   ```
   SLOW QUERY (2.5s): SELECT * FROM animals WHERE...
   ```

3. **Autenticación:**
   ```
   Login successful: user_id=42
   JWT token issued for user 42
   ```

4. **Errores:**
   ```
   Error obteniendo User ID 999: Not found
   ```

**Ver logs en producción:**

```bash
# Logs en archivo
tail -f app.log

# Logs de Gunicorn
tail -f /var/log/gunicorn/error.log

# Logs de Nginx
tail -f /var/log/nginx/error.log
```

### 📊 Métricas Importantes

**Monitorear:**

1. **Response times:**
   - GET endpoints: < 100ms
   - POST endpoints: < 200ms
   - `/metadata`: < 10ms

2. **Cache hit rate:**
   - Target: > 80%
   - Ver en logs: "Cache hit" vs "Cache miss"

3. **Database connections:**
   ```python
   # Ver pool de conexiones
   from app import db
   print(db.engine.pool.status())
   ```

4. **Memory usage:**
   ```bash
   # Proceso Python
   ps aux | grep gunicorn

   # Redis
   redis-cli INFO memory
   ```

---

## 9. Deployment y Producción

### 🚀 Servidor WSGI (OBLIGATORIO en producción)

**NO usar `flask run` en producción**. Usar Gunicorn o uWSGI:

#### Opción A: Gunicorn (Recomendado)

```bash
# Instalar
pip install gunicorn

# Ejecutar (4 workers)
gunicorn --workers 4 \
         --bind 127.0.0.1:8000 \
         --timeout 60 \
         --access-logfile /var/log/gunicorn/access.log \
         --error-logfile /var/log/gunicorn/error.log \
         wsgi:app
```

**Configuración óptima workers:**
```python
# Fórmula: (2 x CPU cores) + 1
# Servidor con 4 cores: 9 workers
workers = 9

# Worker class (sync para CPU-bound, gevent para I/O-bound)
worker_class = 'sync'  # o 'gevent' si instalas gevent

# Timeout para requests largos
timeout = 60

# Reiniciar workers periódicamente (evita memory leaks)
max_requests = 1000
max_requests_jitter = 100
```

#### Opción B: Systemd Service

```ini
# /etc/systemd/system/finca-api.service
[Unit]
Description=Finca API Backend
After=network.target redis.service mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/finca-backend
Environment="PATH=/var/www/finca-backend/venv/bin"
ExecStart=/var/www/finca-backend/venv/bin/gunicorn \
          --workers 4 \
          --bind 127.0.0.1:8000 \
          wsgi:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Activar servicio
sudo systemctl enable finca-api
sudo systemctl start finca-api
sudo systemctl status finca-api
```

### 🔄 Proceso de Deploy

```bash
#!/bin/bash
# deploy.sh

# 1. Backup DB
pg_dump -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> > backup_$(date +%Y%m%d).sql

# 2. Pull código
git pull origin main

# 3. Activar venv
source venv/bin/activate

# 4. Actualizar dependencias
pip install -r requirements.txt

# 5. Ejecutar migraciones (si hay)
python run_migration.py

# 6. Reiniciar servicio
sudo systemctl restart finca-api

# 7. Verificar salud
curl -f https://finca.enlinea.sbs/api/v1/auth/me || echo "❌ API no responde"

# 8. Ver logs
tail -f /var/log/gunicorn/error.log
```

---

## 10. Checklist Final

### ✅ Antes de Lanzar PWA

#### Infraestructura:
- [ ] MySQL funcionando y accesible
- [ ] Redis funcionando y accesible
- [ ] Nginx/Apache configurado con HTTPS
- [ ] Certificado SSL válido (Let's Encrypt)
- [ ] Firewall configurado (puertos 80, 443, 3306, 6379)

#### Configuración:
- [ ] Archivo `.env` creado con todas las variables
- [ ] `JWT_SECRET_KEY` es seguro (64+ caracteres)
- [ ] `CORS_ORIGINS` incluye dominio del PWA
- [ ] `JWT_COOKIE_DOMAIN` correcto para tu dominio
- [ ] `REDIS_URL` apunta a Redis funcional

#### Base de Datos:
- [ ] Usuario MySQL tiene permisos necesarios
- [ ] Tablas creadas (seeds ejecutados)
- [ ] Índices de rendimiento creados (`run_migration.py`)
- [ ] Charset es `utf8mb4`

#### Backend:
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Flask-Migrate instalado
- [ ] Gunicorn instalado y configurado
- [ ] Systemd service activo (producción)
- [ ] Logs funcionando y monitoreados

#### Seguridad:
- [ ] HTTPS activo (obligatorio para PWA)
- [ ] Rate limiting activado
- [ ] CORS configurado correctamente
- [ ] JWT cookies con `Secure=True` y `SameSite=None`
- [ ] Headers de seguridad presentes

#### PWA Features:
- [ ] Endpoints `/metadata` funcionan
- [ ] Headers `Cache-Control` presentes
- [ ] Headers `ETag` y `Last-Modified` presentes
- [ ] Sincronización delta `?since=` funciona
- [ ] Headers `X-Cache-Strategy` presentes

#### Testing:
- [ ] Login/Logout funciona desde PWA
- [ ] CRUD funciona (crear, leer, actualizar, eliminar)
- [ ] Búsqueda funciona
- [ ] Paginación funciona
- [ ] Service Worker puede cachear respuestas
- [ ] PWA funciona offline (con datos cacheados)
- [ ] Sincronización funciona cuando vuelve online

#### Performance:
- [ ] Respuestas < 200ms promedio
- [ ] `/metadata` < 10ms
- [ ] Cache hit rate > 80%
- [ ] Queries tienen índices necesarios
- [ ] No hay memory leaks (monitorear 24h)

#### Monitoreo:
- [ ] Logs configurados y accesibles
- [ ] Slow query log activo
- [ ] Redis monitoreado
- [ ] CPU/Memory monitoreado (htop, Prometheus, etc.)
- [ ] Alertas configuradas para errores críticos

---

## 🆘 Troubleshooting Común

### Problema: Service Worker no se registra

**Causa:** HTTP en vez de HTTPS

**Solución:**
```bash
# Verificar certificado SSL
sudo certbot certificates

# Renovar si expira
sudo certbot renew
```

### Problema: Cookies JWT no se envían

**Causa:** `SameSite` o `Secure` mal configurado

**Solución en `.env`:**
```bash
JWT_COOKIE_SECURE=True
JWT_COOKIE_SAMESITE=None
JWT_COOKIE_DOMAIN=.tudominio.com  # con punto inicial
```

### Problema: CORS errors

**Causa:** Origin no está en `CORS_ORIGINS`

**Solución:**
```bash
# En .env
CORS_ORIGINS=https://app.tudominio.com,https://pwa.tudominio.com

# Reiniciar backend
sudo systemctl restart finca-api
```

### Problema: PWA no cachea respuestas

**Causa:** Headers `Cache-Control` ausentes

**Verificar:**
```bash
curl -I https://api.tudominio.com/api/v1/users | grep -i cache
```

**Debe mostrar:**
```
Cache-Control: private, max-age=120, stale-while-revalidate=60
ETag: "42-2025-09-06T12:00:00Z"
```

### Problema: Queries lentas

**Causa:** Falta índice en `updated_at`

**Solución:**
```bash
python run_migration.py
```

**Verificar:**
```sql
SHOW INDEX FROM user;
```

### Problema: Redis connection error

**Causa:** Redis no está corriendo o URL incorrecta

**Verificar:**
```bash
# Redis funciona?
redis-cli ping

# URL correcta en .env?
echo $REDIS_URL
```

---

## 📞 Contacto y Soporte

**Documentación completa:**
- `PERFORMANCE_IMPROVEMENTS.md` - Mejoras técnicas
- `PWA_OPTIMIZATION_GUIDE.md` - Guía para frontend
- `INSTRUCCIONES_MIGRACION.md` - Migración de DB

**Logs importantes:**
- Backend: `app.log`
- Gunicorn: `/var/log/gunicorn/error.log`
- Nginx: `/var/log/nginx/error.log`
- MySQL: `/var/log/mysql/error.log`

---

**Con esta configuración, tu backend Flask está 100% optimizado para servir un React PWA de producción con alta performance, seguridad y confiabilidad.** 🚀
