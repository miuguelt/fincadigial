"""
Reglas de alertas sanitarias y veterinarias.
"""

from datetime import date, timedelta
import logging
from app import db
from app.models.animals import Animals, Sex
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.reproduction import ReproductiveEvent, EventType, DiagnosisResult
from app.models.milk_production import MilkProduction
from app.models.vaccinations import Vaccinations as VacTable
from app.models.breed_growth_standards import BreedGrowthStandard
from app.models.animal_production_metrics import AnimalProductionMetrics, MetricType
from app.services.alert_engine import AlertEngine
from app.models.alerts import AlertType, AlertPriority
from sqlalchemy import or_

logger = logging.getLogger(__name__)


def evaluate_health_rules(animal, finca_id, trig, today, age_months) -> int:
    """Evalúa reglas sanitarias: vacunas, controles, enfermedades, post-parto."""
    # ── 1. CONTROLES SANITARIOS PERIÓDICOS ────────────────────────────
    last_ctrl = animal.controls.order_by(Control.checkup_date.desc()).first()
    days_ctrl = (today - last_ctrl.checkup_date).days if last_ctrl else 9999

    ctrl_crit = AlertEngine._get_param_int("control_days_critical")
    ctrl_high = AlertEngine._get_param_int("control_days_high")
    ctrl_med = AlertEngine._get_param_int("control_days_medium")
    if ctrl_crit is not None and days_ctrl > ctrl_crit:
        trig(
            AlertType.HEALTH,
            f" Control sanitario CRÍTICO: {days_ctrl} días sin revisión médica veterinaria.",
            AlertPriority.CRITICAL,
        )
    elif ctrl_high is not None and days_ctrl > ctrl_high:
        trig(
            AlertType.HEALTH,
            f" Control sanitario urgente: {days_ctrl} días sin revisión. Programar inmediatamente.",
            AlertPriority.HIGH,
        )
    elif ctrl_med is not None and days_ctrl > ctrl_med:
        trig(
            AlertType.HEALTH,
            f" Control sanitario vencido: {days_ctrl} días sin revisión médica.",
            AlertPriority.MEDIUM,
        )

    if not last_ctrl and age_months >= 3:
        trig(
            AlertType.HEALTH,
            " Sin historia clínica: el animal no tiene ningún control veterinario registrado.",
            AlertPriority.HIGH,
        )

    # ── 2. VACUNACIÓN ICA ─────────────────────────────────────────────
    _check_vaccine_ica(animal, today, age_months, trig)

    # ── 3. VACUNACIÓN IBR/DVB ─────────────────────────────────────────
    _check_vaccine_ibr_dvb(animal, today, age_months, trig)

    # ── 4. VACUNACIÓN CARBÓN BACTERIANO ───────────────────────────────
    _check_vaccine_carbon(animal, today, age_months, trig)

    # ── 5. VACUNACIÓN RABIA BOVINA ────────────────────────────────────
    _check_vaccine_rabia(animal, today, age_months, trig)

    # ── 6. DESPARASITACIÓN ────────────────────────────────────────────
    _check_deworming(animal, today, age_months, trig)

    # ── 7. VITAMINAS Y MINERALES ──────────────────────────────────────
    _check_vitamins_minerals(animal, today, age_months, trig)

    # ── 8. ENFERMEDADES ACTIVAS ───────────────────────────────────────
    active_diseases = animal.diseases.filter_by(status="Activo").all()
    for ad in active_diseases:
        disease_name = ad.disease.name if ad.disease else "desconocida"
        last_tx = (
            Treatments.query.filter_by(animal_id=animal.id)
            .order_by(Treatments.treatment_date.desc())
            .first()
        )
        days_tx = (today - last_tx.treatment_date).days if last_tx else 9999
        if days_tx >= 14:
            trig(
                AlertType.HEALTH,
                f" Enfermedad crónica activa: '{disease_name}' sin tratamiento reciente ({days_tx} días). Revisar evolución.",
                AlertPriority.HIGH,
            )
        elif days_tx >= 2:
            trig(
                AlertType.HEALTH,
                f" Enfermedad activa '{disease_name}' requiere revisión clínica y plan de tratamiento.",
                AlertPriority.HIGH,
            )

    # ── 9. VACUNA CLOSTRIDIAL ─────────────────────────────────────────
    _check_vaccine_clostridial(animal, today, age_months, trig)

    # ── 10. POST-PARTO ─────────────────────────────────────────────────
    _check_postpartum(animal, today, trig)

    # ── 11. VACUNACIONES (tabla Vaccinations) ──────────────────────────
    last_vac = (
        VacTable.query.filter_by(animal_id=animal.id)
        .order_by(VacTable.vaccination_date.desc())
        .first()
    )
    if last_vac:
        days_vac = (today - last_vac.vaccination_date).days
        if days_vac > 210:
            trig(
                AlertType.HEALTH,
                f" Última vacunación registrada hace {days_vac} días. Revisar calendario vacunal completo.",
                AlertPriority.HIGH,
            )
        elif days_vac > 180:
            trig(
                AlertType.HEALTH,
                f" Vacunación próxima a vencer ({days_vac} días desde última aplicación). Programar refuerzo.",
                AlertPriority.MEDIUM,
            )

    # ── 12. COMPOSITA: enfermedad + pérdida de peso ───────────────────
    all_ctrls = (
        animal.controls.filter(Control.weight.isnot(None))
        .order_by(Control.checkup_date)
        .all()
    )
    if active_diseases and len(all_ctrls) >= 2:
        w_cur = all_ctrls[-1].weight
        w_prev = all_ctrls[-2].weight
        if w_cur and w_prev and w_prev > 0:
            loss_pct = (w_prev - w_cur) / w_prev * 100
            if loss_pct >= 3:
                disease_names = ", ".join(
                    [d.disease.name for d in active_diseases if d.disease]
                )
                trig(
                    AlertType.HEALTH,
                    f" ENFERMEDAD + PÉRDIDA DE PESO: '{disease_names}' activa con caída de {loss_pct:.1f}% ({w_prev}→{w_cur} kg).",
                    AlertPriority.CRITICAL,
                )

    # ── 13. ESTRÉS TÉRMICO ────────────────────────────────────────────
    _check_heat_stress(animal, finca_id, age_months, trig)

    # ── 14. MASTITIS ──────────────────────────────────────────────────
    _check_mastitis(animal, today, age_months, trig)


