"""Datos globales compartidos por todas las fincas.

Catálogos maestros (especies, razas, curvas de crecimiento) más datos de
referencia basados en estudios y publicaciones para ganadería bovina
colombiana: benchmarks productivos por raza, tabla de condición corporal
(1-9), valores nutricionales de forrajes y división político-administrativa
(DANE) de Antioquia y Santander.

Fuentes: ICA, FEDEGAN, SENA, AGROSAVIA, DANE, NRC 2001, Wildman et al. 1982,
FAO. Todo idempotente: actualiza filas existentes, no las duplica.
"""

from __future__ import annotations

import logging

from app import db
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage
from app.models.breeds import BreedPurpose, Breeds
from app.models.species import Species
from app.models.system_content import SystemContent
from app.utils.seed_knowledge_base import seed_knowledge_base
from app.utils.seed_master import seed_learning_materials, seed_territories

logger = logging.getLogger("startup")

# ──────────────────────────────────────────────────────────────────────────────
# Catálogo de razas: nombre -> (propósito, origen, descripción, características)
# Criollas colombianas incluidas (ICA / AGROSAVIA).
# ──────────────────────────────────────────────────────────────────────────────
BREED_CATALOG = {
    "Bovino": {
        "Holstein": (
            BreedPurpose.Milk,
            "Holanda / Alemania",
            "Raza lechera de mayor producción mundial; especializada en trópico alto (2000+ msnm).",
            "Capacidad de ubre excelente, temperamento dócil, cuerpo angular y buena adaptación a estabulación.",
        ),
        "Angus": (
            BreedPurpose.Meat,
            "Escocia",
            "Raza cárnica de referencia nacional; crecimiento precoz y carne marmoleada.",
            "Robusta, fértil y excelente en sistemas de cruce con Cebú; formación de híbridos en trópico.",
        ),
        "Simmental": (
            BreedPurpose.Dual,
            "Suiza",
            "Raza de doble propósito; gran desarrollo y presencia de leche en cruzas.",
            "Pigmentación moteada roja y blanca, alta capacidad de crecimiento y buena producción láctea.",
        ),
        "Brahman": (
            BreedPurpose.Meat,
            "Estados Unidos (origen cebú indio)",
            "Raza cebú líder en ganadería de carne del trópico bajo colombiano.",
            "Bajada en calor por piel pigmentada y orejas caídas; alta adaptación a altas temperaturas.",
        ),
        "Cebú": (
            BreedPurpose.Meat,
            "India",
            "Bos indicus comercial y base de la ganadería de cría del trópico; núcleo de cruces dobles.",
            "Resistencia a garrapatas, versatilidad y rusticidad; soporte de ranchería de cruzamiento.",
        ),
        "Jersey": (
            BreedPurpose.Milk,
            "Isla de Jersey (Reino Unido)",
            "Raza lechera eficiente en trópico; excelente conversión y alto contenido de grasa en leche.",
            "Tamaño reducido, alta fertilidad, leche rica en grasa (4.5-5%) y proteína.",
        ),
        "Normando": (
            BreedPurpose.Milk,
            "Francia",
            "Raza lechera de doble propósito muy difundida en los Andes colombianos.",
            "Leche apta para quesos por alta grasa, hueso fuerte y temperamento tranquilo.",
        ),
        "Gyr": (
            BreedPurpose.Dual,
            "India (Gujarat)",
            "Cebú lechero tropical; base del ganado criollo y cruzamientos de ganadería doble propósito.",
            "Productora de leche en trópico con alta resistencia a calor y eficiencia corporal.",
        ),
        "Guzerat": (
            BreedPurpose.Dual,
            "India (Gujarat)",
            "Cebú originario de Gujarat; base del ganado criollo y cruzamientos de ganadería.",
            "Productor en trópico con alta resistencia a calor, robustez y eficiencia reproductiva.",
        ),
        "Romosinuano": (
            BreedPurpose.Dual,
            "Colombia (San Jorge, Córdoba)",
            "Raza criolla colombiana de pelo rojo (romosinuano) y gran docilidad; contribuye a la seguridad alimentaria.",
            "Pelo corto rojo brillante, aceptable adaptación tropical, temperamento dócil y destino dual.",
        ),
        "Blanco Orejinegro": (
            BreedPurpose.Dual,
            "Colombia (Antioquia)",
            "Raza criolla antioqueña con pelo blanco y orejas negras; alta adaptabilidad y resistencia protozoa.",
            "Versatilidad en carne, leche y trabajo; excelente rusticidad y desempeño en húmedos.",
        ),
        "Casanare": (
            BreedPurpose.Dual,
            "Colombia (Casanare)",
            "Raza criolla adaptada a sabanas inundables; históricamente usada para trabajo y leche.",
            "Resistencia a suelos inundables, buena capacidad pulmonar y adaptación a ecosistemas difíciles.",
        ),
        "Hartón del Valle": (
            BreedPurpose.Dual,
            "Colombia (Valle del Cauca)",
            "Raza criolla de cuernos desarrollados (Hartón); doble propósito y elevada calidad de leche.",
            "Hasta 2.4 m de altura, excelente rendimiento lechero adaptado a agroecosistemas del valle.",
        ),
    },
    "Porcino": {
        "Duroc": (BreedPurpose.Meat, "Estados Unidos", "Raza porcina de carne: gran % magro.", "Pigmentación castaña y excelente rendimiento en canal."),
        "Landrace": (BreedPurpose.Meat, "Dinamarca", "Raza porcina horizontal (100% carne magra).", "Cuerpo alargado, extremidades cortas, buena prolificidad."),
        "Hampshire": (BreedPurpose.Meat, "Estados Unidos", "Raza porcina: longevidad y calidad de carne.", "Piel negra con banda blanca y excelente motorización."),
        "Yorkshire": (BreedPurpose.Meat, "Inglaterra", "Raza porcina reproductora y de madres.", "Ciclo reproductivo y alta adaptación; carne magra impecable."),
        "Pietrain": (BreedPurpose.Meat, "Bélgica", "Raza porcina de calidad en canal.", "Pigmentación blanca con moteado negro; HPP excepcional."),
    },
    "Equino": {
        "Cuarto de Milla": (BreedPurpose.Work, "Estados Unidos", "Raza equina velocista y de trabajo.", "Versatilidad reproductiva baja; buenos para zancada y traslado."),
        "Paso Fino": (BreedPurpose.Work, "Colombia", "Raza equina de paso amblador; excelente para transporte rural.", "Caballo criollo de andadura temblante útil en montañas."),
        "Árabe": (BreedPurpose.Work, "Arabia", "Raza equina de resistencia genética y pura sangre.", "Elegante, rústico y oriundo de climas cálidos."),
        "Pura Sangre": (BreedPurpose.Work, "Inglaterra", "Raza equina velocista por excelencia.", "Alta velocidad en recta y durabilidad en competencia."),
        "Appaloosa": (BreedPurpose.Work, "Estados Unidos", "Raza equina versátil de pelaje moteado.", "Sanidad robusta y versatilidad bajo silla en trabajo y turismo."),
    },
    "Caprino": {
        "Saanen": (BreedPurpose.Milk, "Suiza", "Raza caprina de alta producción de leche.", "Pelo blanco, perfil recto y buena rusticidad tropical parcial."),
        "Alpina": (BreedPurpose.Milk, "Francia", "Raza caprina lechera de alta producción.", "Pelo multicapa, excelente composición australiana estructural."),
        "Toggenburg": (BreedPurpose.Milk, "Suiza", "Raza caprina lechera alpina europea.", "Pelo castaño con marcas, alta producción láctea, y buena gama láctica."),
        "Boer": (BreedPurpose.Meat, "Sudáfrica", "Raza caprina cárnica de crecimiento superior.", "Pelo rojo y blanco, alta tasa de crecimiento y óptimos rendimientos."),
    },
}

