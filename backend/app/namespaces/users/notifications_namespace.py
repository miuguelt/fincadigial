"""Feed de notificaciones del usuario autenticado."""

import logging

import flask
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields

from app.services.notification_feed_service import NotificationFeedService
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

user_notifications_ns = Namespace(
    'user-notifications', description='🔔 Notificaciones del usuario autenticado'
)
notifications_ns = Namespace(
    'notifications', description='🔔 Acciones sobre notificaciones'
)

action_model = notifications_ns.model('NotificationAction', {
    'action': fields.String(
        required=True, enum=['approve', 'reject', 'read'],
        description='Acción a aplicar sobre la notificación'
    ),
})


@user_notifications_ns.route('/me/notifications')
class MyNotifications(Resource):
    @user_notifications_ns.doc('list_my_notifications', security=['Bearer'])
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        status = flask.request.args.get('status')
        items = NotificationFeedService.list_for_user(user_id, status=status)
        return APIResponse.success(data=items)


@notifications_ns.route('/<int:notification_id>')
class NotificationAction(Resource):
    @notifications_ns.doc('act_on_notification', security=['Bearer'])
    @notifications_ns.expect(action_model)
    @jwt_required()
    def patch(self, notification_id):
        user_id = int(get_jwt_identity())
        data = flask.request.get_json() or {}
        action = data.get('action')
        if not action:
            return APIResponse.validation_error({'action': 'Requerido'})

        item = NotificationFeedService.apply_action(notification_id, user_id, action)
        return APIResponse.success(data=item, message="Notificación actualizada")
