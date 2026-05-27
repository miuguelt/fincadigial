"""User Preferences Namespace - Favorites and Settings"""
from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, UTC
import logging

from app import db
from app.utils.response_handler import APIResponse
from app.models.user_favorite import UserFavorite

logger = logging.getLogger(__name__)

prefs_ns = Namespace(
    'preferences',
    description='👤 User Preferences - Favoritos y configuración personal',
    path='/preferences'
)

favorite_model = prefs_ns.model('Favorite', {
    'id': fields.Integer(description='Favorite ID'),
    'endpoint': fields.String(required=True, description='Endpoint path'),
    'label': fields.String(description='Custom label'),
    'method': fields.String(description='HTTP method'),
    'created_at': fields.DateTime(description='Creation date')
})

favorites_list_model = prefs_ns.model('FavoritesList', {
    'favorites': fields.List(fields.Nested(favorite_model)),
    'count': fields.Integer(description='Total favorites')
})


@prefs_ns.route('/favorites')
class UserFavorites(Resource):
    @prefs_ns.doc('get_favorites', security=['Bearer', 'Cookie'])
    @prefs_ns.marshal_with(favorites_list_model)
    @jwt_required()
    def get(self):
        """Obtener lista de endpoints favoritos del usuario desde BD."""
        try:
            user_id = get_jwt_identity()
            favorites = UserFavorite.query.filter_by(user_id=user_id)\
                .order_by(UserFavorite.created_at.desc()).all()

            return APIResponse.success(data={
                'favorites': [f.to_namespace_dict() for f in favorites],
                'count': len(favorites),
            })
        except Exception as e:
            logger.error(f"Error getting favorites: {e}", exc_info=True)
            return APIResponse.error(message='Error al obtener favoritos', status_code=500)

    @prefs_ns.doc('add_favorite', security=['Bearer', 'Cookie'])
    @prefs_ns.expect(favorite_model)
    @jwt_required()
    def post(self):
        """Agregar endpoint a favoritos (persistido en BD)."""
        try:
            user_id = get_jwt_identity()
            data = flask.request.json

            if not data.get('endpoint'):
                return APIResponse.error(message='El campo endpoint es requerido', status_code=400)

            existing = UserFavorite.query.filter_by(
                user_id=user_id, endpoint=data['endpoint']
            ).first()
            if existing:
                return APIResponse.success(data=existing.to_namespace_dict(), message='Ya está en favoritos')

            fav = UserFavorite.create(
                user_id=user_id,
                endpoint=data['endpoint'],
                label=data.get('label', data['endpoint']),
                method=data.get('method', 'GET'),
            )
            return APIResponse.success(
                data=fav.to_namespace_dict(),
                message='Agregado a favoritos exitosamente',
                status_code=201,
            )
        except Exception as e:
            logger.error(f"Error adding favorite: {e}", exc_info=True)
            return APIResponse.error(message='Error al agregar favorito', status_code=500)

    @prefs_ns.doc('clear_favorites', security=['Bearer', 'Cookie'])
    @jwt_required()
    def delete(self):
        """Eliminar todos los favoritos del usuario."""
        try:
            user_id = get_jwt_identity()
            UserFavorite.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            return APIResponse.success(message='Favoritos eliminados exitosamente')
        except Exception as e:
            logger.error(f"Error clearing favorites: {e}", exc_info=True)
            return APIResponse.error(message='Error al eliminar favoritos', status_code=500)


@prefs_ns.route('/favorites/<int:favorite_id>')
class UserFavoriteResource(Resource):
    @prefs_ns.doc('delete_favorite', security=['Bearer', 'Cookie'])
    @jwt_required()
    def delete(self, favorite_id):
        """Eliminar un favorito específico."""
        try:
            user_id = get_jwt_identity()
            fav = UserFavorite.query.filter_by(id=favorite_id, user_id=user_id).first()
            if not fav:
                return APIResponse.error(message='Favorito no encontrado', status_code=404)
            fav.delete()
            return APIResponse.success(message='Favorito eliminado exitosamente')
        except Exception as e:
            logger.error(f"Error deleting favorite: {e}", exc_info=True)
            return APIResponse.error(message='Error al eliminar favorito', status_code=500)


@prefs_ns.route('/history')
class EndpointHistory(Resource):
    @prefs_ns.doc('get_history', security=['Bearer', 'Cookie'],
                  params={'limit': 'Number of recent endpoints (default: 10)'})
    @jwt_required()
    def get(self):
        """Obtener historial de endpoints usados recientemente desde BD."""
        try:
            user_id = get_jwt_identity()
            limit = flask.request.args.get('limit', 10, type=int)
            recent = UserFavorite.query.filter_by(user_id=user_id)\
                .order_by(UserFavorite.updated_at.desc()).limit(limit).all()
            return APIResponse.success(data={
                'history': [f.to_namespace_dict() for f in recent],
                'count': len(recent),
            })
        except Exception as e:
            logger.error(f"Error getting history: {e}", exc_info=True)
            return APIResponse.error(message='Error al obtener historial', status_code=500)

    @prefs_ns.doc('add_to_history', security=['Bearer', 'Cookie'])
    @jwt_required()
    def post(self):
        """Registrar acceso a endpoint en BD."""
        try:
            user_id = get_jwt_identity()
            data = flask.request.json
            if not data.get('endpoint'):
                return APIResponse.error(message='El campo endpoint es requerido', status_code=400)

            fav = UserFavorite.query.filter_by(
                user_id=user_id, endpoint=data['endpoint']
            ).first()
            if fav:
                fav.save(commit=True)
            else:
                UserFavorite.create(
                    user_id=user_id,
                    endpoint=data['endpoint'],
                    label=data.get('label', data['endpoint']),
                    method=data.get('method', 'GET'),
                )
            return APIResponse.success(message='Registrado en historial')
        except Exception as e:
            logger.error(f"Error adding to history: {e}", exc_info=True)
            return APIResponse.error(message='Error al agregar al historial', status_code=500)