# Curva genérica de respaldo (previa) para razas sin curva específica
_GENERIC_BOVINE_STAGES = (
    (GrowthStage.Neonato, 1, 45, 35, 0.55, 0.35),
    (GrowthStage.Lactancia, 3, 90, 70, 0.65, 0.45),
    (GrowthStage.Destete, 9, 210, 170, 0.70, 0.50),
    (GrowthStage.Desarrollo, 18, 360, 290, 0.65, 0.45),
    (GrowthStage.Adulto, 30, 480, 380, 0.25, 0.15),
)

# Curvas reales (hembra): (etapa, meses, esperado kg, mínimo kg, ADG kg/d, ADG mín kg/d)
# Basadas en datos de referencia FEDEGAN/AGROSAVIA-NRC por raza (Colombia).
BOVINE_CURVES: dict[str, dict] = {
    "Holstein": {
        "hembra": [
            (GrowthStage.Neonato, 1, 45, 35, 0.55, 0.35),
            (GrowthStage.Lactancia, 3, 100, 78, 0.64, 0.45),
            (GrowthStage.Destete, 9, 220, 180, 0.72, 0.52),
            (GrowthStage.Desarrollo, 18, 390, 310, 0.66, 0.46),
            (GrowthStage.Adulto, 30, 560, 450, 0.30, 0.18),
        ],
        "macho_factor": 1.15,
    },
    "Jersey": {
        "hembra": [
            (GrowthStage.Neonato, 1, 35, 28, 0.45, 0.30),
            (GrowthStage.Lactancia, 3, 80, 62, 0.55, 0.38),
            (GrowthStage.Destete, 9, 180, 145, 0.62, 0.44),
            (GrowthStage.Desarrollo, 18, 300, 240, 0.55, 0.38),
            (GrowthStage.Adulto, 30, 400, 320, 0.22, 0.14),
        ],
        "macho_factor": 1.10,
    },
    "Normando": {
        "hembra": [
            (GrowthStage.Neonato, 1, 40, 32, 0.50, 0.33),
            (GrowthStage.Lactancia, 3, 90, 70, 0.60, 0.42),
            (GrowthStage.Destete, 9, 200, 160, 0.66, 0.46),
            (GrowthStage.Desarrollo, 18, 350, 280, 0.62, 0.42),
            (GrowthStage.Adulto, 30, 520, 420, 0.28, 0.16),
        ],
        "macho_factor": 1.15,
    },
    "Angus": {
        "hembra": [
            (GrowthStage.Neonato, 1, 45, 36, 0.58, 0.38),
            (GrowthStage.Lactancia, 3, 105, 82, 0.70, 0.50),
            (GrowthStage.Destete, 9, 225, 185, 0.72, 0.52),
            (GrowthStage.Desarrollo, 18, 390, 310, 0.68, 0.48),
            (GrowthStage.Adulto, 30, 600, 480, 0.30, 0.18),
        ],
        "macho_factor": 1.22,
    },
    "Simmental": {
        "hembra": [
            (GrowthStage.Neonato, 1, 45, 36, 0.58, 0.38),
            (GrowthStage.Lactancia, 3, 105, 82, 0.70, 0.50),
            (GrowthStage.Destete, 9, 225, 185, 0.72, 0.52),
            (GrowthStage.Desarrollo, 18, 395, 315, 0.68, 0.48),
            (GrowthStage.Adulto, 30, 590, 470, 0.30, 0.18),
        ],
        "macho_factor": 1.22,
    },
    "Brahman": {
        "hembra": [
            (GrowthStage.Neonato, 1, 42, 34, 0.52, 0.35),
            (GrowthStage.Lactancia, 3, 95, 74, 0.62, 0.44),
            (GrowthStage.Destete, 9, 200, 160, 0.68, 0.48),
            (GrowthStage.Desarrollo, 18, 340, 270, 0.62, 0.42),
            (GrowthStage.Adulto, 30, 480, 385, 0.26, 0.15),
        ],
        "macho_factor": 1.20,
    },
    "Cebú": {
        "hembra": [
            (GrowthStage.Neonato, 1, 40, 32, 0.50, 0.34),
            (GrowthStage.Lactancia, 3, 90, 70, 0.60, 0.42),
            (GrowthStage.Destete, 9, 190, 150, 0.65, 0.45),
            (GrowthStage.Desarrollo, 18, 320, 255, 0.60, 0.40),
            (GrowthStage.Adulto, 30, 470, 370, 0.25, 0.14),
        ],
        "macho_factor": 1.20,
    },
    "Gyr": {
        "hembra": [
            (GrowthStage.Neonato, 1, 38, 31, 0.48, 0.33),
            (GrowthStage.Lactancia, 3, 85, 66, 0.57, 0.40),
            (GrowthStage.Destete, 9, 180, 143, 0.62, 0.44),
            (GrowthStage.Desarrollo, 18, 300, 240, 0.58, 0.38),
            (GrowthStage.Adulto, 30, 460, 360, 0.24, 0.13),
        ],
        "macho_factor": 1.15,
    },
    "Guzerat": {
        "hembra": [
            (GrowthStage.Neonato, 1, 38, 31, 0.48, 0.33),
            (GrowthStage.Lactancia, 3, 85, 66, 0.57, 0.40),
            (GrowthStage.Destete, 9, 185, 148, 0.63, 0.45),
            (GrowthStage.Desarrollo, 18, 310, 250, 0.59, 0.39),
            (GrowthStage.Adulto, 30, 470, 375, 0.24, 0.13),
        ],
        "macho_factor": 1.15,
    },
    "Romosinuano": {
        "hembra": [
            (GrowthStage.Neonato, 1, 32, 25, 0.45, 0.30),
            (GrowthStage.Lactancia, 3, 72, 56, 0.50, 0.35),
            (GrowthStage.Destete, 9, 155, 125, 0.60, 0.42),
            (GrowthStage.Desarrollo, 18, 250, 200, 0.55, 0.38),
            (GrowthStage.Adulto, 30, 340, 275, 0.20, 0.12),
        ],
        "macho_factor": 1.15,
    },
    "Blanco Orejinegro": {
        "hembra": [
            (GrowthStage.Neonato, 1, 36, 28, 0.47, 0.32),
            (GrowthStage.Lactancia, 3, 82, 65, 0.55, 0.38),
            (GrowthStage.Destete, 9, 180, 145, 0.62, 0.44),
            (GrowthStage.Desarrollo, 18, 300, 245, 0.60, 0.40),
            (GrowthStage.Adulto, 30, 420, 340, 0.22, 0.13),
        ],
        "macho_factor": 1.15,
    },
    "Casanare": {
        "hembra": [
            (GrowthStage.Neonato, 1, 30, 23, 0.42, 0.28),
            (GrowthStage.Lactancia, 3, 70, 55, 0.48, 0.33),
            (GrowthStage.Destete, 9, 158, 128, 0.58, 0.40),
            (GrowthStage.Desarrollo, 18, 260, 210, 0.55, 0.36),
            (GrowthStage.Adulto, 30, 360, 290, 0.20, 0.12),
        ],
        "macho_factor": 1.15,
    },
    "Hartón del Valle": {
        "hembra": [
            (GrowthStage.Neonato, 1, 37, 29, 0.48, 0.32),
            (GrowthStage.Lactancia, 3, 84, 66, 0.56, 0.38),
            (GrowthStage.Destete, 9, 185, 148, 0.62, 0.44),
            (GrowthStage.Desarrollo, 18, 310, 250, 0.58, 0.38),
            (GrowthStage.Adulto, 30, 440, 350, 0.22, 0.13),
        ],
        "macho_factor": 1.15,
    },
}

