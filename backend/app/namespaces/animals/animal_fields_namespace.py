from flask_restx import Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import date, datetime
from app.models.animalFields import AnimalFields
from app.models.base_model import ValidationError
from app import db
from app.services.operational.field_occupancy_service import sync_field_occupancy
from app.utils.namespace_helpers import create_optimized_namespace, _cache_clear
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

animal_fields_ns = create_optimized_namespace(
    "animal-fields",
    "🌳 Gestión de ubicación de animales en potreros",
    AnimalFields,
    path="/animal-fields",
    rbac_entity="animal-fields",
)


def _as_date(value) -> date:
    """Lee la fecha del cuerpo; si viene rota, usa hoy (igual que el modelo)."""
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).split("T", maxsplit=1)[0])
    except (ValueError, TypeError):
        return date.today()


@animal_fields_ns.route("/transfer")
class AnimalFieldTransferResource(Resource):
    """Acciones masivas de traslado de animales."""

    @animal_fields_ns.doc(
        "bulk_transfer_animals",
        description="Trasladar múltiples animales a un nuevo potrero",
    )
    @jwt_required()
    def post(self):
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get("animal_ids")
            field_id = data.get("field_id")
            date_val = data.get("date") or datetime.now().strftime("%Y-%m-%d")
            notes = data.get("notes")

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error(
                    {"animal_ids": "Se requiere lista de IDs de animales"}
                )
            if not field_id:
                return APIResponse.validation_error(
                    {"field_id": "Se requiere ID del potrero de destino"}
                )

            outcome = AnimalFields.batch_transfer(animal_ids, field_id, date_val, notes)

            # El potrero que recibe y el que entrega cambian de ocupación, de
            # estado y de fecha de pastoreo: la tarjeta lee esos tres datos.
            updated_fields = sync_field_occupancy(
                outcome["affected_field_ids"],
                _as_date(date_val),
                get_current_finca_id(),
            )

            db.session.commit()

            # Limpiar cachés relacionados
            _cache_clear("AnimalFields")
            _cache_clear("Animals")
            _cache_clear("Fields")

            moved = outcome["assignments"] + outcome["reactivated"]
            skipped = outcome["skipped_animal_ids"]

            # El desglose evita el reporte engañoso de antes: trasladar 20
            # animales de los que 8 ya estaban en el destino respondía
            # "12 animales trasladados" sin decir qué pasó con los otros 8.
            message = f"{len(moved)} animales trasladados exitosamente"
            if skipped:
                message += f" ({len(skipped)} ya estaban en el potrero de destino)"

            return APIResponse.success(
                data=[r.to_namespace_dict() for r in moved],
                message=message,
                meta={
                    "total_requested": outcome["total_requested"],
                    "transferred_count": len(moved),
                    "skipped_count": len(skipped),
                    "skipped_animal_ids": skipped,
                    "fields": updated_fields,
                },
            )
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(f"Error en traslado masivo: {str(e)}")


@animal_fields_ns.route("/bulk-remove")
class AnimalFieldBulkRemoveResource(Resource):
    """Acciones masivas de retiro de animales de potreros."""

    @animal_fields_ns.doc(
        "bulk_remove_animals",
        description="Retirar masivamente animales de sus potreros actuales",
    )
    @jwt_required()
    def post(self):
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get("animal_ids")
            date_val = data.get("date") or datetime.now().strftime("%Y-%m-%d")

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error(
                    {"animal_ids": "Se requiere lista de IDs de animales"}
                )

            outcome = AnimalFields.batch_remove(animal_ids, date_val)

            updated_fields = sync_field_occupancy(
                outcome["affected_field_ids"],
                _as_date(date_val),
                get_current_finca_id(),
            )

            db.session.commit()

            _cache_clear("AnimalFields")
            _cache_clear("Animals")
            _cache_clear("Fields")

            removed = outcome["assignments"]
            skipped = outcome["skipped_animal_ids"]

            message = f"{len(removed)} animales retirados de sus potreros exitosamente"
            if skipped:
                message += f" ({len(skipped)} ya estaban sin potrero)"

            return APIResponse.success(
                data=[r.to_namespace_dict() for r in removed],
                message=message,
                meta={
                    "total_requested": outcome["total_requested"],
                    "removed_count": len(removed),
                    "skipped_count": len(skipped),
                    "skipped_animal_ids": skipped,
                    "fields": updated_fields,
                },
            )
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(str(e), status_code=400)
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(f"Error en retiro masivo: {str(e)}")
