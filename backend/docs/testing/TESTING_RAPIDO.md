# 🧪 TESTING RÁPIDO - Nuevas Funcionalidades

**Documento**: Guía rápida de testing para verificar implementación
**Tiempo**: 5-10 minutos
**Requisitos**: Servidor corriendo en `http://localhost:8081`

---

## 🚀 INICIO RÁPIDO

### 1. Verificar Servidor Activo

```bash
# Windows PowerShell
curl http://localhost:8081/api/v1/health
```

**Respuesta esperada**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "cache": "available"
  }
}
```

---

## 🗺️ TESTING: Navegación Dinámica

### Endpoint: GET /api/v1/navigation/structure

**Sin autenticación requerida** ✅

```bash
# PowerShell
curl http://localhost:8081/api/v1/navigation/structure | ConvertFrom-Json | ConvertTo-Json -Depth 10

# O simplemente en navegador:
# http://localhost:8081/api/v1/navigation/structure
```

**Qué verificar**:
- ✅ `success: true`
- ✅ `data.version: "1.0"`
- ✅ `data.groups` es un array con ~21 elementos
- ✅ Cada grupo tiene: `id`, `name`, `icon`, `path`, `endpoints`, `count`

**Ejemplo de grupo**:
```json
{
  "id": "animals",
  "name": "🐄 Gestión de Animales - CRUD de animales",
  "description": "🐄 Gestión de Animales - CRUD de animales",
  "icon": "🐄",
  "path": "/animals",
  "endpoints": [
    {
      "method": "GET",
      "path": "/animals/",
      "description": "Listar todos los animales",
      "requires_auth": true,
      "permissions": []
    }
  ],
  "count": 8
}
```

### Endpoint: GET /api/v1/navigation/quick-access

**Sin autenticación requerida** ✅

```bash
curl http://localhost:8081/api/v1/navigation/quick-access
```

**Qué verificar**:
- ✅ `success: true`
- ✅ `data.endpoints` array con 8 elementos
- ✅ `data.count: 8`
- ✅ Cada endpoint tiene: `name`, `path`, `method`, `icon`, `description`

**Endpoints esperados**:
1. Dashboard Analytics
2. Listado de Animales
3. Alertas del Sistema
4. Registrar Animal
5. Controles de Salud
6. Vacunaciones
7. Health Check
8. Mis Favoritos

---

## 👤 TESTING: Preferencias de Usuario

**Autenticación JWT requerida** 🔐

### Paso 1: Obtener Token

```bash
# Login como admin (ajustar credenciales según tu usuario)
curl -X POST http://localhost:8081/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"identification":"<IDENTIFICACION>","password":"<CONTRASEÑA>"}'
```

**Guardar el token de la respuesta**:
```json
{
  "success": true,
  "data": {
    "access_token": "<TU_TOKEN_JWT_AQUI>",  // ← COPIAR ESTO
    "user": { ... }
  }
}
```

### Paso 2: Configurar Token

```powershell
# PowerShell
$token = "<TU_TOKEN_JWT_AQUI>"  # Tu token aquí
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

### Endpoint: GET /api/v1/preferences/favorites

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8081/api/v1/preferences/favorites" `
  -Headers $headers -Method GET
