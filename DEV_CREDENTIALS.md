# 🔐 Credenciales de Desarrollo - Villa Luz

Este archivo contiene las credenciales estandarizadas para el entorno de desarrollo local. **NUNCA** uses estas contraseñas en producción.

## 🔑 Contraseña Universal (Local)
> **`Villaluz2024!`**

---

## 👥 Usuarios de Prueba
Puedes usar los botones de **"Acceso Rápido"** en la página de login o ingresar manualmente los siguientes documentos:

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

## 🛠️ Comandos Útiles
Si el login devuelve `401 Credenciales inválidas`, los hashes en PostgreSQL se
desincronizaron de la contraseña universal. Resincronízalos desde la carpeta `backend`:

```powershell
.\venv_win\Scripts\python.exe sync_test_users.py
```

El script es idempotente: crea los usuarios que falten y, para los existentes,
reescribe contraseña, rol, email, `status=True` y `approval_status=Approved`.
La lista de usuarios vive en el propio `sync_test_users.py` (fuente de verdad).

## 🚀 Acceso Automático
La interfaz de Login incluye botones de colores en la parte inferior que:
1. Completan el documento automáticamente.
2. Completan la contraseña universal.
3. Ejecutan el inicio de sesión de inmediato.
