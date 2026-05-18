from flask_restx import Namespace

analytics_ns = Namespace('analytics', description='📊 Analytics y Dashboard - Sistema de Gestión Integral', path='/analytics')

# Importar rutas para que se registren en el namespace
from . import stats
from . import predictive
from . import reports
from . import professional_reports
from . import intelligence
from . import dashboard # Si existe
#   production.py    → /analytics/production/* (production_ns)
#   health.py        → /analytics/health/*     (health_analytics_ns)
#   ai_insights.py   → /analytics/ai/*         (ai_ns)
#   predictions.py   → /analytics/predictions/*(predictions_ns)
#   live.py          → /analytics/live/*       (live_ns)
#   _helpers.py      → funciones matemáticas compartidas (sin namespace)
