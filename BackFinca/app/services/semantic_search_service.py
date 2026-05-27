"""
Servicio de Busqueda Semantica (P3.4)
Implementa busqueda vectorial para animales y registros
"""

from typing import Any
from difflib import SequenceMatcher
import re
import logging
from sqlalchemy import or_
from app.models.animals import Animals, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """
    Servicio de busqueda semantica para el sistema VillaLuz.

    Implementa busqueda por similitud textual y coincidencia por subcadenas
    con soporte para busqueda instantanea en tiempo real.
    """

    FIELD_WEIGHTS = {
        'record': 1.0,
        'breed_name': 0.8,
        'species_name': 0.9,
        'description': 0.6,
    }

    @classmethod
    def _calculate_match_score(cls, query: str, target: str) -> float:
        if not query or not target:
            return 0.0
        q = query.lower().strip()
        t = target.lower().strip()
        
        # Coincidencia exacta obtiene el score maximo
        if q == t:
            return 1.0
            
        # Coincidencia por prefijo (ej. "An" coincide con "Animal") obtiene un score alto
        if t.startswith(q):
            return 0.8 + (len(q) / len(t)) * 0.15
            
        # Coincidencia por prefijo de palabra (ej. "An" coincide con "Vaca Animal")
        words = t.split()
        for w in words:
            if w.startswith(q):
                return 0.7 + (len(q) / len(w)) * 0.15
                
        # Coincidencia por subcadena en cualquier posicion (ej. "an" coincide con "cabana")
        if q in t:
            return 0.5 + (len(q) / len(t)) * 0.15
            
        # Si el valor objetivo es una palabra dentro de la consulta del usuario
        if t in q:
            return 0.6 + (len(t) / len(q)) * 0.15
            
        # Fallback a SequenceMatcher para similitud difusa
        return SequenceMatcher(None, q, t).ratio()

    @staticmethod
    def _similarity_score(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        a = a.lower().strip()
        b = b.lower().strip()
        return SequenceMatcher(None, a, b).ratio()

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        if not text:
            return []
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        tokens = text.split()
        stopwords = {
            'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al',
            'y', 'o', 'en', 'con', 'por', 'para', 'a', 'e', 'i', 'u',
        }
        # Reducir longitud minima a 1 para no ignorar prefijos de busqueda de 2 caracteres ("an", "v1", etc.)
        return [t for t in tokens if t not in stopwords and len(t) >= 1]

    @classmethod
    def search_animals(
        cls,
        query: str,
        finca_id: int,
        limit: int = 20,
        include_inactive: bool = False,
    ) -> list[dict[str, Any]]:
        query_tokens = cls._tokenize(query)
        if not query_tokens:
            return []

        from app.models.breeds import Breeds
        from app.models.species import Species

        base_query = Animals.query.filter(Animals.finca_id == finca_id)
        if not include_inactive:
            base_query = base_query.filter(Animals.status == AnimalStatus.Vivo)

        # Realizar join con breeds y species para permitir busqueda por raza y especie
        base_query = base_query.outerjoin(Breeds, Animals.breeds_id == Breeds.id).outerjoin(
            Species, Breeds.species_id == Species.id
        )

        search_filters = []
        for token in query_tokens:
            search_filters.append(
                or_(
                    Animals.record.ilike(f'%{token}%'),
                    Breeds.name.ilike(f'%{token}%'),
                    Species.name.ilike(f'%{token}%')
                )
            )

        if search_filters:
            base_query = base_query.filter(or_(*search_filters))

        base_query = base_query.limit(limit * 3)
        animals = base_query.all()

        results = []
        for animal in animals:
            scores = []

            record_score = cls._calculate_match_score(query, animal.record)
            scores.append(record_score * cls.FIELD_WEIGHTS['record'])

            if animal.breed and animal.breed.name:
                breed_score = cls._calculate_match_score(query, animal.breed.name)
                scores.append(breed_score * cls.FIELD_WEIGHTS['breed_name'])

            if animal.breed and animal.breed.species and animal.breed.species.name:
                species_score = cls._calculate_match_score(query, animal.breed.species.name)
                scores.append(species_score * cls.FIELD_WEIGHTS['species_name'])

            if scores:
                final_score = max(scores)
                if final_score > 0.1:
                    results.append({
                        'id': animal.id,
                        'name': animal.record,
                        'internal_id': animal.record,
                        'species': animal.breed.species.name if animal.breed and animal.breed.species else None,
                        'breed': animal.breed.name if animal.breed else None,
                        'score': round(final_score, 3),
                        'type': 'animal',
                        'url': f'/admin/animals/{animal.id}',
                    })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

    @classmethod
    def search_records(
        cls,
        query: str,
        finca_id: int,
        record_type: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        query_tokens = cls._tokenize(query)
        if not query_tokens:
            return []

        results = []
        query_lower = query.lower()

        if not record_type or record_type == 'treatment':
            search_filters = []
            for token in query_tokens:
                search_filters.append(
                    or_(
                        Treatments.description.ilike(f'%{token}%'),
                        Treatments.observations.ilike(f'%{token}%'),
                        Animals.record.ilike(f'%{token}%')
                    )
                )

            treatments_query = (
                Treatments.query.join(Animals, Treatments.animal_id == Animals.id)
                .filter(Animals.finca_id == finca_id)
            )
            if search_filters:
                treatments_query = treatments_query.filter(or_(*search_filters))

            treatments = treatments_query.limit(limit * 3).all()

            for t in treatments:
                text = f'{t.description or ""} {t.observations or ""}'.lower()
                score = cls._calculate_match_score(query_lower, text)
                
                animal_record = t.animals.record if t.animals else 'N/A'
                record_score = cls._calculate_match_score(query_lower, animal_record)
                final_score = max(score, record_score)

                if final_score > 0.1:
                    results.append({
                        'id': t.id,
                        'title': f'Tratamiento: {animal_record}',
                        'description': t.description or 'Sin descripcion',
                        'date': t.treatment_date.isoformat() if t.treatment_date else None,
                        'score': round(final_score, 3),
                        'type': 'treatment',
                        'url': f'/admin/treatments/{t.id}',
                    })

        if not record_type or record_type == 'vaccination':
            search_filters = []
            for token in query_tokens:
                search_filters.append(
                    or_(
                        Vaccinations.notes.ilike(f'%{token}%'),
                        Animals.record.ilike(f'%{token}%')
                    )
                )

            vaccs_query = (
                Vaccinations.query.join(Animals, Vaccinations.animal_id == Animals.id)
                .filter(Animals.finca_id == finca_id)
            )
            if search_filters:
                vaccs_query = vaccs_query.filter(or_(*search_filters))

            vaccs = vaccs_query.limit(limit * 3).all()

            for v in vaccs:
                text = f'{v.notes or ""}'.lower()
                score = cls._calculate_match_score(query_lower, text)
                
                animal_record = v.animals.record if v.animals else 'N/A'
                record_score = cls._calculate_match_score(query_lower, animal_record)
                final_score = max(score, record_score)

                if final_score > 0.1:
                    results.append({
                        'id': v.id,
                        'title': f'Vacunacion: {animal_record}',
                        'description': v.notes or 'Sin notas',
                        'date': v.vaccination_date.isoformat() if v.vaccination_date else None,
                        'score': round(final_score, 3),
                        'type': 'vaccination',
                        'url': f'/admin/vaccinations/{v.id}',
                    })

        if not record_type or record_type == 'control':
            search_filters = []
            for token in query_tokens:
                search_filters.append(
                    or_(
                        Control.description.ilike(f'%{token}%'),
                        Control.health_status.ilike(f'%{token}%'),
                        Animals.record.ilike(f'%{token}%')
                    )
                )

            controls_query = (
                Control.query.join(Animals, Control.animal_id == Animals.id)
                .filter(Animals.finca_id == finca_id)
            )
            if search_filters:
                controls_query = controls_query.filter(or_(*search_filters))

            controls = controls_query.limit(limit * 3).all()

            for c in controls:
                hs_val = c.health_status.value if hasattr(c.health_status, 'value') else str(c.health_status)
                text = f'{c.description or ""} {hs_val}'.lower()
                score = cls._calculate_match_score(query_lower, text)
                
                animal_record = c.animals.record if c.animals else 'N/A'
                record_score = cls._calculate_match_score(query_lower, animal_record)
                final_score = max(score, record_score)

                if final_score > 0.1:
                    results.append({
                        'id': c.id,
                        'title': f'Control: {animal_record}',
                        'description': c.description or 'Sin descripcion',
                        'date': c.checkup_date.isoformat() if c.checkup_date else None,
                        'score': round(final_score, 3),
                        'type': 'control',
                        'url': f'/admin/controls/{c.id}',
                    })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

    @classmethod
    def unified_search(
        cls,
        query: str,
        finca_id: int,
        limit: int = 20,
    ) -> dict[str, list[dict[str, Any]]]:
        return {
            'animals': cls.search_animals(query, finca_id, limit),
            'records': cls.search_records(query, finca_id, limit=limit // 2),
        }


semantic_search_service = SemanticSearchService()
