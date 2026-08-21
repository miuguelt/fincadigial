"""Módulo de rutas de gestión reproductiva.

Importar este paquete registra todas las rutas sobre ``reproduction_ns``:
CRUD de eventos y descendencia, indicadores, planeación y registro por lote.
"""

from ._namespace import reproduction_ns
from . import analytics_routes  # noqa: F401 — registra rutas al importarse
from . import batch_routes  # noqa: F401 — registra rutas al importarse
from . import events_routes  # noqa: F401 — registra rutas al importarse
from . import offspring_routes  # noqa: F401 — registra rutas al importarse
from . import planning_routes  # noqa: F401 — registra rutas al importarse

__all__ = ["reproduction_ns"]
