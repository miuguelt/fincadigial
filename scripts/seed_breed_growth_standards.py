"""
Seed estándares de crecimiento por raza (BreedGrowthStandard).
Crea 120 registros: 4 razas × 2 sexos × 15 edades.
Idempotente — requiere ALLOW_SIMULATION_SCRIPTS=true
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app, db
from app.models.breeds import Breeds, BreedPurpose
from app.models.species import Species
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage

# Estándares: (edad_meses, peso_esperado, peso_min, adg_esperado, adg_min)
# Datos aproximados para bovinos colombianos (valores de referencia ICA/Fedegán)
STANDARDS_BY_BREED = {
    "Brahman": {
        "Hembra": [
            (1, 45, 35, 0.6, 0.4),
            (2, 65, 52, 0.65, 0.45),
            (3, 85, 68, 0.7, 0.5),
            (4, 105, 84, 0.65, 0.45),
            (5, 125, 100, 0.6, 0.4),
            (6, 145, 116, 0.55, 0.35),
            (8, 180, 144, 0.5, 0.3),
            (10, 210, 168, 0.45, 0.25),
            (12, 240, 192, 0.4, 0.2),
            (14, 265, 212, 0.35, 0.2),
            (16, 290, 232, 0.3, 0.15),
            (18, 315, 252, 0.25, 0.15),
            (21, 345, 276, 0.2, 0.1),
            (24, 370, 296, 0.15, 0.1),
            (36, 420, 336, 0.1, 0.05),
        ],
        "Macho": [
            (1, 48, 38, 0.65, 0.45),
            (2, 70, 56, 0.7, 0.5),
            (3, 92, 74, 0.75, 0.55),
            (4, 115, 92, 0.7, 0.5),
            (5, 138, 110, 0.65, 0.45),
            (6, 160, 128, 0.6, 0.4),
            (8, 200, 160, 0.55, 0.35),
            (10, 235, 188, 0.5, 0.3),
            (12, 270, 216, 0.45, 0.25),
            (14, 300, 240, 0.4, 0.25),
            (16, 330, 264, 0.35, 0.2),
            (18, 360, 288, 0.3, 0.2),
            (21, 400, 320, 0.25, 0.15),
            (24, 440, 352, 0.2, 0.1),
            (36, 520, 416, 0.15, 0.08),
        ],
    },
    "Holstein": {
        "Hembra": [
            (1, 50, 40, 0.7, 0.5),
            (2, 72, 58, 0.75, 0.55),
            (3, 95, 76, 0.8, 0.6),
            (4, 118, 94, 0.75, 0.55),
            (5, 140, 112, 0.7, 0.5),
            (6, 160, 128, 0.65, 0.45),
            (8, 195, 156, 0.55, 0.35),
            (10, 225, 180, 0.5, 0.3),
            (12, 255, 204, 0.45, 0.25),
            (14, 280, 224, 0.4, 0.25),
            (16, 305, 244, 0.35, 0.2),
            (18, 330, 264, 0.3, 0.2),
            (21, 360, 288, 0.25, 0.15),
            (24, 390, 312, 0.2, 0.1),
            (36, 460, 368, 0.1, 0.05),
        ],
        "Macho": [
            (1, 55, 44, 0.75, 0.55),
            (2, 80, 64, 0.8, 0.6),
            (3, 105, 84, 0.85, 0.65),
            (4, 130, 104, 0.8, 0.6),
            (5, 155, 124, 0.75, 0.55),
            (6, 180, 144, 0.7, 0.5),
            (8, 225, 180, 0.6, 0.4),
            (10, 265, 212, 0.55, 0.35),
            (12, 305, 244, 0.5, 0.3),
            (14, 340, 272, 0.45, 0.3),
            (16, 375, 300, 0.4, 0.25),
            (18, 410, 328, 0.35, 0.25),
            (21, 460, 368, 0.3, 0.2),
            (24, 510, 408, 0.25, 0.15),
            (36, 620, 496, 0.15, 0.08),
        ],
    },
    "Gyr": {
        "Hembra": [
            (1, 42, 33, 0.55, 0.35),
            (2, 60, 48, 0.6, 0.4),
            (3, 78, 62, 0.6, 0.4),
            (4, 95, 76, 0.55, 0.35),
            (5, 112, 90, 0.5, 0.3),
            (6, 128, 102, 0.45, 0.25),
            (8, 158, 126, 0.4, 0.2),
            (10, 185, 148, 0.35, 0.2),
            (12, 210, 168, 0.3, 0.15),
            (14, 230, 184, 0.25, 0.15),
            (16, 250, 200, 0.2, 0.1),
            (18, 270, 216, 0.2, 0.1),
            (21, 295, 236, 0.15, 0.08),
            (24, 320, 256, 0.1, 0.05),
            (36, 380, 304, 0.08, 0.04),
        ],
        "Macho": [
            (1, 45, 36, 0.6, 0.4),
            (2, 65, 52, 0.65, 0.45),
            (3, 85, 68, 0.65, 0.45),
            (4, 105, 84, 0.6, 0.4),
            (5, 125, 100, 0.55, 0.35),
            (6, 145, 116, 0.5, 0.3),
            (8, 180, 144, 0.45, 0.25),
            (10, 210, 168, 0.4, 0.25),
            (12, 240, 192, 0.35, 0.2),
            (14, 265, 212, 0.3, 0.2),
            (16, 290, 232, 0.25, 0.15),
            (18, 315, 252, 0.25, 0.15),
            (21, 350, 280, 0.2, 0.1),
            (24, 385, 308, 0.15, 0.08),
            (36, 465, 372, 0.1, 0.05),
        ],
    },
    "Normando": {
        "Hembra": [
            (1, 48, 38, 0.65, 0.45),
            (2, 68, 54, 0.7, 0.5),
            (3, 90, 72, 0.7, 0.5),
            (4, 110, 88, 0.65, 0.45),
            (5, 130, 104, 0.6, 0.4),
            (6, 150, 120, 0.55, 0.35),
            (8, 185, 148, 0.5, 0.3),
            (10, 215, 172, 0.45, 0.25),
            (12, 245, 196, 0.4, 0.2),
            (14, 270, 216, 0.35, 0.2),
            (16, 295, 236, 0.3, 0.15),
            (18, 320, 256, 0.25, 0.15),
            (21, 350, 280, 0.2, 0.1),
            (24, 380, 304, 0.15, 0.08),
            (36, 440, 352, 0.1, 0.05),
        ],
        "Macho": [
            (1, 52, 42, 0.7, 0.5),
            (2, 75, 60, 0.75, 0.55),
            (3, 100, 80, 0.75, 0.55),
            (4, 125, 100, 0.7, 0.5),
            (5, 150, 120, 0.65, 0.45),
            (6, 175, 140, 0.6, 0.4),
            (8, 220, 176, 0.55, 0.35),
            (10, 260, 208, 0.5, 0.3),
            (12, 300, 240, 0.45, 0.25),
            (14, 335, 268, 0.4, 0.25),
            (16, 370, 296, 0.35, 0.2),
            (18, 405, 324, 0.3, 0.2),
            (21, 455, 364, 0.25, 0.15),
            (24, 505, 404, 0.2, 0.1),
            (36, 620, 496, 0.12, 0.06),
        ],
    },
}

BREED_PURPOSE_MAP = {
    "Brahman": BreedPurpose.Meat,
    "Holstein": BreedPurpose.Milk,
    "Gyr": BreedPurpose.Milk,
    "Normando": BreedPurpose.Dual,
}


def get_stage(age_months):
    if age_months <= 1:
        return GrowthStage.Neonato
    elif age_months <= 6:
        return GrowthStage.Lactancia
    elif age_months <= 12:
        return GrowthStage.Destete
    elif age_months <= 24:
        return GrowthStage.Desarrollo
    return GrowthStage.Adulto


def seed_breed_growth_standards():
    app = create_app("development")
    with app.app_context():
        species = Species.query.filter_by(name="Bovino").first()
        if not species:
            species = Species(name="Bovino", description="Ganado bovino")
            db.session.add(species)
            db.session.flush()

        total = 0
        for breed_name, data in STANDARDS_BY_BREED.items():
            breed = Breeds.query.filter_by(name=breed_name).first()
            if not breed:
                breed = Breeds(
                    name=breed_name,
                    species_id=species.id,
                    purpose=BREED_PURPOSE_MAP[breed_name],
                    is_active=True,
                )
                db.session.add(breed)
                db.session.flush()

            for sex_label, standards in data.items():
                for age, exp_w, min_w, exp_adg, min_adg in standards:
                    stage = get_stage(age)
                    existing = BreedGrowthStandard.query.filter_by(
                        breed_id=breed.id,
                        sex=sex_label,
                        growth_stage=stage,
                        age_months=age,
                    ).first()
                    if existing:
                        continue
                    rec = BreedGrowthStandard(
                        breed_id=breed.id,
                        sex=sex_label,
                        growth_stage=stage,
                        age_months=age,
                        expected_weight_kg=exp_w,
                        min_weight_kg=min_w,
                        expected_adg_kg=exp_adg,
                        min_adg_kg=min_adg,
                    )
                    db.session.add(rec)
                    total += 1

        db.session.commit()
        print(f"Creados {total} estándares de crecimiento (4 razas, 2 sexos, 15 edades)")


if __name__ == "__main__":
    seed_breed_growth_standards()
