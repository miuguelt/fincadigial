#!/usr/bin/env bash
# =============================================================
# run_tests.sh — Runner de tests para VillaLuz (Linux / WSL / macOS)
# =============================================================
# Uso:
#   ./run_tests.sh              # Corre todo
#   ./run_tests.sh backend      # Solo pytest
#   ./run_tests.sh frontend     # Solo Vitest
#   ./run_tests.sh e2e          # Solo Playwright
#   ./run_tests.sh backend --coverage
# =============================================================

set -euo pipefail

LAYER="${1:-all}"
COVERAGE="${2:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cargar variables de entorno de test
if [ -f "$ROOT_DIR/.env.test" ]; then
  echo "[Setup] Cargando .env.test..."
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env.test"
  set +a
fi

# Detectar python con venv
PYTHON="python"
if [ -f "$BACKEND_DIR/venv/bin/python" ]; then
  PYTHON="$BACKEND_DIR/venv/bin/python"
elif [ -f "$BACKEND_DIR/venv_win/Scripts/python" ]; then
  PYTHON="$BACKEND_DIR/venv_win/Scripts/python"
fi

step() {
  local name="$1"
  local cmd="$2"
  echo -e "\n${YELLOW}[→] $name...${NC}"
  if eval "$cmd"; then
    echo -e "${GREEN}✅ $name pasó${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ $name falló${NC}"
    FAIL=$((FAIL + 1))
  fi
}

run_backend() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}  Capa 1 — Backend: pytest${NC}"
  echo -e "${CYAN}========================================${NC}"

  PYTEST_ARGS="-q --tb=short"
  if [ "$COVERAGE" = "--coverage" ]; then
    PYTEST_ARGS="$PYTEST_ARGS --cov=app --cov-report=html:../test-results/coverage-backend --cov-report=term-missing"
  fi

  FLASK_CONFIG=testing FLASK_ENV=testing \
  step "pytest (integración API)" \
    "cd '$BACKEND_DIR' && $PYTHON -m pytest tests/ $PYTEST_ARGS; cd '$ROOT_DIR'"
}

run_frontend() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}  Capa 2 — Frontend: Vitest${NC}"
  echo -e "${CYAN}========================================${NC}"

  if [ "$COVERAGE" = "--coverage" ]; then
    step "Vitest (cobertura)" "npm run test:coverage --prefix '$ROOT_DIR/frontend'"
  else
    step "Vitest (rápido)" "npm run test:run --prefix '$ROOT_DIR/frontend'"
  fi
}

run_e2e() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN}  Capa 3 — E2E: Playwright${NC}"
  echo -e "${CYAN}========================================${NC}"

  step "Playwright (headless)" "cd '$ROOT_DIR' && npx playwright test"

  REPORT="$ROOT_DIR/test-results/playwright/index.html"
  if [ -f "$REPORT" ]; then
    echo -e "\n📊 Reporte HTML: file://$REPORT"
  fi
}

START=$(date +%s)

echo ""
echo -e "${CYAN}🧪 VillaLuz — Suite de Tests${NC}"
echo "   Capa: $LAYER | $(date '+%Y-%m-%d %H:%M:%S')"

case "$LAYER" in
  backend)  run_backend ;;
  frontend) run_frontend ;;
  e2e)      run_e2e ;;
  all)      run_backend; run_frontend; run_e2e ;;
  *)
    echo "Uso: $0 [backend|frontend|e2e|all] [--coverage]"
    exit 1
    ;;
esac

END=$(date +%s)
DURATION=$((END - START))

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "  Resultados: ${GREEN}✅ $PASS pasos OK${NC} | ${RED}❌ $FAIL fallidos${NC}"
echo "  Duración: ${DURATION}s"
echo -e "${CYAN}======================================${NC}"

[ "$FAIL" -eq 0 ] || exit 1
