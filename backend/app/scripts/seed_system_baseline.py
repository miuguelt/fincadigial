"""Siembra únicamente datos globales compartidos por todas las fincas."""

from app import create_app
from app.services.bootstrap.system import seed_global_baseline


def main() -> None:
    app = create_app()
    with app.app_context():
        print(seed_global_baseline())


if __name__ == "__main__":
    main()