# ──────────────────────────────────────────────────────────────────────────────
# Benchmarks productivos por raza (FEDEGAN/NRC/AGROSAVIA)
# ──────────────────────────────────────────────────────────────────────────────
PRODUCTION_BENCHMARKS = [
    {"breed": "Holstein", "purpose": "Leche", "lactation_liters": 6000, "peak_liters_day": 28, "fat_pct": 3.6, "protein_pct": 3.1, "adult_female_kg": 620, "adult_male_kg": 950, "wean_weight_kg": 120, "source": "FEDEGAN/NRC 2001"},
    {"breed": "Jersey", "purpose": "Leche", "lactation_liters": 4300, "peak_liters_day": 20, "fat_pct": 4.8, "protein_pct": 3.7, "adult_female_kg": 420, "adult_male_kg": 630, "wean_weight_kg": 95, "source": "FEDEGAN/NRC 2001"},
    {"breed": "Normando", "purpose": "Leche", "lactation_liters": 3900, "peak_liters_day": 18, "fat_pct": 4.1, "protein_pct": 3.4, "adult_female_kg": 530, "adult_male_kg": 820, "wean_weight_kg": 105, "source": "FEDEGAN/ICA"},
    {"breed": "Gyr", "purpose": "Doble propósito", "lactation_liters": 3200, "peak_liters_day": 15, "fat_pct": 4.5, "protein_pct": 3.6, "adult_female_kg": 470, "adult_male_kg": 700, "wean_weight_kg": 95, "source": "FEDEGAN"},
    {"breed": "Guzerat", "purpose": "Doble propósito", "lactation_liters": 2500, "peak_liters_day": 12, "fat_pct": 4.4, "protein_pct": 3.5, "adult_female_kg": 470, "adult_male_kg": 760, "wean_weight_kg": 100, "source": "FEDEGAN"},
    {"breed": "Angus", "purpose": "Carne", "lactation_liters": None, "peak_liters_day": None, "fat_pct": None, "protein_pct": None, "adult_female_kg": 560, "adult_male_kg": 880, "wean_weight_kg": 215, "source": "NRC 2016 / FEDEGAN"},
    {"breed": "Simmental", "purpose": "Doble propósito", "lactation_liters": 4500, "peak_liters_day": 20, "fat_pct": 4.0, "protein_pct": 3.5, "adult_female_kg": 600, "adult_male_kg": 900, "wean_weight_kg": 225, "source": "NRC/FEDEGAN"},
    {"breed": "Brahman", "purpose": "Carne", "lactation_liters": None, "peak_liters_day": None, "fat_pct": None, "protein_pct": None, "adult_female_kg": 500, "adult_male_kg": 880, "wean_weight_kg": 185, "source": "AGROSAVIA/FEDEGAN"},
    {"breed": "Cebú", "purpose": "Carne", "lactation_liters": None, "peak_liters_day": None, "fat_pct": None, "protein_pct": None, "adult_female_kg": 460, "adult_male_kg": 800, "wean_weight_kg": 170, "source": "AGROSAVIA"},
    {"breed": "Romosinuano", "purpose": "Doble propósito", "lactation_liters": 1500, "peak_liters_day": 8, "fat_pct": 4.3, "protein_pct": 3.5, "adult_female_kg": 340, "adult_male_kg": 500, "wean_weight_kg": 150, "source": "ICA/AGROSAVIA"},
    {"breed": "Blanco Orejinegro", "purpose": "Doble propósito", "lactation_liters": 1400, "peak_liters_day": 8, "fat_pct": 4.2, "protein_pct": 3.5, "adult_female_kg": 410, "adult_male_kg": 570, "wean_weight_kg": 165, "source": "AGROSAVIA"},
    {"breed": "Casanare", "purpose": "Doble propósito", "lactation_liters": 1000, "peak_liters_day": 6, "fat_pct": 4.1, "protein_pct": 3.4, "adult_female_kg": 360, "adult_male_kg": 480, "wean_weight_kg": 140, "source": "ICA"},
    {"breed": "Hartón del Valle", "purpose": "Doble propósito", "lactation_liters": 2500, "peak_liters_day": 10, "fat_pct": 4.3, "protein_pct": 3.6, "adult_female_kg": 450, "adult_male_kg": 600, "wean_weight_kg": 160, "source": "ICA/AGROSAVIA"},
]

