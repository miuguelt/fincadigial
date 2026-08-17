"""Registros secundarios para probar módulos regulatorios y campesinos."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from app import db
from app.models.animal_images import AnimalImages
from app.models.animal_production_metrics import AnimalProductionMetrics, MetricType
from app.models.campesino import (
    AssistanceStatus,
    ClimateRiskAlert,
    MarketOffer,
    MarketOfferType,
    RiskSeverity,
    TechnicalAssistanceRequest,
)
from app.models.farm_entity_alerts import FarmEntityAlert, FarmEntityAlertConfig
from app.models.finca_images import FincaImages
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.operational_costs import OperationalCategory, OperationalCost
from app.models.production_finance import FarmExpenses
from app.models.production_target import ProductionTarget, TargetPeriod
from app.models.professional_credentials import (
    CONSENT_VERSION,
    CredentialStatus,
    CredentialTitle,
    ProfessionalCredential,
)
from app.models.sinigan_registrations import SiniganRegistrations
from app.models.treatment_medications import TreatmentMedications
from app.models.treatment_recommendation_controls import TreatmentRecommendationControls
from app.models.treatment_recommendations import TreatmentRecommendations
from app.models.treatment_vaccines import TreatmentVaccines
from app.models.user_favorite import UserFavorite
from app.models.user import Role, User


def seed_extended_demo(
    finca_id: int,
    animal,
    treatment,
    vaccine,
    medication,
    lot,
    actor_id: int,
    territory_id: int | None = None,
) -> None:
    """Completa tablas operativas que no son necesarias para el onboarding."""

    if not FincaImages.query.filter_by(finca_id=finca_id, filename="demo-finca.jpg").first():
        db.session.add(FincaImages(finca_id=finca_id, filename="demo-finca.jpg", filepath="/uploads/demo/finca.jpg", file_size=1024, mime_type="image/jpeg", is_primary=True))
    if not AnimalImages.query.filter_by(animal_id=animal.id, filename="demo-animal.jpg").first():
        db.session.add(AnimalImages(animal_id=animal.id, finca_id=finca_id, filename="demo-animal.jpg", filepath="/uploads/demo/animal.jpg", file_size=1024, mime_type="image/jpeg", is_primary=True))
    if not AnimalProductionMetrics.query.filter_by(animal_id=animal.id, finca_id=finca_id, metric_type=MetricType.MilkYield).first():
        db.session.add(AnimalProductionMetrics(animal_id=animal.id, finca_id=finca_id, metric_type=MetricType.MilkYield, recorded_date=date.today() - timedelta(days=1), value=26, unit="L/día", recorded_by=actor_id, notes="Métrica demo"))
    if not LactationCycle.query.filter_by(animal_id=animal.id, finca_id=finca_id, lactation_number=1).first():
        db.session.add(LactationCycle(animal_id=animal.id, finca_id=finca_id, calving_date=date.today() - timedelta(days=120), expected_dry_off_date=date.today() + timedelta(days=160), lactation_number=1, status=LactationStatus.Active, peak_liters=28, peak_date=date.today() - timedelta(days=80), total_liters_lactation=2800, notes="Ciclo demo"))
    if not ProductionTarget.query.filter_by(finca_id=finca_id, animal_id=animal.id, period=TargetPeriod.Daily).first():
        db.session.add(ProductionTarget(finca_id=finca_id, animal_id=animal.id, target_liters=25, period=TargetPeriod.Daily, start_date=date.today() - timedelta(days=30), notes="Meta demo"))
    if not FarmExpenses.query.filter_by(finca_id=finca_id, description="Compra de sal demo").first():
        db.session.add(FarmExpenses(finca_id=finca_id, category="Alimento", description="Compra de sal demo", amount=80000, expense_date=date.today() - timedelta(days=4), is_income=False))
    if not OperationalCost.query.filter_by(finca_id=finca_id, concept="Mantenimiento demo").first():
        db.session.add(OperationalCost(finca_id=finca_id, concept="Mantenimiento demo", amount=120000, date=date.today() - timedelta(days=5), category=OperationalCategory.MANTENIMIENTO, notes="Costo de prueba"))
    if not SiniganRegistrations.query.filter_by(arete_sinigan=f"DEMO-{finca_id}-001").first():
        db.session.add(SiniganRegistrations(finca_id=finca_id, animal_id=animal.id, arete_sinigan=f"DEMO-{finca_id}-001", fecha_registro=date.today() - timedelta(days=90), predio_origen="Finca demo", guia_movilizacion=f"GSMI-DEMO-{finca_id}"))
    if not UserFavorite.query.filter_by(user_id=actor_id, endpoint="/animals", label="Animales demo").first():
        db.session.add(UserFavorite(user_id=actor_id, endpoint="/animals", label="Animales demo", method="GET"))
    if not TreatmentMedications.query.filter_by(treatment_id=treatment.id, medication_id=medication.id).first():
        db.session.add(TreatmentMedications(treatment_id=treatment.id, medication_id=medication.id, lot_id=lot.id if lot else None, quantity=1))
    if vaccine and not TreatmentVaccines.query.filter_by(treatment_id=treatment.id, vaccine_id=vaccine.id).first():
        db.session.add(TreatmentVaccines(treatment_id=treatment.id, vaccine_id=vaccine.id, quantity=1))
    recommendation = TreatmentRecommendations.query.filter_by(animal_id=animal.id, finca_id=finca_id, title="Seguimiento demo").first()
    if not recommendation:
        recommendation = TreatmentRecommendations(animal_id=animal.id, finca_id=finca_id, title="Seguimiento demo", recommendation="Revisar peso y condición corporal cada 30 días.", responsible="Equipo demo", start_date=date.today() - timedelta(days=10), estimated_end_date=date.today() + timedelta(days=80), duration_days=90, control_interval_days=30, status="en_curso")
        db.session.add(recommendation)
        db.session.flush()
    if not TreatmentRecommendationControls.query.filter_by(treatment_recommendation_id=recommendation.id, scheduled_date=date.today() + timedelta(days=20)).first():
        db.session.add(TreatmentRecommendationControls(treatment_recommendation_id=recommendation.id, scheduled_date=date.today() + timedelta(days=20), recorded_by=actor_id, completed=False, observation="Control demo pendiente"))
    if not FarmEntityAlertConfig.query.filter_by(finca_id=finca_id, entity_type="finca", dimension="water_level").first():
        config = FarmEntityAlertConfig(finca_id=finca_id, entity_type="finca", entity_id=finca_id, dimension="water_level", condition_value="<30", message="Nivel de agua bajo (demo)", priority="Alta", is_active=True, is_default=True)
        db.session.add(config)
        db.session.flush()
    else:
        config = FarmEntityAlertConfig.query.filter_by(finca_id=finca_id, entity_type="finca", dimension="water_level").first()
    if not FarmEntityAlert.query.filter_by(finca_id=finca_id, entity_type="finca", alert_type="water_level").first():
        db.session.add(FarmEntityAlert(finca_id=finca_id, entity_type="finca", entity_id=finca_id, config_id=config.id, alert_type="water_level", message="Nivel de agua bajo (demo)", recommendation="Revisar tanque de reserva", priority="Alta", is_read=False, triggered_at=datetime.utcnow()))
    if not ClimateRiskAlert.query.filter_by(finca_id=finca_id, title="Riesgo de sequía demo").first():
        db.session.add(ClimateRiskAlert(finca_id=finca_id, territory_id=territory_id, title="Riesgo de sequía demo", risk_type="sequía", severity=RiskSeverity.MEDIUM, description="Registro de prueba para el panel climático", recommendation="Revisar disponibilidad de agua", valid_from=datetime.utcnow(), valid_until=datetime.utcnow() + timedelta(days=15), source="fixture-demo", is_active=True))
    if not MarketOffer.query.filter_by(finca_id=finca_id, product_name="Leche demo").first():
        db.session.add(MarketOffer(finca_id=finca_id, territory_id=territory_id, offer_type=MarketOfferType.SALE, product_name="Leche demo", quantity=100, unit="litros", price=2200, currency="COP", available_from=date.today(), available_until=date.today() + timedelta(days=7), contact_name="Cooperativa Demo", status="active", notes="Oferta de prueba"))
    if not TechnicalAssistanceRequest.query.filter_by(finca_id=finca_id, title="Asistencia sanitaria demo").first():
        db.session.add(TechnicalAssistanceRequest(finca_id=finca_id, territory_id=territory_id, requester_user_id=actor_id, assigned_user_id=actor_id, title="Asistencia sanitaria demo", category="Sanidad animal", description="Solicitud de prueba para QA", priority="medium", status=AssistanceStatus.OPEN, requested_at=datetime.utcnow()))
    vet = User.query.filter_by(role=Role.Veterinario).first()
    if vet and not ProfessionalCredential.query.filter_by(user_id=vet.id).first():
        db.session.add(ProfessionalCredential(user_id=vet.id, title=CredentialTitle.MedicoVeterinarioZootecnista, professional_card_number=f"DEMO-{vet.id}", issuing_authority="COMVEZCOL", university="Universidad Demo", graduation_year=2020, status=CredentialStatus.Autodeclarado, consent_version=CONSENT_VERSION, consent_accepted_at=datetime.utcnow(), practice_areas="Ganadería bovina"))
