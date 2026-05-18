from datetime import datetime, timedelta, date
from typing import List, Optional, Dict
from app.models.control import Control
from app.models.animals import Animals

class PredictionService:
    """
    Servicio de predicción basado en datos históricos y algoritmos estadísticos/IA.
    Versión Pure Python (sin numpy para máxima portabilidad).
    """
    
    @staticmethod
    def _linear_regression(x, y):
        n = len(x)
        if n < 2: return 0, 0, 0
        
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xx = sum(xi*xi for xi in x)
        sum_xy = sum(xi*yi for xi, yi in zip(x, y))
        
        denom = (n * sum_xx - sum_x**2)
        if denom == 0: return 0, sum_y/n, 0
        
        m = (n * sum_xy - sum_x * sum_y) / denom
        b = (sum_y - m * sum_x) / n
        
        # Calcular R^2
        y_mean = sum_y / n
        ss_tot = sum((yi - y_mean)**2 for yi in y)
        if ss_tot == 0: return m, b, 1.0
        ss_res = sum((yi - (m*xi + b))**2 for xi, yi in zip(x, y))
        r_squared = 1 - (ss_res / ss_tot)
        
        return m, b, r_squared

    @staticmethod
    def predict_animal_weight(animal_id: int, target_date: date) -> Dict:
        """
        Predice el peso de un animal para una fecha futura basándose en su ADG histórico.
        """
        animal = Animals.get_by_id(animal_id)
        if not animal:
            return {"error": "Animal no encontrado"}
            
        controls = Control.query.filter_by(animal_id=animal_id).order_by(Control.checkup_date.asc()).all()
        # Filtrar solo controles con peso
        valid_controls = [c for c in controls if c.weight]
        
        if len(valid_controls) < 2:
            return {
                "animal_id": animal_id,
                "prediction": None,
                "confidence": 0,
                "reason": "Datos insuficientes (se requieren al menos 2 pesajes)"
            }
            
        weights = [c.weight for c in valid_controls]
        dates = [c.checkup_date for c in valid_controls]
        
        # X = días desde el primer pesaje
        x = [(d - dates[0]).days for d in dates]
        y = weights
        
        m, b, r2 = PredictionService._linear_regression(x, y)
        
        # Calcular días hasta el objetivo (desde el primer pesaje)
        days_to_target = (target_date - dates[0]).days
        predicted_weight = m * days_to_target + b
        
        return {
            "animal_id": animal_id,
            "animal_record": animal.record,
            "current_weight": animal.weight,
            "predicted_weight": round(float(predicted_weight), 2),
            "target_date": target_date.isoformat(),
            "avg_daily_gain": round(float(m), 3),
            "confidence_score": round(float(max(0, r2) * 100), 1),
            "days_ahead": (target_date - date.today()).days
        }

    @staticmethod
    def estimate_market_readiness(animal_id: int, target_weight: int = 450) -> Dict:
        """
        Estima cuándo un animal alcanzará el peso de sacrificio/venta.
        """
        animal = Animals.get_by_id(animal_id)
        if not animal: return {"error": "Animal no encontrado"}
        
        # Proyectar a 1 año para obtener métricas base
        future_date = date.today() + timedelta(days=365)
        pred = PredictionService.predict_animal_weight(animal_id, future_date)
        
        if pred.get("predicted_weight") is None:
            return pred
            
        adg = pred["avg_daily_gain"]
        if adg <= 0.01: # Ganancia insignificante o negativa
            return {
                "animal_id": animal_id,
                "ready": False,
                "estimated_date": None,
                "reason": "Ganancia de peso insuficiente para proyección positiva"
            }
            
        weight_needed = target_weight - animal.weight
        if weight_needed <= 0:
            return {
                "animal_id": animal_id,
                "ready": True,
                "estimated_date": date.today().isoformat(),
                "days_to_go": 0,
                "message": "El animal ya alcanzó o superó el peso objetivo"
            }

        days_needed = weight_needed / adg
        estimated_date = date.today() + timedelta(days=int(days_needed))
        
        return {
            "animal_id": animal_id,
            "target_weight": target_weight,
            "estimated_date": estimated_date.isoformat(),
            "days_to_go": int(days_needed),
            "adg_used": adg,
            "confidence": pred["confidence_score"]
        }

    @staticmethod
    def monitor_growth_anomalies(finca_id: int) -> Dict:
        """
        Monitorea todos los animales de una finca para detectar anomalías:
        1. Animales estancados (ganancia de peso negativa o nula).
        2. Animales sin pesaje reciente (> 45 días).
        3. Animales por alcanzar peso de venta (80% del objetivo).
        """
        from app.models.animals import Animals, AnimalStatus
        from app.services.push_notification_service import PushNotificationService
        
        animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
        anomalies = []
        notifications_sent = 0
        
        for animal in animals:
            # 1. Verificar pesaje reciente
            last_control = Control.query.filter_by(animal_id=animal.id).filter(Control.weight != None).order_by(Control.checkup_date.desc()).first()
            
            if not last_control:
                continue

            days_since_weight = (date.today() - last_control.checkup_date).days
            
            # Anomalía: Falta de seguimiento
            if days_since_weight > 45:
                anomalies.append({
                    "animal_id": animal.id,
                    "record": animal.record,
                    "type": "LACK_OF_DATA",
                    "severity": "medium",
                    "message": f"Sin pesaje hace {days_since_weight} días."
                })
            
            # 2. Análisis de Predicción
            pred = PredictionService.predict_animal_weight(animal.id, date.today() + timedelta(days=30))
            
            if pred.get("avg_daily_gain") is not None:
                adg = pred["avg_daily_gain"]
                
                # Anomalía: Crecimiento estancado
                if adg <= 0.05: # Menos de 50g al día es crítico para ganado de engorde
                    anomalies.append({
                        "animal_id": animal.id,
                        "record": animal.record,
                        "type": "STAGNANT_GROWTH",
                        "severity": "high",
                        "message": f"Crecimiento estancado detected: {adg} kg/día.",
                        "adg": adg
                    })
                    
                # Notificación: Próximo a Venta
                target_weight = 450
                if animal.weight and animal.weight >= (target_weight * 0.9):
                    anomalies.append({
                        "animal_id": animal.id,
                        "record": animal.record,
                        "type": "MARKET_READY",
                        "severity": "low",
                        "message": f"Animal cerca del peso objetivo ({animal.weight} kg)."
                    })

        # Enviar resumen si hay anomalías críticas
        high_severity = [a for a in anomalies if a["severity"] == "high"]
        if high_severity and len(high_severity) > 0:
            PushNotificationService.send_to_finca(
                finca_id=finca_id,
                title="⚠️ Alerta de Cortex IA: Crecimiento",
                body=f"Se detectaron {len(high_severity)} animales con crecimiento estancado. Revise el panel de salud.",
                data={"type": "ai_alert", "category": "growth", "url": "/analytics/health"}
            )
            notifications_sent = 1

        return {
            "finca_id": finca_id,
            "total_monitored": len(animals),
            "anomalies_found": len(anomalies),
            "anomalies": anomalies,
            "notifications_sent": notifications_sent
        }
