"""
Endpoints de curvas de crecimiento: análisis de peso/talla por animal.
Usa los registros existentes de la tabla `control`.
"""
import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from datetime import date

from app.models.animals import Animals, AnimalStatus, Sex
from app.models.control import Control
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

growth_ns = Namespace('growth', description='📈 Curvas de crecimiento y análisis de peso/talla')

# ---------------------------------------------------------------------------
# Curva de referencia bovina (kg por mes de edad)
# Fuente: valores estándar para bovinos doble propósito (Colombia)
# ---------------------------------------------------------------------------
_REF_POINTS = [
    (0, 35), (1, 52), (2, 70), (3, 90), (4, 110), (5, 132),
    (6, 155), (7, 172), (8, 187), (9, 200), (10, 212), (11, 222),
    (12, 232), (15, 262), (18, 290), (21, 318), (24, 345),
    (30, 390), (36, 430), (48, 475), (60, 500),
]


def _expected_weight(age_months: float) -> float:
    """Interpola linealmente en la curva de referencia bovina."""
    if age_months <= 0:
        return _REF_POINTS[0][1]
    for i in range(len(_REF_POINTS) - 1):
        m0, w0 = _REF_POINTS[i]
        m1, w1 = _REF_POINTS[i + 1]
        if m0 <= age_months <= m1:
            t = (age_months - m0) / (m1 - m0)
            return round(w0 + t * (w1 - w0), 1)
    return _REF_POINTS[-1][1]


