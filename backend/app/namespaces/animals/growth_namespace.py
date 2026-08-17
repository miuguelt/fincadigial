"""
Endpoints de curvas de crecimiento: análisis de peso/talla por animal.
Usa los registros existentes de la tabla `control`.
Ahora soporta curvas específicas por raza y proyección forward.
"""

import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from datetime import date, timedelta

from app.models.animals import Animals, AnimalStatus, Sex
from app.models.control import Control
from app.models.breed_growth_standards import BreedGrowthStandard, GrowthStage
from app.models.seasonal_adjustments import SeasonalAdjustment
from app.models.body_condition_scores import BodyConditionScore
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

growth_ns = Namespace(
    "growth", description="📈 Curvas de crecimiento y análisis de peso/talla"
)


def _get_generic_ref_points():
    """Obtiene la curva de referencia genérica desde system_contents o usa fallback."""
    from app.models.system_content import SystemContent

    entry = SystemContent.get_by_key("reference_curve.generic")
    if entry and entry.extra and isinstance(entry.extra, list):
        return [
            (p["age"], p["weight"]) for p in entry.extra if "age" in p and "weight" in p
        ]
    return [
        (0, 35),
        (1, 52),
        (2, 70),
        (3, 90),
        (4, 110),
        (5, 132),
        (6, 155),
        (7, 172),
        (8, 187),
        (9, 200),
        (10, 212),
        (11, 222),
        (12, 232),
        (15, 262),
        (18, 290),
        (21, 318),
        (24, 345),
        (30, 390),
        (36, 430),
        (48, 475),
        (60, 500),
    ]


def _expected_weight_generic(age_months: float) -> float:
    """Interpola linealmente en la curva de referencia bovina genérica desde DB."""
    points = _get_generic_ref_points()
    if not points:
        return 35.0
    if age_months <= 0:
        return points[0][1]
    for i in range(len(points) - 1):
        m0, w0 = points[i]
        m1, w1 = points[i + 1]
        if m0 <= age_months <= m1:
            t = (age_months - m0) / (m1 - m0)
            return round(w0 + t * (w1 - w0), 1)
    return points[-1][1]


def _expected_weight(animal, age_months: float) -> tuple:
    """Obtiene peso esperado usando curva de raza si existe, sino genérica.
    Retorna: (expected_weight, min_weight, expected_adg)"""
    if animal.breeds_id and animal.sex:
        expected, min_w, adg = BreedGrowthStandard.get_expected_weight(
            animal.breeds_id, animal.sex.value, age_months
        )
        if expected is not None:
            return expected, min_w, adg
    return _expected_weight_generic(age_months), None, None


def _linear_trend(xs, ys):
    """Regresión lineal simple. Retorna pendiente (kg/día)."""
    n = len(xs)
    if n < 2:
        return None
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_xx = sum(x * x for x in xs)
    denom = n * sum_xx - sum_x**2
    if denom == 0:
        return None
    return (n * sum_xy - sum_x * sum_y) / denom


def _get_growth_stage(age_months: float) -> GrowthStage:
    """Determina la etapa de crecimiento según la edad."""
    if age_months < 1:
        return GrowthStage.Neonato
    elif age_months < 6:
        return GrowthStage.Lactancia
    elif age_months < 12:
        return GrowthStage.Destete
    elif age_months < 24:
        return GrowthStage.Desarrollo
    else:
        return GrowthStage.Adulto


