"""
Reglas de alertas de crecimiento (peso, ADG, BCS, proyección).
"""
from datetime import date, timedelta
import logging
from app import db
from app.models.animals import Animals, Sex
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.reproduction import ReproductiveEvent, EventType
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage
from app.models.body_condition_scores import BodyConditionScore
from app.models.seasonal_adjustments import SeasonalAdjustment
from app.models.animalFields import AnimalFields
from app.services.alert_engine import AlertEngine
from app.models.alerts import AlertType, AlertPriority
from sqlalchemy import or_
import re

logger = logging.getLogger(__name__)


def evaluate_growth_rules(animal, finca_id, trig, today, age_months) -> int:
    """Evalúa reglas de crecimiento: peso, ADG, BCS, proyección, destete, castración."""
    # ── 1. IDENTIFICACIÓN ─────────────────────────────────────────────
    if not animal.record or not str(animal.record).strip():
        trig(AlertType.STATUS, " Sin identificación: el animal no tiene número de registro o arete.", AlertPriority.HIGH)

    # ── 2. CONSANGUINIDAD ─────────────────────────────────────────────
    if animal.father and animal.mother:
        if ((animal.father.idFather == animal.mother.idFather and animal.father.idFather) or (animal.father.idMother == animal.mother.idMother and animal.father.idMother)):
            trig(AlertType.CUSTOM, " Consanguinidad ALTA: padres son medios hermanos. Revisar plan de cruces.", AlertPriority.HIGH)
        if (animal.father.id == animal.mother.idFather) or (animal.mother.id == animal.father.idMother):
            trig(AlertType.CUSTOM, " Consanguinidad CRÍTICA: cruce directo abuelo/a — alto riesgo genético.", AlertPriority.CRITICAL)

    # ── 3. PÉRDIDA DE PESO ───────────────────────────────────────────
    _check_weight_loss(animal, age_months, trig)

    # ── 4. TERNERO — PRIMER AÑO ───────────────────────────────────────
    if age_months < 12:
        controls_count = animal.controls.count()
        if controls_count == 0 and age_months >= 1:
            trig(AlertType.GROWTH, f" Ternero de {age_months} meses sin ningún control de crecimiento. Requerido mensual.", AlertPriority.HIGH)
        elif controls_count < (age_months // 2) and age_months >= 4:
            trig(AlertType.GROWTH, f" Ternero de {age_months} meses con solo {controls_count} controles. Realizar seguimiento mensual.", AlertPriority.MEDIUM)

    # ── 5. DESTETE ────────────────────────────────────────────────────
    if 5 <= age_months <= 8:
        destete = Treatments.query.filter(Treatments.animal_id == animal.id, or_(Treatments.description.ilike('%destete%'), Treatments.description.ilike('%weaning%'))).first()
        if not destete:
            trig(AlertType.GROWTH, f" Destete pendiente: ternero de {age_months} meses. Registrar procedimiento (5–8 meses).", AlertPriority.MEDIUM)

    # ── 6. CASTRACIÓN ─────────────────────────────────────────────────
    if animal.sex == Sex.Macho and 6 <= age_months <= 9:
        castrado = Treatments.query.filter(Treatments.animal_id == animal.id, or_(Treatments.description.ilike('%castrac%'), Treatments.description.ilike('%orquiect%'))).first()
        if not castrado:
            trig(AlertType.STATUS, f" Castración recomendada: macho de {age_months} meses (rango óptimo 6–9 meses).", AlertPriority.MEDIUM)

    # ── 7. POTRERO — ROTACIÓN ─────────────────────────────────────────
    _check_field_rotation(animal, today, age_months, trig)

    # ── 8. VEJEZ ──────────────────────────────────────────────────────
    if age_months >= 144:
        trig(AlertType.STATUS, f" Animal anciano ({age_months // 12} años). Evaluar retiro y bienestar animal.", AlertPriority.MEDIUM)
    elif age_months >= 120:
        trig(AlertType.STATUS, f" Animal geriátrico ({age_months // 12} años). Monitoreo especial: dental, articulaciones y productividad.", AlertPriority.LOW)

    # ── 9. PESO SIN ACTUALIZAR ────────────────────────────────────────
    _check_stale_weight(animal, today, age_months, trig)

    # ── 10. CURVA POR RAZA ────────────────────────────────────────────
    all_controls = animal.controls.filter(Control.weight.isnot(None)).order_by(Control.checkup_date).all()
    if len(all_controls) >= 2 and animal.breeds_id:
        _check_breed_standard(animal, all_controls, age_months, trig)

    # ── 11. ADG SOSTENIDO BAJO ────────────────────────────────────────
        _check_adg_sustained(animal, all_controls, finca_id, trig)

    # ── 12. PROYECCIÓN FORWARD ────────────────────────────────────────
        _check_forward_projection(animal, all_controls, trig)

    # ── 13. BCS BAJO ──────────────────────────────────────────────────
    _check_bcs_low(animal, trig)

    # ── 14. BCS TENDENCIA NEGATIVA ────────────────────────────────────
    _check_bcs_trend(animal, trig)

    # ── 15. SIN CONTROLES >90 DÍAS ────────────────────────────────────
    if len(all_controls) >= 1:
        days_since_last = (today - all_controls[-1].checkup_date).days
        if days_since_last > 120:
            trig(AlertType.GROWTH, f" Sin control de peso hace {days_since_last} días. Realizar pesaje para evaluar tendencia.", AlertPriority.HIGH)
        elif days_since_last > 90:
            trig(AlertType.GROWTH, f" Último control de peso hace {days_since_last} días. Programar nuevo pesaje.", AlertPriority.MEDIUM)

    # ── 16. POST-TRATAMIENTO VENTANA DE GRACIA ────────────────────────
    last_treatment = Treatments.query.filter_by(animal_id=animal.id).order_by(Treatments.treatment_date.desc()).first()
    if last_treatment and len(all_controls) >= 2:
        days_since_tx = (today - last_treatment.treatment_date).days
        if days_since_tx <= 14:
            w_cur = all_controls[-1].weight
            w_prev = all_controls[-2].weight
            if w_cur and w_prev and w_prev > 0:
                loss_pct = (w_prev - w_cur) / w_prev * 100
                if 3 <= loss_pct < 5:
                    pass  # Suprimida: esperada post-tratamiento

    # ── 17. ESTACIONALIDAD AJUSTADA ───────────────────────────────────
    if finca_id and len(all_controls) >= 2:
        sa = SeasonalAdjustment.get_current(finca_id)
        if sa and sa.adg_multiplier < 0.9:
            weights_s = [c.weight for c in all_controls if c.weight]
            dates_s = [c.checkup_date for c in all_controls if c.weight]
            if len(weights_s) >= 2:
                days_s = (dates_s[-1] - dates_s[0]).days
                if days_s > 0:
                    adg_s = (weights_s[-1] - weights_s[0]) / days_s
                    if adg_s < 0.1:
                        pass  # Silenciosa por ahora


def _check_weight_loss(animal, age_months, trig):
    last_controls = animal.controls.order_by(Control.checkup_date.desc()).limit(2).all()
    if len(last_controls) >= 2:
        w_actual, w_prev = last_controls[0].weight, last_controls[1].weight
        if w_actual and w_prev and w_prev > 0:
            diff_pct = (w_prev - w_actual) / w_prev * 100
            wl_severe = AlertEngine._get_param('weight_loss_severe_pct')
            wl_high = AlertEngine._get_param('weight_loss_high_pct')
            if wl_severe is not None and diff_pct >= wl_severe:
                trig(AlertType.GROWTH, f" Pérdida severa de peso: -{diff_pct:.1f}% ({w_prev}→{w_actual} kg). Revisar urgente.", AlertPriority.CRITICAL)
            elif wl_high is not None and diff_pct >= wl_high:
                trig(AlertType.GROWTH, f" Pérdida de peso detectada: -{diff_pct:.1f}% ({w_prev}→{w_actual} kg). Revisar nutrición.", AlertPriority.HIGH)


def _check_field_rotation(animal, today, age_months, trig):
    active_af = animal.animal_fields.filter_by(removal_date=None).first()
    if active_af:
        days_field = (today - active_af.assignment_date).days
        if days_field > 25:
            trig(AlertType.STATUS, f" Rotación CRÍTICA: {days_field} días en '{active_af.field.name}'. Deterioro de pasturas.", AlertPriority.HIGH)
        elif days_field > 15:
            trig(AlertType.STATUS, f" Rotación pendiente: {days_field} días en '{active_af.field.name}'. Rotar antes de día 21.", AlertPriority.MEDIUM)
        try:
            m = re.search(r'(\d+)', str(active_af.field.capacity))
            if m:
                cap = int(m.group(1))
                current = AnimalFields.query.join(Animals).filter(AnimalFields.field_id == active_af.field.id, AnimalFields.removal_date == None, AnimalFields.is_deleted == False, Animals.is_deleted == False, Animals.status == AnimalStatus.Vivo).count()
                if current > cap:
                    trig(AlertType.STATUS, f" Sobre-capacidad: '{active_af.field.name}' tiene {current}/{cap} animales. Riesgo de degradación.", AlertPriority.HIGH)
        except Exception:
            pass
    elif age_months >= 3:
        trig(AlertType.STATUS, f" Animal sin potrero asignado: bovino de {age_months} meses sin campo activo.", AlertPriority.MEDIUM)


def _check_stale_weight(animal, today, age_months, trig):
    last_ctrl_peso = animal.controls.filter(Control.weight.isnot(None)).order_by(Control.checkup_date.desc()).first()
    if not last_ctrl_peso and age_months >= 3:
        trig(AlertType.GROWTH, " Sin registro de peso en historial clínico. Pesar en próximo control veterinario.", AlertPriority.MEDIUM)
    elif last_ctrl_peso:
        days_peso = (today - last_ctrl_peso.checkup_date).days
        if days_peso > 180:
            trig(AlertType.GROWTH, f" Último peso registrado hace {days_peso} días. Realizar control de peso cada 60-90 días.", AlertPriority.MEDIUM)


def _check_breed_standard(animal, all_controls, age_months, trig):
    expected_w, min_w, expected_adg = BreedGrowthStandard.get_expected_weight(animal.breeds_id, animal.sex.value, age_months)
    if expected_w and all_controls[-1].weight:
        actual_w = all_controls[-1].weight
        deviation_pct = (actual_w - expected_w) / expected_w * 100
        if deviation_pct < -25:
            trig(AlertType.GROWTH, f" Peso CRÍTICO vs raza: {actual_w} kg (esperado {expected_w} kg, -{abs(deviation_pct):.0f}%). Muy por debajo del estándar.", AlertPriority.CRITICAL)
        elif deviation_pct < -15:
            trig(AlertType.GROWTH, f" Peso bajo vs raza: {actual_w} kg (esperado {expected_w} kg, -{abs(deviation_pct):.0f}%). Revisar nutrición y sanidad.", AlertPriority.HIGH)
        elif deviation_pct < -10:
            trig(AlertType.GROWTH, f" Peso ligeramente bajo vs raza: {actual_w} kg (esperado {expected_w} kg, -{abs(deviation_pct):.0f}%). Monitorear.", AlertPriority.MEDIUM)


def _check_adg_sustained(animal, all_controls, finca_id, trig):
    if len(all_controls) >= 3:
        weights = [c.weight for c in all_controls if c.weight]
        dates = [c.checkup_date for c in all_controls if c.weight]
        if len(weights) >= 3 and len(dates) >= 3:
            total_days = (dates[-1] - dates[0]).days
            if total_days > 0:
                actual_adg = (weights[-1] - weights[0]) / total_days
                _, _, expected_adg = BreedGrowthStandard.get_expected_weight(animal.breeds_id, animal.sex.value, animal.age_in_months or 0) if animal.breeds_id else (None, None, None)
                seasonal_mult = 1.0
                if finca_id:
                    sa = SeasonalAdjustment.get_current(finca_id)
                    if sa:
                        seasonal_mult = sa.adg_multiplier
                adjusted_expected_adg = (expected_adg or 0.5) * seasonal_mult
                if actual_adg < 0 and abs(actual_adg) > 0.05:
                    trig(AlertType.GROWTH, f" ADG NEGATIVO: {actual_adg:.3f} kg/día. El animal está perdiendo peso sostenidamente.", AlertPriority.CRITICAL)
                elif actual_adg < adjusted_expected_adg * 0.4:
                    trig(AlertType.GROWTH, f" ADG muy bajo: {actual_adg:.3f} kg/día (esperado ≥{adjusted_expected_adg:.3f}). Rendimiento <40% del esperado.", AlertPriority.HIGH)
                elif actual_adg < adjusted_expected_adg * 0.6:
                    trig(AlertType.GROWTH, f" ADG bajo: {actual_adg:.3f} kg/día (esperado ≥{adjusted_expected_adg:.3f}). Rendimiento <60% del esperado.", AlertPriority.MEDIUM)


def _check_forward_projection(animal, all_controls, trig):
    if len(all_controls) >= 2 and animal.birth_date:
        weights_proj = [c.weight for c in all_controls if c.weight]
        dates_proj = [c.checkup_date for c in all_controls if c.weight]
        if len(weights_proj) >= 2:
            days_obs = (dates_proj[-1] - dates_proj[0]).days
            if days_obs > 0:
                current_adg = (weights_proj[-1] - weights_proj[0]) / days_obs
                current_age = animal.age_in_months or 0
                projected_weight_12m = weights_proj[-1] + current_adg * (12 - current_age) * 30.44
                if current_age < 12 and projected_weight_12m > 0:
                    _, min_12m, _ = BreedGrowthStandard.get_expected_weight(animal.breeds_id, animal.sex.value, 12) if animal.breeds_id else (None, None, None)
                    if min_12m and projected_weight_12m < min_12m * 0.8:
                        trig(AlertType.GROWTH, f" Proyección a 12 meses: {projected_weight_12m:.0f} kg (mínimo esperado {min_12m:.0f} kg). Riesgo de bajo rendimiento.", AlertPriority.HIGH)


def _check_bcs_low(animal, trig):
    latest_bcs = BodyConditionScore.get_latest(animal.id)
    if latest_bcs:
        for key, prio in [('bcs_critical', AlertPriority.CRITICAL), ('bcs_high', AlertPriority.HIGH), ('bcs_medium', AlertPriority.MEDIUM), ('bcs_obese', AlertPriority.MEDIUM)]:
            val = AlertEngine._get_param(key)
            if val is not None:
                threshold = int(val)
                if key == 'bcs_obese':
                    if latest_bcs.score >= threshold:
                        trig(AlertType.GROWTH, f" BCS obeso: {latest_bcs.score}/9 ({latest_bcs.category}). Riesgo de problemas metabólicos y reproductivos.", prio)
                elif latest_bcs.score <= threshold:
                    label = "CRÍTICO" if prio == AlertPriority.CRITICAL else "bajo" if prio == AlertPriority.HIGH else "por debajo de ideal"
                    trig(AlertType.GROWTH, f" BCS {label}: {latest_bcs.score}/9 ({latest_bcs.category}). {'Riesgo de muerte por emaciación. Intervención urgente.' if prio == AlertPriority.CRITICAL else 'Incrementar suplementación y revisar sanidad.' if prio == AlertPriority.HIGH else 'Monitorear tendencia.'}", prio)


def _check_bcs_trend(animal, trig):
    if BodyConditionScore.get_latest(animal.id):
        bcs_trend = BodyConditionScore.get_trend(animal.id, days=90)
        if len(bcs_trend) >= 2:
            bcs_drop = bcs_trend[0].score - bcs_trend[-1].score
            if bcs_drop >= 1.5:
                trig(AlertType.GROWTH, f" BCS en caída: {bcs_trend[-1].score}→{bcs_trend[0].score} en 90 días (-{bcs_drop:.1f} puntos). Revisar nutrición urgente.", AlertPriority.HIGH)
