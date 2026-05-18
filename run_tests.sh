#!/bin/bash
set -e
echo "=== Villa Luz OS — Test Suite ==="

echo -e "\n[1/4] Tests unitarios Flask..."
cd backend
pytest tests/unit/ -v --tb=short \
  --cov=app --cov-report=html:coverage/unit \
  --cov-fail-under=70
cd ..

echo -e "\n[2/4] Tests integración Flask..."
cd backend
pytest tests/integration/ tests/contract/ -v --tb=short \
  --cov=app --cov-append --cov-report=html:coverage/full
cd ..

echo -e "\n[3/4] Tests unitarios + integración React..."
npm run test:coverage

echo -e "\n[4/4] Tests E2E Playwright..."
npx playwright test --reporter=html

echo -e "\n=== Todos los tests pasaron ==="
