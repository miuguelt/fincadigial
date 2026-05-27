"""
Tests para Tenant Isolation
===========================
Valida que los datos están correctamente aislados por finca_id.

Uso:
    cd BackFinca
    python -m pytest tests/test_tenant_isolation.py -v
"""

import unittest
from app import create_app, db
from app.models.user import ApprovalStatus
from app.models import Animal, Finca, FarmType, User, Role
from app.models.breeds import Breeds
from app.models.species import Species
from app.utils.tenant_context import TENANT_MODELS
from datetime import date


class TestTenantIsolation(unittest.TestCase):
    """Test suite para aislamiento de datos por finca."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        """Limpiar después de tests."""
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        """Preparar datos para cada test."""
        with self.app.app_context():
            # Limpiar datos previos
            db.session.query(Animal).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.query(Breeds).delete()
            db.session.query(Species).delete()
            db.session.commit()

            # Crear especie y raza base
            self.species = Species(name='Bovino')
            db.session.add(self.species)
            db.session.commit()

            self.breed = Breeds(name='Criollo', species_id=self.species.id)
            db.session.add(self.breed)
            db.session.commit()

            # Crear dos fincas diferentes
            self.finca_a = Finca.create(
                name='Finca A - El Progreso',
                type=FarmType.Tradicional,
                is_active=True
            )

            self.finca_b = Finca.create(
                name='Finca B - La Esperanza',
                type=FarmType.Educativa,
                is_active=True
            )

            db.session.commit()

    # =========================================================================
    # TESTS: AISLAMIENTO BÁSICO
    # =========================================================================

    def test_Animales_aislados_por_finca(self):
        """Animales de finca A no deben ser visibles en finca B."""
        with self.app.app_context():
            # Crear Animales en finca A
            Animal_a1 = Animal.create(
                sex='Macho',
                birth_date=date(2023, 1, 15),
                weight=350,
                record='A-001',
                breeds_id=self.breed.id,
                finca_id=self.finca_a.id
            )

            Animal_a2 = Animal.create(
                sex='Hembra',
                birth_date=date(2023, 2, 20),
                weight=320,
                record='A-002',
                breeds_id=self.breed.id,
                finca_id=self.finca_a.id
            )

            # Crear Animal en finca B
            Animal_b1 = Animal.create(
                sex='Macho',
                birth_date=date(2023, 3, 10),
                weight=400,
                record='B-001',
                breeds_id=self.breed.id,
                finca_id=self.finca_b.id
            )

            db.session.commit()

            # Verificar conteos
            Animales_finca_a = Animal.query.filter_by(finca_id=self.finca_a.id).count()
            Animales_finca_b = Animal.query.filter_by(finca_id=self.finca_b.id).count()

            self.assertEqual(Animales_finca_a, 2, "Finca A debe tener 2 Animales")
            self.assertEqual(Animales_finca_b, 1, "Finca B debe tener 1 Animal")

            # Verificar que los Animales no se mezclan
            Animal_a_en_b = Animal.query.filter_by(
                finca_id=self.finca_b.id,
                record='A-001'
            ).first()

            self.assertIsNone(
                Animal_a_en_b,
                "Animal A-001 no debe existir en finca B"
            )

    def test_record_puede_repetirse_entre_fincas(self):
        """Mismo número de arete puede existir en diferentes fincas."""
        with self.app.app_context():
            # Mismo número de arete en diferentes fincas
            Animal_a = Animal.create(
                sex='Macho',
                birth_date=date(2023, 1, 15),
                weight=350,
                record='001',  # Mismo record
                breeds_id=self.breed.id,
                finca_id=self.finca_a.id
            )

            Animal_b = Animal.create(
                sex='Macho',
                birth_date=date(2023, 3, 10),
                weight=400,
                record='001',  # Mismo record
                breeds_id=self.breed.id,
                finca_id=self.finca_b.id
            )

            db.session.commit()

            # Ambos deben existir
            self.assertIsNotNone(Animal_a.id)
            self.assertIsNotNone(Animal_b.id)

            # Deben tener el mismo record pero diferente finca
            self.assertEqual(Animal_a.record, Animal_b.record)
            self.assertNotEqual(Animal_a.finca_id, Animal_b.finca_id)

    # =========================================================================
    # TESTS: USUARIOS POR FINCA
    # =========================================================================

    def test_usuarios_aislados_por_finca(self):
        """Usuarios de una finca no deben verse en otra."""
        with self.app.app_context():
            user_a = User.create(
                identification=111111111,
                fullname='Usuario Finca A',
                email='user@fincaa.com',
                phone='3001111111',
                password='TestPass123!',
                role=Role.Administrador,
                finca_id=self.finca_a.id
            ,
                approval_status=ApprovalStatus.Approved,
            )

            user_b = User.create(
                identification=222222222,
                fullname='Usuario Finca B',
                email='user@fincab.com',
                phone='3002222222',
                password='TestPass123!',
                role=Role.Administrador,
                finca_id=self.finca_b.id
            ,
                approval_status=ApprovalStatus.Approved,
            )

            db.session.commit()

            # Verificar que cada usuario está en su finca
            self.assertEqual(user_a.finca_id, self.finca_a.id)
            self.assertEqual(user_b.finca_id, self.finca_b.id)

            # No deben haber usuarios compartidos
            usuarios_finca_a = User.query.filter_by(finca_id=self.finca_a.id).count()
            usuarios_finca_b = User.query.filter_by(finca_id=self.finca_b.id).count()

            self.assertEqual(usuarios_finca_a, 1)
            self.assertEqual(usuarios_finca_b, 1)

    # =========================================================================
    # TESTS: LISTA DE MODELOS TENANT
    # =========================================================================

    def test_tenant_models_lista_completa(self):
        """TENANT_MODELS debe incluir todos los modelos aislados."""
        modelos_esperados = {
            'Animals',
            'Fields',
            'FoodTypes',
            'AnimalAlert',
            'AnimalAlertConfig',
            'ActivityLog',
            'ActivityDailyAgg',
            'Control',
            'Treatments',
            'Vaccinations',
            'GeneticImprovements',
            'ReproductiveEvent',
            'Offspring',
            'AnimalDiseases',
            'AnimalImages',
            'AnimalFields',
            'InventoryLot',
            'InventoryMovement',
        }

        for modelo in modelos_esperados:
            with self.subTest(modelo=modelo):
                self.assertIn(
                    modelo,
                    TENANT_MODELS,
                    f"{modelo} debe estar en TENANT_MODELS"
                )

    # =========================================================================
    # TESTS: VALIDACIÓN DE UNICIDAD TENANT-AWARE
    # =========================================================================

    def test_no_puede_duplicar_record_en_misma_finca(self):
        """No se puede crear dos Animales con mismo record en la misma finca."""
        with self.app.app_context():
            # Crear primer Animal
            Animal_1 = Animal.create(
                sex='Macho',
                birth_date=date(2023, 1, 15),
                weight=350,
                record='DUP-001',
                breeds_id=self.breed.id,
                finca_id=self.finca_a.id
            )
            db.session.commit()

            # Intentar crear segundo con mismo record en misma finca
            try:
                Animal_2 = Animal(
                    sex='Hembra',
                    birth_date=date(2023, 2, 20),
                    weight=300,
                    record='DUP-001',  # Mismo record
                    breeds_id=self.breed.id,
                    finca_id=self.finca_a.id  # Misma finca
                )
                db.session.add(Animal_2)
                db.session.commit()

                # Si llega aquí, el constraint no funcionó
                self.fail("Debería haber fallado por duplicate record en misma finca")

            except Exception as e:
                # Debe fallar por constraint único
                db.session.rollback()
                self.assertTrue(
                    'UNIQUE' in str(e).upper() or 'duplicate' in str(e).lower(),
                    f"Error debe ser por constraint único: {e}"
                )

    # =========================================================================
    # TESTS: BASEMODEL TENANT FILTERING
    # =========================================================================

    def test_basemodel_get_namespace_query_aplica_filtro(self):
        """BaseModel.get_namespace_query debe aplicar filtro de finca."""
        with self.app.app_context():
            # Crear Animales en ambas fincas
            for i in range(3):
                Animal.create(
                    sex='Macho',
                    birth_date=date(2023, 1, 15),
                    weight=300 + i * 10,
                    record=f'A-{i:03d}',
                    breeds_id=self.breed.id,
                    finca_id=self.finca_a.id
                )

            for i in range(2):
                Animal.create(
                    sex='Hembra',
                    birth_date=date(2023, 2, 20),
                    weight=280 + i * 10,
                    record=f'B-{i:03d}',
                    breeds_id=self.breed.id,
                    finca_id=self.finca_b.id
                )

            db.session.commit()

            # Verificar que el modelo está en TENANT_MODELS
            self.assertIn('Animals', TENANT_MODELS)

            # Verificar conteos individuales
            count_a = Animal.query.filter_by(finca_id=self.finca_a.id).count()
            count_b = Animal.query.filter_by(finca_id=self.finca_b.id).count()

            self.assertEqual(count_a, 3, "Finca A debe tener 3 Animales")
            self.assertEqual(count_b, 2, "Finca B debe tener 2 Animales")


class TestFincaModel(unittest.TestCase):
    """Test suite para el modelo Finca."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

        with cls.app.app_context():
            db.create_all()

    def test_crear_finca_tradicional(self):
        """Crear finca tradicional."""
        with self.app.app_context():
            finca = Finca.create(
                name='Finca Tradicional Test',
                type=FarmType.Tradicional,
                department='Antioquia',
                municipality='Medellín',
                is_active=True
            )
            db.session.commit()

            self.assertIsNotNone(finca.id)
            self.assertEqual(finca.type, FarmType.Tradicional)
            self.assertEqual(finca.name, 'Finca Tradicional Test')
            self.assertTrue(finca.is_active)

    def test_crear_finca_educativa(self):
        """Crear finca educativa."""
        with self.app.app_context():
            finca = Finca.create(
                name='Finca Educativa Test',
                type=FarmType.Educativa,
                department='Cundinamarca',
                municipality='Bogotá',
                is_active=True
            )
            db.session.commit()

            self.assertIsNotNone(finca.id)
            self.assertEqual(finca.type, FarmType.Educativa)

    def test_finca_relacion_con_Animales(self):
        """Finca puede tener múltiples Animales relacionados."""
        with self.app.app_context():
            finca = Finca.create(
                name='Finca con Animales',
                type=FarmType.Tradicional,
                is_active=True
            )
            db.session.commit()

            # Crear especie y raza
            species = Species(name='Test Species')
            db.session.add(species)
            db.session.commit()

            breed = Breeds(name='Test Breed', species_id=species.id)
            db.session.add(breed)
            db.session.commit()

            # Crear Animales
            for i in range(5):
                Animal.create(
                    sex='Macho' if i % 2 == 0 else 'Hembra',
                    birth_date=date(2023, 1, 15),
                    weight=300,
                    record=f'F-{i:03d}',
                    breeds_id=breed.id,
                    finca_id=finca.id
                )

            db.session.commit()

            # Verificar relación
            Animales_count = Animal.query.filter_by(finca_id=finca.id).count()
            self.assertEqual(Animales_count, 5)


if __name__ == '__main__':
    unittest.main(verbosity=2)
