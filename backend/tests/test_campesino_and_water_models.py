"""Pruebas unitarias para modelos campesinos y recursos hidricos.

Cubre: crop_plots, crop_activities, water_sources, water_measurements,
climate_risk_alerts, offline_learning_materials.
"""

from datetime import date, datetime
import pytest

from app.models.base_model import ValidationError
from app.models.campesino import (
    ClimateRiskAlert,
    CropActivity,
    CropActivityType,
    CropPlot,
    CropStatus,
    LearningContentType,
    OfflineLearningMaterial,
    RiskSeverity,
    WaterMeasurement,
    WaterSource,
    WaterSourceType,
)
from app.models.fields import Fields, LandStatus
from app.models.finca import FarmType, Finca
from app.models.territory import Territory
from app.models.user import User


@pytest.fixture
def campesino_context(app, db_session):
    """Crea el contexto base con finca, territorio y usuario para pruebas campesinas."""
    with app.app_context():
        import random

        n = random.randint(10000000, 99999999)
        finca = Finca.create(name=f"Finca Campesina {n}", type=FarmType.Tradicional, is_active=True)
        user = User.create(
            email=f"campesino_{n}@villaluz.co",
            password="Password123!",
            fullname="Campesino Productor",
            identification=str(n),
            phone=f"310{n}",
            role="Administrador",
            finca_id=finca.id,
            status=True,
        )
        territory = Territory.create(
            name=f"Territorio Rural {n}",
            vereda="El Vergel",
            municipality="Villavicencio",
            department="Meta",
        )
        field = Fields.create(
            name=f"Potrero Cultivo {n}",
            finca_id=finca.id,
            state=LandStatus.Activo,
            area="5.0",
        )
        return {"finca": finca, "user": user, "territory": territory, "field": field}


def test_crop_plot_creation_and_validation(app, campesino_context):
    """Valida la creacion, enums y requerimientos obligatorios de CropPlot."""
    with app.app_context():
        finca, field = campesino_context["finca"], campesino_context["field"]

        plot = CropPlot.create(
            finca_id=finca.id,
            field_id=field.id,
            name="Lote Yuca Dulce 1",
            crop_name="Yuca",
            variety="Chirosa",
            area=2.5,
            status=CropStatus.ACTIVE,
            seed_source="Semilla certificada ICA",
        )
        assert plot.id is not None
        assert plot.crop_name == "Yuca"
        assert plot.status == CropStatus.ACTIVE
        assert plot.field.name == field.name

        with pytest.raises(ValidationError):
            CropPlot.create(finca_id=finca.id, name=None, crop_name="Platano")
        with pytest.raises(ValidationError):
            CropPlot.create(finca_id=finca.id, name="Lote Sin Cultivo", crop_name=None)


def test_crop_activity_creation_and_transaction_sync(app, campesino_context):
    """Valida registro de labores agricolas y generacion automatica de transaccion financiera."""
    with app.app_context():
        finca, user = campesino_context["finca"], campesino_context["user"]
        plot = CropPlot.create(
            finca_id=finca.id,
            name="Lote Maiz Amarillo",
            crop_name="Maiz",
            status=CropStatus.PLANNED,
        )
        from app.models.financial import Transaction, TransactionCategory, TransactionType

        initial_tx_count = Transaction.query.filter_by(finca_id=finca.id).count()
        activity = CropActivity.create(
            finca_id=finca.id,
            crop_plot_id=plot.id,
            activity_type=CropActivityType.FERTILIZATION,
            activity_date=date.today(),
            description="Fertilizacion edafica de inicio",
            input_name="Urea Granulada",
            quantity=2.0,
            unit="Bultos",
            cost=250000.0,
            performed_by=user.id,
        )

        assert activity.id is not None
        assert activity.activity_type == CropActivityType.FERTILIZATION
        assert activity.crop_plot.name == "Lote Maiz Amarillo"

        # Verifica creacion de transaccion financiera automatica
        final_tx_count = Transaction.query.filter_by(finca_id=finca.id).count()
        assert final_tx_count == initial_tx_count + 1

        tx = Transaction.query.filter_by(
            finca_id=finca.id, amount=250000.0, category=TransactionCategory.Agriculture
        ).first()
        assert tx is not None
        assert tx.transaction_type == TransactionType.Expense

        with pytest.raises(ValidationError):
            CropActivity.create(
                finca_id=finca.id,
                crop_plot_id=None,
                activity_type=CropActivityType.PEST_CONTROL,
                activity_date=date.today(),
            )


