import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app import db
from app.models.control import Control, HealthStatus
from app.models.milk_production import MilkProduction, MilkSession
from app.models.reproduction import ReproductiveEvent, EventType
from app.models.treatments import Treatments
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

corral_ns = Namespace("corral", description="Operaciones unificadas de corral para campesinos")

@corral_ns.route("/session")
class CorralSessionResource(Resource):
    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id() or payload.get("finca_id")
        animal_id = payload.get("animal_id")
        
        if not finca_id or not animal_id:
            return APIResponse.validation_error({"finca_id": "requerido", "animal_id": "requerido"})
        
        try:
            # 1. Crear el Control (el eje central)
            health_status_str = payload.get("health_status", "Bueno")
            health_status = getattr(HealthStatus, health_status_str, HealthStatus.Bueno)
            weight = payload.get("weight")
            checkup_date = date.today()
            
            # Usar constructores SQLAlchemy directos si create() tiene efectos secundarios problemáticos en transacciones,
            # pero dado que el modelo de base_model usa db.session.add(instance), está bien.
            control = Control.create(
                checkup_date=checkup_date,
                health_status=health_status,
                weight=weight,
                animal_id=animal_id,
                finca_id=finca_id,
                commit=False
            )
            db.session.flush() # Para obtener el ID del control
            
            created_entities = {"control_id": control.id}
            
            # 2. Producción de Leche (Opcional)
            milk_liters = payload.get("milk_liters")
            if milk_liters is not None and float(milk_liters) > 0:
                session_str = payload.get("milking_session", "AM")
                milking_session = getattr(MilkSession, session_str, MilkSession.AM)
                milk = MilkProduction.create(
                    animal_id=animal_id,
                    finca_id=finca_id,
                    control_id=control.id,
                    date=checkup_date,
                    liters=float(milk_liters),
                    milking_session=milking_session,
                    commit=False
                )
                created_entities["milk_production"] = True
                
            # 3. Novedad Reproductiva (Opcional)
            repro_event_str = payload.get("reproduction_event")
            if repro_event_str:
                event_type = getattr(EventType, repro_event_str, None)
                if event_type:
                    repro = ReproductiveEvent.create(
                        animal_id=animal_id,
                        finca_id=finca_id,
                        control_id=control.id,
                        event_type=event_type,
                        event_date=checkup_date,
                        actor_id=user_id,
                        commit=False
                    )
                    created_entities["reproduction_event"] = repro_event_str

            # 4. Tratamiento (Opcional)
            treatment_desc = payload.get("treatment_description")
            if treatment_desc:
                treatment = Treatments.create(
                    animal_id=animal_id,
                    finca_id=finca_id,
                    control_id=control.id,
                    treatment_date=checkup_date,
                    description=treatment_desc,
                    frequency=payload.get("treatment_frequency", "Dosis única"),
                    dosis=payload.get("treatment_dosis", "Aplicado"),
                    performed_by=user_id,
                    commit=False
                )
                created_entities["treatment"] = True
                
            db.session.commit()
            return APIResponse.success(created_entities, message="Sesión de corral guardada exitosamente", status_code=201)
            
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(f"Error procesando sesión de corral: {str(e)}", status_code=500)
