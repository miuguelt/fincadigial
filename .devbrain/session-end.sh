#!/bin/bash
# .devbrain/session-end.sh
# Protocolo de cierre de sesión de agente DevBrain

echo "=========================================="
echo "  DevBrain Session End Protocol"
echo "=========================================="

# 1. Verificar que no hay archivos sin commitear
UNCOMMITTED=$(git status --short 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
    echo ""
    echo "[1/5] Archivos sin commit detectados:"
    echo "$UNCOMMITTED"
    echo "   ⚠️ No se hará commit automático. Revisa y confirma manualmente."
else
    echo "[1/5] ✅ Sin archivos pendientes"
fi

# 2. Verificar build
if [ -f "frontend/package.json" ]; then
    echo ""
    echo "[2/5] Verificando build..."
    (cd frontend && npm run build >/dev/null 2>&1) && echo "   ✅ Build exitoso" || echo "   ⚠️  Build falló o no disponible"
fi

# 3. Verificar integridad
echo ""
echo "[3/5] Verificando integridad..."
bash .devbrain/integrity-check.sh || true

# 4. Actualizar FEATURE_MANIFEST si se agregó funcionalidad crítica
echo ""
echo "[4/5] Si agregaste funcionalidad crítica:"
echo "   • Actualiza FEATURE_MANIFEST.md"
echo "   • Agrega header ⚠️ COMPONENTE CRÍTICO al archivo"

# 5. No crear tags automáticos: el historial debe ser una decisión humana.
echo ""
echo "[5/5] No se creó tag automático."

echo ""
echo "✅ Protocolo de cierre completado. Sesión finalizada."