# ──────────────────────────────────────────────────────────────────────────────
# Tabla de Condición Corporal (Wildman et al. 1982 / NRC 2001)
# ──────────────────────────────────────────────────────────────────────────────
BCS_TABLE = [
    {"score": 1, "label": "Emaciación extrema", "description": "Anca y paletas muy prominentes, costillas marcadas, depresión profunda en tuber isquiático; reservas adiposas mínimas."},
    {"score": 2, "label": "Emaciado", "description": "Estructura ósea visible sin depósitos de grasa; costillas y procesos espinales notorios; alerta crítica de nutrición."},
    {"score": 3, "label": "Delgado", "description": "Costillas y procesos espinales visibles, anca ligeramente prominente; pérdida de estado corporal."},
    {"score": 4, "label": "Más delgado que ideal", "description": "Costillas poco visibles, anca redondeada, primera sensación de cubierta grasa."},
    {"score": 5, "label": "Ideal", "description": "Costillas cubiertas, tuber isquiático e ilion redondeados; condición corporal óptima de mantenimiento y producción."},
    {"score": 6, "label": "Gordo", "description": "Costillas no visibles, grasa en entrada de ijar y base de la cola; exceso moderado."},
    {"score": 7, "label": "Gordo con depósitos", "description": "Costillas cubiertas por grasa, depósitos marcados en cadera y «pucheras»; sobrepeso."},
    {"score": 8, "label": "Obeso", "description": "Pliegues de grasa en ijar, cuello y vulva, abdomen redondeado; alerta de sobrecondición."},
    {"score": 9, "label": "Obeso severo", "description": "Depósitos muy marcados en toda la coyuntura; riesgo metabólico y reproductivo alto."},
]

