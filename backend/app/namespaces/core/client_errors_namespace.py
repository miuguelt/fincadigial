import logging
from flask_restx import Namespace, Resource, fields
from flask import request

client_errors_ns = Namespace(
    "errors", description="Recepción de errores del cliente frontend", path="/errors"
)

logger = logging.getLogger(__name__)

error_event_model = client_errors_ns.model(
    "ClientErrorEvent",
    {
        "message": fields.String(required=True),
        "stack": fields.String(),
        "type": fields.String(required=True),
        "context": fields.Raw(),
        "timestamp": fields.String(),
        "url": fields.String(),
    },
)

batch_model = client_errors_ns.model(
    "ClientErrorBatch",
    {
        "errors": fields.List(fields.Nested(error_event_model), required=True),
    },
)


@client_errors_ns.route("/client")
class ClientErrors(Resource):
    @client_errors_ns.expect(batch_model, validate=False)
    def post(self):
        data = request.get_json(silent=True) or {}
        errors = data.get("errors", [])
        for err in errors:
            logger.error(
                "[CLIENT] %s | type=%s | url=%s | msg=%s",
                err.get("type", "unknown"),
                err.get("type", "unknown"),
                err.get("url", "unknown"),
                err.get("message", "unknown"),
            )
        return {"success": True, "count": len(errors)}, 200
