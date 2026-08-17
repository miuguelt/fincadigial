"""Carga fincas y operaciones demo; requiere variables explícitas."""

from app import create_app
from app.services.bootstrap.config import load_bootstrap_settings
from app.services.bootstrap.demo import seed_demo_data


def main() -> None:
    app = create_app()
    with app.app_context():
        print(seed_demo_data(load_bootstrap_settings()))


if __name__ == "__main__":
    main()
