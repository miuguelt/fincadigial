# 📋 BITÁCORA DE DESARROLLO - VILLALUZ

Esta bitácora es la fuente de verdad (SSoT) para la IA y los desarrolladores sobre el estado técnico, configuración, y soluciones de problemas aplicadas a este proyecto.

---

## 🛠️ Ficha Técnica

- **Estatus:** Activo / Desarrollo
- **Tecnologías:** Flask (Python) + Celery (Redis) + React
- **Puertos de Red:** Frontend: `3005`, Backend: `8092`
- **Base de Datos:** PostgreSQL en Docker / SQLite local fallback
- **Entorno de Ejecución:** Nativo Windows (PowerShell) con Celery/Redis en WSL. Ahorra ~3.2GB de RAM versus Docker total.

---

## 🎯 Directrices de Arquitectura y Estilo

1. **Gestión de Tareas Asíncronas:** Celery maneja colas de tareas con Redis en puerto `6380` (dentro de WSL).
2. **Desarrollo Atómico:** Todas las modificaciones deben realizarse en la ruta `frontend/src/` y evitar romper el flujo del dashboard.
3. **SSoT con Variables de Entorno:** Configurar las variables dinámicas en el archivo `.env`.

---

## 🏥 Historial de Incidencias y Soluciones

### 📝 Incidencia - 2026-06-28
- **Problema Detectado:** Configuración inicial de bitácora.
- **Causa Raíz:** Documentación técnica inicial para acelerar el desarrollo del equipo de agentes e IAs.
- **Solución Aplicada:** Inicialización del archivo de bitácora en `.devbrain/bitacora.md`.
- **Estado:** Solucionado 🟢