BCS_STAGES = [
    {"stage": "Al parto", "min": 3.25, "max": 3.75, "notes": "Evitar BCS > 5 al parto; vacas gordas presentan más distocias y cetosis."},
    {"stage": "Inicio de lactancia (0-60 días)", "min": 2.5, "max": 3.0, "notes": "Pérdida esperada ≤ 0.5 puntos; caídas mayores sugieren balance energético deficiente."},
    {"stage": "Pico de lactancia", "min": 2.75, "max": 3.25, "notes": "Punto de máxima presión energética; monitorear producción y dieta."},
    {"stage": "Media lactancia", "min": 3.0, "max": 3.25, "notes": "Recuperación gradual del balance energético."},
    {"stage": "Secado (últimos 60 días)", "min": 3.25, "max": 3.75, "notes": "Preparación del óptimo para el próximo parto."},
    {"stage": "Novilla de reemplazo (destete)", "min": 2.0, "max": 2.5, "notes": "Objetivo de condición para el apareamiento."},
    {"stage": "Ternera de 6 a 12 meses", "min": 2.25, "max": 2.75, "notes": "Crecimiento sin reservas excesivas."},
]

# ──────────────────────────────────────────────────────────────────────────────
# Valores nutricionales de referencia de forrajes (FAO / NRC / tablas FEDEGAN)
# ──────────────────────────────────────────────────────────────────────────────
FORAGE_NUTRITION = [
    {"name": "Pasto Brachiaria decumbens (Amargo)", "dm_pct": 25, "pb_pct": 8, "tdn_pct": 56, "source": "FAO/FEDEGAN"},
    {"name": "Pasto Brachiaria brizantha (Marandú / Toledo)", "dm_pct": 28, "pb_pct": 10, "tdn_pct": 58, "source": "FAO/FEDEGAN"},
    {"name": "Pasto Brachiaria humidicola (Pomerania)", "dm_pct": 26, "pb_pct": 7, "tdn_pct": 54, "source": "FAO"},
    {"name": "Pasto Kikuyo (Pennisetum clandestinum)", "dm_pct": 22, "pb_pct": 16, "tdn_pct": 64, "source": "FEDEGAN"},
    {"name": "Pasto Ryegrass Perenne (Lolium perenne)", "dm_pct": 20, "pb_pct": 20, "tdn_pct": 70, "source": "NRC 2001"},
    {"name": "Pasto Estrella (Cynodon nlemfuensis)", "dm_pct": 24, "pb_pct": 12, "tdn_pct": 60, "source": "FEDEGAN"},
    {"name": "Pasto Guinea Mombaza (Panicum maximum)", "dm_pct": 25, "pb_pct": 13, "tdn_pct": 60, "source": "FEDEGAN"},
    {"name": "Botón de Oro (Tithonia diversifolia)", "dm_pct": 24, "pb_pct": 22, "tdn_pct": 64, "source": "FAO"},
    {"name": "Matarratón (Gliricidia sepium)", "dm_pct": 28, "pb_pct": 24, "tdn_pct": 62, "source": "FAO"},
    {"name": "Pasto Maralfalfa / Pincoya (Corte)", "dm_pct": 18, "pb_pct": 11, "tdn_pct": 58, "source": "FEDEGAN"},
    {"name": "Ensilaje de Maíz (Zea mays)", "dm_pct": 35, "pb_pct": 8, "tdn_pct": 68, "source": "NRC 2001"},
    {"name": "Torta de Palmiste (Suplemento)", "dm_pct": 90, "pb_pct": 15, "tdn_pct": 74, "source": "FAO"},
    {"name": "Sal Mineralizada 8% Fósforo", "dm_pct": 100, "pb_pct": 0, "tdn_pct": 0, "source": "FEDEGAN"},
    {"name": "Sal Mineralizada 12% Fósforo (Cría/Leche)", "dm_pct": 100, "pb_pct": 0, "tdn_pct": 0, "source": "FEDEGAN"},
]