def _check_vaccine_ica(animal, today, age_months, trig):
    last_ica = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%aftosa%"),
                Treatments.description.ilike("%brucela%"),
                Treatments.description.ilike("%brucelosis%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_ica:
        days_ica = (today - last_ica.treatment_date).days
        ica_days = AlertEngine._get_param_int("ica_vaccine_days")
        if ica_days is not None and days_ica > ica_days:
            trig(
                AlertType.HEALTH,
                f" Vacunación ICA VENCIDA ({days_ica} días). Aftosa/Brucelosis obligatoria — riesgo legal.",
                AlertPriority.CRITICAL,
            )
        elif (ica_days - 15) <= days_ica <= ica_days:
            trig(
                AlertType.HEALTH,
                f" Vacunación ICA próxima a vencer (en {ica_days - days_ica} días). Programar con anticipación.",
                AlertPriority.HIGH,
            )
    else:
        trig(
            AlertType.HEALTH,
            " Sin vacunación ICA: no hay registro de Aftosa ni Brucelosis. Incumplimiento sanitario.",
            AlertPriority.CRITICAL,
        )


def _check_vaccine_ibr_dvb(animal, today, age_months, trig):
    last_ibr = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%ibr%"),
                Treatments.description.ilike("%dvb%"),
                Treatments.description.ilike("%rinotra%"),
                Treatments.description.ilike("%diarrea viral%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_ibr:
        if (today - last_ibr.treatment_date).days > 365:
            trig(
                AlertType.HEALTH,
                " Vacuna IBR/DVB vencida (>1 año). Renovar para proteger contra enfermedades respiratorias.",
                AlertPriority.HIGH,
            )
    elif age_months >= 4:
        trig(
            AlertType.HEALTH,
            " Sin vacuna IBR/DVB registrada. Recomendado para hatos mayores de 4 meses.",
            AlertPriority.MEDIUM,
        )


def _check_vaccine_carbon(animal, today, age_months, trig):
    last_carbon = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%carbón%"),
                Treatments.description.ilike("%carbon%"),
                Treatments.description.ilike("%anthrax%"),
                Treatments.description.ilike("%carbunco%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_carbon:
        if (today - last_carbon.treatment_date).days > 180:
            trig(
                AlertType.HEALTH,
                " Vacuna carbón bacteriano vencida (>6 meses). Aplicar cada 6 meses en zonas endémicas.",
                AlertPriority.HIGH,
            )
    elif age_months >= 3:
        trig(
            AlertType.HEALTH,
            " Sin vacuna carbón bacteriano registrada. Obligatoria en zonas endémicas colombianas.",
            AlertPriority.MEDIUM,
        )


def _check_vaccine_rabia(animal, today, age_months, trig):
    last_rabia = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%rabia%"),
                Treatments.description.ilike("%derriengue%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_rabia:
        if (today - last_rabia.treatment_date).days > 365:
            trig(
                AlertType.HEALTH,
                " Vacuna antirrábica bovina vencida (>1 año). Requerida en zonas con murciélagos.",
                AlertPriority.MEDIUM,
            )
    elif age_months >= 3:
        trig(
            AlertType.HEALTH,
            " Sin vacuna antirrábica registrada. Aplicar en zonas de riesgo (ICA Colombia).",
            AlertPriority.LOW,
        )


def _check_deworming(animal, today, age_months, trig):
    last_desp = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%desparasit%"),
                Treatments.description.ilike("%antiparasit%"),
                Treatments.description.ilike("%ivermectin%"),
                Treatments.description.ilike("%albendazol%"),
                Treatments.description.ilike("%levamisol%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_desp:
        days_desp = (today - last_desp.treatment_date).days
        if days_desp > 150:
            trig(
                AlertType.HEALTH,
                f" Desparasitación URGENTE ({days_desp} días sin tratamiento antiparasitario).",
                AlertPriority.HIGH,
            )
        elif days_desp > 120:
            trig(
                AlertType.HEALTH,
                f" Desparasitación pendiente ({days_desp} días). Recomendado cada 90–120 días.",
                AlertPriority.MEDIUM,
            )
    else:
        trig(
            AlertType.HEALTH,
            " Sin desparasitación registrada. La parasitosis reduce hasta 30% la productividad.",
            AlertPriority.HIGH,
        )


def _check_vitamins_minerals(animal, today, age_months, trig):
    last_mineral = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%mineral%"),
                Treatments.description.ilike("%vitamina%"),
                Treatments.description.ilike("%complejo b%"),
                Treatments.description.ilike("%calcio%"),
                Treatments.description.ilike("%fosforo%"),
                Treatments.description.ilike("%fósforo%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_mineral:
        if (today - last_mineral.treatment_date).days > 180:
            trig(
                AlertType.HEALTH,
                " Suplementación mineral/vitamínica vencida (>6 meses). Evaluar estado nutricional.",
                AlertPriority.MEDIUM,
            )
    elif age_months >= 6:
        trig(
            AlertType.HEALTH,
            " Sin registro de suplementación mineral. Deficiencias afectan reproducción y crecimiento.",
            AlertPriority.LOW,
        )


def _check_vaccine_clostridial(animal, today, age_months, trig):
    last_clost = (
        Treatments.query.filter(
            Treatments.animal_id == animal.id,
            or_(
                Treatments.description.ilike("%clostridial%"),
                Treatments.description.ilike("%clostridi%"),
                Treatments.description.ilike("%enterotoxemia%"),
                Treatments.description.ilike("%edema malign%"),
            ),
        )
        .order_by(Treatments.treatment_date.desc())
        .first()
    )
    if last_clost:
        if (today - last_clost.treatment_date).days > 365:
            trig(
                AlertType.HEALTH,
                " Vacuna clostridial vencida (>1 año). Renovar para prevenir enterotoxemia y muerte súbita.",
                AlertPriority.HIGH,
            )
    elif age_months >= 2:
        trig(
            AlertType.HEALTH,
            " Sin vacuna clostridial registrada. Recomendada desde 2 meses para prevenir muerte súbita.",
            AlertPriority.MEDIUM,
        )


def _check_postpartum(animal, today, trig):
    if animal.sex == Sex.Hembra:
        last_birth_event = (
            ReproductiveEvent.query.filter(
                ReproductiveEvent.animal_id == animal.id,
                ReproductiveEvent.event_type == EventType.Parto,
            )
            .order_by(ReproductiveEvent.event_date.desc())
            .first()
        )
        if last_birth_event:
            days_postparto = (today - last_birth_event.event_date).days
            if 0 <= days_postparto <= 3:
                trig(
                    AlertType.HEALTH,
                    f" POST-PARTO día {days_postparto}: Verificar expulsión de placenta. Retención >12h = emergencia.",
                    AlertPriority.CRITICAL,
                )
                trig(
                    AlertType.HEALTH,
                    f" POST-PARTO día {days_postparto}: Confirmar que el ternero recibió calostro en primeras 6 horas.",
                    AlertPriority.CRITICAL,
                )
            elif 1 <= days_postparto <= 5:
                trig(
                    AlertType.HEALTH,
                    f" POST-PARTO día {days_postparto}: Vigilar hipocalcemia (fiebre de leche). Síntomas: debilidad, tambaleo.",
                    AlertPriority.HIGH,
                )
            elif 3 <= days_postparto <= 14:
                trig(
                    AlertType.HEALTH,
                    f" POST-PARTO día {days_postparto}: Revisar signos de metritis (fiebre, descarga fétida). Crítico días 3-14.",
                    AlertPriority.HIGH,
                )
            if 7 <= days_postparto <= 14:
                trig(
                    AlertType.HEALTH,
                    f" POST-PARTO día {days_postparto}: Revisión mastitis subclínica. Realizar California Mastitis Test.",
                    AlertPriority.MEDIUM,
                )
            if days_postparto == 21:
                trig(
                    AlertType.REPRODUCTION,
                    " POST-PARTO día 21: Vigilar primer celo post-parto. Registrar si se observa.",
                    AlertPriority.MEDIUM,
                )


def _check_heat_stress(animal, finca_id, age_months, trig):
    es_vulnerable = (animal.sex == Sex.Hembra and age_months >= 24) or (age_months < 12)
    if es_vulnerable:
        weather_data = AlertEngine.get_finca_weather(finca_id)
        if weather_data is None:
            weather_data = AlertEngine._get_weather_fallback(finca_id)
        if weather_data:
            current_temp = weather_data.get("temp")
            current_humidity = weather_data.get("humidity")
            if current_temp is not None and current_humidity is not None:
                thi = (1.8 * current_temp + 32) - (
                    (0.55 - 0.0055 * current_humidity) * (1.8 * current_temp - 26)
                )
                if thi >= 89:
                    trig(
                        AlertType.HEALTH,
                        f" ESTRÉS TÉRMICO CRÍTICO (THI {thi:.1f}): Peligro inminente. Suspender manejo, proveer sombra y agua fresca.",
                        AlertPriority.CRITICAL,
                    )
                elif thi >= 79:
                    trig(
                        AlertType.HEALTH,
                        f" ALERTA CLIMA: Estrés térmico severo (THI {thi:.1f}). Posible reducción de producción láctea.",
                        AlertPriority.HIGH,
                    )
                elif thi >= 72:
                    trig(
                        AlertType.HEALTH,
                        f" Clima: Estrés térmico leve (THI {thi:.1f}). Observar frecuencia respiratoria.",
                        AlertPriority.MEDIUM,
                    )


def _check_mastitis(animal, today, age_months, trig):
    if animal.sex == Sex.Hembra and age_months >= 24:
        recent_milk_somatic = (
            MilkProduction.query.filter(
                MilkProduction.animal_id == animal.id,
                MilkProduction.somatic_cells.isnot(None),
                MilkProduction.somatic_cells > 0,
            )
            .order_by(MilkProduction.date.desc())
            .limit(3)
            .all()
        )
        if recent_milk_somatic:
            latest_somatic = recent_milk_somatic[0].somatic_cells
            avg_somatic = sum(m.somatic_cells for m in recent_milk_somatic) / len(
                recent_milk_somatic
            )
            for key, prio in [
                ("somatic_cells_critical", AlertPriority.CRITICAL),
                ("somatic_cells_high", AlertPriority.HIGH),
                ("somatic_cells_medium", AlertPriority.MEDIUM),
            ]:
                val = AlertEngine._get_param(key)
                if val is not None and latest_somatic > int(val):
                    label = (
                        "MASTITIS CRÍTICA"
                        if prio == AlertPriority.CRITICAL
                        else "MASTITIS"
                        if prio == AlertPriority.HIGH
                        else "Células somáticas elevadas"
                    )
                    trig(
                        AlertType.HEALTH,
                        f" {label}: Células somáticas {latest_somatic:,}. {'Tratamiento inmediato' if prio == AlertPriority.CRITICAL else 'Monitorear'}.",
                        prio,
                    )
            if avg_somatic > 400000 and len(recent_milk_somatic) >= 2:
                trig(
                    AlertType.HEALTH,
                    f" Células somáticas sostenidamente altas (promedio: {avg_somatic:,.0f}). Posible mastitis crónica.",
                    AlertPriority.HIGH,
                )
