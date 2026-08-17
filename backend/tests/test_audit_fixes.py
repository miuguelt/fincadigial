import unittest
from app import create_app, db
from app.models import (
    Finca,
    FarmType,
    Field,
    FoodType,
    Treatment,
    Animal,
    Species,
    Breed,
)
from datetime import date


class TestAuditFixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        cls.client = cls.app.test_client()
        with cls.app.app_context():
            db.create_all()

    def setUp(self):
        with self.app.app_context():
            db.session.query(Treatment).delete()
            db.session.query(FoodType).delete()
            db.session.query(Field).delete()
            db.session.query(Animal).delete()
            db.session.query(Breed).delete()
            db.session.query(Species).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            # Create base entities
            f_a = Finca.create(name="Finca A", type=FarmType.Tradicional)
            f_b = Finca.create(name="Finca B", type=FarmType.Tradicional)
            db.session.commit()
            self.finca_a_id = f_a.id
            self.finca_b_id = f_b.id

            s = Species(name="Bovino")
            db.session.add(s)
            db.session.commit()

            b = Breed(name="Gyr", species_id=s.id)
            db.session.add(b)
            db.session.commit()
            self.breed_id = b.id

            a = Animal.create(
                record="A1",
                sex="Hembra",
                birth_date=date(2020, 1, 1),
                weight=300,
                breeds_id=self.breed_id,
                finca_id=self.finca_a_id,
            )
            db.session.commit()
            self.animal_id = a.id

    def test_basemodel_aliases(self):
        """Test if BaseModel correctly handles aliases from _input_aliases"""
        with self.app.app_context():
            # Test Field alias: location -> ubication
            field_data = {
                "name": "Potrero Alias",
                "area": "10ha",
                "state": "Disponible",
                "location": "Sector Norte",  # Alias for ubication
                "finca_id": self.finca_a_id,
            }
            field = Field.create(**field_data)
            self.assertEqual(field.ubication, "Sector Norte")

            # Test Treatment alias: diagnosis -> description
            treatment_data = {
                "treatment_date": "2023-10-01",
                "diagnosis": "Fiebre Aftosa",  # Alias for description
                "frequency": "Diaria",
                "dosis": "10ml",
                "animal_id": self.animal_id,
                "finca_id": self.finca_a_id,
            }
            treatment = Treatment.create(**treatment_data)
            self.assertEqual(treatment.description, "Fiebre Aftosa")

    def test_fields_uniqueness_per_finca(self):
        """Test if Field name can be repeated in different fincas but not in the same one"""
        with self.app.app_context():
            # Create field in Finca A
            Field.create(
                name="Potrero 1",
                area="5ha",
                state="Disponible",
                finca_id=self.finca_a_id,
            )
            db.session.commit()

            # Create same name in Finca B (Should SUCCEED)
            field_b = Field.create(
                name="Potrero 1",
                area="10ha",
                state="Disponible",
                finca_id=self.finca_b_id,
            )
            self.assertIsNotNone(field_b.id)

            # Create same name in Finca A again (Should FAIL)
            with self.assertRaises(Exception):
                Field.create(
                    name="Potrero 1",
                    area="2ha",
                    state="Disponible",
                    finca_id=self.finca_a_id,
                )
                db.session.commit()

    def test_food_types_uniqueness_per_finca(self):
        """Test if FoodType name can be repeated in different fincas but not in the same one"""
        with self.app.app_context():
            common_data = {
                "sowing_date": "2023-01-01",
                "area": 5,
                "handlings": "Normal",
                "gauges": "N/A",
            }
            # Create in Finca A
            FoodType.create(
                food_type="Pasto Estrella", finca_id=self.finca_a_id, **common_data
            )
            db.session.commit()

            # Create same name in Finca B (Should SUCCEED)
            ft_b = FoodType.create(
                food_type="Pasto Estrella", finca_id=self.finca_b_id, **common_data
            )
            self.assertIsNotNone(ft_b.id)

            # Create same name in Finca A again (Should FAIL)
            with self.assertRaises(Exception):
                FoodType.create(
                    food_type="Pasto Estrella", finca_id=self.finca_a_id, **common_data
                )
                db.session.commit()


if __name__ == "__main__":
    unittest.main()