```

**Qué verificar**:
- ✅ `success: true`
- ✅ `data.favorites` array (puede estar vacío al inicio)
- ✅ `data.count: 0` (o cantidad de favoritos existentes)

### Endpoint: POST /api/v1/preferences/favorites

```powershell
# PowerShell - Agregar favorito
$body = @{
    endpoint = "/api/v1/animals/"
    label = "Mis Animales Favoritos"
    method = "GET"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/v1/preferences/favorites" `
  -Headers $headers -Method POST -Body $body
```

**Qué verificar**:
- ✅ `success: true`
- ✅ `data.id` existe (número auto-generado)
- ✅ `data.endpoint: "/api/v1/animals/"`
- ✅ `data.label: "Mis Animales Favoritos"`
- ✅ `data.created_at` existe con timestamp

### Endpoint: GET /api/v1/preferences/history

```powershell
# PowerShell - Ver historial (últimos 5)
Invoke-RestMethod -Uri "http://localhost:8081/api/v1/preferences/history?limit=5" `
  -Headers $headers -Method GET
```

**Qué verificar**:
- ✅ `success: true`
- ✅ `data.history` array
- ✅ `data.count` número total

### Endpoint: POST /api/v1/preferences/history

```powershell
# PowerShell - Agregar al historial
$body = @{
    endpoint = "/api/v1/analytics/dashboard/complete"
    method = "GET"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/v1/preferences/history" `
  -Headers $headers -Method POST -Body $body
```

### Endpoint: DELETE /api/v1/preferences/favorites

```powershell
# PowerShell - Limpiar todos los favoritos
Invoke-RestMethod -Uri "http://localhost:8081/api/v1/preferences/favorites" `
  -Headers $headers -Method DELETE
```

---

## 📊 TESTING: Swagger UI

**Método visual más fácil** ⭐

### 1. Abrir Swagger

```
http://localhost:8081/api/v1/
```

### 2. Buscar Nuevas Secciones

Scroll hacia abajo y buscar:

- **navigation** 🗺️
  - GET `/navigation/structure`
  - GET `/navigation/quick-access`

- **preferences** 👤
  - GET `/preferences/favorites`
  - POST `/preferences/favorites`
  - DELETE `/preferences/favorites`
  - DELETE `/preferences/favorites/{favorite_id}`
  - GET `/preferences/history`
  - POST `/preferences/history`

### 3. Probar desde Swagger

1. Click en el endpoint (ej: GET `/navigation/structure`)
2. Click en "Try it out"
3. Click en "Execute"
4. Ver respuesta abajo

**Para endpoints con 🔒**:
1. Click en "Authorize" arriba a la derecha
2. Pegar tu token JWT: `Bearer eyJ0eXAiOiJKV1Qi...`
3. Click "Authorize"
4. Ahora puedes ejecutar endpoints protegidos

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Backend API

- [ ] GET `/navigation/structure` retorna 21 grupos
- [ ] GET `/navigation/quick-access` retorna 8 endpoints
- [ ] GET `/preferences/favorites` requiere autenticación
- [ ] POST `/preferences/favorites` crea favorito correctamente
- [ ] GET `/preferences/history` retorna historial
- [ ] POST `/preferences/history` agrega entrada
- [ ] DELETE `/preferences/favorites` limpia todos
- [ ] Swagger UI muestra las nuevas secciones

### Cache

- [ ] Segunda llamada a `/navigation/structure` es más rápida (cache 1h)
- [ ] Segunda llamada a `/preferences/favorites` es más rápida (cache 5min)

### Errores Esperados

- [ ] Sin token JWT en `/preferences/*` → 401 Unauthorized ✅
- [ ] Token inválido → 422 Unprocessable Entity ✅
- [ ] POST sin campo `endpoint` → 400 Bad Request ✅

---

## 🐛 TROUBLESHOOTING

### Error: "Connection refused"
```
Solución: Verificar que el servidor esté corriendo
→ python wsgi.py
→ Debería mostrar: http://localhost:8081
```

### Error: "404 Not Found" en /preferences o /navigation
```
Solución: Namespaces no registrados
1. Verificar imports en app/api.py líneas 89-90
2. Verificar add_namespace en app/api.py líneas 123-124
3. Reiniciar servidor
```

### Error: "401 Unauthorized" en /preferences
```
Solución: Token JWT faltante o inválido
1. Hacer login: POST /api/v1/auth/login
2. Copiar access_token de la respuesta
3. Usar: Authorization: Bearer <token>
```

### Error: "500 Internal Server Error"
```
Solución: Ver logs del servidor
→ Buscar líneas con [ERROR]
→ Verificar que cache esté disponible
→ Verificar que archivos .py no tengan errores de sintaxis
```

### Respuesta vacía en /preferences/favorites
```
Normal: No has agregado favoritos aún
→ Usar POST /preferences/favorites para agregar
→ Luego GET debería retornar los favoritos
```

---

## 📈 TESTING DE PERFORMANCE

### Navegación (debe ser rápida por cache)

```bash
# Primera llamada (sin cache)
curl -w "\nTiempo: %{time_total}s\n" http://localhost:8081/api/v1/navigation/structure

# Segunda llamada (con cache, debería ser <0.01s)
curl -w "\nTiempo: %{time_total}s\n" http://localhost:8081/api/v1/navigation/structure
```

**Esperado**:
- Primera llamada: 0.05 - 0.15 segundos
- Segunda llamada: 0.001 - 0.01 segundos (90%+ más rápida)

### Favoritos (cache de 5 minutos)

```bash
# Con token configurado
curl -w "\nTiempo: %{time_total}s\n" \
  -H "Authorization: Bearer $token" \
  http://localhost:8081/api/v1/preferences/favorites
```

**Esperado**: < 0.05 segundos

---

## 🎯 PRÓXIMOS PASOS

Después de verificar que todo funciona:

1. **Aplicar migraciones de BD** (ver IMPLEMENTACION_COMPLETADA.md)
2. **Implementar frontend React** (ver VERIFICACION_Y_MEJORAS_COMPLETAS.md)
3. **Configurar Redis** para cache distribuido (opcional)
4. **Añadir tests unitarios** para nuevos endpoints

---

## 📞 COMANDOS ÚTILES

```bash
# Ver todas las rutas registradas
flask routes | grep -E "preferences|navigation"

# Ver logs en tiempo real
tail -f logs/app.log

# Verificar cache (si tienes redis-cli)
redis-cli
> KEYS *nav_structure*
> KEYS *favorites_*

# Limpiar cache manualmente
curl -X DELETE http://localhost:8081/api/v1/cache/clear \
  -H "Authorization: Bearer $token"
```

---

**Fin del documento** - Testing rápido completado ✅
