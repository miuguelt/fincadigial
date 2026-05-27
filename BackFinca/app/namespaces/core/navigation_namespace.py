"""Navigation Namespace - Dynamic menu generation"""
from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required
import logging

from app.utils.cache_utils import safe_cached
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

nav_ns = Namespace(
    'navigation',
    description='🗺️ Dynamic Navigation - Generación automática de menús',
    path='/navigation'
)

# Response models
endpoint_model = nav_ns.model('Endpoint', {
    'method': fields.String(description='HTTP method'),
    'path': fields.String(description='Endpoint path'),
    'description': fields.String(description='Endpoint description'),
    'requires_auth': fields.Boolean(description='Requires authentication'),
    'permissions': fields.List(fields.String, description='Required permissions')
})

nav_group_model = nav_ns.model('NavigationGroup', {
    'id': fields.String(description='Group ID'),
    'name': fields.String(description='Group name'),
    'description': fields.String(description='Group description'),
    'icon': fields.String(description='Icon emoji'),
    'path': fields.String(description='Base path'),
    'endpoints': fields.List(fields.Nested(endpoint_model)),
    'count': fields.Integer(description='Number of endpoints')
})

nav_structure_model = nav_ns.model('NavigationStructure', {
    'version': fields.String(description='API version'),
    'base_url': fields.String(description='Base API URL'),
    'groups': fields.List(fields.Nested(nav_group_model))
})


@nav_ns.route('/structure')
class NavigationStructure(Resource):
    """Generate navigation structure from registered namespaces"""

    @nav_ns.doc(
        'get_navigation_structure',
        description='''
        **Genera estructura de navegación dinámica**

        Analiza todos los namespaces registrados en la API y genera
        una estructura de navegación jerárquica con:
        - Grupos de endpoints organizados por módulo
        - Métodos HTTP disponibles
        - Indicadores de autenticación requerida
        - Conteo de endpoints por grupo

        **Uso**: Perfecto para generar menús dinámicos en el frontend

        **Cache**: 1 hora (estructura raramente cambia)
        '''
    )
    @safe_cached(timeout=3600, key_prefix='nav_structure')
    def get(self):
        """Get navigation structure"""
        try:
            # Get flask.Flask-RESTX Api instance registered in app.api.register_api
            api = None
            try:
                api = (flask.current_app.extensions or {}).get('restx_api')
            except Exception:
                api = None
            if not api:
                return APIResponse.error(
                    message='API no inicializada para navegaci¢n',
                    details='No se encontr¢ restx_api en flask.current_app.extensions',
                    status_code=500
                )

            structure = {
                'version': '1.0',
                'base_url': '/api/v1',
                'groups': []
            }

            # Define icons for each namespace
            icons = {
                'auth': '🔐',
                'users': '👥',
                'animals': '🐄',
                'analytics': '📊',
                'security': '🛡️',
                'species': '🦌',
                'breeds': '🐃',
                'controls': '📋',
                'fields': '🌾',
                'diseases': '🦠',
                'genetic-improvements': '🧬',
                'food-types': '🌿',
                'treatments': '💊',
                'vaccinations': '💉',
                'vaccines': '💉',
                'medications': '💊',
                'animal-diseases': '🔗',
                'animal-fields': '🔗',
                'treatment-medications': '🔗',
                'treatment-vaccines': '🔗',
                'routes': '⚙️',
                'preferences': '⚙️',
                'navigation': '🗺️'
            }

            # Parse registered namespaces
            namespaces_data = []

            for namespace in api.namespaces:
                group = {
                    'id': namespace.name,
                    'name': namespace.description or namespace.name.title(),
                    'description': namespace.description,
                    'icon': icons.get(namespace.name, '📁'),
                    'path': namespace.path,
                    'endpoints': [],
                    'count': 0
                }

                # Count resources in namespace
                try:
                    for resource in namespace.resources:
                        for method in resource.methods:
                            # Get endpoint info
                            endpoint_info = {
                                'method': method,
                                'path': resource.urls[0] if resource.urls else namespace.path,
                                'description': extract_description(resource, method),
                                'requires_auth': has_jwt_required(resource, method),
                                'permissions': []
                            }
                            group['endpoints'].append(endpoint_info)
                            group['count'] += 1
                except Exception as e:
                    logger.warning(f"Error parsing namespace {namespace.name}: {e}")

                namespaces_data.append(group)

            # Organize into categories
            categories = {
                'auth': {'name': 'Autenticación', 'groups': [], 'order': 1},
                'users': {'name': 'Usuarios', 'groups': [], 'order': 2},
                'animals': {'name': 'Gestión Ganadera', 'groups': [], 'order': 3},
                'medical': {'name': 'Módulo Médico', 'groups': [], 'order': 4},
                'management': {'name': 'Gestión Recursos', 'groups': [], 'order': 5},
                'relations': {'name': 'Relaciones', 'groups': [], 'order': 6},
                'analytics': {'name': 'Analytics', 'groups': [], 'order': 7},
                'system': {'name': 'Sistema', 'groups': [], 'order': 8}
            }

            # Categorize namespaces
            for ns_data in namespaces_data:
                ns_id = ns_data['id']

                if ns_id in ['auth']:
                    categories['auth']['groups'].append(ns_data)
                elif ns_id in ['users']:
                    categories['users']['groups'].append(ns_data)
                elif ns_id in ['animals', 'species', 'breeds']:
                    categories['animals']['groups'].append(ns_data)
                elif ns_id in ['treatments', 'vaccinations', 'vaccines', 'medications']:
                    categories['medical']['groups'].append(ns_data)
                elif ns_id in ['controls', 'fields', 'diseases', 'genetic-improvements', 'food-types']:
                    categories['management']['groups'].append(ns_data)
                elif 'animal-' in ns_id or 'treatment-' in ns_id:
                    categories['relations']['groups'].append(ns_data)
                elif ns_id in ['analytics']:
                    categories['analytics']['groups'].append(ns_data)
                else:
                    categories['system']['groups'].append(ns_data)

            # Build final structure (only non-empty categories)
            for cat_key, cat_data in sorted(categories.items(), key=lambda x: x[1]['order']):
                if cat_data['groups']:
                    structure['groups'].extend(cat_data['groups'])

            return APIResponse.success(
                data=structure,
                message='Estructura de navegación generada exitosamente'
            )

        except Exception as e:
            logger.error(f"Error generating navigation structure: {e}", exc_info=True)
            return APIResponse.error(
                message='Error al generar estructura de navegación',
                details=str(e),
                status_code=500
            )


