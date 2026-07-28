"""Seed: Hitos de gestación en system_contents."""
import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app, db
from app.models.system_content import SystemContent

MILESTONES = [
    {"day": 30, "message": "Confirmación de preñez (palpación o ecografía).", "priority": "MEDIUM"},
    {"day": 60, "message": "Segunda confirmación y evaluación fetal.", "priority": "MEDIUM"},
    {"day": 90, "message": "Control de 1er tercio — revisar nutrición y condición corporal.", "priority": "MEDIUM"},
    {"day": 150, "message": "Control de 2do tercio — ajuste de suplementación.", "priority": "MEDIUM"},
    {"day": 210, "message": "Control de 3er tercio — preparación al parto.", "priority": "HIGH"},
    {"day": 223, "message": "INICIO DE SECADO obligatorio (60 días pre-parto).", "priority": "CRITICAL"},
    {"day": 250, "message": "Trasladar a zona de maternidad o potrero de parto.", "priority": "HIGH"},
    {"day": 270, "message": "Alerta de parto inminente — vigilancia 24 horas.", "priority": "CRITICAL"},
    {"day": 283, "message": "FECHA ESTIMADA DE PARTO alcanzada.", "priority": "CRITICAL"},
]

GROWTH_MILESTONES = [
    {"age_months": 6, "label": "Destete"},
    {"age_months": 12, "label": "Año"},
    {"age_months": 18, "label": "Pubertad"},
    {"age_months": 24, "label": "Primer servicio"},
    {"age_months": 36, "label": "Adulto joven"},
]

app = create_app('development')
with app.app_context():
    entries = [
        ('config.gestation_milestones', 'Hitos de gestación por día', MILESTONES),
        ('config.growth_milestones', 'Hitos de proyección de crecimiento', GROWTH_MILESTONES),
    ]
    for key, content, extra in entries:
        entry = SystemContent.get_by_key(key)
        if not entry:
            entry = SystemContent(key=key, content=content, category='config', content_type='json', extra=extra)
            db.session.add(entry)
            print(f'  ✅ {key} creado')
        else:
            entry.extra = extra
            entry.content = content
            print(f'  ✅ {key} actualizado')

    db.session.commit()
    print('\n Hitos de gestación y crecimiento listos en system_contents.')
