from flask_restx import Resource, Namespace, fields
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime
from app.models.animalFields import AnimalFields
from app.models.animals import Animals
from app.models.fields import Fields
from app import db
from app.utils.namespace_helpers import create_optimized_namespace, _cache_clear
from app.utils.response_handler import APIResponse

animal_fields_ns = create_optimized_namespace(
    'animal-fields',
    '🌳 Gestión de ubicación de animales en potreros',
    AnimalFields,
    path='/animal-fields',
    rbac_entity='animal-fields'
)

@animal_fields_ns.route('/transfer')
class AnimalFieldTransferResource(Resource):
    """Acciones masivas de traslado de animales."""
    
    @animal_fields_ns.doc('bulk_transfer_animals', description='Trasladar múltiples animales a un nuevo potrero')
    @jwt_required()
    def post(self):
        try:
            data = flask.request.get_json() or {}
            animal_ids = data.get('animal_ids')
            field_id = data.get('field_id')
            date_val = data.get('date') or datetime.now().strftime('%Y-%m-%d')
            notes = data.get('notes')

            if not animal_ids or not isinstance(animal_ids, list):
                return APIResponse.validation_error({'animal_ids': 'Se requiere lista de IDs de animales'})
            if not field_id:
                return APIResponse.validation_error({'field_id': 'Se requiere ID del potrero de destino'})

            results = AnimalFields.batch_transfer(animal_ids, field_id, date_val, notes)
            
            db.session.commit()
            
            # Limpiar cachés relacionados
            _cache_clear('AnimalFields')
            _cache_clear('Animals')
            
            return APIResponse.success(
                data=[r.to_namespace_dict() for r in results],
                message=f'{len(results)} animales trasladados exitosamente'
            )
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(f'Error en traslado masivo: {str(e)}')
