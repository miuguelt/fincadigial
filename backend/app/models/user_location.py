from app import db
from datetime import datetime


class UserLocation(db.Model):
    """
    Rastreo de ubicación para usuarios y nodos de la red Mesh.
    Soporta 'Breadcrumbs' offline que se sincronizan vía Mesh.
    """

    __tablename__ = "user_locations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float)  # En metros

    # Método de obtención: 'GPS', 'Mesh_Proximity', 'LoRa_Node'
    detection_method = db.Column(db.String(50), default="GPS")

    # ID del nodo o usuario que reportó esta ubicación (en caso de salto Mesh)
    reported_by_node_id = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "finca_id": self.finca_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "accuracy": self.accuracy,
            "detection_method": self.detection_method,
            "reported_by_node_id": self.reported_by_node_id,
            "created_at": self.created_at.isoformat(),
        }
