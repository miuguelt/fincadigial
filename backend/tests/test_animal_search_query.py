"""
Tests unitarios para la búsqueda avanzada de animales y BaseModel.
Verifica:
- Búsqueda por arete (record)
- Búsqueda por ID (#15 o 15)
- Búsqueda por raza (Breeds.name)
- Búsqueda por especie (Species.name)
- Búsqueda por sexo (Macho / Hembra)
- Búsqueda por estado (Vivo / Vendido)
- Búsqueda por año de nacimiento
- Búsqueda multi-token (ej. 'Macho Brahman')
"""

import unittest
from datetime import date
from app import create_app, db
from app.models import Animals, Breeds, Species, Finca, FarmType
from app.models.animals import Sex, AnimalStatus


class TestAnimalSearchQuery(unittest.TestCase):
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
            db.session.query(Animals).delete()
            db.session.query(Breeds).delete()
            db.session.query(Species).delete()
            db.session.query(Finca).delete()

            self.finca = Finca(name="La Esperanza", type=FarmType.Tradicional)
            db.session.add(self.finca)
            db.session.flush()

            self.sp_bov = Species(name="Bovino")
            self.sp_buf = Species(name="Bufalino")
            db.session.add_all([self.sp_bov, self.sp_buf])
            db.session.flush()

            self.br_brahman = Breeds(name="Brahman", species_id=self.sp_bov.id)
            self.br_holstein = Breeds(name="Holstein", species_id=self.sp_bov.id)
            self.br_murrah = Breeds(name="Murrah", species_id=self.sp_buf.id)
            db.session.add_all([self.br_brahman, self.br_holstein, self.br_murrah])
            db.session.flush()

            # Animal 1: Macho Brahman, nacido 2024
            self.a1 = Animals(
                record="VIL-101",
                sex=Sex.Macho,
                birth_date=date(2024, 3, 15),
                weight=320.0,
                status=AnimalStatus.Vivo,
                breeds_id=self.br_brahman.id,
                finca_id=self.finca.id,
            )
            # Animal 2: Hembra Holstein, nacida 2023
            self.a2 = Animals(
                record="VIL-202",
                sex=Sex.Hembra,
                birth_date=date(2023, 8, 10),
                weight=450.0,
                status=AnimalStatus.Vivo,
                breeds_id=self.br_holstein.id,
                finca_id=self.finca.id,
            )
            # Animal 3: Hembra Murrah (Bufalino), vendida, nacida 2022
            self.a3 = Animals(
                record="BUF-303",
                sex=Sex.Hembra,
                birth_date=date(2022, 1, 20),
                weight=510.0,
                status=AnimalStatus.Vendido,
                breeds_id=self.br_murrah.id,
                finca_id=self.finca.id,
            )
            db.session.add_all([self.a1, self.a2, self.a3])
            db.session.commit()

    def test_search_by_record(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="101")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "VIL-101")

    def test_search_by_breed_name(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="Brahman")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "VIL-101")

    def test_search_by_species_name(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="Bufalino")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "BUF-303")

    def test_search_by_sex(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="Macho")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "VIL-101")

    def test_search_by_status(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="Vendido")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "BUF-303")

    def test_search_by_birth_year(self):
        with self.app.app_context():
            q = Animals.get_namespace_query(search="2023")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "VIL-202")

    def test_search_by_id_with_hash(self):
        with self.app.app_context():
            a1_id = self.a1.id
            q = Animals.get_namespace_query(search=f"#{a1_id}")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].id, a1_id)

    def test_multi_token_search(self):
        with self.app.app_context():
            # Debe encontrar a1 porque es Macho Y Brahman
            q = Animals.get_namespace_query(search="Macho Brahman")
            results = q.all()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].record, "VIL-101")

            # No debe encontrar a2 porque aunque es Hembra, no es Brahman
            q_none = Animals.get_namespace_query(search="Hembra Brahman")
            self.assertEqual(len(q_none.all()), 0)


if __name__ == "__main__":
    unittest.main()
