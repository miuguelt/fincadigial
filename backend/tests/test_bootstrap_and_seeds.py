import pytest
import os
from unittest.mock import MagicMock, patch
from app import db
from app.models.user import User, Role
from app.models.finca import Finca, FarmType
from app.models.route_administration import RouteAdministration
from app.models import Territory, Vaccines, FoodTypes, Fields, Diseases
from app.models.knowledge_base import KBRecomendacion, KBCalendario
from app.utils.seed_users import ensure_test_users
from app.utils.seed_knowledge_base import seed_knowledge_base
from app.utils.seed_master import (
    run_master_seed,
    seed_territories,
    seed_vaccines,
    seed_fincas_and_users,
    seed_feeding_infrastructure,
    seed_learning_materials,
)
from app.utils.bootstrap import seed_admin_user, warmup_initial_caches


@pytest.mark.unit
class TestSeedUsers:
    def test_ensure_test_users_fresh(self, app, db_session):
        with app.app_context():
            # Limpiar tablas para simular un estado completamente limpio
            User.query.delete()
            Finca.query.delete()
            db.session.commit()

            assert Finca.query.count() == 0
            assert User.query.count() == 0

            # Ejecutar ensure_test_users
            ensure_test_users()

            # Debe haberse creado una finca y los 7 usuarios de prueba
            assert Finca.query.count() == 1
            assert User.query.count() == 7

            # Validar que exista el administrador con el email correcto
            admin = User.query.filter_by(role=Role.Administrador).first()
            assert admin is not None
            assert admin.email == "admin@villaluz.co"

    def test_ensure_test_users_conflict_resolution(self, app, db_session):
        with app.app_context():
            # Limpiar tablas
            User.query.delete()
            Finca.query.delete()
            db.session.commit()

            # Crear una finca y un usuario conflictivo (mismo ID pero diferente email)
            finca = Finca(name="Villa Luz", type=FarmType.Tradicional, department="Colombia")
            db.session.add(finca)
            db.session.commit()

            conflict_user = User(
                identification=1098,  # ID de admin por defecto
                email="conflict@villaluz.co",  # diferente email
                fullname="Conflicto",
                role=Role.Operario,
                finca_id=finca.id,
                phone="3001234567",
                password="hashedpassword"  # Proveer password para evitar error de NOT NULL
            )
            db.session.add(conflict_user)
            db.session.commit()

            assert User.query.filter_by(identification=1098).first().email == "conflict@villaluz.co"

            # Ejecutar ensure_test_users
            ensure_test_users()

            # El usuario en conflicto debe haber sido eliminado y reemplazado por el administrador real
            admin = User.query.filter_by(identification=1098).first()
            assert admin is not None
            assert admin.email == "admin@villaluz.co"

    def test_ensure_test_users_exception(self, app, db_session):
        with app.app_context():
            with patch('app.utils.seed_users.Finca.query') as mock_query:
                mock_query.first.side_effect = Exception("DB error")
                # No debe propagar la excepción, sino hacer rollback y registrar el error
                ensure_test_users()


@pytest.mark.unit
class TestSeedKnowledgeBase:
    def test_seed_knowledge_base_success(self, app, db_session):
        with app.app_context():
            # Inicialmente vacía
            assert KBRecomendacion.query.count() == 0
            assert KBCalendario.query.count() == 0

            # Ejecutar seed
            seed_knowledge_base()

            # Debe haber registros
            assert KBRecomendacion.query.count() > 0
            assert KBCalendario.query.count() > 0


@pytest.mark.unit
class TestSeedMaster:
    def test_run_master_seed_success(self, app, db_session):
        with app.app_context():
            # Limpiar tablas para evitar conflictos únicos/relacionales
            User.query.delete()
            Finca.query.delete()
            RouteAdministration.query.delete()
            db.session.commit()

            # seed_vaccines crea sus propias rutas de administración una vez
            # que existen fincas a las que asociarlas.

            # Ejecutar master seed completo
            run_master_seed()

            # Verificar resultados
            assert Finca.query.count() > 0
            assert User.query.count() > 0
            assert Territory.query.count() > 0
            assert Vaccines.query.count() > 0
            assert FoodTypes.query.count() > 0
            assert Fields.query.count() > 0

    def test_run_master_seed_exception(self, app, db_session):
        with app.app_context():
            with patch('app.utils.seed_master.seed_territories', side_effect=Exception("Master seed fail")):
                # No debe propagar la excepción
                run_master_seed()


@pytest.mark.unit
class TestBootstrap:
    def test_seed_admin_user_success(self, app, db_session):
        with app.app_context():
            # Limpiar tablas
            User.query.delete()
            Finca.query.delete()
            db.session.commit()

            # El usuario 99999999 no existe
            assert User.query.filter_by(identification=99999999).first() is None

            seed_admin_user(app)

            # Ahora debe existir
            admin = User.query.filter_by(identification=99999999).first()
            assert admin is not None
            assert admin.email == 'admin.seed@example.com'

            # Ejecutar de nuevo no debe duplicarlo
            seed_admin_user(app)
            assert User.query.filter_by(identification=99999999).count() == 1

    def test_seed_admin_user_no_table(self, app, db_session):
        with app.app_context():
            # Limpiar tablas
            User.query.delete()
            Finca.query.delete()
            db.session.commit()

            with patch('sqlalchemy.inspect') as mock_inspect:
                mock_inspector = MagicMock()
                mock_inspector.get_table_names.return_value = []
                mock_inspect.return_value = mock_inspector

                # Retorna inmediatamente sin crear nada
                seed_admin_user(app)
                assert User.query.filter_by(identification=99999999).first() is None

    def test_seed_admin_user_exception(self, app, db_session):
        with app.app_context():
            with patch('sqlalchemy.inspect', side_effect=Exception("DB error")):
                # Captura la excepción sin propagarla
                seed_admin_user(app)

    def test_warmup_initial_caches_sync(self, app, db_session):
        # Desactivar modo asíncrono para que corra sincrónicamente en el test
        app.config['CACHE_WARMUP_ASYNC'] = False
        app.config['CACHE_WARMUP_INCLUDE_RELATIONS'] = True

        with app.app_context():
            # Crear finca y animales básicos para calentar
            finca = Finca(name="Villa Luz", type=FarmType.Tradicional, department="Colombia")
            db.session.add(finca)
            db.session.commit()

            # Correr warmup
            warmup_initial_caches(app)
