"""Borrado con integridad referencial explicada.

Cubre la clasificación de dependencias (cascada vs bloqueo), la propagación del
borrado lógico a los hijos y los mensajes que recibe el operador cuando la
eliminación no es posible.
"""

import pytest
from datetime import date

from app import db
from app.models import Animal, Breed, FarmType, Finca, Species
from app.models.animalFields import AnimalFields
from app.models.control import Control, HealthStatus
from app.models.fields import Fields, LandStatus
from app.models.milk_production import MilkProduction, MilkSession
from app.utils.deletion import build_deletion_report

BASE = "/api/v1"
ADMIN = "Administrador"


# ---------------------------------------------------------------------------
# Helpers de datos
# ---------------------------------------------------------------------------


def _finca() -> Finca:
    finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
    if not finca:
        finca = Finca.create(
            name="Finca Borrado", type=FarmType.Tradicional, is_active=True
        )
        db.session.commit()
    return finca


def _animal(record: str = "DEL-001") -> Animal:
    finca = _finca()
    species = Species.query.first() or Species.create(name="Bovino")
    breed = Breed.query.first() or Breed.create(name="Criollo", species_id=species.id)
    db.session.commit()
    animal = Animal.create(
        sex="Hembra",
        birth_date=date(2023, 1, 15),
        weight=350,
        record=record,
        breeds_id=breed.id,
        finca_id=finca.id,
    )
    db.session.commit()
    return animal


def _milk(animal: Animal, day: int) -> MilkProduction:
    milk = MilkProduction.create(
        animal_id=animal.id,
        finca_id=animal.finca_id,
        date=date(2024, 1, day),
        liters=10.0,
        milking_session=MilkSession.AM,
    )
    db.session.commit()
    return milk


def _control(animal: Animal) -> Control:
    control = Control.create(
        checkup_date=date.today(),
        health_status=HealthStatus.Excelente,
        animal_id=animal.id,
        finca_id=animal.finca_id,
    )
    db.session.commit()
    return control


def _animal_field(animal: Animal) -> AnimalFields:
    field = Fields.query.first() or Fields.create(
        name="Potrero Uno",
        area="1",
        state=LandStatus.Activo,
        finca_id=animal.finca_id,
    )
    db.session.commit()
    assignment = AnimalFields.create(
        animal_id=animal.id,
        field_id=field.id,
        assignment_date=date.today(),
        finca_id=animal.finca_id,
    )
    db.session.commit()
    return assignment


# ---------------------------------------------------------------------------
# Clasificación de dependencias
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestClasificacionDeDependencias:
    def test_relacion_con_cascade_orm_no_bloquea(self, app, db_session):
        """animal_fields declara cascade delete-orphan: debe eliminarse en cascada."""
        with app.app_context():
            animal = _animal("DEL-CASC")
            _animal_field(animal)

            report = build_deletion_report(Animal, animal.id)

            assert report.can_delete is True
            tablas = {d.table for d in report.cascading}
            assert "animal_fields" in tablas
            assert report.blocking == []

    def test_relacion_sin_cascade_bloquea_con_conteo_real(self, app, db_session):
        """La producción de leche no se elimina sola: bloquea e informa cuántos hay."""
        with app.app_context():
            animal = _animal("DEL-BLOQ")
            for day in (1, 2, 3):
                _milk(animal, day)

            report = build_deletion_report(Animal, animal.id)

            assert report.can_delete is False
            bloqueo = next(d for d in report.blocking if d.table == "milk_production")
            assert bloqueo.count == 3
            assert "3" in bloqueo.message
            assert "Producción de leche" in bloqueo.message
            assert "Producción de leche" in report.message

    def test_hijos_ya_eliminados_no_bloquean(self, app, db_session):
        """Un registro con borrado lógico previo no puede seguir bloqueando."""
        with app.app_context():
            animal = _animal("DEL-GHOST")
            milk = _milk(animal, 4)
            milk.delete()

            report = build_deletion_report(Animal, animal.id)

            assert report.can_delete is True
            assert all(d.table != "milk_production" for d in report.blocking)

    def test_hijo_en_cascada_ya_eliminado_no_se_reporta(self, app, db_session):
        with app.app_context():
            animal = _animal("DEL-GHOST2")
            control = _control(animal)
            control.delete()

            report = build_deletion_report(Animal, animal.id)

            assert report.total_dependents == 0


