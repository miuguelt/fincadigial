from flask_restx import Namespace, Resource, fields
import flask
import logging
from flask_jwt_extended import jwt_required
from app.models.alerts import AnimalAlertConfig, AnimalAlert, AlertType
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
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
        page = flask.request.args.get('page', default=1, type=int) or 1
        limit = flask.request.args.get('limit', default=50, type=int) or 50

        query = AnimalAlertConfig.query
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        return APIResponse.paginated_success(
            data=[c.to_namespace_dict() for c in pagination.items],
            page=page,
            limit=int(limit),
            total_items=pagination.total,
            message="Configuraciones de alertas obtenidas"
        )

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
        """Listar alertas disparadas (filtradas por finca del usuario)"""
        finca_id = get_current_finca_id()
        animal_id = flask.request.args.get('animal_id')
        is_read = flask.request.args.get('is_read')
        page = flask.request.args.get('page', default=1, type=int) or 1
        limit = flask.request.args.get('limit', default=50, type=int) or 50

        query = AnimalAlert.query
        if finca_id:
            query = query.filter_by(finca_id=finca_id)
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        if is_read is not None:
            query = query.filter_by(is_read=is_read.lower() == 'true')

        pagination = query.order_by(AnimalAlert.triggered_at.desc()).paginate(page=page, per_page=int(limit), error_out=False)
        alerts_data = [a.to_namespace_dict() for a in pagination.items]
        total_items = pagination.total

        # Inyectar alertas virtuales de usuarios pendientes de aprobación en la página 1 si no se buscan solo leídas
        if page == 1 and (is_read is None or is_read.lower() == 'false'):
            try:
                from app.utils.tenant_context import get_current_user_role
                user_role = get_current_user_role()
                
                # Solo para roles con privilegios de aprobación (Admin, Propietario, Instructor)
                if user_role in ['Administrador', 'Propietario', 'Instructor']:
                    from app.models.user import User, ApprovalStatus
                    user_query = User.query.filter(User.approval_status == ApprovalStatus.Pending)
                    
                    # Restringir por finca si no es el administrador global
                    if user_role != 'Administrador' and finca_id:
                        user_query = user_query.filter(User.finca_id == finca_id)
                        
                    pending_users = user_query.all()
                    
                    virtual_alerts = []
                    for u in pending_users:
                        role_str = u.role.value if hasattr(u.role, 'value') else str(u.role)
                        virtual_alerts.append({
                            'id': u.id + 1000000,
                            'animal_id': None,
                            'field_id': None,
                            'config_id': None,
                            'alert_type': 'Personalizada',
                            'message': f"Usuario pendiente de aprobación: {u.fullname} ({role_str})",
                            'recommendation': "Edita el perfil del usuario para cambiar su estado a Aprobado.",
                            'priority': 'Alta',
                            'is_read': False,
                            'triggered_at': u.created_at.isoformat() if u.created_at else datetime.now().isoformat(),
                            'finca_id': u.finca_id,
                            'created_at': u.created_at.isoformat() if u.created_at else datetime.now().isoformat()
                        })
                    
                    # Unir al principio de los resultados y actualizar el total
                    alerts_data = virtual_alerts + alerts_data
                    total_items += len(virtual_alerts)
            except Exception as e:
                # Loggear y continuar con las alertas normales para evitar romper el endpoint
                import logging
                logging.getLogger(__name__).warning(f"Error inyectando alertas virtuales de usuarios: {e}")

        return APIResponse.paginated_success(
            data=alerts_data,
            page=page,
            limit=int(limit),
            total_items=total_items,
            message="Alertas obtenidas"
        )

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
        if id >= 1000000:
            # Es una alerta de usuario virtual. Simular el éxito.
            return APIResponse.success(None, "Alerta de usuario virtual marcada como leída")
            
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
