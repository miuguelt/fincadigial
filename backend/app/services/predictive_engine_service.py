import logging
from datetime import datetime, timezone, timedelta
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.control import Control
from app.models.alerts import AnimalAlert, AlertType, AlertPriority
from app.services.cortex_service import CortexService, PromptRole

logger = logging.getLogger(__name__)

class PredictiveEngineService:
    """
    Motor de análisis predictivo que utiliza IA para detectar riesgos en el hato.
    """

    @staticmethod
    def run_finca_analysis(finca_id):
        """
        Escanea todos los animales de una finca y genera alertas predictivas usando procesamiento por lotes.
        Optimizado para Hito F8 (Alta Concurrencia).
        """
        animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
        if not animals:
            return {"status": "success", "alerts_created": 0, "message": "No hay animales activos para analizar."}

        alerts_created = 0
        batch_size = 5 # Analizar 5 animales por llamada para balancear contexto y costo
        
        for i in range(0, len(animals), batch_size):
            batch = animals[i:i + batch_size]
            batch_data = []
            
            for animal in batch:
                context = animal.to_ai_context()
                # Recent controls for weight trend
                recent_controls = animal.controls.order_by(Control.checkup_date.desc()).limit(3).all()
                weight_history = ", ".join([f"{c.checkup_date}: {c.weight}kg" for c in recent_controls])
                batch_data.append(f"ID: {animal.record}\nDATOS: {context}\nPESOS: {weight_history if weight_history else 'N/A'}")

            full_prompt = f"""Analiza la salud y crecimiento de este lote de {len(batch)} animales.
Detecta anomalías críticas (caídas de peso >10%, estancamiento prolongado, riesgos sanitarios).

LOTE DE ANIMALES:
{chr(10).join(batch_data)}

ESPECIFICACIÓN:
Responde en formato JSON estrictamente:
{{
  "analyses": [
    {{ 
      "id": "RECORD_ID", 
      "risk": true/false, 
      "message": "Breve alerta si hay riesgo (máx 15 palabras)", 
      "recommendation": "Sugerencia técnica detallada para el operario en campo (máx 40 palabras)",
      "priority": "HIGH/MEDIUM" 
    }},
    ...
  ]
}}
Si no hay riesgo para un animal, "risk" debe ser false.
"""

            # Llamar a la IA con rol de analista
            analysis = CortexService.call_claude(
                prompt=full_prompt, 
                role=PromptRole.ANALYST,
                max_tokens=1500
            )

            text = analysis.get('text', '').strip()
            
            # Intentar parsear el JSON de la respuesta
            try:
                import json
                json_start = text.find('{')
                json_end = text.rfind('}') + 1
                if json_start != -1 and json_end != -1:
                    results = json.loads(text[json_start:json_end])
                    for res in results.get('analyses', []):
                        if res.get('risk'):
                            animal_id_str = res.get('id')
                            target_animal = next((a for a in batch if a.record == animal_id_str), None)
                            
                            if target_animal:
                                # Evitar duplicados recientes
                                existing = AnimalAlert.query.filter(
                                    AnimalAlert.animal_id == target_animal.id,
                                    AnimalAlert.alert_type == AlertType.PREDICTIVE,
                                    AnimalAlert.triggered_at > datetime.now(timezone.utc) - timedelta(days=1)
                                ).first()

                                if not existing:
                                    AnimalAlert.create(
                                        animal_id=target_animal.id,
                                        finca_id=finca_id,
                                        alert_type=AlertType.PREDICTIVE,
                                        message=res.get('message', 'Anomalía detectada por IA'),
                                        recommendation=res.get('recommendation', 'Revisión veterinaria sugerida.'),
                                        priority=AlertPriority.HIGH if res.get('priority') == 'HIGH' else AlertPriority.MEDIUM,
                                        commit=True
                                    )
                                    alerts_created += 1
                                    logger.info(f"Alerta predictiva creada para {target_animal.record}")
            except Exception as e:
                logger.error(f"Error parseando respuesta de lote IA: {e}. Texto: {text}")
                continue

        # --- PREDICCIÓN DE CELOS (REPRODUCCIÓN) ---
        heat_alerts = PredictiveEngineService.predict_heat_cycles(finca_id)
        alerts_created += heat_alerts.get('alerts_created', 0)

        return {
            "status": "success", 
            "alerts_created": alerts_created,
            "total_analyzed": len(animals)
        }

    @staticmethod
    def predict_heat_cycles(finca_id):
        """
        Analiza el historial reproductivo para predecir próximos celos.
        Detecta ciclos de 21 días y genera alertas preventivas.
        """
        from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
        from app.models.animals import Sex
        
        # Obtener hembras vivas
        cows_query = Animals.query.filter_by(
            finca_id=finca_id, 
            status=AnimalStatus.Vivo, 
            sex=Sex.Hembra
        ).all()
        
        # Filtrar por edad en Python (>15 meses)
        cows = [c for c in cows_query if c.age_in_months is not None and c.age_in_months >= 15]
        
        alerts_created = 0
        today = datetime.now(timezone.utc).date()
        
        for cow in cows:
            # Buscar último evento reproductivo relevante (Celo, Inseminacion)
            last_event = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == cow.id,
                ReproductiveEvent.event_type.in_([EventType.Celo, EventType.Inseminacion])
            ).order_by(ReproductiveEvent.event_date.desc()).first()
            
            if last_event:
                # Si está preñada confirmada, ignorar
                is_pregnant = ReproductiveEvent.query.filter_by(
                    animal_id=cow.id, 
                    event_type=EventType.Diagnostico,
                    diagnosis_result=DiagnosisResult.Positivo
                ).filter(ReproductiveEvent.event_date >= last_event.event_date).first()
                
                if is_pregnant:
                    continue
                
                # Proyectar ciclos de 21 días
                days_since = (today - last_event.event_date).days
                cycle_day = days_since % 21
                
                # Si faltan 2 días para el próximo celo o estamos en el día del celo
                if 19 <= cycle_day <= 21 or cycle_day == 0:
                    next_heat = today + timedelta(days=(21 - cycle_day) if cycle_day != 0 else 0)
                    
                    # Evitar duplicados recientes
                    existing = AnimalAlert.query.filter(
                        AnimalAlert.animal_id == cow.id,
                        AnimalAlert.alert_type == AlertType.REPRODUCTION,
                        AnimalAlert.message.ilike('%celo probable%'),
                        AnimalAlert.triggered_at > datetime.now(timezone.utc) - timedelta(days=5)
                    ).first()
                    
                    if not existing:
                        AnimalAlert.create(
                            animal_id=cow.id,
                            finca_id=finca_id,
                            alert_type=AlertType.REPRODUCTION,
                            message=f"🔔 Celo probable para el {next_heat.strftime('%d/%m/%Y')}.",
                            recommendation="Vigilancia intensiva durante 48 horas. Observar signos: monta a otras vacas, inquietud, descarga vulvar. Preparar material de inseminación si aplica.",
                            priority=AlertPriority.HIGH,
                            commit=True
                        )
                        alerts_created += 1
                        
        return {"alerts_created": alerts_created}

    @staticmethod
    def get_finca_insights_summary(finca_id):
        """
        Genera un resumen ejecutivo de IA para el dashboard de la finca.
        """
        from app.models.livestock_summary import LivestockSummary
        summary = LivestockSummary.get_for_finca(finca_id)
        
        recent_ai_alerts = AnimalAlert.query.filter_by(
            finca_id=finca_id, 
            alert_type=AlertType.PREDICTIVE
        ).order_by(AnimalAlert.triggered_at.desc()).limit(5).all()
        
        alerts_text = "\n".join([f"- {a.animal.record}: {a.message}" for a in recent_ai_alerts])
        
        data_summary = f"""
        Total Animales: {summary.total_animals}
        Peso Promedio: {summary.avg_weight}kg
        Alertas IA Recientes:
        {alerts_text if alerts_text else "Ninguna"}
        """
        
        prompt = CortexService.generate_insight_request(data_summary)
        analysis = CortexService.call_claude(prompt, role=PromptRole.MANAGER)
        
        return analysis.get('text', 'No se pudo generar el resumen ejecutivo.')
