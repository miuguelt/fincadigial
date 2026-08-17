# 🌿 VillaLuz — Ecosistema de Configuración Unificada
> **Fuente de Verdad para IAs y Desarrolladores. Leer ANTES de modificar cualquier archivo.**
> Última actualización: 2026-05-02

---

## 🏗️ Arquitectura del Ecosistema

```
villaluz/
├── backend/          → Backend Flask (Python) — Puerto 8092
├── frontend/         → Frontend Vite/React    — Puerto 3005 (HTTPS)
├── ECOSYSTEM.md      → ← ESTE ARCHIVO (Fuente de Verdad)
├── IDENTITY.json     → Credenciales de prueba (auto-seeding)
```

---

## 🔌 Puertos y Servicios

| Servicio         | Puerto  | Protocolo | Notas                         |
| :--------------- | :------ | :-------- | :---------------------------- |
| **Backend Flask**| `8092`  | HTTP      | `run.py` en backend/          |
| **Frontend Vite**| `3005`  | HTTPS     | `npm run dev` en frontend/    |
| **SQLite**       | —       | Archivo   | `instance/finca.db` (dev)     |
| **Redis**        | `6379`  | TCP       | Cache de sesiones (opcional dev) |

> ⚠️ **CRÍTICO para IAs:** El Frontend usa un **proxy Vite** interno. Las peticiones del navegador van a `/api/v1` (relativo), y Vite las reenvía a `http://127.0.0.1:5000`. Nunca uses la URL del backend directamente desde el frontend; usa siempre rutas relativas `/api/v1/...`.

---

## 🔑 Credenciales de Prueba

> ⚠️ Estos usuarios **ya no se siembran solos**: hoy `wsgi.py` solo corre `run_core_initialization()` e `initialize_all_finca_defaults()`, y nadie llama a `ensure_test_users()` fuera de las pruebas. Créalos con `scripts/create_test_users.py` o `scripts/seed_e2e.py`.

> Los documentos y correos salen de `backend/app/utils/seed_identities.py`, la tabla canónica que comparten el seeder, los scripts de apoyo y los botones del login.

> 🔒 La contraseña **no se documenta aquí**. Sale de `ADMIN_PASSWORD` o `TEST_USER_PASSWORD` en tu `backend/.env` local, que está ignorado por git. Ver [DEV_CREDENTIALS.md](DEV_CREDENTIALS.md).

| Rol              | ID (Identificación) | Email                    |
| :--------------- | :------------------ | :----------------------- |
| **Administrador**| `1098`              | admin@villaluz.co        |
| **Propietario**  | `55555555`          | propietario@villaluz.co  |
| **Capataz**      | `66666666`          | capataz@villaluz.co      |
| **Instructor**   | `11111111`          | instructor@sena.edu.co   |
| **Aprendiz**     | `22222222`          | aprendiz@sena.edu.co     |
| **Operario**     | `33333333`          | operario@villaluz.co     |
| **Veterinario**  | `44444444`          | veterinario@villaluz.co  |

> El login en el frontend usa el campo **"Número de identificación"** (no email). Los botones de acceso rápido en la pantalla de login pre-llenan el documento y la contraseña que tengas en `VITE_DEV_PROFILE_PASSWORD`.

---

## 📁 Archivos de Configuración

### Backend: `backend/.env`
```
FLASK_ENV=development
PORT=5000
USE_HTTPS=false
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=finca_db
FRONTEND_URL=https://localhost:3003
BACKEND_URL=http://localhost:5000
CORS_ORIGINS=https://localhost:3003,...
TEST_USER_PASSWORD=<defínela en tu .env local, nunca aquí>
ADMIN_ID=1098
TEST_USER_PROPRIETARIO_ID=55555555
TEST_USER_CAPATAZ_ID=66666666
TEST_USER_OPERARIO_ID=33333333
TEST_USER_VETERINARIO_ID=44444444
```

### Frontend: `frontend/.env`
```
VITE_API_BASE_URL=/api/v1          ← Ruta RELATIVA (usa el proxy Vite)
VITE_PROXY_TARGET=http://127.0.0.1:5000  ← Backend real
VITE_FRONTEND_URL=https://localhost:3003
VITE_DEV_PROFILE_PASSWORD=<defínela en tu .env local, nunca aquí>
```

---

## 🚀 Cómo Levantar el Sistema

### 1. Backend (terminal 1)
```bash
cd backend
python run.py
# Esperar: "Running on http://127.0.0.1:8092"
# Esperar: "Ecosistema de identidades estabilizado" (seeding automático)
```

### 2. Frontend (terminal 2)
```bash
cd frontend
npm run dev
# Esperar: "Local: https://localhost:3005/"
```

### 3. Acceder
- Abrir `https://localhost:3005`
- Aceptar advertencia de certificado auto-firmado
- Usar botón "Admin" → "Iniciar sesión"

---

## ⚠️ Reglas para IAs (Anti-Interferencia)

1. **Nunca cambiar los puertos** sin actualizar AMBOS `.env` (backend y frontend).
2. **Nunca modificar credenciales de prueba** sin actualizar `backend/.env` e `IDENTITY.json`.
3. **El proxy Vite es el puente:** si el login falla con error de red, verificar que `VITE_PROXY_TARGET` apunte al mismo puerto que `PORT` en el backend.
4. **`npm run dev` fuerza el puerto 3003** via `--port 3003` en `package.json`. Si el puerto está ocupado, matar procesos Node con `Stop-Process -Name node -Force`.
5. **CORS:** Al agregar un nuevo origen, actualizar `CORS_ORIGINS` en `backend/.env`.
6. **Seeding:** `ensure_test_users()` en `backend/app/utils/seed_users.py` usa las variables `TEST_USER_*` del `.env`. Cambiar el `.env` es suficiente para cambiar las credenciales.

---

## 🐛 Diagnóstico Rápido

| Síntoma                        | Causa probable                    | Fix                                      |
| :----------------------------- | :-------------------------------- | :--------------------------------------- |
| Login falla (error de red)     | Proxy apunta a puerto incorrecto  | Verificar `VITE_PROXY_TARGET` en `.env`  |
| Login falla (401)              | Contraseña desincronizada         | Reiniciar backend (seeding auto)         |
| Frontend en puerto aleatorio   | Procesos Node huérfanos           | `Stop-Process -Name node -Force`         |
| Error CORS en browser          | Origen no en `CORS_ORIGINS`       | Agregar origen al `.env` del backend     |
| Backend no arranca             | Puerto 5000 ocupado               | `netstat -ano | findstr :5000`           |
