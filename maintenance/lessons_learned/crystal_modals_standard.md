# Estándar de Diseño Crystal: Modales Administrativos de Alta Densidad

Este documento define el estándar de diseño y técnico para la implementación de modales de gran escala en el ecosistema Villa Luz, garantizando el máximo aprovechamiento del ancho de pantalla y una legibilidad humana superior.

## 🧠 Lección Aprendida (Core Insight)
El error recurrente en implementaciones previas fue intentar expandir los modales manteniendo una estructura de tarjetas verticales y una escala tipográfica "ampliada" (efecto zoom). Esto resultaba en textos verticales deformados y una experiencia de usuario mediocre.

**La solución definitiva** consiste en combinar la flexibilización del componente base con un diseño de contenido horizontal de alta densidad.

## 🛠️ Especificaciones Técnicas

### 1. Flexibilización del Componente Base
Se debe asegurar que el componente `DialogContent` permita el desbordamiento controlado de las clases `max-w`.
- **Archivo**: `src/shared/ui/dialog.tsx`
- **Acción**: Eliminar las clases restrictivas como `sm:max-w-lg`, `md:max-w-xl`, etc., para permitir que el modal específico defina su propio ancho responsivo.

### 2. Dimensionamiento Dominante (Width Dominance)
Para modales administrativos (Batch Actions), se debe usar:
- `w-[95vw]` (Mínimo 95% del ancho de pantalla).
- `max-w-[1600px]` (Límite superior para evitar distorsión en monitores Ultra-Wide).
- `h-[92dvh]` (Aprovechamiento vertical casi total).
- Uso de `!important` (en Tailwind `!`) si existen conflictos con el sistema de centrado nativo.

### 3. Layout de Alta Densidad
- **Workspace**: División horizontal `flex-row` en pantallas grandes.
- **Sidebars**: Ancho fijo (`350px` - `400px`) para evitar la deformación de textos de configuración.
- **Grids**: Cuadrículas ultra-flexibles que escalen desde 1 columna (móvil) hasta 6-8 columnas (escritorio).

## 🎨 Estética Crystal (Premium UI)
1. **Tarjetas Horizontales**: Los elementos de lista deben ser `flex-row`. Icono a la izquierda, información a la derecha. Esto previene el truncamiento de nombres y permite mostrar métricas secundarias en la misma línea.
2. **Escala Tipográfica Controlada**: No usar fuentes gigantes. Mantener títulos en `text-lg` o `text-xl` y descripciones en `text-[10px]` o `text-xs`. La amplitud debe venir del espacio ganado, no del tamaño de la letra.
3. **Visual Auditing (Panel de Impacto)**: Siempre incluir un panel de resumen con glassmorphism que muestre el "antes y después" de la operación (ej. Carga Proyectada vs Capacidad).
4. **Mesh Gradients**: Uso de gradientes de malla animados en el header (`bg-slate-950` con capas de color desenfocadas).

## 🚀 Aplicación en Otros Módulos
Este estándar debe ser replicado inmediatamente en:
- `BatchVaccinationModal.tsx`
- `BatchWeightModal.tsx`
- `AdminFieldManagement.tsx`
- Dashboards de Reportes Regulatorios.

## 🧠 Lecciones Técnicas Críticas (Mayo 2026)

### 1. Enlazado Nativo de Accesibilidad en Radix UI (Evitar Alertas ARIA)
- **Causa del Error**: Intentar forzar un contexto custom (`DialogA11yContext`) y renderizar elementos `<VisuallyHidden><DialogPrimitive.Title id={titleId}></VisuallyHidden>` como fallback dentro de `DialogContent` generaba duplicidad de IDs en el DOM durante el primer render cuando el consumidor ya aportaba su propio `<DialogTitle>`. Al desmontarse el fallback en el segundo render tras registrarse el ID, Radix UI detectaba un desajuste o elemento faltante y emitía la alerta: `DialogContent requires a DialogTitle`.
- **Solución Arquitectónica**: Eliminar por completo el contexto custom y los fallbacks inyectados en `DialogContent`. Permitir que el mecanismo nativo de Radix UI enlace automáticamente el `DialogPrimitive.Content` con los componentes `DialogTitle` y `DialogDescription` aportados por el desarrollador dentro del modal.

### 2. Normalización de URLs en Axios (Prevención de 404 por Duplicación)
- **Causa del Error**: Cuando la configuración global de Axios define un `baseURL` que termina en `/api/v1` (ej. en entornos locales o de desarrollo proxy), y los servicios individuales pasan rutas relativas que ya incluyen `/api/v1` (ej. `/api/v1/location/report`), Axios concatena ambos valores produciendo rutas malformadas como `/api/v1/api/v1/location/report`.
- **Solución Arquitectónica**: Implementar un interceptor de solicitud (`request interceptor`) que verifique si `config.baseURL` termina en `/api/v1` y limpie dinámicamente cualquier prefijo `/api/v1` duplicado al inicio de `config.url`, asegurando que la ruta final enviada al servidor sea siempre limpia y canónica.

---
*Registrado en el DevBrain Neural Store - Mayo 2026*
