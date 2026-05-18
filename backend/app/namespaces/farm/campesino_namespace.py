from app.models.campesino import (
    CropPlot,
    CropActivity,
    WaterSource,
    WaterMeasurement,
    ClimateRiskAlert,
    MarketOffer,
    TechnicalAssistanceRequest,
    OfflineLearningMaterial,
)
from app.utils.namespace_helpers import create_optimized_namespace


crop_plots_ns = create_optimized_namespace(
    "crop-plots",
    "Parcelas y cultivos campesinos",
    CropPlot,
)

crop_activities_ns = create_optimized_namespace(
    "crop-activities",
    "Bitacora offline de labores de cultivo",
    CropActivity,
)

water_sources_ns = create_optimized_namespace(
    "water-sources",
    "Fuentes de agua rurales",
    WaterSource,
)

water_measurements_ns = create_optimized_namespace(
    "water-measurements",
    "Mediciones de agua en campo",
    WaterMeasurement,
)

climate_risks_ns = create_optimized_namespace(
    "climate-risks",
    "Alertas locales de clima y riesgo",
    ClimateRiskAlert,
)

market_offers_ns = create_optimized_namespace(
    "market-offers",
    "Mercado campesino local",
    MarketOffer,
)

technical_assistance_ns = create_optimized_namespace(
    "technical-assistance",
    "Solicitudes de asistencia tecnica",
    TechnicalAssistanceRequest,
)

offline_learning_ns = create_optimized_namespace(
    "offline-learning",
    "Materiales de aprendizaje offline",
    OfflineLearningMaterial,
)
