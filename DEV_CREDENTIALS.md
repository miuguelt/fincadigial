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
Si las credenciales no funcionan, reinicia la base de datos local con este comando desde la carpeta `backend`:

```powershell
# Windows
.\venv_win\Scripts\python.exe seed_test_users.py
```

## 🚀 Acceso Automático
La interfaz de Login incluye botones de colores en la parte inferior que:
1. Completan el documento automáticamente.
2. Completan la contraseña universal.
3. Ejecutan el inicio de sesión de inmediato.
