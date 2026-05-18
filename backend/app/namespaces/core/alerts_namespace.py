from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.alerts import AnimalAlertConfig, AnimalAlert, AlertType, AlertPriority
from app.models.animals import Animals
from app.utils.response_handler import APIResponse
from datetime import datetime

alerts_ns = Namespace('alerts', description='Gestión de alertas de animales')

# Modelos de entrada para flask.Flask-RESTX
alert_config_model = alerts_ns.model('AlertConfig', {
    'animal_id': fields.Integer(required=True, description='ID del animal'),
    'alert_type': fields.String(required=True, description='Tipo de alerta', enum=[e.value for e in AlertType]),
    'dimension': fields.String(required=True, description='Dimensión (Peso, Tiempo, Estado)'),
    'condition_value': fields.String(required=True, description='Valor de la condición (ej: < 150, 90 days)'),
    'message': fields.String(required=True, description='Mensaje de la alerta'),
    'is_active': fields.Boolean(description='Estado de la alerta', default=True)
})

alert_model = alerts_ns.model('Alert', {
    'id': fields.Integer(description='ID de la alerta'),
    'animal_id': fields.Integer(description='ID del animal (opcional)'),
    'field_id': fields.Integer(description='ID del potrero (opcional)'),
    'alert_type': fields.String(description='Tipo de alerta'),
    'message': fields.String(description='Mensaje'),
    'priority': fields.String(description='Prioridad'),
    'is_read': fields.Boolean(description='¿Leída?'),
    'triggered_at': fields.DateTime(description='Fecha de disparo')
})

@alerts_ns.route('/configs')
class AlertConfigList(Resource):
    @alerts_ns.doc('list_alert_configs')
    @jwt_required()
    def get(self):
        """Listar configuraciones de alertas"""
        animal_id = flask.request.args.get('animal_id')
        query = AnimalAlertConfig.query
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        configs = query.all()
        return APIResponse.success([c.to_namespace_dict() for c in configs])

    @alerts_ns.doc('create_alert_config')
    @alerts_ns.expect(alert_config_model)
    @jwt_required()
    def post(self):
        """Crear una nueva configuración de alerta"""
        data = flask.request.json
        try:
            config = AnimalAlertConfig.create(**data)
            return APIResponse.success(config.to_namespace_dict(), "Configuración creada exitosamente", status_code=201)
        except Exception as e:
            return APIResponse.error(str(e), status_code=400)

@alerts_ns.route('/configs/<int:id>')
class AlertConfigResource(Resource):
    @alerts_ns.doc('get_alert_config')
    @jwt_required()
    def get(self, id):
        """Obtener una configuración de alerta"""
        config = AnimalAlertConfig.get_by_id(id)
        if not config:
            return APIResponse.error("Configuración no encontrada", status_code=404)
        return APIResponse.success(config.to_namespace_dict())

    @alerts_ns.doc('update_alert_config')
    @alerts_ns.expect(alert_config_model)
    @jwt_required()
    def put(self, id):
        """Actualizar una configuración de alerta"""
        config = AnimalAlertConfig.get_by_id(id)
        if not config:
            return APIResponse.error("Configuración no encontrada", status_code=404)
        data = flask.request.json
        config.update(**data)
        return APIResponse.success(config.to_namespace_dict(), "Configuración actualizada")

    @alerts_ns.doc('delete_alert_config')
    @jwt_required()
    def delete(self, id):
        """Eliminar una configuración de alerta"""
        config = AnimalAlertConfig.get_by_id(id)
        if not config:
            return APIResponse.error("Configuración no encontrada", status_code=404)
        config.delete()
        return APIResponse.success(None, "Configuración eliminada")

