# Protocolo de Blindaje Villa Luz OS: Anti-Regresiones y Excelencia Estética

Este protocolo define las reglas inmutables para el desarrollo y mantenimiento de Villa Luz OS. Todo asistente de IA y desarrollador DEBE cumplir estas leyes para proteger la inversión técnica y estética del proyecto.

## ⚖️ Leyes de Integridad Estética (Ultra-Crystal Chromatic)

1. **Prohibición de MVP**: Queda terminantemente prohibido degradar componentes de alta fidelidad a versiones "MVP" o simplificadas. Cualquier refactorización debe mantener o elevar el nivel de detalle visual.
2. **Identidad Lumínica**: No se deben eliminar los efectos de `backdrop-blur-3xl`, gradientes de neón ni sombras de color (`shadow-[color]/20`). Estos son el ADN de la interfaz.
3. **Tipografía Industrial**: El uso de `font-black uppercase tracking-[0.5em] italic` para etiquetas y títulos es obligatorio en todos los módulos administrativos. No usar pesos de fuente normales para labels operativos.
4. **Iconografía Semántica**: Se prohíbe el uso de iconos genéricos. Se debe consultar el `DESIGN_STANDARD_ULTRA_CRYSTAL.md` para usar la pieza exacta (`Waypoints` para traslados, `Syringe` para clínica, `Zap` para ejecución).

---

## 🛠️ Reglas de Oro Técnicas (Zero-Fault)

1. **Validación Obligatoria**: No se considerará terminada ninguna tarea que involucre cambios en el código sin antes ejecutar y pasar `npm run type-check`.
2. **Hidratación de Memoria**: Antes de iniciar una sesión, la IA debe leer el archivo `frontend/docs/DESIGN_STANDARD_ULTRA_CRYSTAL.md` para sincronizar el estado estético actual.
3. **Escudo de Dependencias**: Antes de implementar virtualización o lógica compleja, verificar la existencia de la librería en `package.json` (ej: `react-window`). Si no existe, instalarla con sus tipos correspondientes inmediatamente.
4. **Preservación de Comentarios**: Mantener todos los bloques de comentarios que documentan la lógica de virtualización o memoización en `CRUDTable.tsx`.

---

## 🔄 Protocolo de Acción ante Errores

* **Si `replace_file_content` falla**: No intentar simplificar el código para que encaje. Realizar un `view_file` exhaustivo para detectar discrepancias de espacios en blanco o usar `write_to_file` para asegurar la integridad total del bloque.
* **Si hay conflictos de tipos**: No usar `any` como solución rápida. Refactorizar la lógica de genéricos (especialmente en `memo` y `forwardRef`) para mantener la seguridad de tipos.

---
*Este protocolo es la autoridad máxima para la prevención de regresiones en Villa Luz OS. Generado por Antigravity - Core Intelligence.*
