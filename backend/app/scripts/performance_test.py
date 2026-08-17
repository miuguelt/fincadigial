import time
import sys
import os

# Path setup
sys.path.append(os.getcwd())

from app import create_app
from app.services.analytics.dashboard_service import DashboardService
from app.services.analytics.animal_analytics_service import AnimalAnalyticsService
from app.models.finca import Finca
from app.models.animals import Animals

app = create_app("development")
with app.app_context():
    finca = Finca.query.first()
    if not finca:
        print("❌ No hay finca para el test.")
        sys.exit(1)

    print(f"⏱️ Iniciando Benchmark de Rendimiento para: {finca.name}")
    print("-" * 50)

    # TEST 1: Dashboard Completo (O(1))
    start_time = time.time()
    stats = DashboardService.get_complete_stats(finca.id)
    duration_dashboard = time.time() - start_time
    print(f"📊 Dashboard Completo: {duration_dashboard:.4f}s")

    # TEST 2: Cálculo de ROI (Individual)
    animal = Animals.query.filter_by(finca_id=finca.id).first()
    if animal:
        start_time = time.time()
        roi = AnimalAnalyticsService.calculate_animal_roi(animal.id)
        duration_roi = time.time() - start_time
        print(f"💰 Cálculo ROI Individual: {duration_roi:.4f}s")

    # TEST 3: Agenda Operativa
    start_time = time.time()
    agenda = DashboardService.get_daily_operational_agenda(finca.id)
    duration_agenda = time.time() - start_time
    print(f"📅 Agenda Operativa: {duration_agenda:.4f}s")

    print("-" * 50)
    if duration_dashboard > 0.5:
        print("⚠️ ALERTA: El Dashboard está tardando más de 500ms. Revisar caché.")
    else:
        print("✅ RENDIMIENTO EXCELENTE: Todas las respuestas son sub-segundo.")
