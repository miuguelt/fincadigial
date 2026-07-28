#!/usr/bin/env python3
"""Sembrado mínimo de Villaluz para el orquestador DevBrain."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))


def main():
    from app import create_app, db
    from app.utils.seed_users import ensure_test_users

    app = create_app("development")
    with app.app_context():
        db.create_all()
        ensure_test_users()
        print("✅ Villaluz: tablas y usuarios de desarrollo listos.")


if __name__ == "__main__":
    main()