def _build_animal_growth(animal, controls):
    """Construye el objeto de crecimiento para un animal dado sus controles."""
    today = date.today()

    sorted_controls = sorted(controls, key=lambda c: c.checkup_date)

    data_points = []
    for c in sorted_controls:
        age_months = (
            max(0, round((c.checkup_date - animal.birth_date).days / 30.44, 1))
            if animal.birth_date
            else None
        )
        expected_w, min_w, expected_adg = (
            _expected_weight(animal, age_months)
            if age_months is not None
            else (None, None, None)
        )
        data_points.append(
            {
                "date": c.checkup_date.isoformat(),
                "weight": c.weight,
                "height": c.height,
                "health_status": c.health_status.value if c.health_status else None,
                "age_months": age_months,
                "expected_weight": expected_w,
                "min_weight": min_w,
                "expected_adg": expected_adg,
                "deviation_pct": round((c.weight - expected_w) / expected_w * 100, 1)
                if (c.weight and expected_w)
                else None,
                "growth_stage": _get_growth_stage(age_months).value
                if age_months is not None
                else None,
            }
        )

    weights = [c.weight for c in sorted_controls if c.weight]
    first_w = weights[0] if weights else None
    last_w = weights[-1] if weights else None
    total_gain = round(last_w - first_w, 1) if (first_w and last_w) else None

    adg = None
    if len(sorted_controls) >= 2:
        first_c = sorted_controls[0]
        last_c = sorted_controls[-1]
        days = (last_c.checkup_date - first_c.checkup_date).days
        if days > 0 and first_c.weight and last_c.weight:
            adg = round((last_c.weight - first_c.weight) / days, 3)

    slope = None
    if len(sorted_controls) >= 2 and sorted_controls[0].weight:
        base_date = sorted_controls[0].checkup_date
        xs = [(c.checkup_date - base_date).days for c in sorted_controls if c.weight]
        ys = [c.weight for c in sorted_controls if c.weight]
        slope = _linear_trend(xs, ys)

    trend = "sin_datos"
    if slope is not None:
        if slope > 0.2:
            trend = "positivo"
        elif slope > -0.05:
            trend = "estancado"
        else:
            trend = "negativo"

    current_deviation = None
    current_expected = None
    current_min = None
    if animal.birth_date and last_w:
        age_now = (today - animal.birth_date).days / 30.44
        current_expected, current_min, _ = _expected_weight(animal, age_now)
        if current_expected:
            current_deviation = round(
                (last_w - current_expected) / current_expected * 100, 1
            )

    score = 50
    if trend == "positivo":
        score += 25
    elif trend == "negativo":
        score -= 30
    if current_deviation is not None:
        if current_deviation >= 10:
            score += 25
        elif current_deviation >= -10:
            score += 10
        elif current_deviation < -20:
            score -= 20

    score = max(0, min(100, score))

    projected_weight_12m = None
    if adg is not None and animal.birth_date:
        age_now = (today - animal.birth_date).days / 30.44
        if age_now < 12:
            months_to_12 = 12 - age_now
            projected_weight_12m = (
                round(last_w + adg * months_to_12 * 30.44, 1) if last_w else None
            )

    ref_curve = []
    if animal.birth_date:
        max_age = max(
            (
                (sorted_controls[-1].checkup_date if sorted_controls else today)
                - animal.birth_date
            ).days
            / 30.44,
            (today - animal.birth_date).days / 30.44,
        )
        max_age = min(int(max_age) + 3, 60)
        for m in range(0, max_age + 1, 1 if max_age <= 24 else 3):
            exp_w, min_w, _ = _expected_weight(animal, m)
            ref_curve.append(
                {
                    "months": m,
                    "expected_weight": exp_w,
                    "min_weight": min_w,
                }
            )

    latest_bcs = BodyConditionScore.get_latest(animal.id)

    return {
        "animal_id": animal.id,
        "animal_record": animal.record,
        "sex": animal.sex.value if animal.sex else None,
        "breed_id": animal.breeds_id,
        "birth_date": animal.birth_date.isoformat() if animal.birth_date else None,
        "age_months": round((today - animal.birth_date).days / 30.44, 1)
        if animal.birth_date
        else None,
        "current_weight": animal.weight,
        "controls_count": len(sorted_controls),
        "data_points": data_points,
        "reference_curve": ref_curve,
        "current_bcs": {
            "score": latest_bcs.score,
            "category": latest_bcs.category,
            "date": latest_bcs.score_date.isoformat(),
        }
        if latest_bcs
        else None,
        "stats": {
            "first_weight": first_w,
            "last_weight": last_w,
            "total_gain_kg": total_gain,
            "avg_daily_gain_kg": adg,
            "trend": trend,
            "slope_kg_per_day": round(slope, 4) if slope is not None else None,
            "current_deviation_pct": current_deviation,
            "current_expected_weight": current_expected,
            "current_min_weight": current_min,
            "projected_weight_12m": projected_weight_12m,
            "growth_score": score,
            "growth_stage": _get_growth_stage(
                (today - animal.birth_date).days / 30.44
            ).value
            if animal.birth_date
            else None,
        },
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@growth_ns.route("/animal/<int:animal_id>")
class AnimalGrowthCurve(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Curva de crecimiento de un animal: historial peso/talla + curva de referencia."""
        animal = (
            apply_tenant_filter(Animals.query, Animals).filter_by(id=animal_id).first()
        )
        if not animal:
            return APIResponse.error(
                "Animal no encontrado o sin acceso", status_code=404
            )

        controls = (
            apply_tenant_filter(Control.query, Control)
            .filter_by(animal_id=animal_id)
            .order_by(Control.checkup_date)
            .all()
        )

        result = _build_animal_growth(animal, controls)
        return APIResponse.success(data=result, message="Curva de crecimiento")


@growth_ns.route("/summary")
class GrowthSummary(Resource):
    @jwt_required()
    @growth_ns.doc(
        "growth_summary",
        params={
            "status": "Vivo | Vendido | Muerto (default: Vivo)",
            "sex": "Hembra | Macho",
            "min_controls": "Mínimo de controles para incluir (default: 2)",
            "limit": "Máx animales (default: 50)",
        },
    )
    def get(self):
        """Resumen de crecimiento de todos los animales: ADG, tendencia, score."""
        status_filter = flask.request.args.get("status", "Vivo")
        sex_filter = flask.request.args.get("sex")
        min_controls = flask.request.args.get("min_controls", default=2, type=int)
        limit = max(1, min(200, flask.request.args.get("limit", default=50, type=int)))

        query = apply_tenant_filter(Animals.query, Animals)
        if status_filter:
            try:
                query = query.filter_by(status=AnimalStatus(status_filter))
            except ValueError:
                pass
        if sex_filter:
            try:
                query = query.filter_by(sex=Sex(sex_filter))
            except ValueError:
                pass

        animals = query.limit(limit).all()

        results = []
        for animal in animals:
            controls = (
                apply_tenant_filter(Control.query, Control)
                .filter_by(animal_id=animal.id)
                .all()
            )
            if len(controls) < min_controls:
                results.append(
                    {
                        "animal_id": animal.id,
                        "animal_record": animal.record,
                        "sex": animal.sex.value if animal.sex else None,
                        "age_months": round(
                            (date.today() - animal.birth_date).days / 30.44, 1
                        )
                        if animal.birth_date
                        else None,
                        "current_weight": animal.weight,
                        "controls_count": len(controls),
                        "stats": None,
                        "note": "Controles insuficientes",
                    }
                )
                continue
            growth_data = _build_animal_growth(animal, controls)
            results.append(
                {
                    "animal_id": animal.id,
                    "animal_record": animal.record,
                    "sex": animal.sex.value if animal.sex else None,
                    "age_months": growth_data["age_months"],
                    "current_weight": animal.weight,
                    "controls_count": len(controls),
                    "stats": growth_data["stats"],
                }
            )

        # Ordenar: primero los con score más bajo (los que necesitan atención)
        results.sort(key=lambda x: x["stats"]["growth_score"] if x["stats"] else 101)

        return APIResponse.success(data=results, message="Resumen de crecimiento")


@growth_ns.route("/alerts")
class GrowthAlerts(Resource):
    @jwt_required()
    def get(self):
        """Animales con tendencia negativa, estancada o bajo la curva de referencia."""
        animals = (
            apply_tenant_filter(Animals.query, Animals)
            .filter_by(status=AnimalStatus.Vivo)
            .all()
        )

        negative = []
        stagnant = []
        below_ref = []

        for animal in animals:
            controls = (
                apply_tenant_filter(Control.query, Control)
                .filter_by(animal_id=animal.id)
                .all()
            )
            if len(controls) < 2:
                continue
            growth_data = _build_animal_growth(animal, controls)
            flask.g._growth_data = growth_data
            stats = growth_data["stats"]
            entry = {
                "animal_id": animal.id,
                "animal_record": animal.record,
                "age_months": growth_data["age_months"],
                "current_weight": animal.weight,
                "avg_daily_gain_kg": stats["avg_daily_gain_kg"],
                "current_deviation_pct": stats["current_deviation_pct"],
                "growth_score": stats["growth_score"],
                "controls_count": len(controls),
            }
            if stats["trend"] == "negativo":
                negative.append(entry)
            elif stats["trend"] == "estancado":
                stagnant.append(entry)
            dev = stats["current_deviation_pct"]
            if dev is not None and dev < -15:
                below_ref.append({**entry, "deviation_pct": dev})

        for lst in (negative, stagnant, below_ref):
            lst.sort(key=lambda x: x["growth_score"])

        return APIResponse.success(
            data={
                "negative_trend": negative,
                "stagnant": stagnant,
                "below_reference": below_ref,
                "summary": {
                    "negative_count": len(negative),
                    "stagnant_count": len(stagnant),
                    "below_ref_count": len(below_ref),
                },
            },
            message="Alertas de crecimiento",
        )


@growth_ns.route("/projection/<int:animal_id>")
class GrowthProjection(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Proyección forward del crecimiento a hitos futuros."""
        animal = (
            apply_tenant_filter(Animals.query, Animals).filter_by(id=animal_id).first()
        )
        if not animal:
            return APIResponse.error("Animal no encontrado", status_code=404)

        controls = (
            apply_tenant_filter(Control.query, Control)
            .filter_by(animal_id=animal_id)
            .order_by(Control.checkup_date)
            .all()
        )

        if len(controls) < 2:
            return APIResponse.error(
                "Se necesitan al menos 2 controles para proyectar", status_code=400
            )

        today = date.today()
        sorted_controls = sorted(controls, key=lambda c: c.checkup_date)
        weights = [c.weight for c in sorted_controls if c.weight]
        dates = [c.checkup_date for c in sorted_controls if c.weight]

        if len(weights) < 2:
            return APIResponse.error(
                "Se necesitan al menos 2 controles con peso", status_code=400
            )

        total_days = (dates[-1] - dates[0]).days
        if total_days <= 0:
            return APIResponse.error("Controles en misma fecha", status_code=400)

        adg = (weights[-1] - weights[0]) / total_days
        current_weight = weights[-1]
        current_age = (
            (today - animal.birth_date).days / 30.44 if animal.birth_date else 0
        )

        milestones = [
            (6, "Destete"),
            (12, "Año"),
            (18, "Pubertad"),
            (24, "Primer servicio"),
            (36, "Adulto joven"),
        ]

        projections = []
        for target_age, label in milestones:
            if target_age > current_age:
                months_to_go = target_age - current_age
                projected_w = current_weight + adg * months_to_go * 30.44
                expected_w, min_w, _ = _expected_weight(animal, target_age)
                projections.append(
                    {
                        "milestone_age_months": target_age,
                        "milestone_label": label,
                        "projected_weight_kg": round(projected_w, 1),
                        "expected_weight_kg": expected_w,
                        "min_weight_kg": min_w,
                        "months_remaining": round(months_to_go, 1),
                        "meets_target": projected_w >= (min_w or expected_w or 0)
                        if expected_w
                        else None,
                    }
                )

        seasonal_adj = None
        if animal.finca_id:
            sa = SeasonalAdjustment.get_current(animal.finca_id)
            if sa:
                seasonal_adj = {
                    "month": sa.month,
                    "adg_multiplier": sa.adg_multiplier,
                    "pasture_quality": sa.pasture_quality_index,
                    "adjusted_adg": round(adg * sa.adg_multiplier, 3),
                }

        return APIResponse.success(
            data={
                "animal_id": animal.id,
                "animal_record": animal.record,
                "current_age_months": round(current_age, 1),
                "current_weight_kg": current_weight,
                "current_adg_kg_day": round(adg, 3),
                "controls_used": len(weights),
                "observation_days": total_days,
                "projections": projections,
                "seasonal_adjustment": seasonal_adj,
            },
            message="Proyección de crecimiento",
        )


@growth_ns.route("/bcs/<int:animal_id>")
class AnimalBCS(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Historial de Condición Corporal (BCS) de un animal."""
        animal = (
            apply_tenant_filter(Animals.query, Animals).filter_by(id=animal_id).first()
        )
        if not animal:
            return APIResponse.error("Animal no encontrado", status_code=404)

        bcs_records = (
            BodyConditionScore.query.filter_by(animal_id=animal_id)
            .order_by(BodyConditionScore.score_date.desc())
            .all()
        )

        history = []
        for rec in bcs_records:
            history.append(
                {
                    "id": rec.id,
                    "score": rec.score,
                    "category": rec.category,
                    "date": rec.score_date.isoformat(),
                    "evaluator_id": rec.evaluator_id,
                    "notes": rec.notes,
                }
            )

        latest = bcs_records[0] if bcs_records else None
        trend_90d = BodyConditionScore.get_trend(animal_id, days=90)
        bcs_trend = None
        if len(trend_90d) >= 2:
            bcs_trend = round(trend_90d[-1].score - trend_90d[0].score, 1)

        return APIResponse.success(
            data={
                "animal_id": animal.id,
                "animal_record": animal.record,
                "latest_bcs": {
                    "score": latest.score,
                    "category": latest.category,
                    "date": latest.score_date.isoformat(),
                    "is_alert_worthy": latest.is_alert_worthy,
                }
                if latest
                else None,
                "bcs_trend_90d": bcs_trend,
                "history": history,
                "history_count": len(history),
            },
            message="Historial BCS",
        )


@growth_ns.route("/bcs")
class HerdBCS(Resource):
    @jwt_required()
    def get(self):
        """BCS promedio del hato y animales con BCS crítico."""
        from app import db
        from sqlalchemy import func

        finca_id = flask.request.args.get("finca_id", type=int)
        if not finca_id:
            return APIResponse.error("finca_id requerido", status_code=400)

        herd_avg = BodyConditionScore.get_herd_average(finca_id, days=30)

        critical_animals = (
            BodyConditionScore.query.filter(
                BodyConditionScore.finca_id == finca_id, BodyConditionScore.score <= 3
            )
            .order_by(BodyConditionScore.score.asc())
            .limit(20)
            .all()
        )

        critical_list = []
        for rec in critical_animals:
            critical_list.append(
                {
                    "animal_id": rec.animal_id,
                    "animal_record": rec.animal.record if rec.animal else "N/A",
                    "score": rec.score,
                    "category": rec.category,
                    "date": rec.score_date.isoformat(),
                }
            )

        return APIResponse.success(
            data={
                "herd_average_bcs": herd_avg,
                "critical_count": len(critical_list),
                "critical_animals": critical_list,
            },
            message="BCS del hato",
        )


@growth_ns.route("/breed-standards")
class BreedStandardsList(Resource):
    @jwt_required()
    def get(self):
        """Lista de estándares de crecimiento por raza."""
        breed_id = flask.request.args.get("breed_id", type=int)
        sex = flask.request.args.get("sex")
        stage = flask.request.args.get("stage")

        query = BreedGrowthStandard.query
        if breed_id:
            query = query.filter_by(breed_id=breed_id)
        if sex:
            query = query.filter_by(sex=sex)
        if stage:
            try:
                query = query.filter_by(growth_stage=GrowthStage(stage))
            except ValueError:
                pass

        standards = query.order_by(
            BreedGrowthStandard.breed_id, BreedGrowthStandard.age_months
        ).all()

        result = []
        for s in standards:
            result.append(
                {
                    "id": s.id,
                    "breed_id": s.breed_id,
                    "breed_name": s.breed.name if s.breed else "N/A",
                    "sex": s.sex,
                    "growth_stage": s.growth_stage.value,
                    "age_months": s.age_months,
                    "expected_weight_kg": s.expected_weight_kg,
                    "min_weight_kg": s.min_weight_kg,
                    "max_weight_kg": s.max_weight_kg,
                    "expected_adg_kg": s.expected_adg_kg,
                    "min_adg_kg": s.min_adg_kg,
                }
            )

        return APIResponse.success(data=result, message="Estándares de crecimiento")


@growth_ns.route("/seasonal-adjustments")
class SeasonalAdjustmentsList(Resource):
    @jwt_required()
    def get(self):
        """Ajustes estacionales de una finca."""
        finca_id = flask.request.args.get("finca_id", type=int)
        if not finca_id:
            return APIResponse.error("finca_id requerido", status_code=400)

        adjustments = SeasonalAdjustment.get_all_for_finca(finca_id)
        current = SeasonalAdjustment.get_current(finca_id)

        result = []
        for a in adjustments:
            result.append(
                {
                    "id": a.id,
                    "month": a.month,
                    "adg_multiplier": a.adg_multiplier,
                    "pasture_quality_index": a.pasture_quality_index,
                    "milk_production_multiplier": a.milk_production_multiplier,
                    "heat_stress_risk": a.heat_stress_risk,
                    "description": a.description,
                    "is_current": a.id == current.id if current else False,
                }
            )

        return APIResponse.success(
            data={
                "current_month": date.today().month,
                "current_adjustment": {
                    "adg_multiplier": current.adg_multiplier,
                    "pasture_quality_index": current.pasture_quality_index,
                    "heat_stress_risk": current.heat_stress_risk,
                }
                if current
                else None,
                "all_months": result,
            },
            message="Ajustes estacionales",
        )
