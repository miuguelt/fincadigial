"""
Seed: Parámetros climáticos, thresholds y recomendaciones en system_contents.
Uso: python -m app.scripts.seed_weather_params
"""
import os
import sys
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.system_content import SystemContent

app = create_app('development')
with app.app_context():
    params = [
        ('param.weather.heat_warn', '32', 'Temperatura umbral de alerta calor (C)'),
        ('param.weather.heat_critical', '37', 'Temperatura umbral crítico calor (C)'),
        ('param.weather.heat_extreme', '40', 'Temperatura umbral extremo calor (C)'),
        ('param.weather.cold_warn', '5', 'Temperatura umbral de alerta frío (C)'),
        ('param.weather.cold_critical', '2', 'Temperatura umbral crítico frío (C)'),
        ('param.weather.cold_extreme', '0', 'Temperatura umbral extremo frío (C)'),
        ('param.weather.rain_warn', '10', 'Precipitación umbral de alerta (mm)'),
        ('param.weather.rain_critical', '25', 'Precipitación umbral crítico (mm)'),
        ('param.weather.wind_warn', '50', 'Viento umbral de alerta (km/h)'),
        ('param.weather.wind_critical', '60', 'Viento umbral crítico (km/h)'),
        ('param.weather.wind_extreme', '70', 'Viento umbral extremo (km/h)'),
        ('param.weather.thi_warn', '72', 'THI umbral estrés térmico leve'),
        ('param.weather.thi_severe', '79', 'THI umbral estrés térmico severo'),
        ('param.weather.thi_critical', '89', 'THI umbral estrés térmico crítico'),
        ('param.gdp_default', '0.5', 'Ganancia diaria de peso por defecto (kg/día)'),
        ('param.target_market_weight', '450', 'Peso objetivo de mercado (kg)'),
        ('param.milk_price_per_liter', '2100', 'Precio por litro de leche (COP)'),
        ('param.coef_aprovechamiento', '0.7', 'Coeficiente de aprovechamiento de pastura'),
        ('param.consumo_promedio_kg', '35', 'Consumo promedio diario por animal (kg)'),
        ('param.price_per_kg', '8500', 'Precio por kg de carne (COP)'),
        ('param.weight_loss_avoided', '12.0', 'Kg salvados por tratamiento exitoso'),
    ]

    texts = [
        ('recommendation.weather.heat', 'Proporcione sombra adicional y agua fresca. Evite actividades físicas intensas con el ganado.'),
        ('recommendation.weather.cold', 'Proporcione refugio y alimento adicional. Monitoree especialmente a crías y animales enfermos.'),
        ('recommendation.weather.storm', 'Refugie al ganado en zonas seguras. Evite estar bajo árboles aislados.'),
        ('recommendation.weather.rain', 'Vigile zonas de drenaje. Evite mover ganado por terrenos resbaladizos.'),
        ('recommendation.weather.wind', 'Asegure estructuras ligeras. Monitoree cercas y techos.'),
        ('recommendation.weather.hail', 'Refugie al ganado inmediatamente. Proteja cultivos sensibles si es posible.'),
    ]

    for key, value, desc in params:
        entry = SystemContent.query.filter_by(key=key).first()
        if not entry:
            SystemContent.create(
                key=key, content=value, description=desc,
                category='config', content_type='number'
            )
            print(f'  ✅ {key} = {value}')
        else:
            print(f'  ⏭ {key} ya existe')

    for key, value in texts:
        entry = SystemContent.query.filter_by(key=key).first()
        if not entry:
            SystemContent.create(
                key=key, content=value,
                category='recommendation', content_type='text'
            )
            print(f'  ✅ {key}')
        else:
            print(f'  ⏭ {key} ya existe')

    print('\n🌤 Parámetros climáticos y de producción sembrados.')
