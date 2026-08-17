"""Aplica los defaults a todas las fincas ya registradas."""

from app import create_app
from app.services.bootstrap.finca import seed_all_finca_baselines


def main() -> None:
    app = create_app()
    with app.app_context():
        print(seed_all_finca_baselines())


if __name__ == "__main__":
    main()
