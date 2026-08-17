from app import db
import enum
from app.models.base_model import BaseModel


class FarmType(enum.Enum):
    Educativa = "Educativa"
    Tradicional = "Tradicional"

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return f"{self.__class__.__name__}.{self.name}"


class Finca(BaseModel):
    __tablename__ = "finca"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum(FarmType), nullable=False)
    nit = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    municipality = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    logo_url = db.Column(db.String(500), nullable=True)
    ica_registration = db.Column(db.String(50), nullable=True)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)

    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields = [
        "id",
        "name",
        "type",
        "nit",
        "department",
        "municipality",
        "address",
        "latitude",
        "longitude",
        "is_active",
        "logo_url",
        "ica_registration",
        "territory_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {"territory": {"fields": ["id", "name", "municipality"]}}
    _required_fields = ["name", "type"]
    _unique_fields = ["name"]
    _enum_fields = {"type": FarmType}
    _searchable_fields = ["name", "department", "municipality"]
    _filterable_fields = ["type", "is_active"]
    _sortable_fields = ["id", "name", "created_at"]

    @classmethod
    def create(cls, commit=True, **kwargs):
        instance = super().create(commit=False, **kwargs)

        # Asignar usuario creador como propietario/administrador de la finca
        import flask

        try:
            if flask.has_request_context():
                from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    try:
                        user_id_int = int(user_id)
                    except Exception:
                        user_id_int = user_id
                    from app.models.user_finca import UserFinca
                    from app.models.finca import FarmType
                    from app.models.user import User

                    role = "Administrador"
                    if instance.type == FarmType.Tradicional:
                        role = "Propietario"

                    UserFinca.assign(
                        user_id=user_id_int,
                        finca_id=instance.id,
                        role=role,
                        is_active=True,
                        is_primary=True,
                        commit=False,
                    )

                    # Actualizar finca_id en el User si no tiene una
                    user = User.query.get(user_id_int)
                    if user and not user.finca_id:
                        user.finca_id = instance.id
                        db.session.add(user)
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                "No se pudo asignar creador a Finca: %s", e
            )

        if commit:
            db.session.commit()
            # Sembrar datos predeterminados (alertas, etc.) para la nueva finca
            try:
                from app.services.system_initializer import initialize_finca_defaults

                initialize_finca_defaults(instance.id)
            except Exception as e:
                import logging

                logging.getLogger(__name__).error(
                    "Error al sembrar configuraciones por defecto para la finca %s: %s",
                    instance.id,
                    e,
                )

            try:
                db.session.refresh(instance)
            except Exception:
                pass
        return instance

    def __repr__(self):
        return f"<Finca {self.id}: {self.name} ({getattr(self.type, 'value', str(self.type)) if self.type else '?'})>"
