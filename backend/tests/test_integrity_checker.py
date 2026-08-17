import pytest
from datetime import date
from app.utils.integrity_checker import OptimizedIntegrityChecker, check_before_delete
from app.models import Animal, Finca, FarmType, Species, Breed


@pytest.mark.unit
class TestIntegrityChecker:
    def test_cache_key_generation(self):
        key = OptimizedIntegrityChecker._get_cache_key(Finca, 42)
        assert key == "Finca_42"

    def test_clear_and_get_stats(self):
        OptimizedIntegrityChecker.clear_cache()
        stats = OptimizedIntegrityChecker.get_cache_stats()
        assert stats["total_entries"] == 0
        assert stats["valid_entries"] == 0

    def test_check_integrity_invalid_id(self, app):
        with app.app_context():
            warnings = OptimizedIntegrityChecker.check_integrity_fast(Finca, -1)
            assert len(warnings) == 0

            warnings = OptimizedIntegrityChecker.check_integrity_fast(Finca, 0)
            assert len(warnings) == 0

    def test_check_integrity_non_existent(self, app):
        with app.app_context():
            # Limpiar cache para asegurar una consulta limpia
            OptimizedIntegrityChecker.clear_cache()

            # Verificar un ID que no existe
            warnings = OptimizedIntegrityChecker.check_integrity_fast(Finca, 9999)
            # No hay registros reales, por lo que no debería haber advertencias
            assert len(warnings) == 0

    def test_check_integrity_with_dependencies(self, app, db_session):
        with app.app_context():
            # Crear especie y raza
            species = Species.create(name="Bovino")
            breed = Breed.create(name="Criollo", species_id=species.id)

            # Crear Finca
            finca = Finca.create(
                name="Finca Test Integrity", type=FarmType.Tradicional, is_active=True
            )
            db_session.session.commit()

            # Crear Animal perteneciente a la Finca con todos los campos requeridos
            animal = Animal.create(
                sex="Macho",
                birth_date=date(2023, 1, 15),
                weight=350,
                record="TEST1234",
                breeds_id=breed.id,
                finca_id=finca.id,
            )
            db_session.session.commit()

            # Limpiar cache
            OptimizedIntegrityChecker.clear_cache()

            # Verificar integridad de Finca (el animal depende de ella)
            can_delete, warnings = OptimizedIntegrityChecker.can_delete_safely(
                Finca, finca.id
            )

            # Debería haber al menos una advertencia para la tabla 'animals'
            assert len(warnings) > 0

            # Encontrar la advertencia de 'animals'
            animal_warning = next(
                (w for w in warnings if w.dependent_table == "animals"), None
            )
            assert animal_warning is not None
            assert animal_warning.dependent_count == 1
            assert animal_warning.dependent_field == "finca_id"

            # Obtener resumen de eliminación
            summary = check_before_delete(Finca, finca.id)
            assert summary["can_delete"] == can_delete
            assert summary["total_dependents"] >= 1

            # Verificar cache hit
            # La segunda llamada debe usar el cache
            warnings_cached = OptimizedIntegrityChecker.check_integrity_fast(
                Finca, finca.id
            )
            assert len(warnings_cached) == len(warnings)

            # Verificar que el cache stats funciona
            stats_after = OptimizedIntegrityChecker.get_cache_stats()
            assert stats_after["total_entries"] > 0

    def test_get_batch_dependencies(self, app, db_session):
        with app.app_context():
            # Crear especie y raza
            species = Species.create(name="Bovino")
            breed = Breed.create(name="Criollo", species_id=species.id)

            # Crear Finca
            finca = Finca.create(
                name="Finca Test Batch", type=FarmType.Tradicional, is_active=True
            )
            db_session.session.commit()

            # Crear Animal
            animal = Animal.create(
                sex="Macho",
                birth_date=date(2023, 1, 15),
                weight=350,
                record="BATCH123",
                breeds_id=breed.id,
                finca_id=finca.id,
            )
            db_session.session.commit()

            # Crear Control para este animal
            from app.models.control import Control, HealthStatus

            control = Control.create(
                checkup_date=date.today(),
                health_status=HealthStatus.Excelente,
                animal_id=animal.id,
                finca_id=finca.id,
            )
            db_session.session.commit()

            batch_results = OptimizedIntegrityChecker.get_batch_dependencies(
                [animal.id], "animals"
            )
            # Debería devolver un dict con animal.id
            assert animal.id in batch_results
            animal_deps = batch_results[animal.id]

            # Debería reflejar la dependencia de 'control'
            control_dep = next(
                (d for d in animal_deps if d["table"] == "control"), None
            )
            assert control_dep is not None
            assert control_dep["count"] == 1

    def test_get_batch_dependencies_empty(self):
        res = OptimizedIntegrityChecker.get_batch_dependencies([], "finca")
        assert res == {}

    def test_get_batch_dependencies_invalid_model(self):
        # Dado que get_batch_dependencies siempre importa la clase Animals,
        # devolverá un dict mapeado con listas vacías si el record no existe en la base de datos
        res = OptimizedIntegrityChecker.get_batch_dependencies(
            [1], "non_existent_model"
        )
        assert res == {1: []}
