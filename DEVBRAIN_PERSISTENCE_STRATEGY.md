# DevBrain Estrategia Global Anti-Pérdida de Trabajo

## Problema que resolvemos

En cada sesión de agente AI existe el riesgo de:
1. **Sobrescribir** configuraciones ya establecidas
2. **Corromper** archivos por ediciones mal formateadas (minificación accidental)
3. **Perder** funcionalidades porque se trabaja en el directorio equivocado (`frontend/` vs `frontend_VALIDATED_TMP/`)
4. **Duplicar** código en múltiples lugares sin saber cuál es el activo
5. **No poder** revertir cambios porque no hay historial de Git

Esta estrategia garantiza que **cada sesión avanza sin destruir lo anterior**.

---

## 1. PRINCIPIO FUNDAMENTAL: Single Source of Truth (SSOT)

**REGLA ABSOLUTA:** Solo existe un directorio de código activo por stack.

```
✅ CORRECTO:
villaluz/
  frontend/src/          ← Único código fuente frontend
  backend/app/           ← Único código fuente backend

❌ PROHIBIDO (causa #1 de pérdida):
villaluz/
  frontend/src/
  frontend_VALIDATED_TMP/src/   ← NUNCA crear
  frontend_backup/src/          ← NUNCA crear
  _archive/frontend*/           ← Para backups usar git, no carpetas
```

### Política de directorios
- Si un agente necesita "hacer backup", usa `git branch` o `git stash`, NUNCA copias de carpetas.
- Los directorios `_archive/`, `backups/`, `*_TMP/` existentes son **read-only**. No editar nunca.
- Antes de tocar cualquier archivo, verificar que la ruta no contiene `archive`, `backup`, `tmp`, `validated`, `duplicate`.

---

## 2. PROTOCOLO DE INICIO DE SESIÓN (Obligatorio)

Cada agente DEBE ejecutar al inicio de cada sesión:

```bash
# 1. Verificar que estamos en la rama correcta
git status

# 2. Si hay cambios sin commit del agente anterior, guardarlos
git add -A
git commit -m "checkpoint: sesión anterior $(date +%Y-%m-%d_%H:%M)"

# 3. Crear punto de retorno
git tag checkpoint-$(date +%Y%m%d-%H%M%S)

# 4. Verificar directorio activo (debe ser frontend/src/, no frontend_VALIDATED_TMP/)
pwd | grep -v "VALIDATED\|backup\|archive\|tmp"
```

---

## 3. PROTOCOLO DE EDICIÓN SEGURA (Safe Edit Protocol)

### 3.1 Pre-Edit Checklist
Antes de modificar cualquier archivo:
- [ ] Leer las primeras 5 líneas del archivo (verificar que no esté minificado/corrupto)
- [ ] Verificar que no tenga el header `⚠️ COMPONENTE CRÍTICO`
- [ ] Si lo tiene, leer qué funciones maneja y no eliminarlas
- [ ] Confirmar que el archivo tiene formato legible (no una sola línea de 2000+ chars)

### 3.2 Anti-Corruption Rule
Si un archivo tiene más de 500 caracteres en la línea 1 y menos de 10 líneas totales, está **minificado/corrupto**. NO EDITAR. Restaurar desde Git o desde `_archive/`.

### 3.3 Atomic Changes
- Un cambio lógico = un commit
- Nunca mezclar: feature + refactor + fix en el mismo commit
- Si el build falla, el commit no cuenta. Hacer `git reset HEAD~1` y rehacer.

---

## 4. MECANISMO DE PROTECCIÓN: Git Auto-Checkpoint

### Script: `.devbrain/checkpoint.sh`
Ejecutado automáticamente cada 15 minutos o antes de cualquier operación destructiva.

```bash
#!/bin/bash
# .devbrain/checkpoint.sh
# Guarda snapshot automático del trabajo

BRANCH="auto/session-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH" 2>/dev/null || true
git add -A
git commit -m "auto: checkpoint $(date)" --allow-empty 2>/dev/null || true
echo "[DevBrain] Checkpoint guardado en rama: $BRANCH"
```

### Hook pre-command
Antes de cualquier comando de edición masiva (sed, replaceAll, write completo):
1. Guardar checkpoint
2. Mostrar diff de lo que se va a cambiar
3. Pedir confirmación

---

## 5. FEATURE MANIFEST (Registro de Funcionalidades)

Crear y mantener `FEATURE_MANIFEST.md` con todas las funcionalidades críticas:

```markdown
## Funcionalidades Críticas Villa Luz OS

| Función | Archivos | Estado | Último Verify |
|---------|----------|--------|---------------|
| Submenú Sidebar | sidebarConfig.tsx, RoleBasedSideBar.tsx | ✅ Activo | 2026-05-17 |
| Bulk Actions Animales | AdminCRUDPage.tsx, CRUDTable.tsx, animals/index.tsx | ✅ Activo | 2026-05-17 |
| Selección masiva | CRUDTable.tsx, CRUDConfig | ✅ Activo | 2026-05-17 |
| Modales bulk | features/animal-bulk-actions/* | ✅ Activo | 2026-05-17 |
```

