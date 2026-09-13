import pytest


@pytest.fixture(autouse=True)
def db_session():
    """Pure domain tests deliberately avoid the repository's database fixture."""
    yield None
