"""
Servicio de Búsqueda Semántica (P3.4)
Implementa búsqueda vectorial para animales y registros
"""

from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher
import re
import flask
from app.extensions import db
from app.models.animals import Animal
from app.models.treatments import Treatment
from app.models.vaccinations import Vaccination
from app.models.controls import Control
from app.utils.db_optimization import optimized_query


class SemanticSearchService:
    """
    Servicio de búsqueda semántica para el sistema VillaLuz.
    
    Implementa búsqueda por similitud textual como base para
    futura integración con Vector DB (Qdrant/Pinecone).
    """
    
    # Pesos para diferentes campos en la búsqueda
    FIELD_WEIGHTS = {
        'name': 1.0,
        'internal_id': 0.9,
        'species_name': 0.8,
        'breed_name': 0.7,
        'notes': 0.6,
        'treatment_notes': 0.5,
    }
    
    @staticmethod
    def _similarity_score(a: str, b: str) -> float:
        """Calcula score de similitud entre dos strings (0-1)"""
        if not a or not b:
            return 0.0
        
        # Normalizar
        a = a.lower().strip()
        b = b.lower().strip()
        
        # Usar SequenceMatcher para similitud
        return SequenceMatcher(None, a, b).ratio()
    
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Tokeniza texto para búsqueda semántica"""
        if not text:
            return []
        
        # Eliminar caracteres especiales y tokenizar
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        tokens = text.split()
        
        # Filtrar stopwords en español
        stopwords = {'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 
                     'y', 'o', 'en', 'con', 'por', 'para', 'a', 'e', 'i', 'u'}
        
        return [t for t in tokens if t not in stopwords and len(t) > 2]
    
    @classmethod
    def search_animals(
        cls,
        query: str,
        finca_id: int,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Búsqueda semántica de animales.
        
        Args:
            query: Texto de búsqueda
            finca_id: ID de la finca
            limit: Límite de resultados
            include_inactive: Incluir animales inactivos
        
        Returns:
            Lista de animales ordenados por relevancia
        """
        query_tokens = cls._tokenize(query)
        if not query_tokens:
            return []
        
        # Construir query base optimizada
        base_query = Animal.query.filter(Animal.finca_id == finca_id)
        
        if not include_inactive:
            base_query = base_query.filter(Animal.is_active == True)
        
        # Cargar candidatos (limitado para performance)
        animals = base_query.limit(100).all()
        
        results = []
        for animal in animals:
            # Calcular score combinado
            scores = []
            
            # Nombre del animal
            if animal.name:
                name_score = max(
                    cls._similarity_score(token, animal.name.lower())
                    for token in query_tokens
                )
                scores.append(name_score * cls.FIELD_WEIGHTS['name'])
            
            # ID interno
            if animal.internal_id:
                id_score = max(
                    cls._similarity_score(token, str(animal.internal_id).lower())
                    for token in query_tokens
                )
                scores.append(id_score * cls.FIELD_WEIGHTS['internal_id'])
            
            # Especie
            if animal.species and animal.species.name:
                species_score = max(
                    cls._similarity_score(token, animal.species.name.lower())
                    for token in query_tokens
                )
                scores.append(species_score * cls.FIELD_WEIGHTS['species_name'])
            
            # Raza
            if animal.breed and animal.breed.name:
                breed_score = max(
                    cls._similarity_score(token, animal.breed.name.lower())
                    for token in query_tokens
                )
                scores.append(breed_score * cls.FIELD_WEIGHTS['breed_name'])
            
            # Notas
            if animal.notes:
                notes_score = max(
                    cls._similarity_score(token, animal.notes.lower())
                    for token in query_tokens
                )
                scores.append(notes_score * cls.FIELD_WEIGHTS['notes'])
            
            # Score final
            if scores:
                final_score = max(scores)
                if final_score > 0.3:  # Threshold mínimo
                    results.append({
                        'id': animal.id,
                        'name': animal.name,
                        'internal_id': animal.internal_id,
                        'species': animal.species.name if animal.species else None,
                        'breed': animal.breed.name if animal.breed else None,
                        'score': round(final_score, 3),
                        'type': 'animal',
                        'url': f'/admin/animals/{animal.id}'
                    })
        
        # Ordenar por score y limitar
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
    
    @classmethod
    def search_records(
        cls,
        query: str,
        finca_id: int,
        record_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Búsqueda semántica en registros médicos.
        
        Args:
            query: Texto de búsqueda
            finca_id: ID de la finca
            record_type: Tipo de registro ('treatment', 'vaccination', 'control')
            limit: Límite de resultados
        
        Returns:
            Lista de registros ordenados por relevancia
        """
        results = []
        query_lower = query.lower()
        
        # Buscar en tratamientos
        if not record_type or record_type == 'treatment':
            treatments = Treatment.query.join(Animal).filter(
                Animal.finca_id == finca_id
            ).limit(50).all()
            
            for treatment in treatments:
                score = 0
                notes = (treatment.notes or '') + ' ' + (treatment.diagnosis or '')
                
                if notes:
                    score = cls._similarity_score(query_lower, notes.lower())
                
                if score > 0.3:
                    results.append({
                        'id': treatment.id,
                        'title': f'Tratamiento: {treatment.animal.name if treatment.animal else "N/A"}',
                        'description': treatment.diagnosis or 'Sin diagnóstico',
                        'date': treatment.treatment_date.isoformat() if treatment.treatment_date else None,
                        'score': round(score, 3),
                        'type': 'treatment',
                        'url': f'/admin/treatments/{treatment.id}'
                    })
        
        # Ordenar y limitar
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
    
    @classmethod
    def unified_search(
        cls,
        query: str,
        finca_id: int,
        limit: int = 20
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Búsqueda unificada en todas las entidades.
        
        Args:
            query: Texto de búsqueda
            finca_id: ID de la finca
            limit: Límite por categoría
        
        Returns:
            Diccionario con resultados por categoría
        """
        return {
            'animals': cls.search_animals(query, finca_id, limit),
            'records': cls.search_records(query, finca_id, limit=limit // 2),
        }


# Instancia global
semantic_search_service = SemanticSearchService()
