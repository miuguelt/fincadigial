"""
Search Namespace - Busqueda Semantica Unificada
================================================
Endpoints para busqueda global y por entidad.

GET /api/v1/search?q=<query>&limit=20
    Busqueda unificada (animales + registros)

GET /api/v1/search/animals?q=<query>&limit=20&include_inactive=false
    Busqueda especifica de animales
"""

import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from app.services.semantic_search_service import semantic_search_service
from app.utils.tenant_context import get_current_finca_id
from app.utils.response_handler import APIResponse
import logging

logger = logging.getLogger(__name__)

search_ns = Namespace(
    'search',
    description='Busqueda semantica unificada',
    path='/search',
)

search_result_model = search_ns.model('SearchResult', {
    'id': fields.Integer(description='ID del resultado'),
    'name': fields.String(description='Nombre o identificador'),
    'internal_id': fields.String(description='ID interno'),
    'species': fields.String(description='Especie'),
    'breed': fields.String(description='Raza'),
    'score': fields.Float(description='Score de relevancia (0-1)'),
    'type': fields.String(description='Tipo de resultado', enum=['animal', 'treatment', 'vaccination', 'control']),
    'url': fields.String(description='URL de navegacion'),
    'date': fields.String(description='Fecha relevante'),
    'description': fields.String(description='Descripcion del resultado'),
    'title': fields.String(description='Titulo del resultado'),
})

unified_search_model = search_ns.model('UnifiedSearchResponse', {
    'animals': fields.List(fields.Nested(search_result_model), description='Resultados de animales'),
    'records': fields.List(fields.Nested(search_result_model), description='Resultados de registros'),
})


@search_ns.route('')
class UnifiedSearchResource(Resource):
    """Busqueda unificada en todas las entidades."""

    @search_ns.doc('unified_search', security='jwt')
    @search_ns.param('q', 'Texto de busqueda', required=True)
    @search_ns.param('limit', 'Limite de resultados por categoria', type=int, default=20)
    @search_ns.response(200, 'Resultados de busqueda', unified_search_model)
    @search_ns.response(400, 'Parametro q requerido')
    @jwt_required()
    def get(self):
        """Busqueda semantica unificada (animales + registros)."""
        query = flask.request.args.get('q', '').strip()
        limit = flask.request.args.get('limit', 20, type=int)

        if not query or len(query) < 2:
            return APIResponse.validation_error({'q': 'Minimo 2 caracteres'})

        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error(
                message='Contexto de finca no disponible',
                status_code=403,
                error_code='NO_FINCA_CONTEXT',
            )

        try:
            results = semantic_search_service.unified_search(query, finca_id, limit=limit)
            return APIResponse.success(
                message='Busqueda completada',
                data=results,
            )
        except Exception as e:
            logger.exception(f'Error en busqueda unificada: {e}')
            return APIResponse.error(
                message='Error al realizar la busqueda',
                status_code=500,
            )


@search_ns.route('/animals')
class AnimalSearchResource(Resource):
    """Busqueda especifica de animales."""

    @search_ns.doc('search_animals', security='jwt')
    @search_ns.param('q', 'Texto de busqueda', required=True)
    @search_ns.param('limit', 'Limite de resultados', type=int, default=20)
    @search_ns.param('include_inactive', 'Incluir animales inactivos', type=bool, default=False)
    @search_ns.response(200, 'Resultados de animales', fields.List(fields.Nested(search_result_model)))
    @search_ns.response(400, 'Parametro q requerido')
    @jwt_required()
    def get(self):
        """Busqueda semantica de animales."""
        query = flask.request.args.get('q', '').strip()
        limit = flask.request.args.get('limit', 20, type=int)
        include_inactive = flask.request.args.get('include_inactive', 'false').lower() == 'true'

        if not query or len(query) < 2:
            return APIResponse.validation_error({'q': 'Minimo 2 caracteres'})

        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error(
                message='Contexto de finca no disponible',
                status_code=403,
                error_code='NO_FINCA_CONTEXT',
            )

        try:
            results = semantic_search_service.search_animals(
                query, finca_id, limit=limit, include_inactive=include_inactive
            )
            return APIResponse.success(
                message='Busqueda de animales completada',
                data={'results': results},
            )
        except Exception as e:
            logger.exception(f'Error en busqueda de animales: {e}')
            return APIResponse.error(
                message='Error al buscar animales',
                status_code=500,
            )
