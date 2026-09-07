"""LRU in-memory cache with a size limit.

Extracted from ``cache_helpers`` so the eviction policy lives on its own
cohesive module. Keeps only the most-recent entries and evicts the oldest to
bound memory usage.
"""

from collections import OrderedDict
import logging

logger = logging.getLogger(__name__)


class LRUCache:
    """Cache LRU (Least Recently Used) con límite de tamaño.

    Evita memory leaks manteniendo solo las entradas más recientes.
    Cuando se alcanza el límite, elimina las entradas más antiguas.
    """

    def __init__(self, max_size=1000):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, key):
        """Obtener valor y mover al final (más reciente)."""
        if key in self.cache:
            self.hits += 1
            # Mover al final (más reciente)
            self.cache.move_to_end(key)
            return self.cache[key]
        self.misses += 1
        return None

    def set(self, key, value):
        """Guardar valor y aplicar política LRU si es necesario."""
        if key in self.cache:
            # Actualizar valor existente
            self.cache.move_to_end(key)
            self.cache[key] = value
        else:
            # Nuevo valor
            self.cache[key] = value
            # Aplicar límite de tamaño
            if len(self.cache) > self.max_size:
                # Eliminar el más antiguo (primero en OrderedDict)
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                logger.debug("LRU eviction: removed oldest cache entry")

    def clear(self):
        """Limpiar todo el caché."""
        self.cache.clear()

    def size(self):
        """Tamaño actual del caché."""
        return len(self.cache)

    def stats(self):
        """Estadísticas del caché."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%",
        }
