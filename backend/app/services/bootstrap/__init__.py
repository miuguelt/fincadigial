"""Bootstrap idempotente de datos para instalaciones nuevas."""

from .runner import run_database_bootstrap

__all__ = ["run_database_bootstrap"]