# ──────────────────────────────────────────────────────────────────────────────
# División político-administrativa DANE — Antioquia (125) y Santander (87)
# Municipios con vigilancia sanitaria activa (focos/brote) marcados aparte.
# ──────────────────────────────────────────────────────────────────────────────
_ANTIOQUIA = [
    "Abejorral", "Abriaquí", "Alejandría", "Amagá", "Amalfi", "Andes", "Angelópolis", "Angostura",
    "Anorí", "Anzá", "Apartadó", "Arboletes", "Argelia", "Armenia", "Barbosa", "Bello", "Belmira",
    "Betania", "Betulia", "Bolívar", "Briceño", "Buriticá", "Cáceres", "Caicedo", "Caldas",
    "Campamento", "Cañasgordas", "Caracolí", "Caramanta", "Carepa", "Carolina del Príncipe",
    "Caucasia", "Chigorodó", "Cisneros", "Cocorná", "Concepción", "Concordia", "Copacabana",
    "Dabeiba", "Don Matías", "Ebéjico", "El Bagre", "El Carmen de Viboral", "El Peñol", "El Retiro",
    "Entrerríos", "Envigado", "Fredonia", "Frontino", "Giraldo", "Girardota",
    "Gómez Plata", "Granada", "Guadalupe", "Guarne", "Guatapé", "Heliconia", "Hispania", "Itagüí",
    "Ituango", "Jardín", "Jericó", "La Ceja", "La Estrella", "La Pintada", "La Unión", "Liborina",
    "Maceo", "Marinilla", "Montebello", "Murindó", "Mutatá", "Nariño", "Nechí", "Necoclí", "Olaya",
    "Peque", "Pueblorrico", "Puerto Berrío", "Puerto Nare", "Puerto Triunfo", "Remedios",
    "Rionegro", "Sabanalarga", "Sabaneta", "Salgar", "San Andrés de Cuerquia",
    "San Carlos", "San Francisco", "San Jerónimo", "San José de la Montaña", "San Juan de Urabá",
    "San Luis", "San Pedro de los Milagros", "San Pedro de Urabá", "San Rafael", "San Roque",
    "San Vicente", "Santa Bárbara", "Santa Fe de Antioquia", "Santa Rosa de Osos", "Santo Domingo",
    "El Santuario", "Segovia", "Sonsón", "Sopetrán", "Támesis", "Tarazá", "Tarso", "Titiribí",
    "Toledo", "Turbo", "Uramita", "Urrao", "Valdivia", "Valparaíso", "Vegachí", "Venecia",
    "Vigía del Fuerte", "Yalí", "Yarumal", "Yolombó", "Yondó", "Zaragoza",
]

