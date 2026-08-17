"""Datos globales compartidos por todas las fincas."""

from __future__ import annotations

import logging

from app import db
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage
from app.models.breeds import Breeds
from app.models.species import Species
from app.utils.seed_knowledge_base import seed_knowledge_base
from app.utils.seed_master import seed_learning_materials, seed_territories

logger = logging.getLogger("startup")

SPECIES_DATA = {
    "Bovino": ["Holstein", "Angus", "Simmental", "Brahman", "Cebú", "Jersey", "Normando", "Gyr", "Guzerat"],
    "Porcino": ["Duroc", "Landrace", "Hampshire", "Yorkshire", "Pietrain"],
    "Equino": ["Cuarto de Milla", "Paso Fino", "Árabe", "Pura Sangre", "Appaloosa"],
    "Caprino": ["Saanen", "Alpina", "Toggenburg", "Boer"],
}

_BOVINE_STAGES = (
    (GrowthStage.Neonato, 1, 45, 35, 0.55, 0.35),
    (GrowthStage.Lactancia, 3, 90, 70, 0.65, 0.45),
    (GrowthStage.Destete, 9, 210, 170, 0.70, 0.50),
    (GrowthStage.Desarrollo, 18, 360, 290, 0.65, 0.45),
    (GrowthStage.Adulto, 30, 480, 380, 0.25, 0.15),
)


def seed_global_baseline() -> dict[str, int]:
    """Siembra catálogos verdaderamente globales y es idempotente."""

    seed_knowledge_base()
    seed_territories()
    seed_learning_materials()
    created_species = 0
    created_breeds = 0
    created_standards = 0
    for species_name, breed_names in SPECIES_DATA.items():
        species = Species.query.filter_by(name=species_name).first()
        if not species:
            species = Species(name=species_name)
            db.session.add(species)
            db.session.flush()
            created_species += 1
        for breed_name in breed_names:
            breed = Breeds.query.filter_by(name=breed_name, species_id=species.id).first()
            if not breed:
                breed = Breeds(name=breed_name, species_id=species.id, is_active=True)
                db.session.add(breed)
                db.session.flush()
                created_breeds += 1
            if species_name != "Bovino":
                continue
            for sex, multiplier in (("Hembra", 1.0), ("Macho", 1.2)):
                for stage, age, expected, minimum, adg, min_adg in _BOVINE_STAGES:
                    exists = BreedGrowthStandard.query.filter_by(
                        breed_id=breed.id, sex=sex, growth_stage=stage, age_months=age
                    ).first()
                    if exists:
                        continue
                    db.session.add(
                        BreedGrowthStandard(
                            breed_id=breed.id,
                            sex=sex,
                            growth_stage=stage,
                            age_months=age,
                            expected_weight_kg=expected * multiplier,
                            min_weight_kg=minimum * multiplier,
                            max_weight_kg=expected * multiplier * 1.2,
                            expected_adg_kg=adg,
                            min_adg_kg=min_adg,
                        )
                    )
                    created_standards += 1
    db.session.commit()
    logger.info(
        "Baseline global listo: especies=%s razas=%s estándares=%s",
        created_species,
        created_breeds,
        created_standards,
    )
    return {
        "species": created_species,
        "breeds": created_breeds,
        "growth_standards": created_standards,
    }
