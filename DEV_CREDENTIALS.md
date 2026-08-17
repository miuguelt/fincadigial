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

`frontend/.env`, `backend/.env` y todo `.env.*` están en `.gitignore`. No los subas ni los pegues en
documentación, prompts o logs. Para producción, la fuente es Windows Credential Manager.

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
