"""
Motor de evaluación de alertas ganaderas — Finca Villa Luz.

Reglas predeterminadas cubren:
  - Sanidad ICA (vacunación, desparasitación, controles)
  - Reproducción (gestación, celo, intervalo entre partos, nulíparas)
  - Crecimiento (peso, destete, desarrollo)
  - Manejo (potreros, castración, identificación)
  - Consanguinidad
  - Bienestar animal (vejez, enfermedades activas, sin historia clínica)
"""
from datetime import date, datetime, timedelta, timezone
import logging
from app import db
from app.models.alerts import AnimalAlert, AnimalAlertConfig, AlertType, AlertPriority
from app.models.animals import Animals, Sex
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult, InseminationTechnique
from app.models.inventory import InventoryLot
from app.models.activity_log import ActivityLog
from app.models.milk_production import MilkProduction, MilkSession
from app.services.push_notification_service import PushNotificationService
from sqlalchemy import func, or_

logger = logging.getLogger(__name__)


class AlertEngine:

    # ─────────────────────────────────────────────────────────────────────────
    # EVALUACIÓN PRINCIPAL
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def evaluate_all() -> dict:
        """Evalúa todas las reglas para todos los animales vivos de la finca."""
        results = {
            'triggered': 0,
            'processed_animals': 0,
            'inventory_alerts': 0,
            'errors': 0,
        }
        try:
            # Bypass tenant filter en contexto de background (lecturas sin flask.request)
            try:
                import flask
                flask.g.is_admin = True
            except RuntimeError:
                pass

            animals = db.session.query(Animals).filter_by(status='Vivo').all()
            results['processed_animals'] = len(animals)

            # Identificar fincas únicas para análisis de IA
            fincas_to_analyze = set()

            for animal in animals:
                try:
                    finca_id = getattr(animal, 'finca_id', None)
                    if finca_id:
                        fincas_to_analyze.add(finca_id)
                    results['triggered'] += AlertEngine._evaluate_predetermined(animal, finca_id)
                    results['triggered'] += AlertEngine._evaluate_custom(animal, finca_id)
                except Exception as e:
                    logger.error(f"Error evaluando animal {animal.id}: {e}")
                    results['errors'] += 1

            # ── ANÁLISIS PREDICTIVO IA (Claude) ──
            from app.services.predictive_engine_service import PredictiveEngineService
            for finca_id in fincas_to_analyze:
                try:
                    logger.info(f"Iniciando análisis predictivo IA para finca {finca_id}")
                    ai_result = PredictiveEngineService.run_finca_analysis(finca_id)
                    results['triggered'] += ai_result.get('alerts_created', 0)
                except Exception as e:
                    logger.error(f"Error en análisis IA para finca {finca_id}: {e}")
                    results['errors'] += 1

            try:
                results['inventory_alerts'] = AlertEngine._evaluate_inventory()
            except Exception as e:
                logger.error(f"Error evaluando inventario: {e}")

            try:
                results['infrastructure_alerts'] = AlertEngine._evaluate_infrastructure_health()
            except Exception as e:
                logger.error(f"Error evaluando salud de infraestructura: {e}")

            # ── GENERAR RECOMENDACIONES IA PARA ALERTAS PENDIENTES ──
            try:
                logger.info("Generando recomendaciones IA para alertas nuevas...")
                AlertEngine.populate_ai_recommendations()
            except Exception as e:
                logger.error(f"Error generando recomendaciones IA: {e}")

            db.session.commit()
            logger.info(
                f"Evaluación completada — animales: {results['processed_animals']}, "
                f"alertas: {results['triggered']}, inventario: {results['inventory_alerts']}, "
                f"errores: {results['errors']}"
            )
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error crítico en AlertEngine: {e}")
            raise
        return results

    @staticmethod
    def populate_ai_recommendations():
        """
        Busca alertas que no tengan recomendación y usa Claude para generarlas.
        Esto crea una base de conocimientos offline para el trabajador de campo.
        """
        from app.services.cortex_service import CortexService, PromptRole
        
        # Obtener alertas sin recomendación de las últimas 48 horas (mayor ventana para asegurar cobertura)
        since = datetime.now(timezone.utc) - timedelta(hours=48)
        pending_alerts = AnimalAlert.query.filter(
            AnimalAlert.recommendation == None,
            AnimalAlert.triggered_at >= since
        ).limit(50).all() # Aumentado a 50 para cubrir más alertas en una sola ejecución

        if not pending_alerts:
            return

        for alert in pending_alerts:
            animal_context = alert.animal.to_ai_context() if alert.animal else "Desconocido"
            
            prompt = f"""Como experto veterinario colombiano y consultor de la Finca Villa Luz, genera una RECOMENDACIÓN TÉCNICA PROFESIONAL para esta alerta.
ALERTA: {alert.message}
TIPO: {alert.alert_type.value}
CONTEXTO DEL ANIMAL:
{animal_context}

ESPECIFICACIÓN DE LA RESPUESTA:
- Proporciona consejos reales y técnicos (ej. protocolos ICA, manejo de pastos, sanidad).
- El tono debe ser directo y accionable para un operario de campo.
- Máximo 50 palabras.
- Sin introducciones ni despedidas.
- Prioriza la salud y productividad del hato.
"""
            result = CortexService.call_claude(prompt, role=PromptRole.ASSISTANT, max_tokens=250)
            
            if result and result.get('text'):
                alert.recommendation = result['text'].strip()
                db.session.add(alert)
        
        db.session.commit()

    # ─────────────────────────────────────────────────────────────────────────
    # REGLAS PREDETERMINADAS
    # ─────────────────────────────────────────────────────────────────────────

    _weather_cache = {}

    @classmethod
    def get_finca_weather(cls, finca_id):
        import time
        import flask
        from app import cache
        import requests

        now = time.time()
        
        # --- Lógica de Circuit Breaker para Open-Meteo ---
        cb_key = f'circuit_breaker:open_meteo:{finca_id}'
        cb_fails_key = f'{cb_key}:fails'
        
        # Si el circuito está abierto, retornar None (usar caché o ignorar)
        if cache.get(cb_key):
            return None

        # Check cache local (1 hora)
        if finca_id in cls._weather_cache:
            data, timestamp = cls._weather_cache[finca_id]
            if now - timestamp < 3600:
                return data

        from app.models.finca import Finca
        
        finca = Finca.query.get(finca_id) if finca_id else None
        
        # Coordenadas por defecto si no existen
        lat = finca.latitude if finca and getattr(finca, 'latitude', None) is not None else 4.6097
        lon = finca.longitude if finca and getattr(finca, 'longitude', None) is not None else -74.0817
        
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            # Resetear fallos si fue exitoso
            cache.delete(cb_fails_key)
            
            current = data.get('current', {})
            result = {
                'temp': data['current']['temperature_2m'],
                'humidity': data['current']['relative_humidity_2m']
            }
        except Exception as e:
            # Incrementar contador de fallos
            fails = cache.get(cb_fails_key) or 0
            fails += 1
            cache.set(cb_fails_key, fails, timeout=3600)
            
            # Si hay más de 3 fallos seguidos, abrir el circuito por 30 minutos
            if fails >= 3:
                cache.set(cb_key, 'OPEN', timeout=1800)
                logging.getLogger(__name__).error(f"CIRCUIT BREAKER OPEN: Open-Meteo falló {fails} veces para Finca {finca_id}.")
                
            logging.getLogger(__name__).warning(f"Error Open-Meteo Finca {finca_id}: {e}")
            # Retornar fallback seguro pero marcado
            result = {'temp': 31.5, 'humidity': 75, 'fallback': True}
            
        cls._weather_cache[finca_id] = (result, now)
        return result

    @staticmethod
    def _evaluate_predetermined(animal, finca_id=None) -> int:
        """
        Evalúa ~35 reglas veterinarias y de manejo ganadero colombiano.
        Retorna el número de alertas nuevas generadas.
        """
        n = 0
        today = date.today()
        age_months = animal.age_in_months or 0

        def trig(tipo, msg, prioridad):
            nonlocal n
            if AlertEngine._trigger_if_not_exists(animal.id, tipo, msg, prioridad, finca_id=finca_id):
                n += 1

        # ── 1. IDENTIFICACIÓN ─────────────────────────────────────────────────
        if not animal.record or not str(animal.record).strip():
            trig(AlertType.STATUS,
                 "📋 Sin identificación: el animal no tiene número de registro o arete.",
                 AlertPriority.HIGH)

        # ── 2. CONSANGUINIDAD ─────────────────────────────────────────────────
        if animal.father and animal.mother:
            if ((animal.father.idFather == animal.mother.idFather and animal.father.idFather)
                    or (animal.father.idMother == animal.mother.idMother and animal.father.idMother)):
                trig(AlertType.CUSTOM,
                     "🧬 Consanguinidad ALTA: padres son medios hermanos. Revisar plan de cruces.",
                     AlertPriority.HIGH)
            if (animal.father.id == animal.mother.idFather) or (animal.mother.id == animal.father.idMother):
                trig(AlertType.CUSTOM,
                     "🧬 Consanguinidad CRÍTICA: cruce directo abuelo/a — alto riesgo genético.",
                     AlertPriority.CRITICAL)

        # ── 3. CONTROLES SANITARIOS PERIÓDICOS ───────────────────────────────
        last_ctrl = animal.controls.order_by(Control.checkup_date.desc()).first()
        days_ctrl = (today - last_ctrl.checkup_date).days if last_ctrl else 9999

        if days_ctrl > 90:
            trig(AlertType.HEALTH,
                 f"🚨 Control sanitario CRÍTICO: {days_ctrl} días sin revisión médica veterinaria.",
                 AlertPriority.CRITICAL)
        elif days_ctrl > 60:
            trig(AlertType.HEALTH,
                 f"⚕️ Control sanitario urgente: {days_ctrl} días sin revisión. Programar inmediatamente.",
                 AlertPriority.HIGH)
        elif days_ctrl > 30:
            trig(AlertType.HEALTH,
                 f"⚕️ Control sanitario vencido: {days_ctrl} días sin revisión médica.",
                 AlertPriority.MEDIUM)

        if not last_ctrl and age_months >= 3:
            trig(AlertType.HEALTH,
                 "⚕️ Sin historia clínica: el animal no tiene ningún control veterinario registrado.",
                 AlertPriority.HIGH)

        # ── 4. VACUNACIÓN ICA — Aftosa / Brucelosis ───────────────────────────
        last_ica = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%aftosa%'),
                Treatments.description.ilike('%brucela%'),
                Treatments.description.ilike('%brucelosis%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_ica:
            days_ica = (today - last_ica.treatment_date).days
            if days_ica > 180:
                trig(AlertType.HEALTH,
                     f"💉 Vacunación ICA VENCIDA ({days_ica} días). Aftosa/Brucelosis obligatoria — riesgo legal.",
                     AlertPriority.CRITICAL)
            elif 165 <= days_ica <= 180:
                trig(AlertType.HEALTH,
                     f"💉 Vacunación ICA próxima a vencer (en {180 - days_ica} días). Programar con anticipación.",
                     AlertPriority.HIGH)
        else:
            trig(AlertType.HEALTH,
                 "💉 Sin vacunación ICA: no hay registro de Aftosa ni Brucelosis. Incumplimiento sanitario.",
                 AlertPriority.CRITICAL)

        # ── 5. VACUNACIÓN — IBR / DVB (Rinotraqueítis / Diarrea Viral Bovina) ─
        last_ibr = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%ibr%'),
                Treatments.description.ilike('%dvb%'),
                Treatments.description.ilike('%rinotra%'),
                Treatments.description.ilike('%diarrea viral%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_ibr:
            if (today - last_ibr.treatment_date).days > 365:
                trig(AlertType.HEALTH,
                     "💉 Vacuna IBR/DVB vencida (>1 año). Renovar para proteger contra enfermedades respiratorias.",
                     AlertPriority.HIGH)
        elif age_months >= 4:
            trig(AlertType.HEALTH,
                 "💉 Sin vacuna IBR/DVB registrada. Recomendado para hatos mayores de 4 meses.",
                 AlertPriority.MEDIUM)

        # ── 6. VACUNACIÓN — Carbón Bacteriano (Anthrax) ───────────────────────
        last_carbon = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%carbón%'),
                Treatments.description.ilike('%carbon%'),
                Treatments.description.ilike('%anthrax%'),
                Treatments.description.ilike('%carbunco%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_carbon:
            if (today - last_carbon.treatment_date).days > 180:
                trig(AlertType.HEALTH,
                     "💉 Vacuna carbón bacteriano vencida (>6 meses). Aplicar cada 6 meses en zonas endémicas.",
                     AlertPriority.HIGH)
        elif age_months >= 3:
            trig(AlertType.HEALTH,
                 "💉 Sin vacuna carbón bacteriano registrada. Obligatoria en zonas endémicas colombianas.",
                 AlertPriority.MEDIUM)

        # ── 7. VACUNACIÓN — Rabia Bovina ──────────────────────────────────────
        last_rabia = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%rabia%'),
                Treatments.description.ilike('%derriengue%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_rabia:
            if (today - last_rabia.treatment_date).days > 365:
                trig(AlertType.HEALTH,
                     "💉 Vacuna antirrábica bovina vencida (>1 año). Requerida en zonas con murciélagos.",
                     AlertPriority.MEDIUM)
        elif age_months >= 3:
            trig(AlertType.HEALTH,
                 "💉 Sin vacuna antirrábica registrada. Aplicar en zonas de riesgo (ICA Colombia).",
                 AlertPriority.LOW)

        # ── 8. DESPARASITACIÓN ────────────────────────────────────────────────
        last_desp = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%desparasit%'),
                Treatments.description.ilike('%antiparasit%'),
                Treatments.description.ilike('%ivermectin%'),
                Treatments.description.ilike('%albendazol%'),
                Treatments.description.ilike('%levamisol%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_desp:
            days_desp = (today - last_desp.treatment_date).days
            if days_desp > 150:
                trig(AlertType.HEALTH,
                     f"🪱 Desparasitación URGENTE ({days_desp} días sin tratamiento antiparasitario).",
                     AlertPriority.HIGH)
            elif days_desp > 120:
                trig(AlertType.HEALTH,
                     f"🪱 Desparasitación pendiente ({days_desp} días). Recomendado cada 90–120 días.",
                     AlertPriority.MEDIUM)
        else:
            trig(AlertType.HEALTH,
                 "🪱 Sin desparasitación registrada. La parasitosis reduce hasta 30% la productividad.",
                 AlertPriority.HIGH)

        # ── 9. VITAMINAS Y MINERALES ──────────────────────────────────────────
        last_mineral = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%mineral%'),
                Treatments.description.ilike('%vitamina%'),
                Treatments.description.ilike('%complejo b%'),
                Treatments.description.ilike('%calcio%'),
                Treatments.description.ilike('%fosforo%'),
                Treatments.description.ilike('%fósforo%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_mineral:
            if (today - last_mineral.treatment_date).days > 180:
                trig(AlertType.HEALTH,
                     "💊 Suplementación mineral/vitamínica vencida (>6 meses). Evaluar estado nutricional.",
                     AlertPriority.MEDIUM)
        elif age_months >= 6:
            trig(AlertType.HEALTH,
                 "💊 Sin registro de suplementación mineral. Deficiencias afectan reproducción y crecimiento.",
                 AlertPriority.LOW)

        # ── 10. ENFERMEDADES ACTIVAS ─────────────────────────────────────────
        active_diseases = animal.diseases.filter_by(status='Activo').all()
        for ad in active_diseases:
            disease_name = ad.disease.name if ad.disease else 'desconocida'
            last_tx = Treatments.query.filter_by(animal_id=animal.id).order_by(
                Treatments.treatment_date.desc()).first()
            days_tx = (today - last_tx.treatment_date).days if last_tx else 9999

            if days_tx >= 14:
                trig(AlertType.HEALTH,
                     f"🏥 Enfermedad crónica activa: '{disease_name}' sin tratamiento reciente ({days_tx} días). Revisar evolución.",
                     AlertPriority.HIGH)
            elif days_tx >= 2:
                trig(AlertType.HEALTH,
                     f"🏥 Enfermedad activa '{disease_name}' requiere revisión clínica y plan de tratamiento.",
                     AlertPriority.HIGH)

        # ── 11. REPRODUCCIÓN — Gestación e Hitos ─────────────────────────────
        if animal.sex == Sex.Hembra:
            last_preg = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type == EventType.Diagnostico,
                ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if last_preg:
                days_gest = (today - last_preg.event_date).days
                if 0 < days_gest <= 290:
                    hitos = [
                        (30,  "Confirmación de preñez (palpación o ecografía)."),
                        (60,  "Segunda confirmación y evaluación fetal."),
                        (90,  "Control de 1er tercio — revisar nutrición y condición corporal."),
                        (150, "Control de 2do tercio — ajuste de suplementación."),
                        (210, "Control de 3er tercio — preparación al parto."),
                        (223, "⚠️ INICIO DE SECADO obligatorio (60 días pre-parto)."),
                        (250, "Trasladar a zona de maternidad o potrero de parto."),
                        (270, "Alerta de parto inminente — vigilancia 24 horas."),
                        (283, "📅 FECHA ESTIMADA DE PARTO alcanzada."),
                    ]
                    priorities_g = [
                        AlertPriority.MEDIUM, AlertPriority.MEDIUM, AlertPriority.MEDIUM,
                        AlertPriority.MEDIUM, AlertPriority.HIGH,
                        AlertPriority.CRITICAL, AlertPriority.HIGH,
                        AlertPriority.CRITICAL, AlertPriority.CRITICAL,
                    ]
                    for (m_day, m_msg), m_prio in zip(hitos, priorities_g):
                        if abs(days_gest - m_day) <= 3:
                            trig(AlertType.REPRODUCTION,
                                 f"🐄 Gestación día {days_gest}: {m_msg}",
                                 m_prio)

            # ── 12. PERÍODO ABIERTO ───────────────────────────────────────────
            if age_months >= 24:
                last_birth = ReproductiveEvent.query.filter(
                    ReproductiveEvent.animal_id == animal.id,
                    ReproductiveEvent.event_type == EventType.Parto
                ).order_by(ReproductiveEvent.event_date.desc()).first()

                if last_birth:
                    days_postparto = (today - last_birth.event_date).days
                    recent_svc = ReproductiveEvent.query.filter(
                        ReproductiveEvent.animal_id == animal.id,
                        ReproductiveEvent.event_date > last_birth.event_date,
                        ReproductiveEvent.event_type == EventType.Inseminacion
                    ).first()
                    if not recent_svc:
                        if days_postparto > 150:
                            trig(AlertType.REPRODUCTION,
                                 f"🐄 Período abierto crítico: {days_postparto} días post-parto sin servicio. Revisar fertilidad.",
                                 AlertPriority.HIGH)
                        elif days_postparto > 90:
                            trig(AlertType.REPRODUCTION,
                                 f"🐄 Período abierto prolongado: {days_postparto} días post-parto sin inseminación o monta.",
                                 AlertPriority.MEDIUM)

            # ── 13. NULÍPARA — Hembra adulta sin reproducción ─────────────────
            any_repro = ReproductiveEvent.query.filter_by(animal_id=animal.id).first()
            if not any_repro:
                if age_months >= 30:
                    trig(AlertType.REPRODUCTION,
                         f"🐄 Nulípara crítica: hembra de {age_months} meses sin ningún registro reproductivo. Evaluar fertilidad.",
                         AlertPriority.HIGH)
                elif age_months >= 24:
                    trig(AlertType.REPRODUCTION,
                         f"🐄 Novilla de {age_months} meses sin inicio reproductivo. Considerar primer servicio.",
                         AlertPriority.MEDIUM)
                elif 16 <= age_months < 24:
                    trig(AlertType.REPRODUCTION,
                         f"🐄 Novilla de {age_months} meses próxima a pubertad. Preparar para primer servicio.",
                         AlertPriority.LOW)

            # ── 14. CELO — Vigilancia (cada 21 días) ─────────────────────────
            last_event = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type.in_([EventType.Celo, EventType.Inseminacion])
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if last_event:
                days_ev = (today - last_event.event_date).days
                confirmed = ReproductiveEvent.query.filter(
                    ReproductiveEvent.animal_id == animal.id,
                    ReproductiveEvent.event_date > last_event.event_date,
                    ReproductiveEvent.event_type == EventType.Diagnostico,
                    ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo
                ).first()
                if not confirmed and 18 <= (days_ev % 21) <= 22:
                    trig(AlertType.REPRODUCTION,
                         f"🔔 Vigilancia de CELO: {days_ev} días desde último evento. Período probable de celo.",
                         AlertPriority.MEDIUM)

            # ── 15. INTERVALO ENTRE PARTOS ─────────────────────────────────────
            births = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type == EventType.Parto
            ).order_by(ReproductiveEvent.event_date.desc()).limit(2).all()
            if len(births) >= 2:
                interval_days = (births[0].event_date - births[1].event_date).days
                if interval_days > 548:  # >18 meses
                    trig(AlertType.REPRODUCTION,
                         f"🐄 Intervalo entre partos de {interval_days} días (>18 meses). Meta: 12–14 meses. Revisar fertilidad.",
                         AlertPriority.HIGH)
                elif interval_days > 456:  # >15 meses
                    trig(AlertType.REPRODUCTION,
                         f"🐄 Intervalo entre partos de {interval_days} días (>15 meses). Ajustar manejo reproductivo.",
                         AlertPriority.MEDIUM)

        # ── 16. TORO SEMENTAL ─────────────────────────────────────────────────
        if animal.sex == Sex.Macho and age_months >= 18:
            service_records = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type == EventType.Inseminacion
            ).first()
            if not service_records:
                trig(AlertType.REPRODUCTION,
                     f"🐂 Macho de {age_months} meses sin registros de servicio. Evaluar capacidad reproductiva.",
                     AlertPriority.MEDIUM)

        # ── 17. CRECIMIENTO — Pérdida de peso ────────────────────────────────
        last_controls = animal.controls.order_by(Control.checkup_date.desc()).limit(2).all()
        if len(last_controls) >= 2:
            w_actual, w_prev = last_controls[0].weight, last_controls[1].weight
            if w_actual and w_prev and w_prev > 0:
                diff_pct = (w_prev - w_actual) / w_prev * 100
                if diff_pct >= 10:
                    trig(AlertType.GROWTH,
                         f"⚖️ Pérdida severa de peso: -{diff_pct:.1f}% ({w_prev}→{w_actual} kg). Revisar urgente.",
                         AlertPriority.CRITICAL)
                elif diff_pct >= 5:
                    trig(AlertType.GROWTH,
                         f"⚖️ Pérdida de peso detectada: -{diff_pct:.1f}% ({w_prev}→{w_actual} kg). Revisar nutrición.",
                         AlertPriority.HIGH)

        # ── 18. TERNERO — Primer año de vida ─────────────────────────────────
        if age_months < 12:
            controls_count = animal.controls.count()
            if controls_count == 0 and age_months >= 1:
                trig(AlertType.GROWTH,
                     f"🐮 Ternero de {age_months} meses sin ningún control de crecimiento. Requerido mensual.",
                     AlertPriority.HIGH)
            elif controls_count < (age_months // 2) and age_months >= 4:
                trig(AlertType.GROWTH,
                     f"🐮 Ternero de {age_months} meses con solo {controls_count} controles. Realizar seguimiento mensual.",
                     AlertPriority.MEDIUM)

        # ── 19. DESTETE ────────────────────────────────────────────────────────
        if 5 <= age_months <= 8:
            destete = Treatments.query.filter(
                Treatments.animal_id == animal.id,
                or_(
                    Treatments.description.ilike('%destete%'),
                    Treatments.description.ilike('%weaning%'),
                )
            ).first()
            if not destete:
                trig(AlertType.GROWTH,
                     f"🐮 Destete pendiente: ternero de {age_months} meses. Registrar procedimiento (5–8 meses).",
                     AlertPriority.MEDIUM)

        # ── 20. CASTRACIÓN ────────────────────────────────────────────────────
        if animal.sex == Sex.Macho and 6 <= age_months <= 9:
            castrado = Treatments.query.filter(
                Treatments.animal_id == animal.id,
                or_(
                    Treatments.description.ilike('%castrac%'),
                    Treatments.description.ilike('%orquiect%'),
                )
            ).first()
            if not castrado:
                trig(AlertType.STATUS,
                     f"✂️ Castración recomendada: macho de {age_months} meses (rango óptimo 6–9 meses).",
                     AlertPriority.MEDIUM)

        # ── 21. POTRERO — Rotación ────────────────────────────────────────────
        from app.models.animalFields import AnimalFields
        active_af = animal.animal_fields.filter_by(removal_date=None).first()

        if active_af:
            days_field = (today - active_af.assignment_date).days
            if days_field > 25:
                trig(AlertType.STATUS,
                     f"🌿 Rotación CRÍTICA: {days_field} días en '{active_af.field.name}'. Deterioro de pasturas.",
                     AlertPriority.HIGH)
            elif days_field > 15:
                trig(AlertType.STATUS,
                     f"🌿 Rotación pendiente: {days_field} días en '{active_af.field.name}'. Rotar antes de día 21.",
                     AlertPriority.MEDIUM)

            # Sobre-capacidad
            try:
                import re
                m = re.search(r'(\d+)', str(active_af.field.capacity))
                if m:
                    cap = int(m.group(1))
                    current = AnimalFields.query.filter_by(
                        field_id=active_af.field.id, removal_date=None
                    ).count()
                    if current > cap:
                        trig(AlertType.STATUS,
                             f"🌿 Sobre-capacidad: '{active_af.field.name}' tiene {current}/{cap} animales. Riesgo de degradación.",
                             AlertPriority.HIGH)
            except Exception:
                pass
        elif age_months >= 3:
            trig(AlertType.STATUS,
                 f"🌿 Animal sin potrero asignado: bovino de {age_months} meses sin campo activo.",
                 AlertPriority.MEDIUM)

        # ── 22. VEJEZ ─────────────────────────────────────────────────────────
        if age_months >= 144:  # 12 años
            trig(AlertType.STATUS,
                 f"👴 Animal anciano ({age_months // 12} años). Evaluar retiro y bienestar animal.",
                 AlertPriority.MEDIUM)
        elif age_months >= 120:  # 10 años
            trig(AlertType.STATUS,
                 f"👴 Animal geriátrico ({age_months // 12} años). Monitoreo especial: dental, articulaciones y productividad.",
                 AlertPriority.LOW)

        # ── 23. POST-PARTO — Vigilancia primeras 2 semanas ────────────────────
        if animal.sex == Sex.Hembra:
            last_birth_event = ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type == EventType.Parto
            ).order_by(ReproductiveEvent.event_date.desc()).first()

            if last_birth_event:
                days_postparto = (today - last_birth_event.event_date).days
                if 0 <= days_postparto <= 3:
                    trig(AlertType.HEALTH,
                         f"🐮 POST-PARTO día {days_postparto}: Verificar expulsión de placenta. Retención >12h = emergencia.",
                         AlertPriority.CRITICAL)
                    trig(AlertType.HEALTH,
                         f"🥛 POST-PARTO día {days_postparto}: Confirmar que el ternero recibió calostro en primeras 6 horas.",
                         AlertPriority.CRITICAL)
                elif 1 <= days_postparto <= 5:
                    trig(AlertType.HEALTH,
                         f"🩺 POST-PARTO día {days_postparto}: Vigilar hipocalcemia (fiebre de leche). Síntomas: debilidad, tambaleo.",
                         AlertPriority.HIGH)
                elif 3 <= days_postparto <= 14:
                    trig(AlertType.HEALTH,
                         f"🩺 POST-PARTO día {days_postparto}: Revisar signos de metritis (fiebre, descarga fétida). Crítico días 3-14.",
                         AlertPriority.HIGH)
                if 7 <= days_postparto <= 14:
                    trig(AlertType.HEALTH,
                         f"🥛 POST-PARTO día {days_postparto}: Revisión mastitis subclínica. Realizar California Mastitis Test.",
                         AlertPriority.MEDIUM)
                if days_postparto == 21:
                    trig(AlertType.REPRODUCTION,
                         f"🐄 POST-PARTO día 21: Vigilar primer celo post-parto. Registrar si se observa.",
                         AlertPriority.MEDIUM)

        # ── 24. VACUNACIONES — Verificar tabla Vaccinations además de Treatments ─
        from app.models.vaccinations import Vaccinations as VacTable
        last_vac = VacTable.query.filter_by(animal_id=animal.id).order_by(VacTable.vaccination_date.desc()).first()
        if last_vac:
            days_vac = (today - last_vac.vaccination_date).days
            if days_vac > 210:
                trig(AlertType.HEALTH,
                     f"💉 Última vacunación registrada hace {days_vac} días. Revisar calendario vacunal completo.",
                     AlertPriority.HIGH)
            elif days_vac > 180:
                trig(AlertType.HEALTH,
                     f"💉 Vacunación próxima a vencer ({days_vac} días desde última aplicación). Programar refuerzo.",
                     AlertPriority.MEDIUM)

        # ── 25. PESO SIN ACTUALIZAR — Sin control con peso en >90 días ────────
        last_ctrl_peso = animal.controls.filter(Control.weight.isnot(None)).order_by(
            Control.checkup_date.desc()
        ).first()
        if not last_ctrl_peso and age_months >= 3:
            trig(AlertType.GROWTH,
                 f"⚖️ Sin registro de peso en historial clínico. Pesar en próximo control veterinario.",
                 AlertPriority.MEDIUM)
        elif last_ctrl_peso:
            days_peso = (today - last_ctrl_peso.checkup_date).days
            if days_peso > 180:
                trig(AlertType.GROWTH,
                     f"⚖️ Último peso registrado hace {days_peso} días. Realizar control de peso cada 60-90 días.",
                     AlertPriority.MEDIUM)

        # ── 26. VACUNA CLOSTRIDIAL — Enterotoxemia y otras clostridiales ──────
        last_clost = Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike('%clostridial%'),
                Treatments.description.ilike('%clostridi%'),
                Treatments.description.ilike('%enterotoxemia%'),
                Treatments.description.ilike('%edema malign%'),
            )
        ).order_by(Treatments.treatment_date.desc()).first()

        if last_clost:
            if (today - last_clost.treatment_date).days > 365:
                trig(AlertType.HEALTH,
                     "💉 Vacuna clostridial vencida (>1 año). Renovar para prevenir enterotoxemia y muerte súbita.",
                     AlertPriority.HIGH)
        elif age_months >= 2:
            trig(AlertType.HEALTH,
                 "💉 Sin vacuna clostridial registrada. Recomendada desde 2 meses para prevenir muerte súbita.",
                 AlertPriority.MEDIUM)

        # ── 27. PRODUCCIÓN LÁCTEA — Caída de producción (>15%) ───────────────
        if animal.sex == Sex.Hembra and age_months >= 24:
            # Obtener últimos 2 registros de producción
            recent_milk = MilkProduction.query.filter_by(animal_id=animal.id).order_by(
                MilkProduction.date.desc(), MilkProduction.milking_session.desc()
            ).limit(2).all()
            
            if len(recent_milk) >= 2:
                m_actual, m_prev = recent_milk[0].liters, recent_milk[1].liters
                if m_actual and m_prev and m_prev > 0:
                    drop_pct = (m_prev - m_actual) / m_prev * 100
                    if drop_pct >= 20:
                        trig(AlertType.PRODUCTION,
                             f"🥛 Caída CRÍTICA de leche: -{drop_pct:.1f}% ({m_prev}→{m_actual} L). Posible mastitis o enfermedad aguda.",
                             AlertPriority.CRITICAL)
                    elif drop_pct >= 15:
                        trig(AlertType.PRODUCTION,
                             f"🥛 Caída de producción: -{drop_pct:.1f}% ({m_prev}→{m_actual} L). Revisar nutrición o estrés.",
                             AlertPriority.HIGH)
                             
            # Comparar con promedio de los últimos 7 días
            seven_days_ago = today - timedelta(days=7)
            avg_milk = db.session.query(func.avg(MilkProduction.liters)).filter(
                MilkProduction.animal_id == animal.id,
                MilkProduction.date >= seven_days_ago,
                MilkProduction.date < today
            ).scalar()
            
            if avg_milk and len(recent_milk) > 0:
                m_today = recent_milk[0].liters
                if m_today < (avg_milk * 0.8): # Caída > 20% vs promedio
                    trig(AlertType.PRODUCTION,
                         f"🥛 Producción bajo promedio: {m_today} L (Promedio 7d: {avg_milk:.1f} L). Revisar condición corporal.",
                         AlertPriority.HIGH)

        # ── 28. PRODUCCIÓN LÁCTEA — Registro diario faltante ──────────────────
        if animal.sex == Sex.Hembra and age_months >= 24:
            # Verificar si ha tenido producción en el pasado (indicando que está en lactancia)
            has_production = MilkProduction.query.filter_by(animal_id=animal.id).first()
            if has_production:
                # Verificar si tiene registro de hoy o ayer
                last_record = MilkProduction.query.filter_by(animal_id=animal.id).order_by(
                    MilkProduction.date.desc()
                ).first()
                if last_record:
                    days_since_milk = (today - last_record.date).days
                    if days_since_milk >= 2:
                        trig(AlertType.PRODUCTION,
                             f"🥛 Sin registro de ordeño: {days_since_milk} días sin datos de producción. ¿Vaca seca o falta de registro?",
                             AlertPriority.MEDIUM)

        # ── 29. INTEGRACIÓN METEOROLÓGICA — Alertas de estrés térmico ─────────
        # Calcula el Índice de Temperatura y Humedad (THI)
        # Usamos Open-Meteo a través de la caché para no saturar la API
        # THI Formula: (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
        
        # Para evitar spam a todos los animales, solo generamos la alerta en animales en lactancia o terneros jóvenes (más vulnerables)
        es_vulnerable = (animal.sex == Sex.Hembra and age_months >= 24) or (age_months < 12)
        if es_vulnerable:
            weather_data = AlertEngine.get_finca_weather(finca_id)
            current_temp = weather_data.get('temp', 31.5)
            current_humidity = weather_data.get('humidity', 75)
            
            thi = (1.8 * current_temp + 32) - ((0.55 - 0.0055 * current_humidity) * (1.8 * current_temp - 26))
            
            if thi >= 89:
                trig(AlertType.HEALTH,
                     f"🌡️ ESTRÉS TÉRMICO CRÍTICO (THI {thi:.1f}): Peligro inminente. Suspender manejo, proveer sombra y agua fresca obligatoria.",
                     AlertPriority.CRITICAL)
            elif thi >= 79:
                trig(AlertType.HEALTH,
                     f"🌡️ ALERTA CLIMA: Estrés térmico severo (THI {thi:.1f}). Posible reducción de producción láctea e inmunosupresión.",
                     AlertPriority.HIGH)
            elif thi >= 72:
                trig(AlertType.HEALTH,
                     f"⛅ Clima: Estrés térmico leve (THI {thi:.1f}). Observar frecuencia respiratoria en este animal vulnerable.",
                     AlertPriority.MEDIUM)

        return n

    # ─────────────────────────────────────────────────────────────────────────
    # REGLAS PERSONALIZADAS (configs por animal + configs globales de finca)
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _evaluate_custom(animal, finca_id=None) -> int:
        """
        Evalúa:
        1. Configs específicas del animal (animal_id = animal.id).
        2. Configs globales de finca (animal_id = None, finca_id = finca_id).
        """
        n = 0
        today = date.today()
        all_configs = []

        # Configs propias del animal
        all_configs.extend(animal.alert_configs.filter_by(is_active=True).all())

        # Configs globales de la finca (plantillas)
        if finca_id:
            global_configs = AnimalAlertConfig.query.filter_by(
                finca_id=finca_id, animal_id=None, is_active=True
            ).all()
            all_configs.extend(global_configs)

        for cfg in all_configs:
            try:
                dim = cfg.dimension.lower()
                val = cfg.condition_value
                is_triggered = False

                if dim == 'weight':
                    is_triggered = AlertEngine._check_condition(animal.weight, val)
                elif dim == 'age':
                    is_triggered = AlertEngine._check_condition(animal.age_in_months, val)
                elif dim == 'status':
                    is_triggered = (animal.status.value == val)
                elif dim == 'sex':
                    is_triggered = (animal.sex.value == val)
                elif dim == 'days_since_control':
                    last_c = animal.controls.order_by(Control.checkup_date.desc()).first()
                    days = (today - last_c.checkup_date).days if last_c else 9999
                    is_triggered = AlertEngine._check_condition(days, val)

                if is_triggered:
                    priority = getattr(cfg, 'priority', None) or AlertPriority.HIGH
                    if AlertEngine._trigger_if_not_exists(
                        animal.id, cfg.alert_type, cfg.message, priority,
                        config_id=cfg.id, finca_id=finca_id
                    ):
                        n += 1
            except Exception:
                continue

        return n

    # ─────────────────────────────────────────────────────────────────────────
    # INVENTARIO
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _evaluate_inventory() -> int:
        n = 0
        today = date.today()
        lots = InventoryLot.query.filter(InventoryLot.current_quantity > 0).all()
        for lot in lots:
            try:
                days_to_exp = (lot.expiry_date - today).days
                if days_to_exp < 0:
                    title = f"INVENTARIO: Producto Vencido ({lot.lot_number})"
                    if AlertEngine._log_farm_alert(
                        lot.finca_id, title,
                        f"El lote de {lot.product_name} venció el {lot.expiry_date}.",
                        'danger'
                    ):
                        n += 1
                elif days_to_exp <= 30:
                    title = f"INVENTARIO: Próximo a Vencer ({lot.lot_number})"
                    if AlertEngine._log_farm_alert(
                        lot.finca_id, title,
                        f"El lote de {lot.product_name} vence en {days_to_exp} días.",
                        'warning'
                    ):
                        n += 1
                if lot.is_low_stock:
                    title = f"INVENTARIO: Stock Bajo ({lot.product_name})"
                    if AlertEngine._log_farm_alert(
                        lot.finca_id, title,
                        f"Solo {lot.current_quantity} {lot.unit} disponibles. Mínimo: {lot.min_stock}.",
                        'warning'
                    ):
                        n += 1
            except Exception:
                pass
        return n

    @staticmethod
    def _evaluate_infrastructure_health() -> int:
        """
        Monitorea la salud técnica del sistema y genera alertas administrativas
        si se detectan fallos de infraestructura.
        """
        n = 0
        from app.utils.health_check import HealthChecker
        from app import db, cache
        
        checker = HealthChecker(db, cache)
        health = checker.comprehensive_health_check()
        
        # 1. Alerta por Base de Datos
        db_h = health['checks']['database']
        if db_h['status'] != 'healthy':
            title = "INFRAESTRUCTURA: Error de Base de Datos"
            if AlertEngine._log_farm_alert(
                None, title, 
                f"La conexión a la DB falló: {db_h.get('error', 'Desconocido')}", 
                'danger'
            ):
                n += 1
        elif db_h.get('response_time_ms', 0) > 500:
            title = "INFRAESTRUCTURA: Latencia de DB Alta"
            if AlertEngine._log_farm_alert(
                None, title, 
                f"La DB está respondiendo lento ({db_h['response_time_ms']}ms). Posible saturación.", 
                'warning'
            ):
                n += 1

        # 2. Alerta por Cache (Redis)
        cache_h = health['checks']['cache']
        if cache_h['status'] == 'unhealthy':
            title = "INFRAESTRUCTURA: Error de Redis"
            if AlertEngine._log_farm_alert(
                None, title, 
                f"Redis no responde. Las funciones de tiempo real y caché están deshabilitadas.", 
                'danger'
            ):
                n += 1

        # 3. Alerta por Recursos de Hardware
        sys_h = health['checks']['system_resources']
        if sys_h['status'] != 'healthy':
            for warning in sys_h.get('warnings', []):
                title = "INFRAESTRUCTURA: Recursos Críticos"
                if AlertEngine._log_farm_alert(
                    None, title, warning, 'warning' if sys_h['status'] == 'warning' else 'danger'
                ):
                    n += 1

        # 4. Alerta por Workers (Celery)
        cel_h = health['checks']['celery']
        if cel_h['status'] != 'healthy':
            title = "INFRAESTRUCTURA: Workers Inactivos"
            if AlertEngine._log_farm_alert(
                None, title, 
                "No hay workers de Celery activos. Las tareas pesadas y alertas no se procesarán.", 
                'danger'
            ):
                n += 1

        return n

    @staticmethod
    def _log_farm_alert(finca_id, title, description, severity):
        exists = ActivityLog.query.filter(
            ActivityLog.finca_id == finca_id,
            ActivityLog.title == title,
            ActivityLog.created_at >= date.today()
        ).first()
        if not exists:
            ActivityLog.create(
                action='ALERTA', entity='Inventory',
                title=title, description=description,
                severity=severity, finca_id=finca_id
            )
            
            # Enviar notificación push para alertas de inventario (danger/warning)
            if severity in ['danger', 'warning'] and finca_id:
                try:
                    PushNotificationService.send_to_finca(
                        finca_id=finca_id,
                        title=f"📦 {title}",
                        body=description,
                        data={
                            'type': 'inventory_alert',
                            'severity': severity,
                            'url': '/inventario'
                        }
                    )
                except Exception as e:
                    logger.error(f"Error enviando push notification para inventario: {e}")
                    
            return True
        return False

    # ─────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _check_condition(current_val, condition_str: str) -> bool:
        if current_val is None:
            return False
        s = condition_str.strip()
        
        # Detectar si es una comparación de fecha
        is_date_comp = False
        target_val_str = s
        operator = '=='
        
        if s.startswith('>='): operator = '>='; target_val_str = s[2:]
        elif s.startswith('<='): operator = '<='; target_val_str = s[2:]
        elif s.startswith('>'): operator = '>'; target_val_str = s[1:]
        elif s.startswith('<'): operator = '<'; target_val_str = s[1:]
        elif s.startswith('='): operator = '=='; target_val_str = s[1:]
        
        target_val_str = target_val_str.strip()
        
        # Intentar parsear como fecha
        try:
            from datetime import date as py_date
            target_date = py_date.fromisoformat(target_val_str)
            # Si current_val es un objeto date/datetime, o un string de fecha
            cur_date = None
            if isinstance(current_val, py_date):
                cur_date = current_val
            elif isinstance(current_val, str):
                cur_date = py_date.fromisoformat(current_val)
            
            if cur_date:
                if operator == '>=': return cur_date >= target_date
                if operator == '<=': return cur_date <= target_date
                if operator == '>': return cur_date > target_date
                if operator == '<': return cur_date < target_date
                if operator == '==': return cur_date == target_date
        except Exception:
            pass # No era una fecha, proceder como número

        try:
            c_val = float(current_val)
            t_val = float(target_val_str)
            if operator == '>=': return c_val >= t_val
            if operator == '<=': return c_val <= t_val
            if operator == '>': return c_val > t_val
            if operator == '<': return c_val < t_val
            if operator == '==': return c_val == t_val
            return c_val == t_val
        except (ValueError, TypeError):
            return str(current_val) == target_val_str

    @staticmethod
    def _trigger_if_not_exists(
        animal_id, alert_type, message, priority,
        config_id=None, finca_id=None
    ) -> bool:
        """Crea la alerta solo si no existe una no-leída idéntica en las últimas 24 h."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        recent = AnimalAlert.query.filter(
            AnimalAlert.animal_id == animal_id,
            AnimalAlert.message == message,
            AnimalAlert.triggered_at >= cutoff,
        ).first()
        if recent:
            return False
        AnimalAlert.create(
            animal_id=animal_id,
            config_id=config_id,
            alert_type=alert_type,
            message=message,
            priority=priority,
            triggered_at=datetime.now(timezone.utc),
            finca_id=finca_id,
        )

        # ── NOTIFICACIONES (PUSH + SSE) ──
        if finca_id:
            # 1. Notificación Push para prioridades críticas (Móvil/Navegador)
            if priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]:
                try:
                    animal = Animals.query.get(animal_id)
                    animal_record = animal.record if animal else "Animal"
                    PushNotificationService.send_to_finca(
                        finca_id=finca_id,
                        title=f"🚨 Alerta {priority.value}: {animal_record}",
                        body=message,
                        data={
                            'type': 'alert',
                            'animal_id': animal_id,
                            'alert_type': alert_type.value if hasattr(alert_type, 'value') else str(alert_type),
                            'priority': priority.value.lower() if hasattr(priority, 'value') else str(priority).lower(),
                            'url': f'/animales/{animal_id}'
                        }
                    )
                except Exception as e:
                    logger.error(f"Error enviando push notification: {e}")

            # 2. Notificación SSE para el Dashboard en vivo
            try:
                import flask
                event_bus = flask.current_app.extensions.get('event_bus')
                if event_bus:
                    event_bus.publish_payload({
                        "endpoint": "alerts",
                        "action": "create",
                        "id": animal_id,
                        "finca_id": finca_id,
                        "priority": priority.value if hasattr(priority, 'value') else str(priority),
                        "message": message
                    })
            except Exception as e:
                logger.debug(f"No se pudo notificar al event_bus: {e}")

        return True
