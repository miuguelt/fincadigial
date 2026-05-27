"""
Reglas de alertas reproductivas.
"""
from datetime import date, timedelta
import logging
from app import db
from app.models.animals import Animals, Sex
from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
from app.models.treatments import Treatments
from app.services.alert_engine import AlertEngine
from app.models.alerts import AlertType, AlertPriority
from sqlalchemy import or_

logger = logging.getLogger(__name__)


def evaluate_reproduction_rules(animal, finca_id, trig, today, age_months) -> int:
    """Evalúa reglas reproductivas: gestación, celo, parto, inseminación."""
    if animal.sex != Sex.Hembra:
        return 0

    # ── 1. GESTACIÓN ──────────────────────────────────────────────────
    _check_gestation(animal, today, age_months, trig)

    # ── 2. PERÍODO ABIERTO ────────────────────────────────────────────
    if age_months >= 24:
        last_birth = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Parto).order_by(ReproductiveEvent.event_date.desc()).first()
        if last_birth:
            days_postparto = (today - last_birth.event_date).days
            recent_svc = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_date > last_birth.event_date, ReproductiveEvent.event_type == EventType.Inseminacion).first()
            if not recent_svc:
                if days_postparto > 150:
                    trig(AlertType.REPRODUCTION, f" Período abierto crítico: {days_postparto} días post-parto sin servicio. Revisar fertilidad.", AlertPriority.HIGH)
                elif days_postparto > 90:
                    trig(AlertType.REPRODUCTION, f" Período abierto prolongado: {days_postparto} días post-parto sin inseminación o monta.", AlertPriority.MEDIUM)

    # ── 3. NULÍPARA ───────────────────────────────────────────────────
    any_repro = ReproductiveEvent.query.filter_by(animal_id=animal.id).first()
    if not any_repro:
        if age_months >= 30:
            trig(AlertType.REPRODUCTION, f" Nulípara crítica: hembra de {age_months} meses sin ningún registro reproductivo. Evaluar fertilidad.", AlertPriority.HIGH)
        elif age_months >= 24:
            trig(AlertType.REPRODUCTION, f" Novilla de {age_months} meses sin inicio reproductivo. Considerar primer servicio.", AlertPriority.MEDIUM)
        elif 16 <= age_months < 24:
            trig(AlertType.REPRODUCTION, f" Novilla de {age_months} meses próxima a pubertad. Preparar para primer servicio.", AlertPriority.LOW)

    # ── 4. CELO ───────────────────────────────────────────────────────
    last_event = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type.in_([EventType.Celo, EventType.Inseminacion])).order_by(ReproductiveEvent.event_date.desc()).first()
    if last_event:
        days_ev = (today - last_event.event_date).days
        confirmed = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_date > last_event.event_date, ReproductiveEvent.event_type == EventType.Diagnostico, ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo).first()
        if not confirmed and 18 <= (days_ev % 21) <= 22:
            trig(AlertType.REPRODUCTION, f" Vigilancia de CELO: {days_ev} días desde último evento. Período probable de celo.", AlertPriority.MEDIUM)

    # ── 5. INTERVALO ENTRE PARTOS ─────────────────────────────────────
    births = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Parto).order_by(ReproductiveEvent.event_date.desc()).limit(2).all()
    if len(births) >= 2:
        interval_days = (births[0].event_date - births[1].event_date).days
        if interval_days > 548:
            trig(AlertType.REPRODUCTION, f" Intervalo entre partos de {interval_days} días (>18 meses). Meta: 12–14 meses. Revisar fertilidad.", AlertPriority.HIGH)
        elif interval_days > 456:
            trig(AlertType.REPRODUCTION, f" Intervalo entre partos de {interval_days} días (>15 meses). Ajustar manejo reproductivo.", AlertPriority.MEDIUM)

    # ── 6. TORO SEMENTAL ──────────────────────────────────────────────
    if age_months >= 18 and animal.sex == Sex.Macho:
        service_records = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Inseminacion).first()
        if not service_records:
            trig(AlertType.REPRODUCTION, f" Macho de {age_months} meses sin registros de servicio. Evaluar capacidad reproductiva.", AlertPriority.MEDIUM)

    # ── 7. DIAGNÓSTICO NEGATIVO → RE-INSEMINACIÓN ────────────────────
    last_neg_diag = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Diagnostico, ReproductiveEvent.diagnosis_result == DiagnosisResult.Negativo).order_by(ReproductiveEvent.event_date.desc()).first()
    if last_neg_diag:
        days_since_neg = (today - last_neg_diag.event_date).days
        if days_since_neg > 21:
            trig(AlertType.REPRODUCTION, f" Diagnóstico negativo hace {days_since_neg} días. Re-inseminar para no perder ciclo reproductivo.", AlertPriority.HIGH)
        elif days_since_neg > 14:
            trig(AlertType.REPRODUCTION, f" Diagnóstico negativo hace {days_since_neg} días. Preparar re-inseminación en próximos días.", AlertPriority.MEDIUM)

    # ── 8. REPEAT BREEDER ─────────────────────────────────────────────
    inseminations = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Inseminacion).all()
    positive_diags = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Diagnostico, ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo).all()
    if len(inseminations) >= 3 and len(positive_diags) == 0:
        trig(AlertType.REPRODUCTION, f" REPEAT BREEDER: {len(inseminations)} inseminaciones sin preñez confirmada. Evaluar fertilidad, toro y técnica.", AlertPriority.HIGH)
    elif len(inseminations) >= 5 and len(positive_diags) == 0:
        trig(AlertType.REPRODUCTION, f" REPEAT BREEDER CRÍTICO: {len(inseminations)} inseminaciones fallidas. Considerar descarte reproductivo.", AlertPriority.CRITICAL)

    # ── 9. PARTO VENCIDO ──────────────────────────────────────────────
    last_insem = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Inseminacion).order_by(ReproductiveEvent.event_date.desc()).first()
    if last_insem and last_insem.expected_birth_date:
        days_overdue = (today - last_insem.expected_birth_date).days
        if days_overdue > 14:
            trig(AlertType.REPRODUCTION, f" PARTO VENCIDO: {days_overdue} días past due date ({last_insem.expected_birth_date}). Riesgo de distocia o muerte fetal.", AlertPriority.CRITICAL)
        elif days_overdue > 7:
            trig(AlertType.REPRODUCTION, f" Parto retrasado: {days_overdue} días past due date. Vigilancia intensiva.", AlertPriority.HIGH)
        elif days_overdue > 0:
            trig(AlertType.REPRODUCTION, f" Parto vencido: {days_overdue} días past due date. Monitorear signos de parto.", AlertPriority.MEDIUM)

    # ── 10. COMPLICACIONES POST-PARTO ─────────────────────────────────
    last_birth_comp = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Parto, ReproductiveEvent.complications == True).order_by(ReproductiveEvent.event_date.desc()).first()
    if last_birth_comp:
        days_since_comp = (today - last_birth_comp.event_date).days
        if days_since_comp <= 3:
            trig(AlertType.HEALTH, f" POST-COMPLICACIÓN día {days_since_comp}: Revisión veterinaria obligatoria por complicaciones en parto.", AlertPriority.CRITICAL)
        elif days_since_comp <= 7:
            trig(AlertType.HEALTH, f" POST-COMPLICACIÓN día {days_since_comp}: Segunda revisión post-complicaciones. Verificar recuperación.", AlertPriority.HIGH)

    # ── 11. PARTO GEMELAR ─────────────────────────────────────────────
    recent_births = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Parto).order_by(ReproductiveEvent.event_date.desc()).limit(3).all()
    for birth in recent_births:
        if birth.alive_count and birth.alive_count > 1:
            days_since_twin = (today - birth.event_date).days
            if days_since_twin <= 7:
                trig(AlertType.REPRODUCTION, f" PARTO GEMELAR: {birth.alive_count} crías vivas. Manejo especial: doble calostro, monitoreo de hipocalcemia.", AlertPriority.HIGH)

    # ── 12. SECUENCIA INCONSISTENTE ───────────────────────────────────
    births_no_insem = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Parto).all()
    for birth in births_no_insem:
        prior_service = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type.in_([EventType.Inseminacion, EventType.Celo]), ReproductiveEvent.event_date < birth.event_date, ReproductiveEvent.event_date >= birth.event_date - timedelta(days=300)).first()
        if not prior_service:
            trig(AlertType.REPRODUCTION, f" Secuencia inconsistente: Parto registrado el {birth.event_date} sin inseminación o celo previo. ¿Monta natural no registrada?", AlertPriority.MEDIUM)