_SANTANDER = [
    "Aguada", "Albania", "Aratoca", "Barbosa", "Barichara", "Barrancabermeja", "Betulia",
    "Bolívar", "Bucaramanga", "Cabrera", "California", "Capitanejo", "Carcasí", "Cepitá",
    "Cerrito", "Charalá", "Charta", "Chima", "Chipatá", "Cimitarra", "Concepción", "Confines",
    "Contratación", "Coromoro", "Curití", "El Carmen de Chucurí", "El Guacamayo", "El Peñón",
    "El Playón", "Encino", "Enciso", "Florián", "Floridablanca", "Galán", "Gámbita", "Girón",
    "Guaca", "Guadalupe", "Guapotá", "Guavatá", "Güepsa", "Jesús María", "Jordán", "La Belleza",
    "La Paz", "Landázuri", "Lebrija", "Los Santos", "Macaravita", "Málaga", "Matanza", "Mogotes",
    "Molagavita", "Ocamonte", "Oiba", "Onzaga", "Palmar", "Palmas del Socorro", "Páramo",
    "Piedecuesta", "Pinchote", "Puente Nacional", "Puerto Parra", "Puerto Wilches", "Rionegro",
    "Sabana de Torres", "San Andrés", "San Benito", "San Gil", "San Joaquín", "San José de Miranda", "San Miguel",
    "San Vicente de Chucurí", "Santa Bárbara", "Santa Helena del Opón", "Simacota", "Socorro",
    "Suaita", "Sucre", "Suratá", "Tona", "Valle de San José", "Vélez", "Vetas", "Villanueva",
    "Zapatoca",
]

_MUNICIPALITIES = (
    [(name, "Antioquia") for name in _ANTIOQUIA]
    + [(name, "Santander") for name in _SANTANDER]
)

# Municipios donde la app ya tiene veredas; vigilancia sanitaria activa (apoyo
# a planes ICA de la zona de Vélez/Barbosa y Rionegro).
_ICA_WATCHLIST = {"Santander": {"Vélez", "Barbosa", "El Peñón"}, "Antioquia": {"Rionegro"}}

_CONTENT_REFERENCE = "reference"
_CONTENT_GEOGRAPHY = "geography"


