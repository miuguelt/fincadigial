"""
Test Suite para Multi-Tenant _projects/villaluz
======================================

Este paquete contiene todos los tests para validar la implementación multi-tenant.

Estructura:
-----------
tests/
├── __init__.py              # Este archivo
├── test_multi_tenant_rbac.py       # Tests de roles y permisos
├── test_tenant_isolation.py        # Tests de aislamiento de datos
└── test_finca_registration_e2e.py  # Tests E2E de registro de finca

Ejecución:
----------
# Todos los tests
python -m pytest tests/ -v

# Un archivo específico
python -m pytest tests/test_multi_tenant_rbac.py -v

# Con cobertura
python -m pytest tests/ --cov=app --cov-report=html

# Solo tests críticos
python -m pytest tests/ -v -m critical

Notas:
------
- Los tests usan una base de datos SQLite en memoria (:memory:)
- Cada test se ejecuta en una transacción que se revierte al final
- No modifica la base de datos real de la aplicación
"""

__version__ = '1.0.0'
__author__ = 'DevBrain Team'

