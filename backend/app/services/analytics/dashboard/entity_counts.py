"""How many of each thing the dashboard shows.

Two groups with different rules: the catalogues are shared and counted in a
single round trip, while everything operational is scoped to the active farm —
and falls back to a global count only when there is no farm selected, which is
the administration view.
"""

from dataclasses import dataclass

from sqlalchemy import and_, func, select

from app import db


@dataclass(frozen=True)
class CatalogCounts:
    vaccines: int
    medications: int
    diseases: int
    species: int
    breeds: int
    food_types: int


def catalog_counts() -> CatalogCounts:
    """Conteo de los catálogos compartidos en una sola consulta."""
    from app.models.breeds import Breeds
    from app.models.diseases import Diseases
    from app.models.foodTypes import FoodTypes
    from app.models.medications import Medications
    from app.models.species import Species
    from app.models.vaccines import Vaccines

    row = db.session.execute(
        select(
            select(func.count(Vaccines.id)).scalar_subquery(),
            select(func.count(Medications.id)).scalar_subquery(),
            select(func.count(Diseases.id)).scalar_subquery(),
            select(func.count(Species.id)).scalar_subquery(),
            select(func.count(Breeds.id)).scalar_subquery(),
            select(func.count(FoodTypes.id)).scalar_subquery(),
        )
    ).one()
    return CatalogCounts(*(int(value or 0) for value in row))


def _scoped_count(model, finca_id):
    query = model.query.filter_by(finca_id=finca_id) if finca_id else model.query
    return query.count()


def operational_counts(finca_id) -> dict:
    """Conteos de la operación: potreros, usuarios, registros clínicos y relaciones."""
    from app.models.animalDiseases import AnimalDiseases
    from app.models.animalFields import AnimalFields
    from app.models.control import Control
    from app.models.fields import Fields
    from app.models.geneticImprovements import GeneticImprovements
    from app.models.treatment_medications import TreatmentMedications
    from app.models.treatment_vaccines import TreatmentVaccines
    from app.models.treatments import Treatments
    from app.models.user import User
    from app.models.user_finca import UserFinca
    from app.models.vaccinations import Vaccinations

    treatments = _scoped_count(Treatments, finca_id)

    if finca_id:
        # La pertenencia a la finca vive en `UserFinca`, no en `User`.
        users = UserFinca.query.filter_by(finca_id=finca_id, is_active=True).count()
        active_users = (
            db.session.query(func.count(UserFinca.id))
            .join(User, UserFinca.user_id == User.id)
            .filter(
                UserFinca.finca_id == finca_id,
                UserFinca.is_active.is_(True),
                User.status.is_(True),
            )
            .scalar()
            or 0
        )
        treatment_medications = (
            TreatmentMedications.query.join(Treatments)
            .filter(Treatments.finca_id == finca_id)
            .count()
        )
        treatment_vaccines = (
            TreatmentVaccines.query.join(Treatments)
            .filter(Treatments.finca_id == finca_id)
            .count()
        )
    else:
        users = User.query.count()
        active_users = User.query.filter_by(status=True).count()
        treatment_medications = TreatmentMedications.query.count()
        treatment_vaccines = TreatmentVaccines.query.count()

    return {
        "fields": _scoped_count(Fields, finca_id),
        "users": users,
        "active_users": active_users,
        "treatments": treatments,
        "vaccinations": _scoped_count(Vaccinations, finca_id),
        "controls": _scoped_count(Control, finca_id),
        "animal_fields": _scoped_count(AnimalFields, finca_id),
        "animal_diseases": _scoped_count(AnimalDiseases, finca_id),
        "genetic_improvements": _scoped_count(GeneticImprovements, finca_id),
        "treatment_medications": treatment_medications,
        "treatment_vaccines": treatment_vaccines,
    }


def pending_work_counts(finca_id) -> dict:
    """Tareas sin cerrar y alertas sin leer."""
    from app.models.alerts import AnimalAlert
    from app.models.tasks import Tasks, TaskStatus

    tasks = Tasks.query
    if finca_id:
        tasks = tasks.filter_by(finca_id=finca_id)

    alerts = AnimalAlert.query.filter_by(is_read=False, superseded_by_id=None)
    if finca_id:
        alerts = alerts.filter_by(finca_id=finca_id)

    return {
        "pending_tasks": tasks.filter(Tasks.status != TaskStatus.COMPLETED).count(),
        "unread_alerts": alerts.count(),
    }


def animals_without_recent_care(finca_id, control_since, vaccination_since) -> dict:
    """Animales vivos sin control ni vacunación reciente.

    Se resuelve con `LEFT JOIN ... IS NULL`, que en PostgreSQL es bastante más
    rápido que una subconsulta `NOT IN` sobre miles de registros.
    """
    from app.models.animals import AnimalStatus, Animals
    from app.models.control import Control
    from app.models.vaccinations import Vaccinations

    def missing(model, date_column, since):
        conditions = [model.animal_id == Animals.id, date_column >= since]
        if finca_id:
            conditions.append(model.finca_id == finca_id)

        query = (
            db.session.query(func.count(Animals.id))
            .select_from(Animals)
            .outerjoin(model, and_(*conditions))
            .filter(Animals.status == AnimalStatus.Vivo, model.id.is_(None))
        )
        if finca_id:
            query = query.filter(Animals.finca_id == finca_id)
        return int(query.scalar() or 0)

    return {
        "without_control": missing(Control, Control.checkup_date, control_since),
        "without_vaccination": missing(
            Vaccinations, Vaccinations.vaccination_date, vaccination_since
        ),
    }
