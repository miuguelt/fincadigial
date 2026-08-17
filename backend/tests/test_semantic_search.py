import pytest
from app.services.semantic_search_service import semantic_search_service
from app.models.animals import Animals, AnimalStatus
from app.models.breeds import Breeds
from app.models.species import Species
from app.models.fields import Fields, LandStatus
from app.models.control import Control, HealthStatus
from app.models.tasks import Tasks, TaskStatus, TaskPriority
from app.models.medications import Medications
from app.models.vaccines import Vaccines, VaccineType
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app import db
from datetime import date
from app.models import FarmType, Finca


def test_semantic_search_tokenization():
    """Verifica que la tokenización permita caracteres cortos de búsqueda >= 1"""
    tokens = semantic_search_service._tokenize("An")
    assert "an" in tokens

    tokens_long = semantic_search_service._tokenize("Vaca Holando")
    assert "vaca" in tokens_long
    assert "holando" in tokens_long

    # Normalización de tildes
    tokens_accents = semantic_search_service._tokenize("Vacunación Café")
    assert "vacunacion" in tokens_accents
    assert "cafe" in tokens_accents


def test_semantic_search_match_scoring():
    """Verifica el cálculo de puntaje de coincidencia por subcadenas y normalización"""
    # Coincidencia exacta
    assert semantic_search_service._calculate_match_score("an", "an") == 1.0

    # Prefijo
    score_prefix = semantic_search_service._calculate_match_score("an", "animal")
    assert score_prefix > 0.8

    # Coincidencia por subcadena
    score_substring = semantic_search_service._calculate_match_score("an", "cabana")
    assert 0.5 <= score_substring < 0.8

    # Coincidencia insensible a tildes
    score_accent = semantic_search_service._calculate_match_score("pasto", "Pastó")
    assert score_accent == 1.0


def test_semantic_search_animals_matching(app, client, token_for):
    """Prueba que la búsqueda unificada funcione con prefijos y devuelva resultados correctos"""
    with app.app_context():
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Finca Tradicional Test", type=FarmType.Tradicional, is_active=True
            )
            db.session.commit()
        finca_id = finca.id

        species = Species.query.filter_by(name="Bovino Test").first()
        if not species:
            species = Species.create(
                name="Bovino Test", description="Especie de prueba"
            )

        breed = Breeds.query.filter_by(name="Holando Test").first()
        if not breed:
            breed = Breeds.create(name="Holando Test", species_id=species.id)

        animal1 = Animals.query.filter_by(record="AN-001", finca_id=finca_id).first()
        if not animal1:
            animal1 = Animals.create(
                record="AN-001",
                sex="Hembra",
                birth_date=date(2024, 1, 1),
                weight=120.0,
                status=AnimalStatus.Vivo,
                breeds_id=breed.id,
                finca_id=finca_id,
            )

        animal2 = Animals.query.filter_by(record="VACA-02", finca_id=finca_id).first()
        if not animal2:
            animal2 = Animals.create(
                record="VACA-02",
                sex="Hembra",
                birth_date=date(2024, 1, 1),
                weight=150.0,
                status=AnimalStatus.Vivo,
                breeds_id=breed.id,
                finca_id=finca_id,
            )

        # Crear Potrero para probar búsqueda por "po"
        field1 = Fields.query.filter_by(
            name="Potrero Norte Test", finca_id=finca_id
        ).first()
        if not field1:
            field1 = Fields.create(
                name="Potrero Norte Test",
                ubication="Sector Alto",
                area="15",
                state=LandStatus.Activo,
                finca_id=finca_id,
            )

        # Crear Control para probar que Enum HealthStatus no falle con ILIKE
        control1 = Control.query.filter_by(animal_id=animal1.id).first()
        if not control1:
            control1 = Control.create(
                animal_id=animal1.id,
                checkup_date=date(2024, 6, 1),
                health_status=HealthStatus.Excelente,
                description="Control periódico del animal",
                weight=125.0,
                finca_id=finca_id,
            )

        db.session.commit()

        # Búsqueda por "po" - No debe arrojar error y debe encontrar el Potrero
        results_po = semantic_search_service.unified_search("po", finca_id)
        assert "animals" in results_po
        assert "fields" in results_po
        assert "records" in results_po
        assert len(results_po["fields"]) >= 1
        assert any(f["name"] == "Potrero Norte Test" for f in results_po["fields"])

        # Realizar la búsqueda de animales
        results = semantic_search_service.search_animals("AN", finca_id)
        assert len(results) >= 1
        records_found = [r["name"] for r in results]
        assert "AN-001" in records_found

        # Probar a nivel de endpoint API con autenticación
        resp = client.get("/api/v1/search?q=po", headers=token_for("Administrador"))
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "fields" in body["data"]
        assert "animals" in body["data"]
        assert "records" in body["data"]
