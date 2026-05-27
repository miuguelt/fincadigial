import flask
from flask_restx import Resource, fields
import sqlalchemy as sa
from app import db
from flask_jwt_extended import jwt_required

# Asumir que animal_model está definido en modelos o utils
from app.models.animals import Animals
from app.utils.response_handler import APIResponse
from app.utils.cache_utils import safe_cached
from app.utils.namespace_helpers import create_optimized_namespace, _cache_clear
from app.utils.tree_builder import build_ancestor_tree, build_descendant_tree

animals_ns = create_optimized_namespace(
    name='animals',
    description='Animals operations',
    model_class=Animals,
    path='/animals'
)

animal_model = animals_ns.model('Animal', {
    'record': fields.String(required=True),
    'sex': fields.String(required=True),
    'birth_date': fields.Date(required=True),
    'weight': fields.Float(required=True),
    'status': fields.String(default='Vivo'),
    'breeds_id': fields.Integer(required=True),
    'entry_date': fields.Date(),
    'purchase_date': fields.Date(),
    'sale_date': fields.Date(),
    'exit_date': fields.Date(),
    'exit_reason': fields.String(),
})

# Note: Standard CRUD, dependencies, and batch checking are now handled by create_optimized_namespace
# custom routes like tree and status are kept below.

@animals_ns.route('/tree/ancestors')
class AnimalAncestorsTree(Resource):
    @jwt_required()
    def get(self):
        try:
            animal_id = flask.request.args.get('animal_id', type=int)
            if not animal_id:
                return APIResponse.error(message='Parámetro animal_id es requerido', status_code=400)

            max_depth = flask.request.args.get('max_depth', default=5, type=int)
            fields_param = flask.request.args.get('fields')
            fields = [f.strip() for f in fields_param.split(',')] if fields_param else None

            tree = build_ancestor_tree(
                root_id=animal_id,
                max_depth=max_depth,
                fields=fields
            )

            return APIResponse.success(data=tree, message='Árbol de ancestros generado exitosamente')
        except Exception as e:
            return APIResponse.error(message=f'Error al generar árbol de ancestros: {str(e)}')

@animals_ns.route('/tree/descendants')
class AnimalDescendantsTree(Resource):
    @jwt_required()
    def get(self):
        try:
            animal_id = flask.request.args.get('animal_id', type=int)
            if not animal_id:
                return APIResponse.error(message='Parámetro animal_id es requerido', status_code=400)

            max_depth = flask.request.args.get('max_depth', default=5, type=int)
            fields_param = flask.request.args.get('fields')
            fields = [f.strip() for f in fields_param.split(',')] if fields_param else None

            tree = build_descendant_tree(
                root_id=animal_id,
                max_depth=max_depth,
                fields=fields
            )

            return APIResponse.success(data=tree, message='Árbol de descendientes generado exitosamente')
        except Exception as e:
            return APIResponse.error(message=f'Error al generar árbol de descendientes: {str(e)}')

from app.utils.tenant_context import apply_tenant_filter

@animals_ns.route('/status')
class AnimalStatus(Resource):
    @jwt_required()
    @safe_cached(timeout=60, key_prefix='animals_status_stats')
    def get(self):
        try:
            # Aplicar aislamiento multi-inquilino (tenant isolation)
            query = db.session.query(Animals.status, sa.func.count(Animals.id))
            query = apply_tenant_filter(query, Animals)

            rows = query.group_by(Animals.status).all()
            total = sum(cnt for _status, cnt in rows)
            activos = 0
            try:
                from app.models.animals import AnimalStatus as AnimalStatusEnum
                for status, cnt in rows:
                    if str(status) == str(AnimalStatusEnum.Vivo) or status == 'Vivo':
                        activos = cnt
                        break
            except Exception:
                for status, cnt in rows:
                    if status == 'Vivo':
                        activos = cnt
                        break
            inactivos = total - activos
            return APIResponse.success(data={'total': total, 'activos': activos, 'inactivos': inactivos})
        except Exception as e:
            return APIResponse.error(message=f'Error al obtener estadísticas: {str(e)}')

@animals_ns.route('/bulk-delete')
class AnimalBulkDelete(Resource):
    @animals_ns.doc('bulk_delete_animals')
    @jwt_required()
    def post(self):
        """Eliminar múltiples animales."""
        try:
            data = flask.request.get_json() or {}
            ids = data.get('ids', [])
            if not ids:
                return APIResponse.validation_error("Se requieren IDs de animales")

            count = Animals.bulk_delete(ids)
            _cache_clear('Animals')

            return APIResponse.success(message=f"{count} animales eliminados correctamente")
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(f"Error al eliminar animales: {str(e)}")

@animals_ns.route('/batch-weight')
class AnimalBatchWeight(Resource):
    @jwt_required()
    def post(self):
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get('animal_ids')
            weight = data.get('weight')
            checkup_date = data.get('checkup_date')
            notes = data.get('notes')

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error({'animal_ids': 'Se requiere lista de IDs'})
            if weight is None:
                return APIResponse.validation_error({'weight': 'Se requiere el peso'})

            from app.utils.tenant_context import get_current_finca_id
            finca_id = get_current_finca_id()

            results = Animals.batch_weight(
                animal_ids=animal_ids,
                weight=weight,
                checkup_date=checkup_date,
                notes=notes,
                finca_id=finca_id
            )

            db.session.commit()
            _cache_clear('Animals')
            _cache_clear('Control')

            return APIResponse.success(
                data=[r.to_namespace_dict() for r in results],
                message=f'Pesaje masivo registrado para {len(results)} animales'
            )
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(message=f'Error en pesaje masivo: {str(e)}')

@animals_ns.route('/batch-vaccinate')
class AnimalBatchVaccinate(Resource):
    @jwt_required()
    def post(self):
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get('animal_ids')
            vaccine_id = data.get('vaccine_id')
            vaccination_date = data.get('vaccination_date')
            dosis = data.get('dosis')
            batch_number = data.get('batch_number')
            next_due_date = data.get('next_due_date')
            notes = data.get('notes')

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error({'animal_ids': 'Se requiere lista de IDs'})
            if not vaccine_id:
                return APIResponse.validation_error({'vaccine_id': 'Se requiere ID de vacuna'})

            from app.utils.tenant_context import get_current_finca_id, get_current_user_id
            finca_id = get_current_finca_id()
            user_id = get_current_user_id()

            results = Animals.batch_vaccinate(
                animal_ids=animal_ids,
                vaccine_id=vaccine_id,
                vaccination_date=vaccination_date,
                dosis=dosis,
                batch_number=batch_number,
                next_due_date=next_due_date,
                notes=notes,
                finca_id=finca_id,
                performed_by=user_id
            )

            db.session.commit()
            _cache_clear('Animals')
            _cache_clear('Vaccinations')

            return APIResponse.success(
                data=[r.to_namespace_dict() for r in results],
                message=f'Vacunación masiva registrada para {len(results)} animales'
            )
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(message=f'Error en vacunación masiva: {str(e)}')
