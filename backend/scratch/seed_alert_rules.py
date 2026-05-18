from app import create_app
from app.extensions import db
from app.models.alerts import AnimalAlertConfig, AlertType, AlertPriority
from app.models.finca import Finca

app = create_app()
with app.app_context():
    print("--- Sembrando Reglas de Alertas Sugeridas ---")
    
    # Obtener la primera finca disponible para asignar las reglas
    finca = Finca.query.first()
    finca_id = finca.id if finca else None
    
    rules = [
        {
            "alert_type": AlertType.HEALTH,
            "dimension": "vacunación",
            "condition_value": "pendiente > 5 días",
            "message": "Vacunación retrasada detectada en el hato.",
            "priority": AlertPriority.HIGH,
            "is_default": True
        },
        {
            "alert_type": AlertType.REPRODUCTION,
            "dimension": "parto",
            "condition_value": "proximidad < 48h",
            "message": "Alerta de parto inminente detectada por comportamiento.",
            "priority": AlertPriority.CRITICAL,
            "is_default": True
        },
        {
            "alert_type": AlertType.GROWTH,
            "dimension": "peso",
            "condition_value": "ganancia < 500g/día",
            "message": "Ganancia de peso por debajo del promedio esperado.",
            "priority": AlertPriority.MEDIUM,
            "is_default": True
        },
        {
            "alert_type": AlertType.PRODUCTION,
            "dimension": "leche",
            "condition_value": "caída > 15%",
            "message": "Disminución significativa en la producción de leche.",
            "priority": AlertPriority.HIGH,
            "is_default": True
        }
    ]
    
    for r in rules:
        exists = AnimalAlertConfig.query.filter_by(
            alert_type=r["alert_type"], 
            dimension=r["dimension"],
            finca_id=finca_id
        ).first()
        
        if not exists:
            new_rule = AnimalAlertConfig(
                alert_type=r["alert_type"],
                dimension=r["dimension"],
                condition_value=r["condition_value"],
                message=r["message"],
                priority=r["priority"],
                is_default=r["is_default"],
                finca_id=finca_id
            )
            db.session.add(new_rule)
            print(f"Suscrita regla: {r['dimension']}")
        else:
            print(f"Regla ya existe: {r['dimension']}")
            
    db.session.commit()
    print("--- Sembrado completado ---")