# ---------------------------------------------------------------------------
# Propagación del borrado lógico
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestCascadaDeBorradoLogico:
    def test_delete_marca_hijos_en_cascada(self, app, db_session):
        with app.app_context():
            animal = _animal("DEL-HIJOS")
            control = _control(animal)

            animal.delete()

            assert animal.is_deleted is True
            assert control.is_deleted is True

    def test_borrado_logico_conserva_los_archivos_del_animal(
        self, app, db_session, monkeypatch
    ):
        """Un borrado reversible no puede destruir las imágenes en disco."""
        borrados: list[int] = []
        monkeypatch.setattr(
            "app.utils.file_storage.delete_animal_directory",
            lambda animal_id: borrados.append(animal_id) or True,
        )

        with app.app_context():
            animal = _animal("DEL-IMG")

            animal.delete()
            assert borrados == []

            animal.delete(hard_delete=True)
            assert borrados == [animal.id]

    def test_restore_recupera_hijos_de_la_misma_cascada(self, app, db_session):
        with app.app_context():
            animal = _animal("DEL-REST")
            control = _control(animal)
            previo = _control(animal)
            previo.delete()

            animal.delete()
            animal.restore()

            assert control.is_deleted is False
            assert previo.is_deleted is True  # borrado aparte: no se restaura


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestEndpointDelete:
    def test_bloqueo_devuelve_409_explicado(self, app, client, token_for):
        headers = token_for(ADMIN)
        with app.app_context():
            animal = _animal("DEL-409")
            _milk(animal, 5)
            animal_id = animal.id

        resp = client.delete(f"{BASE}/animals/{animal_id}", headers=headers)

        assert resp.status_code == 409
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "REFERENTIAL_INTEGRITY_BLOCKED"
        assert "Producción de leche" in body["message"]
        bloqueos = body["error"]["details"]["blocking"]
        assert bloqueos and bloqueos[0]["table"] == "milk_production"
        assert bloqueos[0]["count"] == 1
        assert body["error"]["details"]["can_delete"] is False

    def test_borrado_exitoso_propaga_a_los_hijos(self, app, client, token_for):
        headers = token_for(ADMIN)
        with app.app_context():
            animal = _animal("DEL-OK")
            control = _control(animal)
            animal_id, control_id = animal.id, control.id

        resp = client.delete(f"{BASE}/animals/{animal_id}", headers=headers)

        assert resp.status_code == 200
        with app.app_context():
            assert Animal.query.get(animal_id).is_deleted is True
            assert Control.query.get(control_id).is_deleted is True

    def test_error_de_integridad_de_bd_se_traduce_a_409(
        self, app, client, token_for, monkeypatch
    ):
        """Si la BD rechaza el borrado, el operador recibe el motivo, no un 500."""
        from sqlalchemy.exc import IntegrityError

        headers = token_for(ADMIN)
        with app.app_context():
            animal = _animal("DEL-FK")
            animal_id = animal.id

        def _boom(self, *args, **kwargs):
            raise IntegrityError(
                "DELETE FROM animals",
                {},
                Exception(
                    'update or delete on table "animals" violates foreign key '
                    'constraint "transactions_animal_id_fkey" on table "transactions"'
                ),
            )

        monkeypatch.setattr(Animal, "delete", _boom)

        resp = client.delete(f"{BASE}/animals/{animal_id}", headers=headers)

        assert resp.status_code == 409
        body = resp.get_json()
        assert body["error"]["code"] == "REFERENTIAL_INTEGRITY_BLOCKED"
        assert "Transacciones" in body["message"]

    def test_batch_dependencies_responde_por_cada_id(self, app, client, token_for):
        headers = token_for(ADMIN)
        with app.app_context():
            libre = _animal("DEL-BATCH-OK")
            bloqueado = _animal("DEL-BATCH-NO")
            _milk(bloqueado, 7)
            ids = [libre.id, bloqueado.id]

        resp = client.post(
            f"{BASE}/animals/batch-dependencies", json={"ids": ids}, headers=headers
        )

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["found"] == 2
        assert data["results"][str(ids[0])]["canDelete"] is True
        bloqueo = data["results"][str(ids[1])]
        assert bloqueo["canDelete"] is False
        assert "Producción de leche" in bloqueo["message"]

    def test_dependencies_marca_cascada_correctamente(self, app, client, token_for):
        headers = token_for(ADMIN)
        with app.app_context():
            animal = _animal("DEL-DEP")
            _animal_field(animal)
            animal_id = animal.id

        resp = client.get(f"{BASE}/animals/{animal_id}/dependencies", headers=headers)

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["canDelete"] is True
        dep = next(d for d in data["dependencies"] if d["table"] == "animal_fields")
        assert dep["cascade_delete"] is True
        assert dep["count"] == 1


@pytest.mark.integration
class TestEndpointBulkDelete:
    def test_informa_eliminados_y_bloqueados(self, app, client, token_for):
        headers = token_for(ADMIN)
        with app.app_context():
            libre = _animal("DEL-BULK-OK")
            bloqueado = _animal("DEL-BULK-NO")
            _milk(bloqueado, 6)
            ids = [libre.id, bloqueado.id]

        resp = client.post(
            f"{BASE}/animals/bulk-delete", json={"ids": ids}, headers=headers
        )

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["deleted_ids"] == [ids[0]]
        bloqueo = data["blocked"][0]
        assert bloqueo["id"] == ids[1]
        assert "Producción de leche" in bloqueo["message"]
