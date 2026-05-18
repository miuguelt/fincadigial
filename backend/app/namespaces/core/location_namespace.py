from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_location import UserLocation
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
import flask

location_ns = Namespace('location', description='Seguimiento de ubicación y telemetría Mesh')

location_model = location_ns.model('UserLocation', {
    'latitude': fields.Float(required=True),
    'longitude': fields.Float(required=True),
    'accuracy': fields.Float(),
    'detection_method': fields.String(),
    'reported_by_node_id': fields.String()
})

@location_ns.route('/report')
class LocationReport(Resource):
    @jwt_required()
    def post(self):
        """Reportar ubicación actual (Breadcrumb)."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()
        data = flask.request.json

        new_loc = UserLocation(
            user_id=user_id,
            finca_id=finca_id,
            latitude=data['latitude'],
            longitude=data['longitude'],
            accuracy=data.get('accuracy'),
            detection_method=data.get('detection_method', 'GPS'),
            reported_by_node_id=data.get('reported_by_node_id')
        )
        db.session.add(new_loc)
        db.session.commit()
        return APIResponse.success(message="Ubicación registrada")

@location_ns.route('/batch-report')
class LocationBatchReport(Resource):
    @jwt_required()
    def post(self):
        """Sincronizar lote de ubicaciones recolectadas vía Mesh."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()
        locations_data = flask.request.json.get('locations', [])

        for data in locations_data:
            # En reportes por lote, el user_id puede venir en el data si es recolectado de otros
            target_user_id = data.get('user_id', user_id)
            new_loc = UserLocation(
                user_id=target_user_id,
                finca_id=finca_id,
                latitude=data['latitude'],
                longitude=data['longitude'],
                accuracy=data.get('accuracy'),
                detection_method=data.get('detection_method', 'Mesh_Relay'),
                reported_by_node_id=data.get('reported_by_node_id')
            )
            db.session.add(new_loc)
        
        db.session.commit()
        return APIResponse.success(message=f"{len(locations_data)} ubicaciones sincronizadas")

@location_ns.route('/latest')
class LatestLocations(Resource):
    @jwt_required()
    def get(self):
        """Obtener la última ubicación conocida de cada trabajador en la finca."""
        finca_id = get_current_finca_id()
        
        # Query para obtener el registro más reciente por usuario
        subquery = db.session.query(
            UserLocation.user_id,
            db.func.max(UserLocation.created_at).label('max_created')
        ).filter_by(finca_id=finca_id).group_by(UserLocation.user_id).subquery()

        latest_locs = db.session.query(UserLocation).join(
            subquery,
            (UserLocation.user_id == subquery.c.user_id) & 
            (UserLocation.created_at == subquery.c.max_created)
        ).all()

        return APIResponse.success(data=[loc.to_dict() for loc in latest_locs])