@alerts_ns.route('/configs/bulk')
class AlertConfigBulk(Resource):
    @alerts_ns.doc('bulk_create_alert_configs')
    @jwt_required()
    def post(self):
        """Crear configuraciones de alertas de forma masiva"""
        data = flask.request.json
        animal_ids = data.get('animal_ids', [])
        alert_data = data.get('alert_data', {})
        
        if not animal_ids:
            # Si no hay IDs, buscar por filtros (ej: potrero)
            field_id = data.get('field_id')
            if field_id:
                from app.models.animalFields import AnimalFields
                animal_ids = [af.animal_id for af in AnimalFields.query.filter_by(field_id=field_id, is_active=True).all()]

        if not animal_ids:
            return APIResponse.error("No se proporcionaron animales para configurar", status_code=400)

        created_count = 0
        for aid in animal_ids:
            try:
                # Evitar duplicados de la misma regla para el mismo animal
                exists = AnimalAlertConfig.query.filter_by(
                    animal_id=aid,
                    dimension=alert_data.get('dimension'),
                    condition_value=alert_data.get('condition_value')
                ).first()
                
                if not exists:
                    AnimalAlertConfig.create(
                        animal_id=aid,
                        alert_type=alert_data.get('alert_type', 'Personalizada'),
                        dimension=alert_data.get('dimension'),
                        condition_value=alert_data.get('condition_value'),
                        message=alert_data.get('message'),
                        is_active=True
                    )
                    created_count += 1
            except Exception as e:
                logging.getLogger(__name__).warning(f"Error en bulk config para animal {aid}: {e}")

        return APIResponse.success({"count": created_count}, f"Configuración aplicada a {created_count} animales")

@alerts_ns.route('/')
class AlertList(Resource):
    @alerts_ns.doc('list_alerts')
    @jwt_required()
    def get(self):
        """Listar alertas disparadas"""
        animal_id = flask.request.args.get('animal_id')
        is_read = flask.request.args.get('is_read')
        
        query = AnimalAlert.query
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        if is_read is not None:
            query = query.filter_by(is_read=is_read.lower() == 'true')
            
        alerts = query.order_by(AnimalAlert.triggered_at.desc()).all()
        return APIResponse.success([a.to_namespace_dict() for a in alerts])

    @alerts_ns.doc('create_manual_alert')
    @alerts_ns.expect(alert_model)
    @jwt_required()
    def post(self):
        """Crear una alerta manual (Recordatorio puntual)"""
        data = flask.request.json
        try:
            # Forzar tipo personalizada para alertas manuales
            data['alert_type'] = AlertType.CUSTOM
            data['triggered_at'] = datetime.now()
            alert = AnimalAlert.create(**data)
            return APIResponse.success(alert.to_namespace_dict(), "Alerta creada", status_code=201)
        except Exception as e:
            return APIResponse.error(str(e), status_code=400)

@alerts_ns.route('/<int:id>/read')
class AlertRead(Resource):
    @alerts_ns.doc('mark_alert_as_read')
    @jwt_required()
    def post(self, id):
        """Marcar alerta como leída"""
        alert = AnimalAlert.get_by_id(id)
        if not alert:
            return APIResponse.error("Alerta no encontrada", status_code=404)
        alert.update(is_read=True)
        return APIResponse.success(alert.to_namespace_dict(), "Alerta marcada como leída")

@alerts_ns.route('/read-all')
class AlertsReadAll(Resource):
    @alerts_ns.doc('mark_all_alerts_as_read')
    @jwt_required()
    def post(self):
        """Marcar todas las alertas como leídas"""
        animal_id = flask.request.args.get('animal_id')
        query = AnimalAlert.query.filter_by(is_read=False)
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        
        alerts = query.all()
        for alert in alerts:
            alert.update(is_read=True)
            
        return APIResponse.success(None, f"{len(alerts)} alertas marcadas como leídas")

@alerts_ns.route('/evaluate')
class AlertEvaluate(Resource):
    @alerts_ns.doc('evaluate_alerts')
    @jwt_required()
    def post(self):
        """Evaluar reglas de alertas manualmente (disparador del motor)"""
        # Aquí se invocaría al motor de reglas
        from app.services.alert_engine import AlertEngine
        results = AlertEngine.evaluate_all()
        return APIResponse.success(results, "Evaluación de alertas completada")
