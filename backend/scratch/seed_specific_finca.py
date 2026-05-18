from app import create_app
from app.extensions import db
from app.models import Finca, AnimalAlertConfig
from app.models.alerts import AlertType, AlertPriority

app = create_app()
with app.app_context():
    finca_target = "Finca Respaldo 4"
    finca = Finca.query.filter(Finca.name.ilike(f"%{finca_target}%")).first()
    
    if not finca:
        print(f"No se encontró la finca '{finca_target}'. Usando la primera disponible.")
        finca = Finca.query.first()
    
    if finca:
        print(f"Poblando para finca: {finca.name} (ID: {finca.id})")
        finca_id = finca.id
        
        rules = [
            { "type": AlertType.HEALTH, "dim": "vacunación", "val": "pendiente > 5 días", "msg": "Vacunación retrasada detectada en el hato.", "prio": AlertPriority.HIGH },
            { "type": AlertType.REPRODUCTION, "dim": "parto", "val": "proximidad < 48h", "msg": "Alerta de parto inminente detectada por comportamiento.", "prio": AlertPriority.CRITICAL },
            { "type": AlertType.GROWTH, "dim": "peso", "val": "ganancia < 500g/día", "msg": "Ganancia de peso por debajo del promedio esperado.", "prio": AlertPriority.MEDIUM },
            { "type": AlertType.PRODUCTION, "dim": "leche", "val": "caída > 15%", "msg": "Disminución significativa en la producción de leche.", "prio": AlertPriority.HIGH }
        ]
        
        for r in rules:
            exists = AnimalAlertConfig.query.filter_by(alert_type=r["type"], dimension=r["dim"], finca_id=finca_id).first()
            if not exists:
                new_rule = AnimalAlertConfig(
                    alert_type=r["type"], dimension=r["dim"], condition_value=r["val"], 
                    message=r["msg"], priority=r["prio"], is_default=True, finca_id=finca_id
                )
                db.session.add(new_rule)
        
        db.session.commit()
        print("Población específica completada.")
    else:
        print("No se encontraron fincas en la DB.")
