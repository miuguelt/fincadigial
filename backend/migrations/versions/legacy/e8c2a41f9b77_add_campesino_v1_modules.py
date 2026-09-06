"""add campesino v1 modules

Revision ID: e8c2a41f9b77
Revises: d4b7c9a2f001
Create Date: 2026-05-06 16:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e8c2a41f9b77"
down_revision = "d4b7c9a2f001"
branch_labels = None
depends_on = None


def _common_columns():
    return [
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("version_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    ]


def _has_table(bind, table_name):
    return sa.inspect(bind).has_table(table_name)


def upgrade():
    bind = op.get_bind()

    if not _has_table(bind, "crop_plots"):
        op.create_table(
            "crop_plots",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("field_id", sa.Integer(), sa.ForeignKey("fields.id"), nullable=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("crop_name", sa.String(length=160), nullable=False),
            sa.Column("variety", sa.String(length=160), nullable=True),
            sa.Column("area", sa.Float(), nullable=True),
            sa.Column("area_unit", sa.String(length=40), nullable=True),
            sa.Column("sowing_date", sa.Date(), nullable=True),
            sa.Column("expected_harvest_date", sa.Date(), nullable=True),
            sa.Column("harvest_date", sa.Date(), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=False),
            sa.Column("seed_source", sa.String(length=180), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_crop_plots_finca_status", "crop_plots", ["finca_id", "status"])
        op.create_index("ix_crop_plots_crop_name", "crop_plots", ["crop_name"])

    if not _has_table(bind, "crop_activities"):
        op.create_table(
            "crop_activities",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("crop_plot_id", sa.Integer(), sa.ForeignKey("crop_plots.id"), nullable=False),
            sa.Column("activity_type", sa.String(length=60), nullable=False),
            sa.Column("activity_date", sa.Date(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("input_name", sa.String(length=180), nullable=True),
            sa.Column("quantity", sa.Float(), nullable=True),
            sa.Column("unit", sa.String(length=50), nullable=True),
            sa.Column("cost", sa.Float(), nullable=True),
            sa.Column("performed_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("attachment_blob_id", sa.Integer(), sa.ForeignKey("attachment_blobs.id"), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_crop_activities_plot_date", "crop_activities", ["crop_plot_id", "activity_date"])
        op.create_index("ix_crop_activities_finca_type", "crop_activities", ["finca_id", "activity_type"])

    if not _has_table(bind, "water_sources"):
        op.create_table(
            "water_sources",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("source_type", sa.String(length=60), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("capacity_liters", sa.Float(), nullable=True),
            sa.Column("is_potable", sa.Boolean(), nullable=True),
            sa.Column("reliability", sa.String(length=60), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_water_sources_finca_type", "water_sources", ["finca_id", "source_type"])

    if not _has_table(bind, "water_measurements"):
        op.create_table(
            "water_measurements",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("water_source_id", sa.Integer(), sa.ForeignKey("water_sources.id"), nullable=False),
            sa.Column("measured_at", sa.DateTime(), nullable=False),
            sa.Column("level_percent", sa.Float(), nullable=True),
            sa.Column("flow_liters_minute", sa.Float(), nullable=True),
            sa.Column("ph", sa.Float(), nullable=True),
            sa.Column("turbidity", sa.Float(), nullable=True),
            sa.Column("rainfall_mm", sa.Float(), nullable=True),
            sa.Column("measured_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_water_measurements_source_date", "water_measurements", ["water_source_id", "measured_at"])

    if not _has_table(bind, "climate_risk_alerts"):
        op.create_table(
            "climate_risk_alerts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=True),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("risk_type", sa.String(length=100), nullable=False),
            sa.Column("severity", sa.String(length=40), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("recommendation", sa.Text(), nullable=True),
            sa.Column("valid_from", sa.DateTime(), nullable=True),
            sa.Column("valid_until", sa.DateTime(), nullable=True),
            sa.Column("source", sa.String(length=180), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            *_common_columns(),
        )
        op.create_index("ix_climate_risk_alerts_finca_severity", "climate_risk_alerts", ["finca_id", "severity"])
        op.create_index("ix_climate_risk_alerts_valid_until", "climate_risk_alerts", ["valid_until"])

    if not _has_table(bind, "market_offers"):
        op.create_table(
            "market_offers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("offer_type", sa.String(length=40), nullable=False),
            sa.Column("product_name", sa.String(length=180), nullable=False),
            sa.Column("quantity", sa.Float(), nullable=True),
            sa.Column("unit", sa.String(length=50), nullable=True),
            sa.Column("price", sa.Float(), nullable=True),
            sa.Column("currency", sa.String(length=20), nullable=True),
            sa.Column("available_from", sa.Date(), nullable=True),
            sa.Column("available_until", sa.Date(), nullable=True),
            sa.Column("contact_name", sa.String(length=160), nullable=True),
            sa.Column("contact_phone", sa.String(length=80), nullable=True),
            sa.Column("delivery_location", sa.String(length=240), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_market_offers_finca_status", "market_offers", ["finca_id", "status"])
        op.create_index("ix_market_offers_product", "market_offers", ["product_name"])

    if not _has_table(bind, "technical_assistance_requests"):
        op.create_table(
            "technical_assistance_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("requester_user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("assigned_user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("priority", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=40), nullable=False),
            sa.Column("requested_at", sa.DateTime(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("resolution_notes", sa.Text(), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_assistance_finca_status", "technical_assistance_requests", ["finca_id", "status"])
        op.create_index("ix_assistance_territory_category", "technical_assistance_requests", ["territory_id", "category"])

    if not _has_table(bind, "offline_learning_materials"):
        op.create_table(
            "offline_learning_materials",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("content_type", sa.String(length=40), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("local_uri", sa.String(length=500), nullable=True),
            sa.Column("attachment_blob_id", sa.Integer(), sa.ForeignKey("attachment_blobs.id"), nullable=True),
            sa.Column("language", sa.String(length=50), nullable=True),
            sa.Column("reading_level", sa.String(length=80), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            *_common_columns(),
        )
        op.create_index("ix_learning_territory_category", "offline_learning_materials", ["territory_id", "category"])
        op.create_index("ix_learning_is_active", "offline_learning_materials", ["is_active"])


def downgrade():
    for table in [
        "offline_learning_materials",
        "technical_assistance_requests",
        "market_offers",
        "climate_risk_alerts",
        "water_measurements",
        "water_sources",
        "crop_activities",
        "crop_plots",
    ]:
        op.drop_table(table)
