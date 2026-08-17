from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_location import UserLocation
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
import flask

location_ns = Namespace(
    "location", description="Seguimiento de ubicación y telemetría Mesh"
)

location_model = location_ns.model(
    "UserLocation",
    {
        "latitude": fields.Float(required=True),
        "longitude": fields.Float(required=True),
        "accuracy": fields.Float(),
        "detection_method": fields.String(),
        "reported_by_node_id": fields.String(),
    },
)


@location_ns.route("/report")
class LocationReport(Resource):
    @jwt_required()
    def post(self):
        """Reportar ubicación actual (Breadcrumb)."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()
        data = flask.request.json

        if not finca_id:
            return APIResponse.error(
                message="Contexto de finca requerido para reportar ubicación",
                status_code=400,
            )

        from app.models.user import User
        from app.models.finca import Finca
        from app.models.user_finca import UserFinca

        # Verificar existencia del usuario
        user = db.session.get(User, user_id)
        if not user:
            return APIResponse.error(
                message="Usuario no encontrado o sesión inválida", status_code=401
            )

        # Verificar existencia de la finca y acceso del usuario
        finca = db.session.get(Finca, finca_id)
        if not finca:
            return APIResponse.error(message="Finca no encontrada", status_code=404)

        if not UserFinca.has_access(user_id, finca_id):
            return APIResponse.error(
                message="No tienes permiso para reportar ubicación en esta finca",
                status_code=403,
            )

        new_loc = UserLocation(
            user_id=user_id,
            finca_id=finca_id,
            latitude=data["latitude"],
            longitude=data["longitude"],
            accuracy=data.get("accuracy"),
            detection_method=data.get("detection_method", "GPS"),
            reported_by_node_id=data.get("reported_by_node_id"),
        )
        db.session.add(new_loc)
        db.session.commit()
        return APIResponse.success(message="Ubicación registrada")


@location_ns.route("/batch-report")
class LocationBatchReport(Resource):
    @jwt_required()
    def post(self):
        """Sincronizar lote de ubicaciones recolectadas vía Mesh."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()
        locations_data = flask.request.json.get("locations", [])

        if not finca_id:
            return APIResponse.error(
                message="Contexto de finca requerido para reportar ubicaciones",
                status_code=400,
            )

        from app.models.user import User
        from app.models.finca import Finca
        from app.models.user_finca import UserFinca

        # Verificar existencia de la finca
        finca = db.session.get(Finca, finca_id)
        if not finca:
            return APIResponse.error(message="Finca no encontrada", status_code=404)

        # El usuario que sube el lote debe tener acceso
        if not UserFinca.has_access(user_id, finca_id):
            return APIResponse.error(
                message="No tienes permiso para subir datos a esta finca",
                status_code=403,
            )

        # Obtener los IDs de todos los usuarios con acceso activo a esta finca
        valid_user_ids = {
            m["user_id"] for m in UserFinca.get_finca_users(finca_id, active_only=True)
        }

        synced_count = 0
        for data in locations_data:
            # En reportes por lote, el user_id puede venir en el data si es recolectado de otros
            target_user_id = data.get("user_id", user_id)

            # Omitir de forma segura si el usuario no tiene acceso a esta finca
            if target_user_id not in valid_user_ids:
                continue

            new_loc = UserLocation(
                user_id=target_user_id,
                finca_id=finca_id,
                latitude=data["latitude"],
                longitude=data["longitude"],
                accuracy=data.get("accuracy"),
                detection_method=data.get("detection_method", "Mesh_Relay"),
                reported_by_node_id=data.get("reported_by_node_id"),
            )
            db.session.add(new_loc)
            synced_count += 1

        db.session.commit()
        return APIResponse.success(message=f"{synced_count} ubicaciones sincronizadas")


@location_ns.route("/latest")
class LatestLocations(Resource):
    @jwt_required()
    def get(self):
        """Obtener la última ubicación conocida de cada trabajador en la finca."""
        from app.utils.tenant_context import apply_tenant_filter

        finca_id = get_current_finca_id()

        # Query para obtener el registro más reciente por usuario respetando aislamiento
        subquery_base = db.session.query(
            UserLocation.user_id,
            db.func.max(UserLocation.created_at).label("max_created"),
        )
        subquery = (
            apply_tenant_filter(subquery_base, UserLocation, finca_id=finca_id)
            .group_by(UserLocation.user_id)
            .subquery()
        )

        latest_locs_base = db.session.query(UserLocation).join(
            subquery,
            (UserLocation.user_id == subquery.c.user_id)
            & (UserLocation.created_at == subquery.c.max_created),
        )
        latest_locs = apply_tenant_filter(
            latest_locs_base, UserLocation, finca_id=finca_id
        ).all()

        return APIResponse.success(data=[loc.to_dict() for loc in latest_locs])
