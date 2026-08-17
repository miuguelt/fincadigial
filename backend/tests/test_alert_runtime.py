from flask import Flask

from app.models.alerts import AlertPriority
from app.models.farm_entity_alerts import FarmEntityAlert, FarmEntityAlertConfig
from app.services.alert_engine import AlertEngine


def test_farm_entity_alert_models_cover_existing_tables():
    assert FarmEntityAlertConfig.__tablename__ == "farm_entity_alert_configs"
    assert FarmEntityAlert.__tablename__ == "farm_entity_alerts"
    assert {"entity_type", "dimension", "condition_value", "finca_id"} <= {
        column.name for column in FarmEntityAlertConfig.__table__.columns
    }
    assert {"entity_type", "alert_type", "message", "finca_id"} <= {
        column.name for column in FarmEntityAlert.__table__.columns
    }


def test_alert_engine_publishes_sse_payload_through_event_bus():
    app = Flask(__name__)

    class EventBus:
        def __init__(self):
            self.payloads = []

        def publish_payload(self, payload):
            self.payloads.append(payload)

    bus = EventBus()
    app.extensions["event_bus"] = bus
    AlertEngine._sse_batch = None

    with app.app_context():
        AlertEngine._queue_sse(1, AlertPriority.HIGH)

    assert bus.payloads == [
        {
            "endpoint": "alertas",
            "action": "alert_created",
            "type": "alerta_alta",
            "message": "Nueva alerta disponible",
            "finca_id": 1,
            "timestamp": bus.payloads[0]["timestamp"],
        }
    ]