def test_water_source_creation_and_validation(app, campesino_context):
    """Valida registro de fuentes hidricas de la finca/territorio."""
    with app.app_context():
        finca, territory = campesino_context["finca"], campesino_context["territory"]

        source = WaterSource.create(
            finca_id=finca.id,
            territory_id=territory.id,
            name="Quebrada La Cristalina",
            source_type=WaterSourceType.STREAM,
            capacity_liters=75000.0,
            is_potable=False,
            reliability="Permanente todo el año",
        )
        assert source.id is not None
        assert source.source_type == WaterSourceType.STREAM
        assert source.territory.name == territory.name

        with pytest.raises(ValidationError):
            WaterSource.create(finca_id=finca.id, name=None)


def test_water_measurement_creation_and_metrics(app, campesino_context):
    """Valida mediciones offline de fuentes de agua."""
    with app.app_context():
        finca, user = campesino_context["finca"], campesino_context["user"]
        source = WaterSource.create(
            finca_id=finca.id,
            name="Aljibe Comunitario",
            source_type=WaterSourceType.WELL,
        )

        measurement = WaterMeasurement.create(
            finca_id=finca.id,
            water_source_id=source.id,
            measured_at=datetime.utcnow(),
            level_percent=92.5,
            flow_liters_minute=80.0,
            ph=6.8,
            turbidity=3.2,
            measured_by=user.id,
            notes="Nivel optimo tras lluvias",
        )
        assert measurement.id is not None
        assert measurement.water_source.name == "Aljibe Comunitario"
        assert measurement.actor.id == user.id
        assert measurement.level_percent == 92.5

        with pytest.raises(ValidationError):
            WaterMeasurement.create(
                finca_id=finca.id,
                water_source_id=None,
                measured_at=datetime.utcnow(),
            )


def test_climate_risk_alert_lifecycle(app, campesino_context):
    """Valida creacion y consulta de alertas agroclimaticas territoriales."""
    with app.app_context():
        finca, territory = campesino_context["finca"], campesino_context["territory"]

        alert = ClimateRiskAlert.create(
            finca_id=finca.id,
            territory_id=territory.id,
            title="Alerta de Sequia Prolongada",
            risk_type="drought",
            severity=RiskSeverity.HIGH,
            description="Precipitaciones 50% por debajo del promedio historico",
            recommendation="Optimizar riego y ensilaje",
            is_active=True,
        )
        assert alert.id is not None
        assert alert.severity == RiskSeverity.HIGH
        assert alert.is_active is True

        alerts = ClimateRiskAlert.query.filter_by(severity=RiskSeverity.HIGH, is_active=True).all()
        assert any(a.id == alert.id for a in alerts)

        with pytest.raises(ValidationError):
            ClimateRiskAlert.create(title=None, risk_type="frost")


def test_offline_learning_material_lifecycle(app, campesino_context):
    """Valida material educativo descargable para nodos sin conectividad."""
    with app.app_context():
        territory = campesino_context["territory"]

        material = OfflineLearningMaterial.create(
            territory_id=territory.id,
            title="Cartilla de Sanidad Bovina en Verano",
            category="veterinaria",
            content_type=LearningContentType.PDF,
            summary="Protocolos de hidratacion y control de ectoparasitos",
            language="es",
            reading_level="Basico",
            is_active=True,
        )
        assert material.id is not None
        assert material.content_type == LearningContentType.PDF
        assert material.territory.name == territory.name

        with pytest.raises(ValidationError):
            OfflineLearningMaterial.create(title=None, category="ganaderia")
