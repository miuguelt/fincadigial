# predictive.py - IA y Mapa de Salud
from flask_restx import Resource
from flask_jwt_extended import jwt_required
from datetime import datetime
from app import db
from app.models.fields import Fields
from app.models.animalFields import AnimalFields
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from . import analytics_ns


@analytics_ns.route("/predictive/run")
class RunPredictiveAnalysis(Resource):
    @jwt_required()
    def post(self):
        """Ejecutar análisis predictivo de IA (Asíncrono)"""
        try:
            from app.tasks.predictive_tasks import run_finca_predictive_analysis

            finca_id = get_current_finca_id()
            task = run_finca_predictive_analysis.delay(finca_id)
            return APIResponse.success(
                {"task_id": task.id, "status": "pending"},
                "Análisis iniciado",
                status_code=202,
            )
        except Exception:
            return APIResponse.error("Error al iniciar el análisis predictivo")


@analytics_ns.route("/fields/health-map")
class FieldHealthMap(Resource):
    @jwt_required()
    def get(self):
        """Obtener mapa de salud de potreros"""
        try:
            from sqlalchemy import func

            finca_id = get_current_finca_id()
            fields = Fields.query.filter_by(finca_id=finca_id).all()
            field_ids = [f.id for f in fields]
            animal_counts = {}
            if field_ids:
                from app.models.animals import Animals, AnimalStatus

                counts = (
                    db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
                    .join(Animals, AnimalFields.animal_id == Animals.id)
                    .filter(
                        AnimalFields.field_id.in_(field_ids),
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted == False,
                        Animals.is_deleted == False,
                        Animals.status == AnimalStatus.Vivo,
                    )
                    .group_by(AnimalFields.field_id)
                    .all()
                )
                animal_counts = {fid: int(cnt) for fid, cnt in counts}

            status_mapping = {
                "Activo": "healthy",
                "Disponible": "healthy",
                "Ocupado": "warning",
                "Mantenimiento": "resting",
                "Restringido": "critical",
            }
            result = []
            for idx, field in enumerate(fields):
                occupation = animal_counts.get(field.id, 0)
                capacity = (
                    int(field.capacity)
                    if field.capacity and field.capacity.isdigit()
                    else 50
                )
                status = status_mapping.get(str(field.state.value), "healthy")

                result.append(
                    {
                        "id": field.id,
                        "name": field.name,
                        "status": status,
                        "occupation": occupation,
                        "capacity": capacity,
                    }
                )
            return APIResponse.success(result, "Mapa de salud obtenido")
        except Exception as e:
            return APIResponse.error(
                message="Error obteniendo mapa de salud", details={"error": str(e)}
            )
