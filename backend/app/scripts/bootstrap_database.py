"""Entrada CLI usada por Coolify después de ejecutar las migraciones."""

from __future__ import annotations

import json
import os

from app import create_app
from app.services.bootstrap import run_database_bootstrap


def main() -> None:
    config_name = os.getenv("FLASK_CONFIG") or os.getenv("FLASK_ENV") or "production"
    app = create_app(config_name)
    with app.app_context():
        result = run_database_bootstrap()
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
