from datetime import date, timedelta
from typing import List, Dict, Any
from app.models.animals import Animals, Sex
from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
from app.models.treatments import Treatments
from app.services.push_notification_service import PushNotificationService
from app import db

class FarmingIntelligenceService:
    @staticmethod
    def get_animal_kpis(animal: Animals) -> Dict[str, Any]:
        """Calcula los KPIs clave para un animal específico."""
        kpis = {
            "open_days": 0,
            "calving_interval": 0,
            "days_to_birth": None,
            "days_in_milk": 0,
            "is_withdrawing": False,
            "withdrawal_remaining": 0,
            "status_color": "green" # default
        }

        # 1. Días Abiertos (DA): Hoy - Último Parto (si no está preñada)
        if animal.sex == Sex.Hembra:
            last_parto = ReproductiveEvent.query.filter_by(
                animal_id=animal.id, 
                event_type=EventType.Parto
            ).order_by(ReproductiveEvent.event_date.desc()).first()
            
            if last_parto:
                # Si está preñada, los DA se "congelan" o se cuentan hasta la concepción
                last_service = ReproductiveEvent.query.filter_by(
                    animal_id=animal.id,
                    event_type=EventType.Inseminacion
                ).filter(ReproductiveEvent.event_date > last_parto.event_date).order_by(ReproductiveEvent.event_date.desc()).first()
                
                # Verificar si el servicio fue exitoso (diagnóstico positivo posterior)
                is_conceived = False
                if last_service:
                    diag = ReproductiveEvent.query.filter_by(
                        animal_id=animal.id,
                        event_type=EventType.Diagnostico
                    ).filter(ReproductiveEvent.event_date > last_service.event_date).first()
                    if diag and diag.diagnosis_result == DiagnosisResult.Positivo:
                        is_conceived = True
                
                if is_conceived and last_service:
                    kpis["open_days"] = (last_service.event_date - last_parto.event_date).days
                else:
                    kpis["open_days"] = (date.today() - last_parto.event_date).days

                # Semáforo de DA
                if not is_conceived and kpis["open_days"] > 120:
                    kpis["status_color"] = "red"
                elif not is_conceived and kpis["open_days"] > 90:
                    kpis["status_color"] = "yellow"

                # 2. Intervalo Entre Partos (IEP)
                previous_partos = ReproductiveEvent.query.filter_by(
                    animal_id=animal.id, 
                    event_type=EventType.Parto
                ).order_by(ReproductiveEvent.event_date.desc()).limit(2).all()
                
                if len(previous_partos) >= 2:
                    kpis["calving_interval"] = (previous_partos[0].event_date - previous_partos[1].event_date).days

                # 3. Días en Leche (DEL)
                if animal.is_lactating:
                    kpis["days_in_milk"] = (date.today() - last_parto.event_date).days

        # 4. Tiempos de Retiro
        active_treatment = Treatments.query.filter_by(animal_id=animal.id).filter(
            Treatments.withdrawal_end_date >= date.today()
        ).first()
        
        if active_treatment:
            kpis["is_withdrawing"] = True
            kpis["withdrawal_remaining"] = (active_treatment.withdrawal_end_date - date.today()).days
            kpis["status_color"] = "red" # Bloqueo por seguridad alimentaria

        return kpis

    @staticmethod
    def get_farm_at_a_glance(finca_id: int) -> Dict[str, Any]:
        """Resumen global para el dashboard campesino."""
        animals = Animals.query.filter_by(finca_id=finca_id, is_deleted=False).all()
        
        alerts = []
        stats = {
            "total_animals": len(animals),
            "critical_cases": 0,
            "warning_cases": 0,
            "withdrawing_animals": 0,
            "lactating_count": 0,
            "pregnant_count": 0
        }

        for animal in animals:
            kpis = FarmingIntelligenceService.get_animal_kpis(animal)
            
            if kpis["status_color"] == "red":
                stats["critical_cases"] += 1
                if kpis["is_withdrawing"]:
                    alerts.append({
                        "animal": animal.record,
                        "reason": "Tiempo de Retiro Activo",
                        "detail": f"Restan {kpis['withdrawal_remaining']} días",
                        "type": "danger"
                    })
                elif kpis["open_days"] > 120:
                    alerts.append({
                        "animal": animal.record,
                        "reason": "Días Abiertos Críticos",
                        "detail": f"{kpis['open_days']} días sin preñez",
                        "type": "danger"
                    })
            
            if kpis["status_color"] == "yellow":
                stats["warning_cases"] += 1
                
            if animal.is_lactating: stats["lactating_count"] += 1
            if animal.is_pregnant: stats["pregnant_count"] += 1
            if kpis["is_withdrawing"]: stats["withdrawing_animals"] += 1

        return {
            "stats": stats,
            "priority_alerts": alerts[:10] # Top 10 alertas
        }

    @staticmethod
    def notify_critical_alerts(finca_id: int):
        """Envía notificaciones push para las alertas críticas de una finca."""
        data = FarmingIntelligenceService.get_farm_at_a_glance(finca_id)
        critical_alerts = [a for a in data["priority_alerts"] if a["type"] == "danger"]
        
        if not critical_alerts:
            return

        # Resumen de notificaciones
        total_critical = len(critical_alerts)
        body = f"Tienes {total_critical} alertas críticas en tu finca que requieren atención inmediata."
        
        # Enviar notificación general a la finca
        PushNotificationService.send_to_finca(
            finca_id=finca_id,
            title="⚠️ Alerta Ganadera Crítica",
            body=body,
            tag="critical-intelligence",
            data={"url": "/dashboard/peasant", "type": "critical_summary"}
        )
        
        # Opcional: Notificar animal por animal si son pocos (<3) para no saturar
        if total_critical <= 3:
            for alert in critical_alerts:
                PushNotificationService.send_to_finca(
                    finca_id=finca_id,
                    title=f"Alerta: {alert['animal']}",
                    body=f"{alert['reason']}: {alert['detail']}",
                    tag=f"animal-alert-{alert['animal']}",
                    data={"url": f"/animals/{alert['animal']}", "type": "animal_alert"}
                )
