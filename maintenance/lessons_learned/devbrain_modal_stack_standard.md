# Estándar DevBrain: Sistema de Pilas de Modales (Modal Stacks) y Aislamiento de Cierre

Este documento define el estándar institucional y arquitectónico de DevBrain para el manejo de modales, submodales apilados (Modal Stacks) y prevención de colisiones de eventos (*click-through* / doble apertura).

---

## 🧠 Causa Raíz de Doble Apertura y Colisiones

En aplicaciones SPA densas con tablas, cuadrículas y enlaces interactivos, se presentaba un error donde al hacer clic en el botón de cerrar ("X" o botón "Cerrar") de un modal, este **se volvía a abrir inmediatamente o disparaba la apertura de otro modal**.

### Mecanismo del Fallo Identificado:
1. **Pérdida Prematura de Puntero (`data-[state=closed]:pointer-events-none`)**:
   Cuando el usuario presiona el botón del mouse (`pointerdown`), Radix UI cambia el estado a `closed`. Si los componentes `DialogOverlay` y `DialogContent` aplicaban `pointer-events: none` instantáneamente en \(t=0\), el modal perdía la capacidad de absorber eventos antes de que el usuario soltara el botón del mouse.
2. **Colisión de `pointerup` / `click` (*Click-Through*)**:
   Al soltarse el mouse (`mouseup`), el navegador realizaba la detección de colisión (*hit testing*) sobre el elemento del DOM que se encontraba directamente debajo del cursor (una fila `<tr>`, una tarjeta `Card`, o un enlace `AnimalLink`).
3. **Disparo No Intencionado**:
   El elemento inferior recibía el evento `click` y ejecutaba su manejador `onClick`, reabriendo el modal de inmediato.

---

## 📐 Estándar Arquitectónico DevBrain

### 1. Pila Jerárquica de Modales (`ModalStackContext`)
Todo modal (`Dialog`, `GenericModal`, `UnifiedModal`, `ConfirmDialog`) participa automáticamente en una pila jerárquica:
- **Nivel Base (Depth 0 - Primer Modal):**
  - Overlay: `z-index: 1100`
  - Content: `z-index: 1200`
- **Nivel Anidado (Depth 1 - Submodal / Confirmación / Árbol):**
  - Overlay: `z-index: 1200`
  - Content: `z-index: 1300`
- **Nivel Profundo (Depth 2+):**
  - Overlay: `1100 + depth * 100`
  - Content: `1200 + depth * 100`

> Los desarrolladores **NO** deben hardcodear z-indexes manuales para modales anidados; el contexto se encarga de apilarlos de forma automática.

### 2. Guardia Anti Click-Through (`modalGuard.ts`)
Se implementa una ventana de enfriamiento (*cooldown* global de ~250ms):
```typescript
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';

// En manejadores de clic de filas, tarjetas o enlaces disparadores:
const handleClick = (e: React.MouseEvent) => {
  if (isDialogClosingRecently()) return;
  onOpenDetail?.(item);
};
```

### 3. Aislamiento de Eventos en Botones de Cierre
- Todos los botones de cierre (`<DialogPrimitive.Close>`, botones de footer "Cancelar" / "Cerrar") DEBEN invocar `e.stopPropagation()` tanto en `onClick` como en `onPointerDown`.
- `DialogContent` debe prevenir la restauración de foco agresiva que reactive disparadores mediante `onCloseAutoFocus={(e) => e.preventDefault()}`.
- `DialogOverlay` y `DialogContent` deben absorber los eventos de puntero hasta que la animación de salida termine y el componente se desmonte.

---

## 🛠️ Reglas para Nuevos Componentes
1. Usar siempre `GenericModal` o `Dialog` de `@/shared/ui/dialog`.
2. Proteger los clics en contenedores de lista/tarjeta con `isDialogClosingRecently()`.
3. Nunca añadir `data-[state=closed]:pointer-events-none` a superficies o fondos de modales durante transiciones.
4. En modales anidados (ej. Árboles genealógicos, confirmaciones de eliminación sobre formularios), confiar en el incremento automático de `ModalStackContext`.

---
*Registrado en el DevBrain Neural Store - Mayo 2026*
