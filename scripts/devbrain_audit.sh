#!/bin/bash
# Script de Auto-Auditoría para DevBrain (WSL/Linux)
# Este script DEBE ser ejecutado por DevBrain al finalizar cualquier refactorización de código.

echo "========================================================="
echo "🧠 DevBrain SDLC Audit Protocol Iniciado"
echo "========================================================="

# 1. Chequeo del Frontend (TypeScript)
echo "[1/2] Verificando sanidad del Frontend (TypeScript Check)..."
cd frontend || { echo "❌ Error: Carpeta frontend no encontrada."; exit 1; }

# Ejecutamos type-check de forma silenciosa para evitar ensuciar los logs, pero capturamos el exit code
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ FALLO EN EL FRONTEND: Existen errores de TypeScript."
    echo "🚨 DEVBRAIN DIRECTIVE: Detener inmediatamente. Debes arreglar los tipos antes de confirmar el éxito al usuario."
    exit 1
else
    echo "✅ Frontend TypeScript OK. Ninguna regresión de tipos detectada."
fi
cd ..

# 2. Chequeo del Backend (Python)
echo "[2/2] Verificando sanidad del Backend (Validación sintáctica)..."
cd backend || { echo "❌ Error: Carpeta backend no encontrada."; exit 1; }

# Chequeo de sintaxis rápido (compilación en bytecode) para evitar errores de tabulación o sintaxis
python -m compileall app/ > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ FALLO EN EL BACKEND: Existen errores de sintaxis en Python."
    echo "🚨 DEVBRAIN DIRECTIVE: Revisa el log de sintaxis y corrige la indentación/estructura."
    exit 1
else
    echo "✅ Backend Python OK. Sintaxis y estructura validada."
fi
cd ..

echo "========================================================="
echo "✅ AUDITORÍA EXITOSA: Villaluz está sano."
echo "DevBrain puede dar por terminada la tarea."
echo "========================================================="
exit 0
