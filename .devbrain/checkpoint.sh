#!/bin/bash
# .devbrain/checkpoint.sh
# Revisa el estado sin crear commits ni ramas automáticas.
# Uso: ./.devbrain/checkpoint.sh [--stage]

# Verificar si estamos en un repo git
if [ ! -d ".git" ]; then
    echo "❌ ERROR: No hay repositorio Git. Ejecutar 'git init' primero."
    exit 1
fi

if [ "${1:-}" = "--stage" ]; then
    git add -A
    echo "Cambios agregados al staging por solicitud explícita."
fi

git status --short
echo "✅ No se creó ningún commit. Ejecuta git commit manualmente después de revisar."
