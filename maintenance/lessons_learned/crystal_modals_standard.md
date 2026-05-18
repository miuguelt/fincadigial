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

---
*Registrado en el DevBrain Neural Store - Mayo 2026*
