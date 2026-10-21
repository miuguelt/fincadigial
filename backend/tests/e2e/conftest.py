"""
Fixtures zootécnicos y utilidades de configuración para la suite E2E de Villa Luz.
"""

from datetime import date
import pytest
from app import db
from app.models.finca import Finca, FarmType
from app.models.species import Species
from app.models.breeds import Breeds
from app.models.animals import Animals, Sex, AnimalStatus


@pytest.fixture
def livestock_setup(app, db_session):
    """Crea una estructura ganadera completa y consistente para pruebas E2E en el tenant del usuario autenticado."""
    with app.app_context():
        # 1. Usar la finca tradicional existente (compartida con auth_headers) o crearla
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Hacienda Villa Luz E2E",
                type=FarmType.Tradicional,
                department="Antioquia",
                municipality="Santa Bárbara",
                is_active=True,
            )

        # 2. Especie Bovina
        species = Species.query.filter_by(name="Bovino E2E").first()
        if not species:
            species = Species(name="Bovino E2E")
            db.session.add(species)
            db.session.commit()

        # 3. Razas lechera y de carne
        breed_dairy = Breeds.query.filter_by(name="Holstein Colombiano", species_id=species.id).first()
        if not breed_dairy:
            breed_dairy = Breeds(name="Holstein Colombiano", species_id=species.id)
            db.session.add(breed_dairy)

        breed_beef = Breeds.query.filter_by(name="Brahman Blanco", species_id=species.id).first()
        if not breed_beef:
            breed_beef = Breeds(name="Brahman Blanco", species_id=species.id)
            db.session.add(breed_beef)

        db.session.commit()

        return {
            "finca": finca,
            "finca_id": finca.id,
            "species": species,
            "species_id": species.id,
            "breed_dairy": breed_dairy,
            "breed_dairy_id": breed_dairy.id,
            "breed_beef": breed_beef,
            "breed_beef_id": breed_beef.id,
        }