@nav_ns.route('/quick-access')
class QuickAccess(Resource):
    """Most used endpoints for quick access"""

    @nav_ns.doc(
        'get_quick_access',
        description='Obtiene los endpoints más utilizados para acceso rápido'
    )
    @jwt_required(optional=True)
    def get(self):
        """Get quick access endpoints"""
        try:
            # Predefined popular endpoints
            popular = [
                {
                    'name': 'Dashboard Analytics',
                    'path': '/api/v1/analytics/dashboard/complete',
                    'method': 'GET',
                    'icon': '📊',
                    'description': 'Dashboard completo con 33+ métricas'
                },
                {
                    'name': 'Listado de Animales',
                    'path': '/api/v1/animals/?page=1&limit=25',
                    'method': 'GET',
                    'icon': '🐄',
                    'description': 'Lista paginada de animales'
                },
                {
                    'name': 'Alertas del Sistema',
                    'path': '/api/v1/analytics/alerts',
                    'method': 'GET',
                    'icon': '🚨',
                    'description': 'Alertas de salud, vacunación y productividad'
                },
                {
                    'name': 'Registrar Animal',
                    'path': '/api/v1/animals/',
                    'method': 'POST',
                    'icon': '➕',
                    'description': 'Crear nuevo animal'
                },
                {
                    'name': 'Controles de Salud',
                    'path': '/api/v1/management/controls/',
                    'method': 'GET',
                    'icon': '📋',
                    'description': 'Historial de controles'
                },
                {
                    'name': 'Vacunaciones',
                    'path': '/api/v1/medical/vaccinations/',
                    'method': 'GET',
                    'icon': '💉',
                    'description': 'Registro de vacunaciones'
                },
                {
                    'name': 'Health Check',
                    'path': '/api/v1/health',
                    'method': 'GET',
                    'icon': '❤️',
                    'description': 'Estado del sistema'
                },
                {
                    'name': 'Mis Favoritos',
                    'path': '/api/v1/preferences/favorites',
                    'method': 'GET',
                    'icon': '⭐',
                    'description': 'Endpoints favoritos del usuario'
                }
            ]

            return APIResponse.success(
                data={'endpoints': popular, 'count': len(popular)},
                message='Endpoints de acceso rápido'
            )

        except Exception as e:
            logger.error(f"Error getting quick access: {e}", exc_info=True)
            return APIResponse.error(
                message='Error al obtener acceso rápido',
                details=str(e),
                status_code=500
            )


# ================================================================
# Helper functions
# ================================================================

def extract_description(resource, method):
    """Extract description from resource docstring"""
    try:
        doc = resource.__doc__ or ''
        # Try to get method-specific description
        if hasattr(resource, method.lower()):
            method_func = getattr(resource, method.lower())
            method_doc = method_func.__doc__
            if method_doc:
                return method_doc.strip().split('\n')[0]
        return doc.strip().split('\n')[0] if doc else ''
    except:
        return ''


def has_jwt_required(resource, method):
    """Check if endpoint requires JWT authentication"""
    try:
        if hasattr(resource, method.lower()):
            method_func = getattr(resource, method.lower())
            # Check for @jwt_required decorator
            if hasattr(method_func, '__wrapped__'):
                return True
            # Simple heuristic: check function name or decorators
            func_code = method_func.__code__
            if 'jwt_required' in str(func_code.co_names):
                return True
        return False
    except:
        return False
