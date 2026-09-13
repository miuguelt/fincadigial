"""Authenticated market endpoints; no generic CRUD or unscoped serialization."""
from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError

from app import db
from .access import context, conversation_for
from .offers import create_offer, find_offer, list_offers, serialize_offer, update_offer
from .conversations import add_event, list_conversations, start_conversation
from .conversation_view import serialize_conversation
from .moderation import can_moderate, list_reports, report_offer, resolve_report
from .validation import MarketError

market_offers_ns = Namespace("market-offers", description="Publicaciones y acuerdos campesinos")


def payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise MarketError("Envía los datos del formulario como un objeto válido.")
    return data


def _problem(error):
    db.session.rollback()
    response = jsonify(type="about:blank", title="No se pudo completar la solicitud",
                       status=error.status, detail=error.detail, instance=request.path,
                       errors={error.field: error.detail} if error.field else {})
    response.status_code = error.status
    response.content_type = "application/problem+json"
    response.headers["Cache-Control"] = "no-store, private"
    return response


def market_endpoint(fn):
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        try:
            user, finca_id = context()
            data, status = fn(*args, user=user, finca_id=finca_id, **kwargs)
            response = jsonify(success=True, data=data)
            response.status_code = status
            response.headers["Cache-Control"] = "no-store, private"
            return response
        except MarketError as error:
            return _problem(error)
        except (IntegrityError, StaleDataError):
            return _problem(MarketError("Esta acción cambió o ya fue enviada. Actualiza y vuelve a intentar.", 409))
        except Exception:
            current_app.logger.exception("No se pudo procesar una operación del mercado")
            return _problem(MarketError("No pudimos guardar o consultar los datos. Intenta de nuevo.", 500))
    return wrapped


@market_offers_ns.route("")
class MarketCollection(Resource):
    @market_endpoint
    def get(self, user, finca_id):
        result = list_offers(user, finca_id, request.args)
        result["can_moderate"] = can_moderate(user)
        return result, 200

    @market_endpoint
    def post(self, user, finca_id):
        return create_offer(user, finca_id, payload(), request.headers.get("Idempotency-Key")), 201


@market_offers_ns.route("/<uuid:offer_id>")
class MarketPublication(Resource):
    @market_endpoint
    def get(self, offer_id, user, finca_id):
        return serialize_offer(find_offer(offer_id, user, finca_id), user.id), 200

    @market_endpoint
    def patch(self, offer_id, user, finca_id):
        return update_offer(offer_id, user, finca_id, payload()), 200


@market_offers_ns.route("/<uuid:offer_id>/conversations")
class MarketContact(Resource):
    @market_endpoint
    def post(self, offer_id, user, finca_id):
        return start_conversation(offer_id, user, finca_id, payload(), request.headers.get("Idempotency-Key")), 201


@market_offers_ns.route("/conversations")
class MarketInbox(Resource):
    @market_endpoint
    def get(self, user, finca_id):
        return list_conversations(user.id, request.args.get("page", 1, type=int) or 1), 200


@market_offers_ns.route("/conversations/<uuid:conversation_id>")
class MarketHistory(Resource):
    @market_endpoint
    def get(self, conversation_id, user, finca_id):
        return serialize_conversation(conversation_for(conversation_id, user.id), user.id,
                                      True, request.args.get("before")), 200


@market_offers_ns.route("/conversations/<uuid:conversation_id>/events")
class MarketConversationEvents(Resource):
    @market_endpoint
    def post(self, conversation_id, user, finca_id):
        return add_event(conversation_id, user, payload(), request.headers.get("Idempotency-Key")), 200


@market_offers_ns.route("/<uuid:offer_id>/report")
class MarketReportSubmission(Resource):
    @market_endpoint
    def post(self, offer_id, user, finca_id):
        return report_offer(offer_id, user, finca_id, payload()), 201


@market_offers_ns.route("/reports")
class MarketReports(Resource):
    @market_endpoint
    def get(self, user, finca_id):
        return list_reports(user), 200


@market_offers_ns.route("/reports/<uuid:report_id>")
class MarketReportResolution(Resource):
    @market_endpoint
    def patch(self, report_id, user, finca_id):
        return resolve_report(report_id, user, payload()), 200