def _linear_trend(xs, ys):
    """Regresión lineal simple. Retorna pendiente (kg/día)."""
    n = len(xs)
    if n < 2:
        return None
    sum_x = sum(xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    sum_xx = sum(x * x for x in xs)
    denom = n * sum_xx - sum_x ** 2
    if denom == 0:
        return None
    return (n * sum_xy - sum_x * sum_y) / denom


def _build_animal_growth(animal, controls):
    """Construye el objeto de crecimiento para un animal dado sus controles."""
    today = date.today()

    # Ordenar controles por fecha
    sorted_controls = sorted(controls, key=lambda c: c.checkup_date)

    # Puntos reales
    data_points = []
    for c in sorted_controls:
        age_months = max(0, round((c.checkup_date - animal.birth_date).days / 30.44, 1)) if animal.birth_date else None
        ref_w = _expected_weight(age_months) if age_months is not None else None
        data_points.append({
            'date': c.checkup_date.isoformat(),
            'weight': c.weight,
            'height': c.height,
            'health_status': c.health_status.value if c.health_status else None,
            'age_months': age_months,
            'expected_weight': ref_w,
            'deviation_pct': round((c.weight - ref_w) / ref_w * 100, 1) if (c.weight and ref_w) else None,
        })

    # Estadísticas
    weights = [c.weight for c in sorted_controls if c.weight]
    first_w = weights[0] if weights else None
    last_w = weights[-1] if weights else None
    total_gain = round(last_w - first_w, 1) if (first_w and last_w) else None

    # ADG (Average Daily Gain)
    adg = None
    if len(sorted_controls) >= 2:
        first_c = sorted_controls[0]
        last_c = sorted_controls[-1]
        days = (last_c.checkup_date - first_c.checkup_date).days
        if days > 0 and first_c.weight and last_c.weight:
            adg = round((last_c.weight - first_c.weight) / days, 3)

    # Tendencia via regresión lineal (días desde el primer control)
    slope = None
    if len(sorted_controls) >= 2 and sorted_controls[0].weight:
        base_date = sorted_controls[0].checkup_date
        xs = [(c.checkup_date - base_date).days for c in sorted_controls if c.weight]
        ys = [c.weight for c in sorted_controls if c.weight]
        slope = _linear_trend(xs, ys)

    trend = 'sin_datos'
    if slope is not None:
        if slope > 0.2:
            trend = 'positivo'
        elif slope > -0.05:
            trend = 'estancado'
        else:
            trend = 'negativo'

    # Desviación actual vs referencia
    current_deviation = None
    if animal.birth_date and last_w:
        age_now = (today - animal.birth_date).days / 30.44
        ref_now = _expected_weight(age_now)
        current_deviation = round((last_w - ref_now) / ref_now * 100, 1)

    # Score 0-100
    score = 50
    if trend == 'positivo':
        score += 25
    elif trend == 'negativo':
        score -= 30
    if current_deviation is not None:
        if current_deviation >= 10:
            score += 25
        elif current_deviation >= -10:
            score += 10
        elif current_deviation < -20:
            score -= 20

    score = max(0, min(100, score))

    # Curva de referencia para el rango de edad del animal
    ref_curve = []
    if animal.birth_date:
        max_age = max(
            ((sorted_controls[-1].checkup_date if sorted_controls else today) - animal.birth_date).days / 30.44,
            (today - animal.birth_date).days / 30.44,
        )
        max_age = min(int(max_age) + 3, 60)
        for m in range(0, max_age + 1, 1 if max_age <= 24 else 3):
            ref_curve.append({
                'months': m,
                'expected_weight': _expected_weight(m),
                'date': (animal.birth_date.replace(day=1)).isoformat(),
            })

    return {
        'animal_id': animal.id,
        'animal_record': animal.record,
        'sex': animal.sex.value if animal.sex else None,
        'birth_date': animal.birth_date.isoformat() if animal.birth_date else None,
        'age_months': round((today - animal.birth_date).days / 30.44, 1) if animal.birth_date else None,
        'current_weight': animal.weight,
        'controls_count': len(sorted_controls),
        'data_points': data_points,
        'reference_curve': ref_curve,
        'stats': {
            'first_weight': first_w,
            'last_weight': last_w,
            'total_gain_kg': total_gain,
            'avg_daily_gain_kg': adg,
            'trend': trend,
            'slope_kg_per_day': round(slope, 4) if slope is not None else None,
            'current_deviation_pct': current_deviation,
            'growth_score': score,
        },
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@growth_ns.route('/animal/<int:animal_id>')
class AnimalGrowthCurve(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Curva de crecimiento de un animal: historial peso/talla + curva de referencia."""
        animal = apply_tenant_filter(Animals.query, Animals).filter_by(id=animal_id).first()
        if not animal:
            return APIResponse.error('Animal no encontrado o sin acceso', status_code=404)

        controls = apply_tenant_filter(Control.query, Control).filter_by(animal_id=animal_id)\
            .order_by(Control.checkup_date).all()

        result = _build_animal_growth(animal, controls)
        return APIResponse.success(data=result, message='Curva de crecimiento')


@growth_ns.route('/summary')
class GrowthSummary(Resource):
    @jwt_required()
    @growth_ns.doc('growth_summary', params={
        'status': 'Vivo | Vendido | Muerto (default: Vivo)',
        'sex': 'Hembra | Macho',
        'min_controls': 'Mínimo de controles para incluir (default: 2)',
        'limit': 'Máx animales (default: 50)',
    })
    def get(self):
        """Resumen de crecimiento de todos los animales: ADG, tendencia, score."""
        status_filter = flask.request.args.get('status', 'Vivo')
        sex_filter = flask.request.args.get('sex')
        min_controls = flask.request.args.get('min_controls', default=2, type=int)
        limit = max(1, min(200, flask.request.args.get('limit', default=50, type=int)))

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
            controls = apply_tenant_filter(Control.query, Control).filter_by(animal_id=animal.id).all()
            if len(controls) < min_controls:
                results.append({
                    'animal_id': animal.id,
                    'animal_record': animal.record,
                    'sex': animal.sex.value if animal.sex else None,
                    'age_months': round((date.today() - animal.birth_date).days / 30.44, 1) if animal.birth_date else None,
                    'current_weight': animal.weight,
                    'controls_count': len(controls),
                    'stats': None,
                    'note': 'Controles insuficientes',
                })
                continue
            growth_data = _build_animal_growth(animal, controls)
            results.append({
                'animal_id': animal.id,
                'animal_record': animal.record,
                'sex': animal.sex.value if animal.sex else None,
                'age_months': growth_data['age_months'],
                'current_weight': animal.weight,
                'controls_count': len(controls),
                'stats': growth_data['stats'],
            })

        # Ordenar: primero los con score más bajo (los que necesitan atención)
        results.sort(key=lambda x: (x['stats']['growth_score'] if x['stats'] else 101))

        return APIResponse.success(data=results, message='Resumen de crecimiento')


@growth_ns.route('/alerts')
class GrowthAlerts(Resource):
    @jwt_required()
    def get(self):
        """Animales con tendencia negativa, estancada o bajo la curva de referencia."""
        animals = apply_tenant_filter(Animals.query, Animals).filter_by(status=AnimalStatus.Vivo).all()

        negative = []
        stagnant = []
        below_ref = []

        for animal in animals:
            controls = apply_tenant_filter(Control.query, Control).filter_by(animal_id=animal.id).all()
            if len(controls) < 2:
                continue
            flask.g = _build_animal_growth(animal, controls)
            stats = flask.g['stats']
            entry = {
                'animal_id': animal.id,
                'animal_record': animal.record,
                'age_months': flask.g['age_months'],
                'current_weight': animal.weight,
                'avg_daily_gain_kg': stats['avg_daily_gain_kg'],
                'current_deviation_pct': stats['current_deviation_pct'],
                'growth_score': stats['growth_score'],
                'controls_count': len(controls),
            }
            if stats['trend'] == 'negativo':
                negative.append(entry)
            elif stats['trend'] == 'estancado':
                stagnant.append(entry)
            dev = stats['current_deviation_pct']
            if dev is not None and dev < -15:
                below_ref.append({**entry, 'deviation_pct': dev})

        for lst in (negative, stagnant, below_ref):
            lst.sort(key=lambda x: x['growth_score'])

        return APIResponse.success(data={
            'negative_trend': negative,
            'stagnant': stagnant,
            'below_reference': below_ref,
            'summary': {
                'negative_count': len(negative),
                'stagnant_count': len(stagnant),
                'below_ref_count': len(below_ref),
            },
        }, message='Alertas de crecimiento')
