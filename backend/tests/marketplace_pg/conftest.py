"""Real PostgreSQL isolation: each contract test rolls back its outer transaction."""
import os
from pathlib import Path
import sys
import pytest
from sqlalchemy.orm import scoped_session, sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture(autouse=True)
def db_session(app):
    from app import db
    if not os.environ.get("VILLALUZ_MARKET_TEST_SCHEMA", "").startswith("market_test_"):
        pytest.skip("Ejecuta scripts/test_marketplace_postgres.py para crear el esquema aislado.")
    with app.app_context():
        assert db.engine.dialect.name == "postgresql"
        db.create_all()
        connection = db.engine.connect()
        transaction = connection.begin()
        original = db.session
        db.session = scoped_session(sessionmaker(bind=connection, join_transaction_mode="create_savepoint"))
        try:
            yield db
        finally:
            db.session.remove()
            transaction.rollback()
            connection.close()
            db.session = original
