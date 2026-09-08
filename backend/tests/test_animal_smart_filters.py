"""
Tests para los filtros inteligentes del inventario de animales.

Auditoría 2026-09:
- `destetar` debe devolver SOLO terneros en la ventana real de destete
  (200-250 días), no todos los animales de 7+ meses como antes.
- `bajo_peso` compara contra el estándar de raza/sexo/edad interpolado
  (breed_growth_standards), no contra un peso fijo de 200 kg.

Uso:
    cd backend
    python -m pytest tests/test_animal_smart_filters.py -v
"""

import unittest
from datetime import date, timedelta

from app import create_app, db
from app.models import Animal, Finca, FarmType, Breeds, Species
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage


class TestAnimalSmartFilters(unittest.TestCase):
    """Suite para los filtros de la barra del inventario."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

        with cls.app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        with self.app.app_context():
            db.session.query(BreedGrowthStandard).delete()
            db.session.query(Animal).delete()
            db.session.query(Breeds).delete()
            db.session.query(Species).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            self.finca = Finca.create(
                name="Finca Filtros", type=FarmType.Tradicional, is_active=True
            )
            self.species = Species(name="Bovino")
            db.session.add(self.species)
            db.session.commit()
            self.breed = Breeds(name="Criollo", species_id=self.species.id)
            db.session.add(self.breed)
            db.session.commit()

    def _create_animal(self, record, birth_date, weight, sex="Hembra", **extra):
        return Animal.create(
            record=record,
            sex=sex,
            birth_date=birth_date,
            weight=weight,
            breeds_id=self.breed.id,
            finca_id=self.finca.id,
            **extra,
        )

    def test_filtro_destete_solo_terneros_en_ventana(self):
        """'destetar' devuelve sólo terneros de 200-250 días (antes devolvía
        TODOS los animales de más de 7 meses, adultos incluidos)."""
        with self.app.app_context():
            today = date.today()
            self._create_animal("T-EN-VENTANA", today - timedelta(days=220), 180)
            self._create_animal("T-JOVEN", today - timedelta(days=100), 90)
            self._create_animal("T-ADULTO", today - timedelta(days=400), 480)
            db.session.commit()

            query = Animal.get_namespace_query(filters={"destetar": "true"})
            results = query.all()
            records = [a.record for a in results]

            self.assertIn("T-EN-VENTANA", records)
            self.assertNotIn("T-JOVEN", records)
            self.assertNotIn("T-ADULTO", records)
            self.assertEqual(len(results), 1)

    def test_filtro_bajo_peso_vs_estandar_de_raza(self):
        """'bajo_peso' compara contra el estándar interpolado por raza/edad."""
        with self.app.app_context():
            BreedGrowthStandard.create(
                breed_id=self.breed.id,
                sex="Hembra",
                growth_stage=GrowthStage.Lactancia,
                age_months=3,
                expected_weight_kg=100,
                min_weight_kg=60,
                max_weight_kg=110,
                expected_adg_kg=0.7,
                min_adg_kg=0.4,
            )
            BreedGrowthStandard.create(
                breed_id=self.breed.id,
                sex="Hembra",
                growth_stage=GrowthStage.Destete,
                age_months=6,
                expected_weight_kg=140,
                min_weight_kg=100,
                max_weight_kg=150,
                expected_adg_kg=0.7,
                min_adg_kg=0.4,
            )

            today = date.today()
            # 135 días ≈ 4.4 meses → min interpolado ≈ 60 + 40*((4.4-3)/3) ≈ 78.9
            self._create_animal("P-BAJO", today - timedelta(days=135), 50)
            self._create_animal("P-NORMAL", today - timedelta(days=135), 120)
            db.session.commit()

            query = Animal.get_namespace_query(filters={"bajo_peso": "true"})
            results = query.all()

            self.assertEqual([a.record for a in results], ["P-BAJO"])

    def test_filtros_reproductivos_booleanos(self):
        """is_pregnant / is_lactating deben filtrar por igualdad exacta."""
        with self.app.app_context():
            today = date.today()
            self._create_animal("PRE-001", today - timedelta(days=900), 400, is_pregnant=True)
            self._create_animal("LAC-001", today - timedelta(days=900), 400, is_lactating=True)
            self._create_animal("VACA-001", today - timedelta(days=900), 400)
            db.session.commit()

            preg = Animal.get_namespace_query(filters={"is_pregnant": "true"}).all()
            lact = Animal.get_namespace_query(filters={"is_lactating": "true"}).all()

            self.assertIn("PRE-001", [a.record for a in preg])
            self.assertNotIn("LAC-001", [a.record for a in preg])
            self.assertIn("LAC-001", [a.record for a in lact])
            self.assertNotIn("PRE-001", [a.record for a in lact])

    def test_filtros_combinables(self):
        """Los filtros inteligentes se componen (AND)."""
        with self.app.app_context():
            today = date.today()
            self._create_animal(
                "PRE-LAC", today - timedelta(days=400), 380, is_pregnant=True, is_lactating=True
            )
            self._create_animal("PRE-ONLY", today - timedelta(days=400), 380, is_pregnant=True)
            db.session.commit()

            query = Animal.get_namespace_query(
                filters={"is_pregnant": "true", "is_lactating": "true"}
            ).all()

            self.assertIn("PRE-LAC", [a.record for a in query])
            self.assertNotIn("PRE-ONLY", [a.record for a in query])


if __name__ == "__main__":
    unittest.main()
