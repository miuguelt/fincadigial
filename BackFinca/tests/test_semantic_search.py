import pytest
from app.services.semantic_search_service import semantic_search_service
from app.models.animals import Animals, AnimalStatus
from app.models.breeds import Breeds
from app.models.species import Species
from app import db

def test_semantic_search_tokenization():
    """Verifica que la tokenización permita caracteres cortos de búsqueda >= 1"""
    tokens = semantic_search_service._tokenize("An")
    assert "an" in tokens
    
    tokens_long = semantic_search_service._tokenize("Vaca Holando")
    assert "vaca" in tokens_long
    assert "holando" in tokens_long

def test_semantic_search_match_scoring():
    """Verifica el cálculo de puntaje de coincidencia por subcadenas"""
    # Coincidencia exacta
    assert semantic_search_service._calculate_match_score("an", "an") == 1.0
    
    # Prefijo
    score_prefix = semantic_search_service._calculate_match_score("an", "animal")
    assert score_prefix > 0.8
    
    # Coincidencia por subcadena
    score_substring = semantic_search_service._calculate_match_score("an", "cabana")
    assert 0.5 <= score_substring < 0.8

from datetime import date
from app.models import FarmType, Finca

def test_semantic_search_animals_matching(app, client, token_for):
    """Prueba que la búsqueda unificada funcione con prefijos y devuelva resultados correctos"""
    with app.app_context():
        # Obtener o crear la finca tradicional para que coincida con la que token_for usa
        finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
        if not finca:
            finca = Finca.create(
                name="Finca Tradicional Test",
                type=FarmType.Tradicional,
                is_active=True
            )
            db.session.commit()
        finca_id = finca.id
        
        # Intentar obtener o crear especie
        species = Species.query.filter_by(name="Bovino Test").first()
        if not species:
            species = Species.create(name="Bovino Test", description="Especie de prueba")
            
        # Intentar obtener o crear raza
        breed = Breeds.query.filter_by(name="Holando Test").first()
        if not breed:
            breed = Breeds.create(name="Holando Test", species_id=species.id)
            
        # Crear animales con récords conocidos
        animal1 = Animals.query.filter_by(record="AN-001", finca_id=finca_id).first()
        if not animal1:
            animal1 = Animals.create(
                record="AN-001",
                sex="Hembra",
                birth_date=date(2024, 1, 1),
                weight=120.0,
                status=AnimalStatus.Vivo,
                breeds_id=breed.id,
                finca_id=finca_id
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
                finca_id=finca_id
            )
            
        db.session.commit()
        
        # Realizar la búsqueda mediante el servicio directamente
        results = semantic_search_service.search_animals("AN", finca_id)
        assert len(results) >= 1
        records_found = [r["name"] for r in results]
        assert "AN-001" in records_found
        
        # Probar que busque por raza
        results_breed = semantic_search_service.search_animals("Holando", finca_id)
        assert len(results_breed) >= 1
        
        # Probar a nivel de endpoint API con autenticación
        resp = client.get("/api/v1/search?q=AN", headers=token_for("Administrador"))
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "animals" in body["data"]