Regla: Si un agente modifica algo marcado como "Activo", debe verificar que sigue funcionando antes de cerrar sesión.

---

## 6. PROTECCIÓN DE ARCHIVOS CRÍTICOS (Headers + Inmutable Regions)

### 6.1 Header Estándar (ya implementado parcialmente)
En todo archivo que implemente funcionalidad crítica, agregar al inicio:

```typescript
// ⚠️ COMPONENTE CRÍTICO - NO ELIMINAR SIN REVISIÓN
// Funciones: [lista explícita de funciones]
// Última modificación: [fecha]
// Relacionado con: [otros componentes]
// Test de regresión: [cómo verificar que funciona]
```

### 6.2 Inmutable Regions
Para evitar que un agente sobrescriba secciones importantes:

```typescript
// === INMUTABLE REGION START ===
// Esta sección fue difícil de implementar. No modificar sin consultar.
const complexLogic = () => { ... }
// === INMUTABLE REGION END ===
```

---

## 7. ESTRATEGIA DE DIRECTORIOS: Mapa de Orígenes

Para resolver la confusión de múltiples AdminCRUDPage y CRUDTable:

| Componente | Origen Único | Alternativas (NO USAR) |
|------------|-------------|------------------------|
| AdminCRUDPage | `widgets/admin-crud/ui/AdminCRUDPage.tsx` | `shared/ui/common/AdminCRUDPage.tsx` (legacy 2844L) |
| CRUDTable | `widgets/admin-crud/ui/CRUDTable.tsx` | `shared/ui/common/AdminCRUDPage/CRUDTable.tsx` (old) |
| OptimizedAdminCRUDPage | `shared/ui/common/AdminCRUDPage/OptimizedAdminCRUDPage.tsx` | `widgets/admin-crud/ui/OptimizedAdminCRUDPage.tsx` (CORRUPTO/minificado) |

Regla: Si hay un archivo minificado/corrupto en una ruta, BORRARLO y usar el bueno. Nunca editar el corrupto.

---

## 8. VERIFICACIÓN DE INTEGRIDAD POST-SESION (Post-Session Checklist)

Antes de que un agente declare "terminé", DEBE:

```bash
# 1. Build completo
npm run build

# 2. Type check (si existe)
npm run type-check || echo "⚠️ type-check no disponible"

# 3. Verificar que no hay archivos de 1 línea (corruptos)
find frontend/src -name "*.tsx" -exec awk 'END{if(NR<5) print FILENAME}' {} \;

# 4. Verificar que no hay archivos modificados en directorios prohibidos
git status | grep -E "VALIDATED|backup|archive|tmp" && echo "❌ ERROR: Ediciones en directorios prohibidos" || echo "✅ OK"

# 5. Commit final
git add -A
git commit -m "feat/fix/refactor: descripción del cambio"

# 6. Tag de sesión
git tag session-$(date +%Y%m%d-%H%M%S)
```

---

## 9. PROTOCOLO DE RECUPERACIÓN RÁPIDA

Si algo se rompió en la sesión actual:

```bash
# Opción 1: Revertir último commit (si no se ha hecho push)
git reset --hard HEAD~1

# Opción 2: Volver al checkpoint de inicio de sesión
git reset --hard checkpoint-20260517-120000  # usar el tag correcto

# Opción 3: Restaurar archivo específico desde tag
git checkout checkpoint-20260517-120000 -- frontend/src/widgets/admin-crud/ui/CRUDTable.tsx
```

---

## 10. CONVENIO DE NOMENCLATURA DE RAMAS Y TAGS

```
Ramas:
  main                    ← Estable, solo merges aprobados
  develop                 ← Integración continua
  feature/nombre          ← Desarrollo de funcionalidades
  fix/nombre              ← Correcciones urgentes
  auto/session-YYYYMMDD-HHMMSS  ← Checkpoints automáticos de agentes

Tags:
  checkpoint-YYYYMMDD-HHMMSS  ← Punto de retorno manual
  session-YYYYMMDD-HHMMSS     ← Fin de sesión de agente
  release-vX.Y.Z               ← Versiones estables
```

---

## 11. RESPONSABILIDADES DEL AGENTE

1. **Nunca** trabajar fuera de `frontend/src/` o `backend/`
2. **Nunca** crear directorios duplicados de código
3. **Siempre** hacer checkpoint antes de operaciones destructivas
4. **Siempre** verificar que funcionalidades críticas siguen activas
5. **Siempre** dejar el repositorio en estado commiteado al terminar
6. **Siempre** documentar en `FEATURE_MANIFEST.md` si se agrega funcionalidad crítica nueva

---

## 12. HERRAMIENTAS DE SUPERVISIÓN

Implementar en `.devbrain/`:
- `checkpoint.sh` — Guarda snapshot cada N minutos
- `integrity-check.sh` — Verifica archivos corruptos, duplicados, y directorios prohibidos
- `session-start.sh` — Protocolo de inicio de sesión
- `session-end.sh` — Protocolo de cierre de sesión

---

*Documento vivo. Última actualización: 2026-05-17*
*Aprobado por: DevBrain Architecture Committee*