def _check_gestation(animal, today, age_months, trig):
    last_preg = ReproductiveEvent.query.filter(ReproductiveEvent.animal_id == animal.id, ReproductiveEvent.event_type == EventType.Diagnostico, ReproductiveEvent.diagnosis_result == DiagnosisResult.Positivo).order_by(ReproductiveEvent.event_date.desc()).first()
    if last_preg:
        days_gest = (today - last_preg.event_date).days
        if 0 < days_gest <= 290:
            hitos = [(30, "Confirmación de preñez (palpación o ecografía)."), (60, "Segunda confirmación y evaluación fetal."), (90, "Control de 1er tercio — revisar nutrición y condición corporal."), (150, "Control de 2do tercio — ajuste de suplementación."), (210, "Control de 3er tercio — preparación al parto."), (223, " INICIO DE SECADO obligatorio (60 días pre-parto)."), (250, "Trasladar a zona de maternidad o potrero de parto."), (270, "Alerta de parto inminente — vigilancia 24 horas."), (283, " FECHA ESTIMADA DE PARTO alcanzada.")]
            priorities_h = [AlertPriority.MEDIUM, AlertPriority.MEDIUM, AlertPriority.MEDIUM, AlertPriority.MEDIUM, AlertPriority.HIGH, AlertPriority.CRITICAL, AlertPriority.HIGH, AlertPriority.CRITICAL, AlertPriority.CRITICAL]
            for (m_day, m_msg), m_prio in zip(hitos, priorities_h):
                if abs(days_gest - m_day) <= 3:
                    trig(AlertType.REPRODUCTION, f" Gestación día {days_gest}: {m_msg}", m_prio)
