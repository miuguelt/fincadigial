# 🔐 Credenciales de Desarrollo - Villa Luz

Este archivo documenta **dónde viven** las credenciales del entorno de desarrollo local.
No contiene contraseñas: ninguna contraseña puede quedar escrita en el repositorio.

## 🔑 Dónde se configura la contraseña

| Uso | Variable | Archivo (local, ignorado por git) |
| :--- | :--- | :--- |
| Botones "Perfiles de desarrollo" del login | `VITE_DEV_PROFILE_PASSWORD` | `frontend/.env` |
| Seeds y pruebas del backend | `ADMIN_PASSWORD` o `TEST_USER_PASSWORD` | `backend/.env` |
| Scripts E2E por rol | `VILLALUZ_E2E_<ROL>_ID` y `VILLALUZ_E2E_<ROL>_PASSWORD` | entorno o `.env` local |

Los sufijos `<ROL>` los define `scripts/test_credentials.py`:
`ADMIN`, `OWNER`, `FOREMAN`, `INSTRUCTOR`, `APPRENTICE`, `WORKER`, `VET`.
Si falta una variable, el script se detiene con un mensaje que dice cuál definir.

`frontend/.env`, `backend/.env` y todo `.env.*` están ignorados; solo se permiten versionar
plantillas explícitas como `.env.example`, `.env.*.example` y `.env.*.template`, siempre con
placeholders. No subas valores reales ni los pegues en documentación, prompts, argumentos o logs.
Para producción, la fuente es Windows Credential Manager o el almacén de secretos del proveedor.

## 🔐 Flujo seguro recomendado

1. Guarda cada contraseña real en Windows Credential Manager con un nombre por entorno y rol.
2. Inyéctala únicamente al proceso que la necesita, como variable de entorno temporal. No la
   escribas en el código, en un JSON, en una orden de shell ni en un archivo rastreable.
3. Si falta una variable, el script debe detenerse; no hay contraseñas de respaldo en el código.
4. Al terminar la sesión, elimina las variables temporales y los estados de autenticación E2E.

Para una sesión local interactiva se puede usar `Get-Credential` y mantener el valor solo en el
proceso actual. No guardes la salida en un archivo ni la incluyas en el historial de PowerShell.

---

## 👥 Usuarios de Prueba

Los documentos de identificación no son secretos: son los mismos que muestran los botones de
"Perfiles de desarrollo" en la página de login.

| Rol | Documento (ID) | Descripción |
| :--- | :--- | :--- |
| **Administrador** | `1098` | Acceso total al sistema y configuraciones. |
| **Propietario** | `55555555` | Dueño de la finca, gestión administrativa. |
| **Capataz** | `66666666` | Supervisor de operaciones diarias. |
| **Instructor** | `11111111` | Gestión pedagógica SENA. |
| **Aprendiz** | `22222222` | Estudiante SENA, vista de consulta y tareas. |
| **Operario** | `33333333` | Personal de campo, registro de actividades. |
| **Veterinario** | `44444444` | Gestión de sanidad, pesajes y vacunación. |

---

## 🚀 Acceso rápido en el login

La sección "Perfiles de desarrollo" solo se renderiza cuando Vite corre en modo desarrollo
(`import.meta.env.DEV`); en un build de producción no existe. Al hacer clic en un perfil:

1. Se completa el documento del rol.
2. Se completa la contraseña tomada de `VITE_DEV_PROFILE_PASSWORD`.
3. El foco pasa al campo de contraseña; el envío es manual.

Si `VITE_DEV_PROFILE_PASSWORD` no está definida en `frontend/.env`, los botones siguen
funcionando pero dejan la contraseña vacía: la escribes a mano. Después de editar `frontend/.env`
hay que reiniciar Vite para que tome el valor.

`VITE_DEV_PROFILE_PASSWORD` es una comodidad exclusiva de desarrollo local: Vite la expone al
navegador. Úsala únicamente con usuarios desechables de desarrollo, nunca con una cuenta real ni
en un build de producción.

---

## 🛠️ Resincronizar usuarios

Si el login devuelve `401 Credenciales inválidas`, los hashes en PostgreSQL se desincronizaron.
Desde la raíz del proyecto, con las variables `VILLALUZ_E2E_*` ya definidas en el entorno:

```powershell
.\backend\venv_win\Scripts\python.exe .\scripts\create_test_users.py
```

Para reescribir solo las contraseñas de Operario y Veterinario:

```powershell
.\backend\venv_win\Scripts\python.exe .\scripts\reset_passwords.py
```

Ambos scripts leen las credenciales del entorno mediante `scripts/test_credentials.py`
y fallan de forma explícita si falta una variable, en lugar de usar un valor por defecto inseguro.

## ✅ Gates antes de commit y push

- Pre-commit: el hook DevBrain ejecuta `pre-commit-secrets.ps1 -Staged` y `validate-rules.ps1`.
- Pre-push: `Test-DevBrainRepoHygiene.ps1 -SingleRepository -FailOnViolations` valida los dos
  archivos de exclusión y el estado real del índice.
- Auditoría completa manual: `pwsh -File C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\pre-commit-secrets.ps1 -Path .`.

Si una contraseña ya fue comprometida en Git, agregarla al `.gitignore` no basta: rótala primero,
retírala del índice y coordina la limpieza del historial con el equipo.
