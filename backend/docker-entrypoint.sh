#!/usr/bin/env bash
set -e

echo "🚀 Iniciando proceso de arranque (Entrypoint)..."

echo "🟢 Arrancando servidor..."
exec "$@"
