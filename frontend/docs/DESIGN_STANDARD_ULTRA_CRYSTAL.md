# Estándar de Diseño Villa Luz OS: Ultra-Crystal Chromatic (2026)

Este documento define el blueprint maestro para la interfaz administrativa de **Villa Luz OS**, estableciendo el lenguaje visual y estructural para todas las acciones masivas y centros de comando.

## 💎 Identidad Visual: "The Chromatic Pulse"

El estándar **Ultra-Crystal Chromatic** se basa en la profundidad, el contraste extremo y la retroalimentación visual luminiscente.

### 🎨 Paleta de Colores Operativa
- **Base Dominante**: `slate-950` (Fondo principal) con `backdrop-blur-3xl`.
- **Zonificación**: `slate-900/40` para paneles internos.
- **Acentos de Estado**:
  - **Indigo (`#6366f1`)**: Navegación, selección primaria, relocalización.
  - **Emerald (`#10b981`)**: Sincronización exitosa, salud clínica, bioma estable.
  - **Rose (`#f43f5e`)**: Alertas críticas, sobrecarga biológica, errores de sistema.
  - **Amber (`#f59e0b`)**: Advertencias, parámetros técnicos, auditoría pendiente.

### 🪄 Efectos de Superficie
- **Glassmorphism**: Uso intensivo de `backdrop-blur-3xl` sobre fondos semi-transparentes (`/60` a `/80`).
- **Luminiscencia**: Sombras de color (`shadow-indigo-500/20`) y efectos de pulso para elementos activos.
- **Bordes**: `border-white/10` como estándar para delineación sutil.

---

## 🏛️ Arquitectura del "Command Center"

Todos los modales administrativos deben seguir esta estructura de tres pilares:

### 1. Header Cromático (Industrial)
- **Densidad**: Alta densidad de información con tipografía `font-black uppercase tracking-tighter`.
- **Iconografía**: Uso de iconos semánticos de alta fidelidad (Ej: `Waypoints` para traslados, `Syringe` para clínica).
- **Feedback**: Indicadores de estado con animaciones `pulse`.

### 2. Workspace de Doble Panel (Zero-Scroll)
- **Panel Izquierdo (Selección/Entrada)**: Cuadrículas densas con tarjetas `rounded-[2.5rem]`.
- **Panel Derecho (Sidebar Operativo)**: Auditoría en tiempo real, configuración de protocolos y simulación de impacto.
- **Componentes**: Uso obligatorio de `ScrollArea` para evitar desbordamientos de layout.

### 3. Footer de Ejecución (High-Contrast)
- **Botón de Acción**: Gradiente vibrante, sombra profunda y uso del icono `Zap` para simbolizar ejecución inmediata.
- **Feedback de Flujo**: Indicadores de "Transmisión de Datos" que muestran el origen y destino/valor de la operación.

---

## 🚀 Guía de Iconografía Semántica

Sustituir iconos genéricos por las siguientes piezas de **Lucide**:
- **Traslados**: `Waypoints`, `Fence`, `MapIcon`.
- **Clínica/Vacunas**: `Syringe`, `Stethoscope`, `Activity`.
- **Pesaje/Métrica**: `Scale`, `TrendingUp`, `Beef`.
- **Identificación**: `Printer`, `Fingerprint`, `Tag`.
- **Ejecución**: `Zap`, `CheckCircle2`, `Pulse`.

---

## ⚠️ Reglas de Oro (Anti-Regresión)
1. **NUNCA** degradar la densidad tipográfica (`font-black uppercase` es el estándar).
2. **NUNCA** eliminar los efectos de desenfoque de fondo (`backdrop-blur-3xl`).
3. **SIEMPRE** usar `DialogContent` con ancho máximo (`!max-w-[1500px]`) y altura dinámica para una sensación de "OS" completo.
4. **SIEMPRE** mantener la separación de paneles en resoluciones LG+.

*Documento generado por Antigravity - Protocolo DevBrain Core Intelligence.*