def _seed_species_breeds_and_curves() -> dict[str, int]:
    created_species = created_breeds = updated_breeds = 0
    created_standards = updated_standards = 0

    for species_name, breeds_by_name in BREED_CATALOG.items():
        species = Species.query.filter_by(name=species_name).first()
        if not species:
            species = Species(name=species_name)
            db.session.add(species)
            db.session.flush()
            created_species += 1

        for breed_name, (purpose, origin, description, characteristics) in breeds_by_name.items():
            breed = Breeds.query.filter_by(name=breed_name, species_id=species.id).first()
            if not breed:
                breed = Breeds(name=breed_name, species_id=species.id, is_active=True)
                db.session.add(breed)
                db.session.flush()
                created_breeds += 1
            if breed.purpose != purpose or breed.origin != origin:
                breed.purpose = purpose
                breed.origin = origin
                if not breed.description:
                    breed.description = description
                if not breed.characteristics:
                    breed.characteristics = characteristics
                updated_breeds += 1

            if species_name != "Bovino":
                continue

            curve = BOVINE_CURVES.get(breed_name)
            stages = curve["hembra"] if curve else _GENERIC_BOVINE_STAGES
            male_factor = curve["macho_factor"] if curve else 1.2
            for sex, multiplier in (("Hembra", 1.0), ("Macho", male_factor)):
                for stage, age, expected, minimum, adg, min_adg in stages:
                    row = BreedGrowthStandard.query.filter_by(
                        breed_id=breed.id, sex=sex, growth_stage=stage, age_months=age
                    ).first()
                    values = {
                        "expected_weight_kg": expected * multiplier,
                        "min_weight_kg": minimum * multiplier,
                        "max_weight_kg": expected * multiplier * 1.2,
                        "expected_adg_kg": adg,
                        "min_adg_kg": min_adg,
                    }
                    if row:
                        for field, value in values.items():
                            if getattr(row, field) != value:
                                setattr(row, field, value)
                                updated_standards += 1
                    else:
                        db.session.add(BreedGrowthStandard(breed_id=breed.id, sex=sex, growth_stage=stage, age_months=age, **values))
                        created_standards += 1
    db.session.commit()
    return {
        "species": created_species,
        "breeds": created_breeds,
        "breeds_updated": updated_breeds,
        "growth_standards": created_standards,
        "growth_standards_updated": updated_standards,
    }


def _seed_reference_contents() -> dict[str, int]:
    """Datos de referencia globales (sin finca) con base en estudios y libros."""
    items = [
        {
            "key": "reference.body.condition.score",
            "category": _CONTENT_REFERENCE,
            "content_type": "json",
            "title": "Condición Corporal — escala 1-9",
            "content": "Escala visual de condición corporal bovina (Wildman et al. 1982 / NRC 2001).",
            "extra": BCS_TABLE,
        },
        {
            "key": "reference.body.condition.stages",
            "category": _CONTENT_REFERENCE,
            "content_type": "json",
            "title": "Condición corporal ideal por etapa fisiológica",
            "content": "Rangos recomendados de BCS por etapa reproductiva (NRC 2001).",
            "extra": BCS_STAGES,
        },
        {
            "key": "reference.breed.production.benchmarks",
            "category": _CONTENT_REFERENCE,
            "content_type": "json",
            "title": "Benchmarks productivos por raza bovina",
            "content": "Promedios de referencia (FEDEGAN / NRC / AGROSAVIA) para comparar producción, peso adulto y destete.",
            "extra": PRODUCTION_BENCHMARKS,
        },
        {
            "key": "reference.forages.nutrition",
            "category": _CONTENT_REFERENCE,
            "content_type": "json",
            "title": "Valores nutricionales de forrajes",
            "content": "Materia seca, proteína bruta y TDN de referencia (FAO / NRC / FEDEGAN).",
            "extra": FORAGE_NUTRITION,
        },
        {
            "key": "reference.geography.municipalities",
            "category": _CONTENT_GEOGRAPHY,
            "content_type": "json",
            "title": "Municipios Antioquia y Santander (DANE)",
            "content": "Catálogo municipal oficial DANE para registro de fincas en Santander y Antioquia.",
            "extra": [{"name": n, "department": d, "source": "DANE"} for n, d in _MUNICIPALITIES],
        },
        {
            "key": "reference.geography.ica.watchlist",
            "category": _CONTENT_GEOGRAPHY,
            "content_type": "json",
            "title": "Municipios en vigilancia sanitaria ICA",
            "content": "Municipios de las veredas registradas en la app: zonas con ciclos de vacunación y vigilancia ICA activa.",
            "extra": [
                {"name": name, "department": dep, "notes": "Vigilancia sanitaria activa — zona de apoyo ICA"}
                for dep, names in _ICA_WATCHLIST.items()
                for name in sorted(names)
            ],
        },
    ]
    SystemContent.bulk_upsert(items)
    return {"reference_contents": len(items)}


def seed_global_baseline() -> dict[str, int]:
    """Siembra catálogos verdaderamente globales y es idempotente."""

    seed_knowledge_base()
    seed_territories()
    seed_learning_materials()
    result = _seed_species_breeds_and_curves()
    result.update(_seed_reference_contents())
    logger.info(
        "Baseline global listo: especies=%s razas=%s actualizadas=%s estándares=%s/%s",
        result["species"],
        result["breeds"],
        result["breeds_updated"],
        result["growth_standards"],
        result["growth_standards_updated"],
    )
    return result
