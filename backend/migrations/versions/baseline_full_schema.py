"""Baseline completo: esquema del modelo actual.
Revision ID: baseline_full_schema
Revises: 
Create Date: 2026-09-06 21:10:31.889288
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'baseline_full_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Crea el esquema completo desde el modelo."""

    # ---- finca ----
    op.create_table('finca',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(255), nullable=False, ),
            sa.Column('type', sa.Enum('Educativa', 'Tradicional', name='farmtype'), nullable=False, ),
            sa.Column('nit', sa.String(20), ),
            sa.Column('department', sa.String(100), ),
            sa.Column('municipality', sa.String(100), ),
            sa.Column('address', sa.String(255), ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('logo_url', sa.String(500), ),
            sa.Column('ica_registration', sa.String(50), ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- user ----
    op.create_table('user',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('identification', sa.BigInteger(), nullable=False, unique=True, ),
            sa.Column('fullname', sa.String(120), nullable=False, ),
            sa.Column('password', sa.String(255), nullable=False, ),
            sa.Column('email', sa.String(120), nullable=False, unique=True, ),
            sa.Column('phone', sa.String(40), nullable=False, unique=True, ),
            sa.Column('address', sa.String(255), ),
            sa.Column('role', sa.Enum('Aprendiz', 'Instructor', 'Administrador', 'Propietario', 'Capataz', 'Operario', 'Veterinario', name='role'), nullable=False, ),
            sa.Column('status', sa.Boolean(), ),
            sa.Column('approval_status', sa.Enum('Pending', 'Approved', 'Rejected', 'Suspended', name='approvalstatus'), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('avatar_url', sa.String(255), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animals ----
    op.create_table('animals',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('sex', sa.Enum('Hembra', 'Macho', name='sex'), nullable=False, ),
            sa.Column('birth_date', sa.Date(), nullable=False, ),
            sa.Column('weight', sa.Float(), nullable=False, ),
            sa.Column('record', sa.String(255), nullable=False, ),
            sa.Column('qr_code', sa.String(100), unique=True, ),
            sa.Column('status', sa.Enum('Vivo', 'Vendido', 'Muerto', name='animalstatus'), ),
            sa.Column('entry_date', sa.Date(), ),
            sa.Column('purchase_date', sa.Date(), ),
            sa.Column('sale_date', sa.Date(), ),
            sa.Column('exit_date', sa.Date(), ),
            sa.Column('exit_reason', sa.String(255), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('breeds_id', sa.Integer(), nullable=False, ),
            sa.Column('idFather', sa.Integer(), ),
            sa.Column('idMother', sa.Integer(), ),
            sa.Column('idFatherFather', sa.Integer(), ),
            sa.Column('idFatherMother', sa.Integer(), ),
            sa.Column('idMotherFather', sa.Integer(), ),
            sa.Column('idMotherMother', sa.Integer(), ),
            sa.Column('is_pregnant', sa.Boolean(), ),
            sa.Column('is_lactating', sa.Boolean(), ),
            sa.Column('last_calving_date', sa.Date(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), ),
            sa.Column('nfc_uid', sa.String(32), unique=True, ),
            sa.Column('nfc_written_at', sa.DateTime(), ),
            sa.Column('lf_tag_code', sa.String(20), unique=True, )
        )

    # ---- species ----
    op.create_table('species',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(255), nullable=False, unique=True, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- breeds ----
    op.create_table('breeds',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(255), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('characteristics', sa.Text(), ),
            sa.Column('species_id', sa.Integer(), nullable=False, ),
            sa.Column('purpose', sa.Enum('Milk', 'Meat', 'Dual', 'Work', 'Ornamental', name='breedpurpose'), ),
            sa.Column('origin', sa.String(100), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- fields ----
    op.create_table('fields',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(255), nullable=False, ),
            sa.Column('ubication', sa.String(255), ),
            sa.Column('capacity', sa.String(255), ),
            sa.Column('state', sa.Enum('Disponible', 'Ocupado', 'Mantenimiento', 'Restringido', 'Dañado', 'Activo', name='landstatus'), nullable=False, ),
            sa.Column('handlings', sa.String(255), ),
            sa.Column('gauges', sa.String(255), ),
            sa.Column('area', sa.String(255), nullable=False, ),
            sa.Column('food_type_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('radius_meters', sa.Float(), ),
            sa.Column('last_grazing_date', sa.Date(), ),
            sa.Column('rest_days', sa.Integer(), ),
            sa.Column('grazing_days', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- diseases ----
    op.create_table('diseases',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(100), nullable=False, ),
            sa.Column('symptoms', sa.String(255), nullable=False, ),
            sa.Column('details', sa.String(255), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_diseases ----
    op.create_table('animal_diseases',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('disease_id', sa.Integer(), nullable=False, ),
            sa.Column('instructor_id', sa.Integer(), nullable=False, ),
            sa.Column('diagnosis_date', sa.Date(), nullable=False, ),
            sa.Column('status', sa.String(50), nullable=False, ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_fields ----
    op.create_table('animal_fields',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('field_id', sa.Integer(), nullable=False, ),
            sa.Column('assignment_date', sa.Date(), nullable=False, ),
            sa.Column('removal_date', sa.Date(), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- vaccinations ----
    op.create_table('vaccinations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('vaccine_id', sa.Integer(), nullable=False, ),
            sa.Column('vaccination_date', sa.Date(), nullable=False, ),
            sa.Column('dosis', sa.String(100), ),
            sa.Column('batch_number', sa.String(80), ),
            sa.Column('next_due_date', sa.Date(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('performed_by', sa.Integer(), ),
            sa.Column('apprentice_id', sa.Integer(), ),
            sa.Column('instructor_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('kb_codigo', sa.String(20), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- vaccines ----
    op.create_table('vaccines',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(100), nullable=False, ),
            sa.Column('dosis', sa.String(255), nullable=False, ),
            sa.Column('route_administration_id', sa.Integer(), nullable=False, ),
            sa.Column('vaccination_interval', sa.String(255), nullable=False, ),
            sa.Column('type', sa.Enum('Atenuada', 'Inactivada', 'Toxoide', 'Subunidad', 'Conjugada', 'Recombinante', 'Adn', 'Arn', name='vaccinetype'), nullable=False, ),
            sa.Column('national_plan', sa.String(255), nullable=False, ),
            sa.Column('target_disease_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- medications ----
    op.create_table('medications',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(100), nullable=False, ),
            sa.Column('description', sa.String(255), nullable=False, ),
            sa.Column('indications', sa.String(255), ),
            sa.Column('dosis', sa.String(50), ),
            sa.Column('contraindications', sa.String(255), ),
            sa.Column('route_administration_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('availability', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- treatments ----
    op.create_table('treatments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('treatment_date', sa.Date(), nullable=False, ),
            sa.Column('description', sa.String(255), nullable=False, ),
            sa.Column('frequency', sa.String(255), nullable=False, ),
            sa.Column('observations', sa.String(255), ),
            sa.Column('dosis', sa.String(255), nullable=False, ),
            sa.Column('withdrawal_days', sa.Integer(), ),
            sa.Column('withdrawal_end_date', sa.Date(), ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('control_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('performed_by', sa.Integer(), ),
            sa.Column('cost', sa.Numeric(10), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- inventory_lots ----
    op.create_table('inventory_lots',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('product_type', sa.Enum('Medicamento', 'Vacuna', name='producttype'), nullable=False, ),
            sa.Column('medication_id', sa.Integer(), ),
            sa.Column('vaccine_id', sa.Integer(), ),
            sa.Column('lot_number', sa.String(100), nullable=False, ),
            sa.Column('quantity', sa.Numeric(12), nullable=False, ),
            sa.Column('current_quantity', sa.Numeric(12), nullable=False, ),
            sa.Column('unit', sa.String(50), nullable=False, ),
            sa.Column('expiry_date', sa.Date(), nullable=False, ),
            sa.Column('entry_date', sa.Date(), nullable=False, ),
            sa.Column('supplier', sa.String(200), ),
            sa.Column('unit_cost', sa.Float(), ),
            sa.Column('min_stock', sa.Integer(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- inventory_movements ----
    op.create_table('inventory_movements',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('lot_id', sa.Integer(), nullable=False, ),
            sa.Column('movement_type', sa.Enum('Entrada', 'Salida', 'Ajuste', 'Baja', name='movementtype'), nullable=False, ),
            sa.Column('quantity', sa.Numeric(12), nullable=False, ),
            sa.Column('balance_before', sa.Numeric(12), ),
            sa.Column('balance_after', sa.Numeric(12), ),
            sa.Column('reference_type', sa.String(50), ),
            sa.Column('reference_id', sa.Integer(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('actor_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- treatment_medications ----
    op.create_table('treatment_medications',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('treatment_id', sa.Integer(), nullable=False, ),
            sa.Column('medication_id', sa.Integer(), nullable=False, ),
            sa.Column('lot_id', sa.Integer(), ),
            sa.Column('quantity', sa.Numeric(12), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- treatment_vaccines ----
    op.create_table('treatment_vaccines',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('treatment_id', sa.Integer(), nullable=False, ),
            sa.Column('vaccine_id', sa.Integer(), nullable=False, ),
            sa.Column('lot_id', sa.Integer(), ),
            sa.Column('quantity', sa.Numeric(12), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- control ----
    op.create_table('control',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('checkup_date', sa.Date(), nullable=False, ),
            sa.Column('health_status', sa.Enum('Excelente', 'Bueno', 'Regular', 'Malo', 'Sano', name='healthstatus'), nullable=False, ),
            sa.Column('weight', sa.Float(), ),
            sa.Column('height', sa.Float(), ),
            sa.Column('description', sa.String(255), ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- food_types ----
    op.create_table('food_types',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('food_type', sa.String(255), nullable=False, ),
            sa.Column('sowing_date', sa.Date(), nullable=False, ),
            sa.Column('harvest_date', sa.Date(), ),
            sa.Column('area', sa.Integer(), nullable=False, ),
            sa.Column('handlings', sa.String(255), nullable=False, ),
            sa.Column('gauges', sa.String(255), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- genetic_improvements ----
    op.create_table('genetic_improvements',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('date', sa.Date(), nullable=False, ),
            sa.Column('details', sa.String(255), nullable=False, ),
            sa.Column('results', sa.String(255), nullable=False, ),
            sa.Column('genetic_event_technique', sa.String(255), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- route_administrations ----
    op.create_table('route_administrations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(50), nullable=False, ),
            sa.Column('description', sa.String(255), ),
            sa.Column('status', sa.Boolean(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_images ----
    op.create_table('animal_images',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('filename', sa.String(255), nullable=False, ),
            sa.Column('filepath', sa.String(500), nullable=False, ),
            sa.Column('thumbnail_path', sa.String(500), ),
            sa.Column('file_size', sa.Integer(), ),
            sa.Column('mime_type', sa.String(100), ),
            sa.Column('is_primary', sa.Boolean(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- activity_log ----
    op.create_table('activity_log',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('action', sa.String(20), nullable=False, ),
            sa.Column('entity', sa.String(50), nullable=False, ),
            sa.Column('entity_id', sa.Integer(), ),
            sa.Column('title', sa.String(255), ),
            sa.Column('description', sa.Text(), ),
            sa.Column('severity', sa.String(20), nullable=False, ),
            sa.Column('actor_id', sa.Integer(), ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('relations', sa.JSON(), ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- activity_daily_agg ----
    op.create_table('activity_daily_agg',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('date', sa.Date(), nullable=False, ),
            sa.Column('actor_id', sa.Integer(), nullable=False, ),
            sa.Column('entity', sa.String(50), nullable=False, ),
            sa.Column('action', sa.String(20), nullable=False, ),
            sa.Column('severity', sa.String(20), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('count', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_alert_configs ----
    op.create_table('animal_alert_configs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('alert_type', sa.Enum('Reproducción', 'Salud', 'Crecimiento', 'Estado', 'Producción', 'Personalizada', 'Predictiva', name='alerttype'), nullable=False, ),
            sa.Column('dimension', sa.String(50), nullable=False, ),
            sa.Column('condition_value', sa.String(255), nullable=False, ),
            sa.Column('message', sa.Text(), nullable=False, ),
            sa.Column('priority', sa.Enum('Baja', 'Media', 'Alta', 'Crítica', name='alertpriority'), ),
            sa.Column('is_active', sa.Boolean(), ),
            sa.Column('is_default', sa.Boolean(), ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_alerts ----
    op.create_table('animal_alerts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('field_id', sa.Integer(), ),
            sa.Column('config_id', sa.Integer(), ),
            sa.Column('alert_type', sa.Enum('Reproducción', 'Salud', 'Crecimiento', 'Estado', 'Producción', 'Personalizada', 'Predictiva', name='alerttype'), nullable=False, ),
            sa.Column('message', sa.Text(), nullable=False, ),
            sa.Column('recommendation', sa.Text(), ),
            sa.Column('priority', sa.Enum('Baja', 'Media', 'Alta', 'Crítica', name='alertpriority'), ),
            sa.Column('is_read', sa.Boolean(), ),
            sa.Column('triggered_at', sa.DateTime(), ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('dedupe_key', sa.String(64), ),
            sa.Column('superseded_by_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- farm_entity_alert_configs ----
    op.create_table('farm_entity_alert_configs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('entity_type', sa.String(50), nullable=False, ),
            sa.Column('entity_id', sa.Integer(), ),
            sa.Column('dimension', sa.String(80), nullable=False, ),
            sa.Column('condition_value', sa.String(255), nullable=False, ),
            sa.Column('message', sa.Text(), nullable=False, ),
            sa.Column('priority', sa.String(50), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true'), ),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- farm_entity_alerts ----
    op.create_table('farm_entity_alerts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('entity_type', sa.String(50), nullable=False, ),
            sa.Column('entity_id', sa.Integer(), ),
            sa.Column('config_id', sa.Integer(), ),
            sa.Column('alert_type', sa.String(80), nullable=False, ),
            sa.Column('message', sa.Text(), nullable=False, ),
            sa.Column('recommendation', sa.Text(), ),
            sa.Column('priority', sa.String(50), ),
            sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('triggered_at', sa.DateTime(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_movements ----
    op.create_table('animal_movements',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_origen_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_destino_id', sa.Integer(), ),
            sa.Column('finca_destino_externa', sa.String(150), ),
            sa.Column('rpp_destino_externo', sa.String(12), ),
            sa.Column('tipo_movimiento', sa.Enum('Traslado_Interno', 'Venta_Traslado_Externo', 'Venta_En_Predio', name='movementtype'), nullable=False, ),
            sa.Column('fecha_movimiento', sa.Date(), nullable=False, ),
            sa.Column('precio_venta', sa.Numeric(12), ),
            sa.Column('comprador', sa.String(150), ),
            sa.Column('comprador_nit', sa.String(20), ),
            sa.Column('arete_sinigan', sa.String(50), ),
            sa.Column('guia_movilizacion', sa.String(50), ),
            sa.Column('ruv_vacunacion', sa.String(50), ),
            sa.Column('placa_vehiculo', sa.String(10), ),
            sa.Column('nombre_conductor', sa.String(100), ),
            sa.Column('cedula_conductor', sa.String(20), ),
            sa.Column('precinto_seguridad', sa.String(50), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- finca_images ----
    op.create_table('finca_images',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('filename', sa.String(255), nullable=False, ),
            sa.Column('filepath', sa.String(500), nullable=False, ),
            sa.Column('thumbnail_path', sa.String(500), ),
            sa.Column('file_size', sa.Integer(), ),
            sa.Column('mime_type', sa.String(100), ),
            sa.Column('is_primary', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- membership_request ----
    op.create_table('membership_request',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('status', sa.Enum('Pending', 'Approved', 'Rejected', name='requeststatus'), nullable=False, ),
            sa.Column('requested_role', sa.String(50), nullable=False, ),
            sa.Column('message', sa.Text(), ),
            sa.Column('processed_by', sa.Integer(), ),
            sa.Column('processed_at', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- system_contents ----
    op.create_table('system_contents',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('key', sa.String(120), nullable=False, ),
            sa.Column('category', sa.String(50), nullable=False, ),
            sa.Column('content_type', sa.String(50), ),
            sa.Column('priority', sa.String(20), ),
            sa.Column('title', sa.String(300), ),
            sa.Column('content', sa.Text(), nullable=False, ),
            sa.Column('extra', sa.JSON(), ),
            sa.Column('is_active', sa.Boolean(), ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- treatment_recommendations ----
    op.create_table('treatment_recommendations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('title', sa.String(160), nullable=False, ),
            sa.Column('recommendation', sa.Text(), nullable=False, ),
            sa.Column('responsible', sa.String(160), ),
            sa.Column('start_date', sa.Date(), nullable=False, ),
            sa.Column('estimated_end_date', sa.Date(), nullable=False, ),
            sa.Column('duration_days', sa.Integer(), nullable=False, ),
            sa.Column('control_interval_days', sa.Integer(), nullable=False, ),
            sa.Column('status', sa.String(20), nullable=False, ),
            sa.Column('final_notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- treatment_recommendation_controls ----
    op.create_table('treatment_recommendation_controls',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('treatment_recommendation_id', sa.Integer(), nullable=False, ),
            sa.Column('scheduled_date', sa.Date(), nullable=False, ),
            sa.Column('control_date', sa.Date(), ),
            sa.Column('observation', sa.Text(), ),
            sa.Column('completed', sa.Boolean(), nullable=False, ),
            sa.Column('recorded_by', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- user_favorites ----
    op.create_table('user_favorites',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('endpoint', sa.String(255), nullable=False, ),
            sa.Column('label', sa.String(255), ),
            sa.Column('method', sa.String(10), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- reproductive_events ----
    op.create_table('reproductive_events',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('control_id', sa.Integer(), ),
            sa.Column('event_type', sa.Enum('Celo', 'Inseminacion', 'Diagnostico', 'Parto', 'Secado', name='eventtype'), nullable=False, ),
            sa.Column('event_date', sa.Date(), nullable=False, ),
            sa.Column('sire_id', sa.Integer(), ),
            sa.Column('technique', sa.Enum('Natural', 'Artificial', 'Transferencia_Embrionaria', name='inseminationtechnique'), ),
            sa.Column('diagnosis_result', sa.Enum('Positivo', 'Negativo', 'Pendiente', name='diagnosisresult'), ),
            sa.Column('expected_birth_date', sa.Date(), ),
            sa.Column('alive_count', sa.Integer(), ),
            sa.Column('dead_count', sa.Integer(), ),
            sa.Column('complications', sa.Boolean(), ),
            sa.Column('actor_id', sa.Integer(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- offspring ----
    op.create_table('offspring',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('birth_event_id', sa.Integer(), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('sex', sa.Enum('Hembra', 'Macho', name='sex'), ),
            sa.Column('alive', sa.Boolean(), nullable=False, ),
            sa.Column('birth_weight', sa.Integer(), ),
            sa.Column('notes', sa.String(255), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- milk_production ----
    op.create_table('milk_production',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('control_id', sa.Integer(), ),
            sa.Column('date', sa.Date(), nullable=False, ),
            sa.Column('liters', sa.Float(), nullable=False, ),
            sa.Column('milking_session', sa.Enum('AM', 'PM', 'Extra', name='milksession'), nullable=False, ),
            sa.Column('fat_percentage', sa.Float(), ),
            sa.Column('protein_percentage', sa.Float(), ),
            sa.Column('somatic_cells', sa.Integer(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- lactation_cycles ----
    op.create_table('lactation_cycles',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('calving_date', sa.Date(), nullable=False, ),
            sa.Column('dry_off_date', sa.Date(), ),
            sa.Column('expected_dry_off_date', sa.Date(), ),
            sa.Column('lactation_number', sa.Integer(), nullable=False, ),
            sa.Column('status', sa.Enum('Active', 'DryingOff', 'Dry', 'Completed', name='lactationstatus'), nullable=False, ),
            sa.Column('peak_liters', sa.Float(), ),
            sa.Column('peak_date', sa.Date(), ),
            sa.Column('total_liters_lactation', sa.Float(), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- production_targets ----
    op.create_table('production_targets',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('target_liters', sa.Float(), nullable=False, ),
            sa.Column('period', sa.Enum('Daily', 'Weekly', 'Monthly', name='targetperiod'), nullable=False, ),
            sa.Column('start_date', sa.Date(), nullable=False, ),
            sa.Column('end_date', sa.Date(), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- user_finca ----
    op.create_table('user_finca',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('role', sa.String(50), nullable=False, ),
            sa.Column('supervisor_id', sa.Integer(), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('is_primary', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, ),
            sa.Column('updated_at', sa.DateTime(), )
        )

    # ---- push_subscription ----
    op.create_table('push_subscription',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('endpoint', sa.String(500), nullable=False, ),
            sa.Column('p256dh', sa.String(200), nullable=False, ),
            sa.Column('auth', sa.String(100), nullable=False, ),
            sa.Column('user_agent', sa.String(500), ),
            sa.Column('platform', sa.String(50), ),
            sa.Column('browser', sa.String(50), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, ),
            sa.Column('updated_at', sa.DateTime(), ),
            sa.Column('last_used', sa.DateTime(), )
        )

    # ---- join_requests ----
    op.create_table('join_requests',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('request_type', sa.Enum('REQUEST', 'INVITATION', name='joinrequesttype'), nullable=False, ),
            sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', name='joinrequeststatus'), nullable=False, ),
            sa.Column('requested_role', sa.String(50), nullable=False, ),
            sa.Column('notes', sa.String(255), ),
            sa.Column('invitation_token', sa.String(128), unique=True, ),
            sa.Column('token_hash', sa.String(256), ),
            sa.Column('invitation_method', sa.Enum('EMAIL', 'LINK', 'QR', 'CODE', name='invitationmethod'), ),
            sa.Column('max_uses', sa.Integer(), nullable=False, ),
            sa.Column('current_uses', sa.Integer(), nullable=False, ),
            sa.Column('expires_at', sa.DateTime(), ),
            sa.Column('processed_at', sa.DateTime(), ),
            sa.Column('processed_by', sa.Integer(), ),
            sa.Column('rejection_reason', sa.String(255), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, ),
            sa.Column('updated_at', sa.DateTime(), )
        )

    # ---- chat_messages ----
    op.create_table('chat_messages',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('sender_id', sa.Integer(), nullable=False, ),
            sa.Column('recipient_id', sa.Integer(), nullable=False, ),
            sa.Column('message', sa.Text(), nullable=False, ),
            sa.Column('attachment_url', sa.String(500), ),
            sa.Column('attachment_type', sa.String(50), ),
            sa.Column('attachment_name', sa.String(255), ),
            sa.Column('is_read', sa.Boolean(), ),
            sa.Column('created_at', sa.DateTime(), )
        )

    # ---- user_locations ----
    op.create_table('user_locations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('latitude', sa.Float(), nullable=False, ),
            sa.Column('longitude', sa.Float(), nullable=False, ),
            sa.Column('accuracy', sa.Float(), ),
            sa.Column('detection_method', sa.String(50), ),
            sa.Column('reported_by_node_id', sa.String(100), ),
            sa.Column('created_at', sa.DateTime(), )
        )

    # ---- transactions ----
    op.create_table('transactions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('transaction_type', sa.Enum('Income', 'Expense', name='transactiontype'), nullable=False, ),
            sa.Column('category', sa.Enum('Milk', 'Animal', 'Cheese', 'Crop', 'Medication', 'Food', 'Agriculture', 'Service', 'Labor', 'Transport', 'Maintenance', 'Other', name='transactioncategory'), nullable=False, ),
            sa.Column('amount', sa.Numeric(12), nullable=False, ),
            sa.Column('date', sa.Date(), nullable=False, ),
            sa.Column('description', sa.String(255), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- tasks ----
    op.create_table('tasks',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('title', sa.String(150), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='taskstatus'), ),
            sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='taskpriority'), ),
            sa.Column('due_date', sa.DateTime(), ),
            sa.Column('animal_id', sa.Integer(), ),
            sa.Column('field_id', sa.Integer(), ),
            sa.Column('assigned_to', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- livestock_summary ----
    op.create_table('livestock_summary',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, unique=True, ),
            sa.Column('total_animals', sa.Integer(), ),
            sa.Column('active_animals', sa.Integer(), ),
            sa.Column('sold_animals', sa.Integer(), ),
            sa.Column('dead_animals', sa.Integer(), ),
            sa.Column('male_count', sa.Integer(), ),
            sa.Column('female_count', sa.Integer(), ),
            sa.Column('sick_animals', sa.Integer(), ),
            sa.Column('last_recalculation', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- financial_summary ----
    op.create_table('financial_summary',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, unique=True, ),
            sa.Column('total_income', sa.Numeric(15), ),
            sa.Column('total_expense', sa.Numeric(15), ),
            sa.Column('balance', sa.Numeric(15), ),
            sa.Column('last_update', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- milk_summary ----
    op.create_table('milk_summary',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, unique=True, ),
            sa.Column('total_liters', sa.Float(), ),
            sa.Column('avg_liters_per_animal', sa.Float(), ),
            sa.Column('total_entries', sa.Integer(), ),
            sa.Column('last_update', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- operational_costs ----
    op.create_table('operational_costs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('concept', sa.String(255), nullable=False, ),
            sa.Column('amount', sa.Numeric(15), nullable=False, ),
            sa.Column('date', sa.Date(), nullable=False, ),
            sa.Column('category', sa.Enum('ALIMENTACION', 'SALUD', 'MANTENIMIENTO', 'PERSONAL', 'LEGAL', 'OTROS', name='operationalcategory'), nullable=False, ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_groups ----
    op.create_table('animal_groups',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(100), nullable=False, ),
            sa.Column('description', sa.String(255), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_group_membership ----
    op.create_table('animal_group_membership',
            sa.Column('animal_id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('group_id', sa.Integer(), nullable=False, primary_key=True, )
        )

    # ---- pasture_aforos ----
    op.create_table('pasture_aforos',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('field_id', sa.Integer(), nullable=False, ),
            sa.Column('entry_height', sa.Float(), ),
            sa.Column('exit_height', sa.Float(), ),
            sa.Column('pasture_quality', sa.Integer(), ),
            sa.Column('notes', sa.String(255), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- infrastructure ----
    op.create_table('infrastructure',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(100), nullable=False, ),
            sa.Column('type', sa.Enum('TANQUE', 'CERCA', 'MAQUINARIA', 'CORRAL', 'BEBEDERO', name='infrastructuretype'), nullable=False, ),
            sa.Column('last_maintenance', sa.Date(), ),
            sa.Column('next_maintenance', sa.Date(), ),
            sa.Column('status', sa.String(50), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- farm_expenses ----
    op.create_table('farm_expenses',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('expense_date', sa.Date(), nullable=False, ),
            sa.Column('category', sa.String(50), nullable=False, ),
            sa.Column('description', sa.String(255), nullable=False, ),
            sa.Column('amount', sa.Float(), nullable=False, ),
            sa.Column('is_income', sa.Boolean(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- devices ----
    op.create_table('devices',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('device_id', sa.String(128), nullable=False, ),
            sa.Column('name', sa.String(160), nullable=False, ),
            sa.Column('public_key', sa.Text(), ),
            sa.Column('platform', sa.String(40), ),
            sa.Column('status', sa.Enum('ACTIVE', 'REVOKED', 'LOST', name='devicestatus'), nullable=False, ),
            sa.Column('last_seen_at', sa.DateTime(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('user_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- sync_operations ----
    op.create_table('sync_operations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('operation_id', sa.String(128), nullable=False, ),
            sa.Column('entity_type', sa.String(80), nullable=False, ),
            sa.Column('entity_id', sa.String(128), ),
            sa.Column('operation', sa.String(20), nullable=False, ),
            sa.Column('payload', sa.JSON(), ),
            sa.Column('base_version', sa.Integer(), ),
            sa.Column('logical_clock', sa.Integer(), ),
            sa.Column('priority', sa.Integer(), nullable=False, ),
            sa.Column('status', sa.Enum('PENDING', 'APPLIED', 'CONFLICT', 'REJECTED', name='syncoperationstatus'), nullable=False, ),
            sa.Column('signature', sa.Text(), ),
            sa.Column('origin_device_id', sa.String(128), nullable=False, ),
            sa.Column('author_user_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at_device', sa.DateTime(), ),
            sa.Column('applied_at', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- sync_sessions ----
    op.create_table('sync_sessions',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('session_id', sa.String(128), nullable=False, unique=True, ),
            sa.Column('local_device_id', sa.String(128), nullable=False, ),
            sa.Column('peer_device_id', sa.String(128), ),
            sa.Column('transport', sa.String(40), nullable=False, ),
            sa.Column('status', sa.Enum('OPEN', 'COMPLETED', 'FAILED', name='syncsessionstatus'), nullable=False, ),
            sa.Column('operations_sent', sa.Integer(), nullable=False, ),
            sa.Column('operations_received', sa.Integer(), nullable=False, ),
            sa.Column('conflicts_count', sa.Integer(), nullable=False, ),
            sa.Column('started_at', sa.DateTime(), nullable=False, ),
            sa.Column('completed_at', sa.DateTime(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- sync_operation_receipts ----
    op.create_table('sync_operation_receipts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('operation_id', sa.String(128), nullable=False, ),
            sa.Column('device_id', sa.String(128), nullable=False, ),
            sa.Column('received_at', sa.DateTime(), nullable=False, ),
            sa.Column('applied', sa.Boolean(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- sync_conflicts ----
    op.create_table('sync_conflicts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('operation_id', sa.String(128), nullable=False, ),
            sa.Column('entity_type', sa.String(80), nullable=False, ),
            sa.Column('entity_id', sa.String(128), ),
            sa.Column('local_payload', sa.JSON(), ),
            sa.Column('incoming_payload', sa.JSON(), ),
            sa.Column('resolution', sa.String(40), ),
            sa.Column('resolved_by', sa.Integer(), ),
            sa.Column('resolved_at', sa.DateTime(), ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- attachment_blobs ----
    op.create_table('attachment_blobs',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('attachment_id', sa.String(128), nullable=False, unique=True, ),
            sa.Column('entity_type', sa.String(80), ),
            sa.Column('entity_id', sa.String(128), ),
            sa.Column('filename', sa.String(255), nullable=False, ),
            sa.Column('content_type', sa.String(120), ),
            sa.Column('sha256', sa.String(64), nullable=False, ),
            sa.Column('total_size', sa.Integer(), nullable=False, ),
            sa.Column('received_size', sa.Integer(), nullable=False, ),
            sa.Column('storage_path', sa.String(500), ),
            sa.Column('is_complete', sa.Boolean(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('uploaded_by', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- node_messages ----
    op.create_table('node_messages',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('message_id', sa.String(128), nullable=False, unique=True, ),
            sa.Column('sender_user_id', sa.Integer(), ),
            sa.Column('sender_device_id', sa.String(128), ),
            sa.Column('recipient_user_id', sa.Integer(), ),
            sa.Column('recipient_node_id', sa.String(128), ),
            sa.Column('message_type', sa.Enum('CHAT', 'ALERT', 'SYSTEM', name='nodemessagetype'), nullable=False, ),
            sa.Column('content', sa.Text(), nullable=False, ),
            sa.Column('status', sa.Enum('PENDING', 'DELIVERED', 'READ', name='nodemessagestatus'), nullable=False, ),
            sa.Column('priority', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- territories ----
    op.create_table('territories',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('name', sa.String(160), nullable=False, ),
            sa.Column('vereda', sa.String(160), ),
            sa.Column('municipality', sa.String(160), ),
            sa.Column('department', sa.String(160), ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('connectivity_level', sa.Enum('NONE', 'LOW', 'INTERMITTENT', 'GOOD', name='connectivitylevel'), nullable=False, ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- community_nodes ----
    op.create_table('community_nodes',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('node_id', sa.String(128), nullable=False, unique=True, ),
            sa.Column('name', sa.String(160), nullable=False, ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('host', sa.String(255), ),
            sa.Column('port', sa.Integer(), ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('last_seen_at', sa.DateTime(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- crop_plots ----
    op.create_table('crop_plots',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('field_id', sa.Integer(), ),
            sa.Column('name', sa.String(160), nullable=False, ),
            sa.Column('crop_name', sa.String(160), nullable=False, ),
            sa.Column('variety', sa.String(160), ),
            sa.Column('area', sa.Float(), ),
            sa.Column('area_unit', sa.String(40), ),
            sa.Column('sowing_date', sa.Date(), ),
            sa.Column('expected_harvest_date', sa.Date(), ),
            sa.Column('harvest_date', sa.Date(), ),
            sa.Column('status', sa.Enum('PLANNED', 'ACTIVE', 'HARVESTED', 'LOST', name='cropstatus'), nullable=False, ),
            sa.Column('seed_source', sa.String(180), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- crop_activities ----
    op.create_table('crop_activities',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('crop_plot_id', sa.Integer(), nullable=False, ),
            sa.Column('activity_type', sa.Enum('SOWING', 'IRRIGATION', 'FERTILIZATION', 'PEST_CONTROL', 'HARVEST', 'NOTE', name='cropactivitytype'), nullable=False, ),
            sa.Column('activity_date', sa.Date(), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('input_name', sa.String(180), ),
            sa.Column('quantity', sa.Float(), ),
            sa.Column('unit', sa.String(50), ),
            sa.Column('cost', sa.Float(), ),
            sa.Column('performed_by', sa.Integer(), ),
            sa.Column('attachment_blob_id', sa.Integer(), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- water_sources ----
    op.create_table('water_sources',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('name', sa.String(160), nullable=False, ),
            sa.Column('source_type', sa.Enum('STREAM', 'WELL', 'RESERVOIR', 'RAINWATER', 'PUBLIC_SUPPLY', 'OTHER', name='watersourcetype'), nullable=False, ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('capacity_liters', sa.Float(), ),
            sa.Column('is_potable', sa.Boolean(), ),
            sa.Column('reliability', sa.String(60), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- water_measurements ----
    op.create_table('water_measurements',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('water_source_id', sa.Integer(), nullable=False, ),
            sa.Column('measured_at', sa.DateTime(), nullable=False, ),
            sa.Column('level_percent', sa.Float(), ),
            sa.Column('flow_liters_minute', sa.Float(), ),
            sa.Column('ph', sa.Float(), ),
            sa.Column('turbidity', sa.Float(), ),
            sa.Column('rainfall_mm', sa.Float(), ),
            sa.Column('measured_by', sa.Integer(), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- climate_risk_alerts ----
    op.create_table('climate_risk_alerts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('title', sa.String(180), nullable=False, ),
            sa.Column('risk_type', sa.String(100), nullable=False, ),
            sa.Column('severity', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='riskseverity'), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('recommendation', sa.Text(), ),
            sa.Column('valid_from', sa.DateTime(), ),
            sa.Column('valid_until', sa.DateTime(), ),
            sa.Column('source', sa.String(180), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- market_offers ----
    op.create_table('market_offers',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('offer_type', sa.Enum('SALE', 'PURCHASE', 'EXCHANGE', name='marketoffertype'), nullable=False, ),
            sa.Column('product_name', sa.String(180), nullable=False, ),
            sa.Column('quantity', sa.Float(), ),
            sa.Column('unit', sa.String(50), ),
            sa.Column('price', sa.Float(), ),
            sa.Column('currency', sa.String(20), ),
            sa.Column('available_from', sa.Date(), ),
            sa.Column('available_until', sa.Date(), ),
            sa.Column('contact_name', sa.String(160), ),
            sa.Column('contact_phone', sa.String(80), ),
            sa.Column('delivery_location', sa.String(240), ),
            sa.Column('status', sa.String(50), nullable=False, ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- technical_assistance_requests ----
    op.create_table('technical_assistance_requests',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('requester_user_id', sa.Integer(), ),
            sa.Column('assigned_user_id', sa.Integer(), ),
            sa.Column('title', sa.String(180), nullable=False, ),
            sa.Column('category', sa.String(100), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('priority', sa.String(50), nullable=False, ),
            sa.Column('status', sa.Enum('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', name='assistancestatus'), nullable=False, ),
            sa.Column('requested_at', sa.DateTime(), ),
            sa.Column('resolved_at', sa.DateTime(), ),
            sa.Column('resolution_notes', sa.Text(), ),
            sa.Column('attachment_blob_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- offline_learning_materials ----
    op.create_table('offline_learning_materials',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('territory_id', sa.Integer(), ),
            sa.Column('title', sa.String(180), nullable=False, ),
            sa.Column('category', sa.String(100), nullable=False, ),
            sa.Column('content_type', sa.Enum('TEXT', 'AUDIO', 'VIDEO', 'PDF', 'IMAGE', name='learningcontenttype'), nullable=False, ),
            sa.Column('summary', sa.Text(), ),
            sa.Column('local_uri', sa.String(500), ),
            sa.Column('attachment_blob_id', sa.Integer(), ),
            sa.Column('language', sa.String(50), ),
            sa.Column('reading_level', sa.String(80), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- kb_recomendaciones ----
    op.create_table('kb_recomendaciones',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('codigo', sa.String(20), nullable=False, unique=True, ),
            sa.Column('categoria', sa.Enum('SANIDAD', 'REPRODUCCION', 'NUTRICION', 'PRODUCCION', 'BIOSEGURIDAD', 'BIENESTAR', 'EMERGENCIA', 'MANEJO', 'NORMATIVA', 'GENETICA', name='kbcategoria'), nullable=False, ),
            sa.Column('titulo', sa.String(120), nullable=False, ),
            sa.Column('descripcion', sa.Text(), nullable=False, ),
            sa.Column('accion', sa.Text(), nullable=False, ),
            sa.Column('cuando', sa.String(255), ),
            sa.Column('profesional', sa.Boolean(), ),
            sa.Column('urgencia', sa.Enum('INMEDIATA', 'ALTA', 'MEDIA', 'BAJA', name='kburgencia'), nullable=False, ),
            sa.Column('sexo', sa.Enum('HEMBRA', 'MACHO', 'AMBOS', name='kbsexo'), ),
            sa.Column('edad_min_dias', sa.Integer(), ),
            sa.Column('edad_max_dias', sa.Integer(), ),
            sa.Column('fuente', sa.String(120), ),
            sa.Column('activo', sa.Boolean(), ),
            sa.Column('creado_en', sa.DateTime(), )
        )

    # ---- kb_reglas ----
    op.create_table('kb_reglas',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('recomendacion_id', sa.Integer(), nullable=False, ),
            sa.Column('campo_condicion', sa.String(80), nullable=False, ),
            sa.Column('operador', sa.Enum('GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'IS_NULL', 'NOT_NULL', 'BETWEEN', name='kboperador'), nullable=False, ),
            sa.Column('valor', sa.String(100), ),
            sa.Column('valor_max', sa.String(100), ),
            sa.Column('descripcion_corta', sa.String(120), )
        )

    # ---- kb_calendario ----
    op.create_table('kb_calendario',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('codigo', sa.String(20), nullable=False, unique=True, ),
            sa.Column('nombre', sa.String(120), nullable=False, ),
            sa.Column('descripcion', sa.Text(), nullable=False, ),
            sa.Column('tipo', sa.String(50), nullable=False, ),
            sa.Column('obligatorio_ica', sa.Boolean(), ),
            sa.Column('sexo', sa.Enum('HEMBRA', 'MACHO', 'AMBOS', name='kbsexo'), ),
            sa.Column('edad_inicio_dias', sa.Integer(), ),
            sa.Column('edad_fin_dias', sa.Integer(), ),
            sa.Column('frecuencia_dias', sa.Integer(), ),
            sa.Column('producto_sugerido', sa.String(200), ),
            sa.Column('dosis_referencia', sa.String(100), ),
            sa.Column('fuente', sa.String(120), ),
            sa.Column('activo', sa.Boolean(), )
        )

    # ---- sinigan_registrations ----
    op.create_table('sinigan_registrations',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('arete_sinigan', sa.String(50), nullable=False, unique=True, ),
            sa.Column('fecha_registro', sa.Date(), nullable=False, ),
            sa.Column('predio_origen', sa.String(150), ),
            sa.Column('guia_movilizacion', sa.String(100), ),
            sa.Column('notes', sa.String(500), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- management_plans ----
    op.create_table('management_plans',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('name', sa.String(200), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('plan_type', sa.Enum('Sanitario', 'Reproductivo', 'Nutricional', 'Manejo', 'Educativo', name='plantype'), nullable=False, ),
            sa.Column('status', sa.Enum('Borrador', 'Activo', 'Completado', 'Cancelado', name='planstatus'), nullable=False, ),
            sa.Column('start_date', sa.Date(), nullable=False, ),
            sa.Column('end_date', sa.Date(), nullable=False, ),
            sa.Column('created_by_user', sa.Integer(), nullable=False, ),
            sa.Column('approved_by_user', sa.Integer(), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- producer_profiles ----
    op.create_table('producer_profiles',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, unique=True, ),
            sa.Column('producer_type', sa.Enum('Subsistencia', 'Comercial_Pequeno', 'Comercial_Mediano', 'Educativo', 'Institucional', name='producertype'), nullable=False, ),
            sa.Column('certifications', sa.String(255), ),
            sa.Column('has_credit_access', sa.Boolean(), ),
            sa.Column('association_name', sa.String(200), ),
            sa.Column('years_experience', sa.Integer(), ),
            sa.Column('land_tenure', sa.String(100), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- professional_credentials ----
    op.create_table('professional_credentials',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('user_id', sa.Integer(), nullable=False, unique=True, ),
            sa.Column('title', sa.Enum('MedicoVeterinario', 'MedicoVeterinarioZootecnista', 'Zootecnista', name='credentialtitle'), nullable=False, ),
            sa.Column('professional_card_number', sa.String(20), nullable=False, ),
            sa.Column('issuing_authority', sa.String(80), nullable=False, ),
            sa.Column('card_issued_at', sa.Date(), ),
            sa.Column('university', sa.String(160), nullable=False, ),
            sa.Column('graduation_year', sa.Integer(), ),
            sa.Column('specialization', sa.String(200), ),
            sa.Column('ica_registration', sa.String(60), ),
            sa.Column('practice_areas', sa.String(255), ),
            sa.Column('liability_insurer', sa.String(120), ),
            sa.Column('liability_policy_number', sa.String(60), ),
            sa.Column('liability_expires_at', sa.Date(), ),
            sa.Column('status', sa.Enum('Autodeclarado', 'EnRevision', 'Verificado', 'Rechazado', 'PorRevalidar', name='credentialstatus'), nullable=False, ),
            sa.Column('verified_by_id', sa.Integer(), ),
            sa.Column('verified_at', sa.DateTime(), ),
            sa.Column('verification_source', sa.String(120), ),
            sa.Column('verification_reference', sa.String(160), ),
            sa.Column('verification_expires_at', sa.Date(), ),
            sa.Column('verification_notes', sa.String(255), ),
            sa.Column('rejection_reason', sa.String(255), ),
            sa.Column('consent_version', sa.String(20), nullable=False, ),
            sa.Column('consent_accepted_at', sa.DateTime(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_health_history ----
    op.create_table('animal_health_history',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('event_type', sa.Enum('Checkup', 'Vaccination', 'Treatment', 'Disease', 'Surgery', 'Deworming', name='healtheventtype'), nullable=False, ),
            sa.Column('event_date', sa.Date(), nullable=False, ),
            sa.Column('weight', sa.Float(), ),
            sa.Column('height', sa.Float(), ),
            sa.Column('temperature', sa.Float(), ),
            sa.Column('health_status', sa.String(50), ),
            sa.Column('description', sa.Text(), ),
            sa.Column('performed_by', sa.Integer(), ),
            sa.Column('reference_id', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- animal_production_metrics ----
    op.create_table('animal_production_metrics',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('metric_type', sa.Enum('Weight', 'MilkYield', 'GrowthRate', 'FeedConversion', 'BodyCondition', name='metrictype'), nullable=False, ),
            sa.Column('recorded_date', sa.Date(), nullable=False, ),
            sa.Column('value', sa.Float(), nullable=False, ),
            sa.Column('unit', sa.String(20), nullable=False, ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('recorded_by', sa.Integer(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- breed_growth_standards ----
    op.create_table('breed_growth_standards',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('breed_id', sa.Integer(), nullable=False, ),
            sa.Column('sex', sa.String(20), nullable=False, ),
            sa.Column('growth_stage', sa.Enum('Neonato', 'Lactancia', 'Destete', 'Desarrollo', 'Adulto', name='growthstage'), nullable=False, ),
            sa.Column('age_months', sa.Integer(), nullable=False, ),
            sa.Column('expected_weight_kg', sa.Float(), nullable=False, ),
            sa.Column('min_weight_kg', sa.Float(), nullable=False, ),
            sa.Column('max_weight_kg', sa.Float(), ),
            sa.Column('expected_adg_kg', sa.Float(), nullable=False, ),
            sa.Column('min_adg_kg', sa.Float(), nullable=False, ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- body_condition_scores ----
    op.create_table('body_condition_scores',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('animal_id', sa.Integer(), nullable=False, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('score_date', sa.Date(), nullable=False, ),
            sa.Column('score', sa.Float(), nullable=False, ),
            sa.Column('evaluator_id', sa.Integer(), ),
            sa.Column('notes', sa.Text(), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- seasonal_adjustments ----
    op.create_table('seasonal_adjustments',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('month', sa.Integer(), nullable=False, ),
            sa.Column('adg_multiplier', sa.Float(), nullable=False, ),
            sa.Column('pasture_quality_index', sa.Float(), nullable=False, ),
            sa.Column('milk_production_multiplier', sa.Float(), nullable=False, ),
            sa.Column('heat_stress_risk', sa.String(20), nullable=False, ),
            sa.Column('description', sa.String(255), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- weather_records ----
    op.create_table('weather_records',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('recorded_at', sa.DateTime(), nullable=False, ),
            sa.Column('temperature_celsius', sa.Float(), ),
            sa.Column('feels_like_celsius', sa.Float(), ),
            sa.Column('humidity_percent', sa.Float(), ),
            sa.Column('wind_speed_kmh', sa.Float(), ),
            sa.Column('wind_direction_degrees', sa.Float(), ),
            sa.Column('precipitation_mm', sa.Float(), ),
            sa.Column('pressure_hpa', sa.Float(), ),
            sa.Column('uv_index', sa.Float(), ),
            sa.Column('cloud_cover_percent', sa.Float(), ),
            sa.Column('weather_code', sa.Integer(), ),
            sa.Column('weather_condition', sa.Enum('CLEAR', 'CLOUDY', 'FOG', 'RAIN', 'STORM', 'SNOW', 'HAIL', 'WINDY', name='weathercondition'), ),
            sa.Column('sunrise_time', sa.Time(), ),
            sa.Column('sunset_time', sa.Time(), ),
            sa.Column('latitude', sa.Float(), ),
            sa.Column('longitude', sa.Float(), ),
            sa.Column('source', sa.String(100), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )

    # ---- weather_alerts ----
    op.create_table('weather_alerts',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True, ),
            sa.Column('finca_id', sa.Integer(), nullable=False, ),
            sa.Column('title', sa.String(200), nullable=False, ),
            sa.Column('alert_type', sa.Enum('HEAT', 'COLD', 'RAIN', 'STORM', 'FROST', 'DROUGHT', 'WIND', 'HAIL', name='weatheralerttype'), nullable=False, ),
            sa.Column('severity', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='weatheralertseverity'), nullable=False, ),
            sa.Column('description', sa.Text(), ),
            sa.Column('recommendation', sa.Text(), ),
            sa.Column('current_temperature', sa.Float(), ),
            sa.Column('current_humidity', sa.Float(), ),
            sa.Column('current_wind_speed', sa.Float(), ),
            sa.Column('valid_from', sa.DateTime(), ),
            sa.Column('valid_until', sa.DateTime(), ),
            sa.Column('is_active', sa.Boolean(), nullable=False, ),
            sa.Column('is_dismissed', sa.Boolean(), nullable=False, ),
            sa.Column('dismissed_by', sa.Integer(), ),
            sa.Column('dismissed_at', sa.DateTime(), ),
            sa.Column('source', sa.String(100), ),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), ),
            sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text('1'), ),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false'), ),
            sa.Column('deleted_at', sa.DateTime(), ),
            sa.Column('created_by', sa.Integer(), ),
            sa.Column('updated_by', sa.Integer(), )
        )


    # ---- unique constraints ----
    op.create_unique_constraint('uq_user_email', 'user', ['email'])
    op.create_unique_constraint('uq_user_identification', 'user', ['identification'])
    op.create_unique_constraint('uq_user_phone', 'user', ['phone'])
    op.create_unique_constraint('uq_animals_qr_code', 'animals', ['qr_code'])
    op.create_unique_constraint('uq_animals_record_finca', 'animals', ['record', 'finca_id'])
    op.create_unique_constraint('uq_species_name', 'species', ['name'])
    op.create_unique_constraint('uq_fields_name_finca', 'fields', ['name', 'finca_id'])
    op.create_unique_constraint('uq_diseases_name_finca', 'diseases', ['name', 'finca_id'])
    op.create_unique_constraint('uq_animal_diseases_animal_disease_date', 'animal_diseases', ['animal_id', 'disease_id', 'diagnosis_date'])
    op.create_unique_constraint('uq_animal_fields_animal_field_date', 'animal_fields', ['animal_id', 'field_id', 'assignment_date'])
    op.create_unique_constraint('uq_vaccines_name_finca', 'vaccines', ['name', 'finca_id'])
    op.create_unique_constraint('uq_medications_name_finca', 'medications', ['name', 'finca_id'])
    op.create_unique_constraint('uq_treatment_medications_treatment_medication', 'treatment_medications', ['treatment_id', 'medication_id'])
    op.create_unique_constraint('uq_treatment_vaccines_treatment_vaccine', 'treatment_vaccines', ['treatment_id', 'vaccine_id'])
    op.create_unique_constraint('uq_food_types_name_finca', 'food_types', ['food_type', 'finca_id'])
    op.create_unique_constraint('uq_route_administrations_name_finca', 'route_administrations', ['name', 'finca_id'])
    op.create_unique_constraint('uq_activity_daily_agg_key', 'activity_daily_agg', ['date', 'actor_id', 'entity', 'action', 'severity', 'animal_id'])
    op.create_unique_constraint('uq_system_content_key_finca', 'system_contents', ['key', 'finca_id'])
    op.create_unique_constraint('uq_recommendation_control_schedule', 'treatment_recommendation_controls', ['treatment_recommendation_id', 'scheduled_date'])
    op.create_unique_constraint('uq_user_favorite_endpoint', 'user_favorites', ['user_id', 'endpoint'])
    op.create_unique_constraint('uq_milk_production_animal_date_session', 'milk_production', ['animal_id', 'date', 'milking_session'])
    op.create_unique_constraint('uq_join_requests_invitation_token', 'join_requests', ['invitation_token'])
    op.create_unique_constraint('uq_livestock_summary_finca_id', 'livestock_summary', ['finca_id'])
    op.create_unique_constraint('uq_financial_summary_finca_id', 'financial_summary', ['finca_id'])
    op.create_unique_constraint('uq_milk_summary_finca_id', 'milk_summary', ['finca_id'])
    op.create_unique_constraint('uq_devices_finca_device', 'devices', ['finca_id', 'device_id'])
    op.create_unique_constraint('uq_sync_operations_operation_id', 'sync_operations', ['operation_id'])
    op.create_unique_constraint('uq_sync_sessions_session_id', 'sync_sessions', ['session_id'])
    op.create_unique_constraint('uq_sync_receipt_operation_device', 'sync_operation_receipts', ['operation_id', 'device_id'])
    op.create_unique_constraint('uq_attachment_sha_finca', 'attachment_blobs', ['sha256', 'finca_id'])
    op.create_unique_constraint('uq_attachment_blobs_attachment_id', 'attachment_blobs', ['attachment_id'])
    op.create_unique_constraint('uq_node_messages_message_id', 'node_messages', ['message_id'])
    op.create_unique_constraint('uq_community_nodes_node_id', 'community_nodes', ['node_id'])
    op.create_unique_constraint('uq_kb_recomendaciones_codigo', 'kb_recomendaciones', ['codigo'])
    op.create_unique_constraint('uq_kb_calendario_codigo', 'kb_calendario', ['codigo'])
    op.create_unique_constraint('uq_sinigan_registrations_arete_sinigan', 'sinigan_registrations', ['arete_sinigan'])
    op.create_unique_constraint('uq_producer_profiles_user_id', 'producer_profiles', ['user_id'])
    op.create_unique_constraint('uq_professional_credentials_user_id', 'professional_credentials', ['user_id'])
    op.create_unique_constraint('uq_breed_growth_standard', 'breed_growth_standards', ['breed_id', 'sex', 'growth_stage', 'age_months'])
    op.create_unique_constraint('uq_seasonal_adj_finca_month', 'seasonal_adjustments', ['finca_id', 'month'])

    # ---- foreign keys ----
    op.create_foreign_key('_fk_finca_territory_id', 'finca', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_user_finca_id', 'user', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animals_idMother', 'animals', 'animals', ['idMother'], ['id'], )
    op.create_foreign_key('_fk_animals_idFather', 'animals', 'animals', ['idFather'], ['id'], )
    op.create_foreign_key('_fk_animals_idFatherFather', 'animals', 'animals', ['idFatherFather'], ['id'], )
    op.create_foreign_key('_fk_animals_finca_id', 'animals', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animals_breeds_id', 'animals', 'breeds', ['breeds_id'], ['id'], )
    op.create_foreign_key('_fk_animals_idMotherFather', 'animals', 'animals', ['idMotherFather'], ['id'], )
    op.create_foreign_key('_fk_animals_idMotherMother', 'animals', 'animals', ['idMotherMother'], ['id'], )
    op.create_foreign_key('_fk_animals_idFatherMother', 'animals', 'animals', ['idFatherMother'], ['id'], )
    op.create_foreign_key('_fk_breeds_species_id', 'breeds', 'species', ['species_id'], ['id'], )
    op.create_foreign_key('_fk_fields_finca_id', 'fields', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_fields_food_type_id', 'fields', 'food_types', ['food_type_id'], ['id'], )
    op.create_foreign_key('_fk_diseases_finca_id', 'diseases', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_diseases_finca_id', 'animal_diseases', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_diseases_instructor_id', 'animal_diseases', 'user', ['instructor_id'], ['id'], )
    op.create_foreign_key('_fk_animal_diseases_disease_id', 'animal_diseases', 'diseases', ['disease_id'], ['id'], )
    op.create_foreign_key('_fk_animal_diseases_animal_id', 'animal_diseases', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_animal_fields_animal_id', 'animal_fields', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_animal_fields_finca_id', 'animal_fields', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_fields_field_id', 'animal_fields', 'fields', ['field_id'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_finca_id', 'vaccinations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_apprentice_id', 'vaccinations', 'user', ['apprentice_id'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_vaccine_id', 'vaccinations', 'vaccines', ['vaccine_id'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_instructor_id', 'vaccinations', 'user', ['instructor_id'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_performed_by', 'vaccinations', 'user', ['performed_by'], ['id'], )
    op.create_foreign_key('_fk_vaccinations_animal_id', 'vaccinations', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_vaccines_route_administration_id', 'vaccines', 'route_administrations', ['route_administration_id'], ['id'], )
    op.create_foreign_key('_fk_vaccines_finca_id', 'vaccines', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_vaccines_target_disease_id', 'vaccines', 'diseases', ['target_disease_id'], ['id'], )
    op.create_foreign_key('_fk_medications_finca_id', 'medications', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_medications_route_administration_id', 'medications', 'route_administrations', ['route_administration_id'], ['id'], )
    op.create_foreign_key('_fk_treatments_animal_id', 'treatments', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_treatments_performed_by', 'treatments', 'user', ['performed_by'], ['id'], )
    op.create_foreign_key('_fk_treatments_finca_id', 'treatments', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_treatments_control_id', 'treatments', 'control', ['control_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_lots_finca_id', 'inventory_lots', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_lots_vaccine_id', 'inventory_lots', 'vaccines', ['vaccine_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_lots_medication_id', 'inventory_lots', 'medications', ['medication_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_movements_lot_id', 'inventory_movements', 'inventory_lots', ['lot_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_movements_finca_id', 'inventory_movements', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_inventory_movements_actor_id', 'inventory_movements', 'user', ['actor_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_medications_medication_id', 'treatment_medications', 'medications', ['medication_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_medications_treatment_id', 'treatment_medications', 'treatments', ['treatment_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_medications_lot_id', 'treatment_medications', 'inventory_lots', ['lot_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_vaccines_vaccine_id', 'treatment_vaccines', 'vaccines', ['vaccine_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_vaccines_treatment_id', 'treatment_vaccines', 'treatments', ['treatment_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_vaccines_lot_id', 'treatment_vaccines', 'inventory_lots', ['lot_id'], ['id'], )
    op.create_foreign_key('_fk_control_finca_id', 'control', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_control_animal_id', 'control', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_food_types_finca_id', 'food_types', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_genetic_improvements_finca_id', 'genetic_improvements', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_genetic_improvements_animal_id', 'genetic_improvements', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_route_administrations_finca_id', 'route_administrations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_images_finca_id', 'animal_images', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_images_animal_id', 'animal_images', 'animals', ['animal_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_activity_log_actor_id', 'activity_log', 'user', ['actor_id'], ['id'], )
    op.create_foreign_key('_fk_activity_log_finca_id', 'activity_log', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_activity_daily_agg_finca_id', 'activity_daily_agg', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alert_configs_finca_id', 'animal_alert_configs', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alert_configs_animal_id', 'animal_alert_configs', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alerts_finca_id', 'animal_alerts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alerts_config_id', 'animal_alerts', 'animal_alert_configs', ['config_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alerts_field_id', 'animal_alerts', 'fields', ['field_id'], ['id'], )
    op.create_foreign_key('_fk_animal_alerts_animal_id', 'animal_alerts', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_farm_entity_alert_configs_finca_id', 'farm_entity_alert_configs', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_farm_entity_alerts_finca_id', 'farm_entity_alerts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_movements_animal_id', 'animal_movements', 'animals', ['animal_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_animal_movements_finca_destino_id', 'animal_movements', 'finca', ['finca_destino_id'], ['id'], )
    op.create_foreign_key('_fk_animal_movements_finca_origen_id', 'animal_movements', 'finca', ['finca_origen_id'], ['id'], )
    op.create_foreign_key('_fk_finca_images_finca_id', 'finca_images', 'finca', ['finca_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_membership_request_user_id', 'membership_request', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_membership_request_processed_by', 'membership_request', 'user', ['processed_by'], ['id'], )
    op.create_foreign_key('_fk_membership_request_finca_id', 'membership_request', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_system_contents_finca_id', 'system_contents', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_recommendations_finca_id', 'treatment_recommendations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_recommendations_animal_id', 'treatment_recommendations', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_treatment_recommendation_controls_recorded_by', 'treatment_recommendation_controls', 'user', ['recorded_by'], ['id'], )
    op.create_foreign_key('_fk_treatment_recommendation_controls_treatment_recom_82c5e0c6', 'treatment_recommendation_controls', 'treatment_recommendations', ['treatment_recommendation_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_user_favorites_user_id', 'user_favorites', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_reproductive_events_actor_id', 'reproductive_events', 'user', ['actor_id'], ['id'], )
    op.create_foreign_key('_fk_reproductive_events_control_id', 'reproductive_events', 'control', ['control_id'], ['id'], )
    op.create_foreign_key('_fk_reproductive_events_finca_id', 'reproductive_events', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_reproductive_events_sire_id', 'reproductive_events', 'animals', ['sire_id'], ['id'], )
    op.create_foreign_key('_fk_reproductive_events_animal_id', 'reproductive_events', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_offspring_animal_id', 'offspring', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_offspring_birth_event_id', 'offspring', 'reproductive_events', ['birth_event_id'], ['id'], )
    op.create_foreign_key('_fk_offspring_finca_id', 'offspring', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_milk_production_control_id', 'milk_production', 'control', ['control_id'], ['id'], )
    op.create_foreign_key('_fk_milk_production_finca_id', 'milk_production', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_milk_production_animal_id', 'milk_production', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_lactation_cycles_finca_id', 'lactation_cycles', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_lactation_cycles_animal_id', 'lactation_cycles', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_production_targets_animal_id', 'production_targets', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_production_targets_finca_id', 'production_targets', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_user_finca_supervisor_id', 'user_finca', 'user', ['supervisor_id'], ['id'], ondelete='SET NULL', )
    op.create_foreign_key('_fk_user_finca_finca_id', 'user_finca', 'finca', ['finca_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_user_finca_user_id', 'user_finca', 'user', ['user_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_push_subscription_user_id', 'push_subscription', 'user', ['user_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_join_requests_finca_id', 'join_requests', 'finca', ['finca_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_join_requests_user_id', 'join_requests', 'user', ['user_id'], ['id'], ondelete='CASCADE', )
    op.create_foreign_key('_fk_join_requests_processed_by', 'join_requests', 'user', ['processed_by'], ['id'], )
    op.create_foreign_key('_fk_chat_messages_recipient_id', 'chat_messages', 'user', ['recipient_id'], ['id'], )
    op.create_foreign_key('_fk_chat_messages_sender_id', 'chat_messages', 'user', ['sender_id'], ['id'], )
    op.create_foreign_key('_fk_chat_messages_finca_id', 'chat_messages', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_user_locations_finca_id', 'user_locations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_user_locations_user_id', 'user_locations', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_transactions_animal_id', 'transactions', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_transactions_finca_id', 'transactions', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_tasks_finca_id', 'tasks', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_tasks_assigned_to', 'tasks', 'user', ['assigned_to'], ['id'], )
    op.create_foreign_key('_fk_tasks_field_id', 'tasks', 'fields', ['field_id'], ['id'], )
    op.create_foreign_key('_fk_tasks_animal_id', 'tasks', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_livestock_summary_finca_id', 'livestock_summary', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_financial_summary_finca_id', 'financial_summary', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_milk_summary_finca_id', 'milk_summary', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_operational_costs_finca_id', 'operational_costs', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_groups_finca_id', 'animal_groups', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_group_membership_group_id', 'animal_group_membership', 'animal_groups', ['group_id'], ['id'], )
    op.create_foreign_key('_fk_animal_group_membership_animal_id', 'animal_group_membership', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_pasture_aforos_finca_id', 'pasture_aforos', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_pasture_aforos_field_id', 'pasture_aforos', 'fields', ['field_id'], ['id'], )
    op.create_foreign_key('_fk_infrastructure_finca_id', 'infrastructure', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_farm_expenses_finca_id', 'farm_expenses', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_devices_user_id', 'devices', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_devices_finca_id', 'devices', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sync_operations_finca_id', 'sync_operations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sync_operations_author_user_id', 'sync_operations', 'user', ['author_user_id'], ['id'], )
    op.create_foreign_key('_fk_sync_sessions_finca_id', 'sync_sessions', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sync_operation_receipts_finca_id', 'sync_operation_receipts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sync_operation_receipts_operation_id', 'sync_operation_receipts', 'sync_operations', ['operation_id'], ['operation_id'], )
    op.create_foreign_key('_fk_sync_conflicts_finca_id', 'sync_conflicts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sync_conflicts_resolved_by', 'sync_conflicts', 'user', ['resolved_by'], ['id'], )
    op.create_foreign_key('_fk_sync_conflicts_operation_id', 'sync_conflicts', 'sync_operations', ['operation_id'], ['operation_id'], )
    op.create_foreign_key('_fk_attachment_blobs_finca_id', 'attachment_blobs', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_attachment_blobs_uploaded_by', 'attachment_blobs', 'user', ['uploaded_by'], ['id'], )
    op.create_foreign_key('_fk_node_messages_finca_id', 'node_messages', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_node_messages_sender_user_id', 'node_messages', 'user', ['sender_user_id'], ['id'], )
    op.create_foreign_key('_fk_node_messages_recipient_user_id', 'node_messages', 'user', ['recipient_user_id'], ['id'], )
    op.create_foreign_key('_fk_community_nodes_finca_id', 'community_nodes', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_community_nodes_territory_id', 'community_nodes', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_crop_plots_field_id', 'crop_plots', 'fields', ['field_id'], ['id'], )
    op.create_foreign_key('_fk_crop_plots_finca_id', 'crop_plots', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_crop_activities_crop_plot_id', 'crop_activities', 'crop_plots', ['crop_plot_id'], ['id'], )
    op.create_foreign_key('_fk_crop_activities_finca_id', 'crop_activities', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_crop_activities_attachment_blob_id', 'crop_activities', 'attachment_blobs', ['attachment_blob_id'], ['id'], )
    op.create_foreign_key('_fk_crop_activities_performed_by', 'crop_activities', 'user', ['performed_by'], ['id'], )
    op.create_foreign_key('_fk_water_sources_territory_id', 'water_sources', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_water_sources_finca_id', 'water_sources', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_water_measurements_measured_by', 'water_measurements', 'user', ['measured_by'], ['id'], )
    op.create_foreign_key('_fk_water_measurements_water_source_id', 'water_measurements', 'water_sources', ['water_source_id'], ['id'], )
    op.create_foreign_key('_fk_water_measurements_finca_id', 'water_measurements', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_climate_risk_alerts_territory_id', 'climate_risk_alerts', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_climate_risk_alerts_finca_id', 'climate_risk_alerts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_market_offers_territory_id', 'market_offers', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_market_offers_finca_id', 'market_offers', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_technical_assistance_requests_assigned_user_id', 'technical_assistance_requests', 'user', ['assigned_user_id'], ['id'], )
    op.create_foreign_key('_fk_technical_assistance_requests_attachment_blob_id', 'technical_assistance_requests', 'attachment_blobs', ['attachment_blob_id'], ['id'], )
    op.create_foreign_key('_fk_technical_assistance_requests_requester_user_id', 'technical_assistance_requests', 'user', ['requester_user_id'], ['id'], )
    op.create_foreign_key('_fk_technical_assistance_requests_territory_id', 'technical_assistance_requests', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_technical_assistance_requests_finca_id', 'technical_assistance_requests', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_offline_learning_materials_territory_id', 'offline_learning_materials', 'territories', ['territory_id'], ['id'], )
    op.create_foreign_key('_fk_offline_learning_materials_attachment_blob_id', 'offline_learning_materials', 'attachment_blobs', ['attachment_blob_id'], ['id'], )
    op.create_foreign_key('_fk_kb_reglas_recomendacion_id', 'kb_reglas', 'kb_recomendaciones', ['recomendacion_id'], ['id'], )
    op.create_foreign_key('_fk_sinigan_registrations_finca_id', 'sinigan_registrations', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_sinigan_registrations_animal_id', 'sinigan_registrations', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_management_plans_finca_id', 'management_plans', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_management_plans_approved_by_user', 'management_plans', 'user', ['approved_by_user'], ['id'], )
    op.create_foreign_key('_fk_management_plans_created_by_user', 'management_plans', 'user', ['created_by_user'], ['id'], )
    op.create_foreign_key('_fk_producer_profiles_user_id', 'producer_profiles', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_professional_credentials_verified_by_id', 'professional_credentials', 'user', ['verified_by_id'], ['id'], )
    op.create_foreign_key('_fk_professional_credentials_user_id', 'professional_credentials', 'user', ['user_id'], ['id'], )
    op.create_foreign_key('_fk_animal_health_history_performed_by', 'animal_health_history', 'user', ['performed_by'], ['id'], )
    op.create_foreign_key('_fk_animal_health_history_finca_id', 'animal_health_history', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_animal_health_history_animal_id', 'animal_health_history', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_animal_production_metrics_recorded_by', 'animal_production_metrics', 'user', ['recorded_by'], ['id'], )
    op.create_foreign_key('_fk_animal_production_metrics_animal_id', 'animal_production_metrics', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_animal_production_metrics_finca_id', 'animal_production_metrics', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_breed_growth_standards_breed_id', 'breed_growth_standards', 'breeds', ['breed_id'], ['id'], )
    op.create_foreign_key('_fk_body_condition_scores_evaluator_id', 'body_condition_scores', 'user', ['evaluator_id'], ['id'], )
    op.create_foreign_key('_fk_body_condition_scores_finca_id', 'body_condition_scores', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_body_condition_scores_animal_id', 'body_condition_scores', 'animals', ['animal_id'], ['id'], )
    op.create_foreign_key('_fk_seasonal_adjustments_finca_id', 'seasonal_adjustments', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_weather_records_finca_id', 'weather_records', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_weather_alerts_finca_id', 'weather_alerts', 'finca', ['finca_id'], ['id'], )
    op.create_foreign_key('_fk_weather_alerts_dismissed_by', 'weather_alerts', 'user', ['dismissed_by'], ['id'], )

    # ---- indexes ----
    op.create_index('ix_user_role', 'user', ['role'], unique=False)
    op.create_index('ix_user_created_at', 'user', ['created_at'], unique=False)
    op.create_index('ix_user_finca_id', 'user', ['finca_id'], unique=False)
    op.create_index('ix_user_updated_at', 'user', ['updated_at'], unique=False)
    op.create_index('ix_animals_lf_tag_code', 'animals', ['lf_tag_code'], unique=True)
    op.create_index('ix_animals_finca_id', 'animals', ['finca_id'], unique=False)
    op.create_index('ix_animals_created_at', 'animals', ['created_at'], unique=False)
    op.create_index('ix_animals_nfc_uid', 'animals', ['nfc_uid'], unique=True)
    op.create_index('ix_animals_breeds_status', 'animals', ['breeds_id', 'status'], unique=False)
    op.create_index('ix_animals_updated_at', 'animals', ['updated_at'], unique=False)
    op.create_index('ix_breeds_updated_at', 'breeds', ['updated_at'], unique=False)
    op.create_index('ix_breeds_created_at', 'breeds', ['created_at'], unique=False)
    op.create_index('ix_breeds_species_purpose', 'breeds', ['species_id', 'purpose'], unique=False)
    op.create_index('ix_fields_finca_id', 'fields', ['finca_id'], unique=False)
    op.create_index('ix_diseases_updated_at', 'diseases', ['updated_at'], unique=False)
    op.create_index('ix_diseases_created_at', 'diseases', ['created_at'], unique=False)
    op.create_index('ix_animal_diseases_animal_id', 'animal_diseases', ['animal_id'], unique=False)
    op.create_index('ix_animal_diseases_finca_id', 'animal_diseases', ['finca_id'], unique=False)
    op.create_index('ix_animal_fields_finca_id', 'animal_fields', ['finca_id'], unique=False)
    op.create_index('ix_animal_fields_active', 'animal_fields', ['animal_id', 'removal_date'], unique=False)
    op.create_index('ix_animal_fields_field_active', 'animal_fields', ['field_id', 'removal_date'], unique=False)
    op.create_index('ix_animal_fields_field_id', 'animal_fields', ['field_id'], unique=False)
    op.create_index('ix_vaccinations_animal_date', 'vaccinations', ['animal_id', 'vaccination_date'], unique=False)
    op.create_index('ix_vaccinations_created_at', 'vaccinations', ['created_at'], unique=False)
    op.create_index('ix_vaccinations_finca_id', 'vaccinations', ['finca_id'], unique=False)
    op.create_index('ix_treatments_created_at', 'treatments', ['created_at'], unique=False)
    op.create_index('ix_treatments_finca_id', 'treatments', ['finca_id'], unique=False)
    op.create_index('ix_treatments_animal_date', 'treatments', ['animal_id', 'treatment_date'], unique=False)
    op.create_index('ix_inventory_lots_vaccine_id', 'inventory_lots', ['vaccine_id'], unique=False)
    op.create_index('ix_inventory_lots_expiry_date', 'inventory_lots', ['expiry_date'], unique=False)
    op.create_index('ix_inventory_lots_finca_id', 'inventory_lots', ['finca_id'], unique=False)
    op.create_index('ix_inventory_lots_medication_id', 'inventory_lots', ['medication_id'], unique=False)
    op.create_index('ix_inventory_movements_lot_id', 'inventory_movements', ['lot_id'], unique=False)
    op.create_index('ix_inventory_movements_created_at', 'inventory_movements', ['created_at'], unique=False)
    op.create_index('ix_inventory_movements_finca_id', 'inventory_movements', ['finca_id'], unique=False)
    op.create_index('ix_control_animal_checkup', 'control', ['animal_id', 'checkup_date'], unique=False)
    op.create_index('ix_control_created_at', 'control', ['created_at'], unique=False)
    op.create_index('ix_control_finca_id', 'control', ['finca_id'], unique=False)
    op.create_index('ix_genetic_improvements_finca_id', 'genetic_improvements', ['finca_id'], unique=False)
    op.create_index('ix_animal_images_created_at', 'animal_images', ['created_at'], unique=False)
    op.create_index('ix_animal_images_finca_id', 'animal_images', ['finca_id'], unique=False)
    op.create_index('ix_animal_images_animal_id', 'animal_images', ['animal_id'], unique=False)
    op.create_index('ix_animal_images_is_primary', 'animal_images', ['is_primary'], unique=False)
    op.create_index('ix_activity_log_finca_id', 'activity_log', ['finca_id'], unique=False)
    op.create_index('ix_activity_log_actor_action_created_at', 'activity_log', ['actor_id', 'action', 'created_at'], unique=False)
    op.create_index('ix_activity_log_animal_id', 'activity_log', ['animal_id'], unique=False)
    op.create_index('ix_activity_log_severity', 'activity_log', ['severity'], unique=False)
    op.create_index('ix_activity_log_created_at', 'activity_log', ['created_at'], unique=False)
    op.create_index('ix_activity_log_actor_severity_created_at', 'activity_log', ['actor_id', 'severity', 'created_at'], unique=False)
    op.create_index('ix_activity_log_actor_created_at', 'activity_log', ['actor_id', 'created_at'], unique=False)
    op.create_index('ix_activity_log_actor_id', 'activity_log', ['actor_id'], unique=False)
    op.create_index('ix_activity_log_action', 'activity_log', ['action'], unique=False)
    op.create_index('ix_activity_log_actor_animal_created_at', 'activity_log', ['actor_id', 'animal_id', 'created_at'], unique=False)
    op.create_index('ix_activity_log_actor_entity_created_at', 'activity_log', ['actor_id', 'entity', 'created_at'], unique=False)
    op.create_index('ix_activity_log_entity_id', 'activity_log', ['entity_id'], unique=False)
    op.create_index('ix_activity_log_entity', 'activity_log', ['entity'], unique=False)
    op.create_index('ix_activity_daily_agg_actor_date', 'activity_daily_agg', ['actor_id', 'date'], unique=False)
    op.create_index('ix_activity_daily_agg_actor_date_entity', 'activity_daily_agg', ['actor_id', 'date', 'entity'], unique=False)
    op.create_index('ix_activity_daily_agg_finca_id', 'activity_daily_agg', ['finca_id'], unique=False)
    op.create_index('ix_activity_daily_agg_date', 'activity_daily_agg', ['date'], unique=False)
    op.create_index('ix_animal_alert_configs_finca_id', 'animal_alert_configs', ['finca_id'], unique=False)
    op.create_index('ix_animal_alerts_finca_priority_unread_triggered', 'animal_alerts', ['finca_id', 'priority', 'triggered_at'], unique=False)
    op.create_index('ix_animal_alerts_animal_read', 'animal_alerts', ['animal_id', 'is_read'], unique=False)
    op.create_index('ix_animal_alerts_finca_id', 'animal_alerts', ['finca_id'], unique=False)
    op.create_index('uq_animal_alerts_unread_dedupe_key', 'animal_alerts', ['dedupe_key'], unique=True)
    op.create_index('ix_animal_alerts_finca_unread_triggered', 'animal_alerts', ['finca_id', 'triggered_at'], unique=False)
    op.create_index('ix_movements_animal_id', 'animal_movements', ['animal_id'], unique=False)
    op.create_index('ix_movements_finca_origen_id', 'animal_movements', ['finca_origen_id'], unique=False)
    op.create_index('ix_movements_finca_destino_id', 'animal_movements', ['finca_destino_id'], unique=False)
    op.create_index('ix_movements_fecha_movimiento', 'animal_movements', ['fecha_movimiento'], unique=False)
    op.create_index('ix_finca_images_finca_id', 'finca_images', ['finca_id'], unique=False)
    op.create_index('ix_finca_images_is_primary', 'finca_images', ['is_primary'], unique=False)
    op.create_index('ix_finca_images_created_at', 'finca_images', ['created_at'], unique=False)
    op.create_index('ix_membership_request_finca_id', 'membership_request', ['finca_id'], unique=False)
    op.create_index('ix_system_content_category', 'system_contents', ['category'], unique=False)
    op.create_index('ix_system_content_key', 'system_contents', ['key'], unique=False)
    op.create_index('ix_treatment_recommendations_finca_status', 'treatment_recommendations', ['finca_id', 'status'], unique=False)
    op.create_index('ix_treatment_recommendations_end_date', 'treatment_recommendations', ['estimated_end_date'], unique=False)
    op.create_index('ix_treatment_recommendations_animal_status', 'treatment_recommendations', ['animal_id', 'status'], unique=False)
    op.create_index('ix_recommendation_controls_schedule_status', 'treatment_recommendation_controls', ['scheduled_date', 'completed'], unique=False)
    op.create_index('ix_recommendation_controls_treatment', 'treatment_recommendation_controls', ['treatment_recommendation_id'], unique=False)
    op.create_index('ix_recommendation_controls_recorded_by', 'treatment_recommendation_controls', ['recorded_by'], unique=False)
    op.create_index('ix_user_favorites_user', 'user_favorites', ['user_id'], unique=False)
    op.create_index('ix_repr_events_animal_id', 'reproductive_events', ['animal_id'], unique=False)
    op.create_index('ix_repr_events_event_date', 'reproductive_events', ['event_date'], unique=False)
    op.create_index('ix_repr_events_event_type', 'reproductive_events', ['event_type'], unique=False)
    op.create_index('ix_repr_events_finca_id', 'reproductive_events', ['finca_id'], unique=False)
    op.create_index('ix_offspring_birth_event_id', 'offspring', ['birth_event_id'], unique=False)
    op.create_index('ix_offspring_finca_id', 'offspring', ['finca_id'], unique=False)
    op.create_index('ix_milk_production_finca_id', 'milk_production', ['finca_id'], unique=False)
    op.create_index('ix_milk_production_date', 'milk_production', ['date'], unique=False)
    op.create_index('ix_milk_production_finca_date', 'milk_production', ['finca_id', 'date'], unique=False)
    op.create_index('ix_milk_production_animal_id', 'milk_production', ['animal_id'], unique=False)
    op.create_index('ix_lactation_status', 'lactation_cycles', ['status'], unique=False)
    op.create_index('ix_lactation_animal_id', 'lactation_cycles', ['animal_id'], unique=False)
    op.create_index('ix_lactation_finca_id', 'lactation_cycles', ['finca_id'], unique=False)
    op.create_index('ix_production_target_finca_id', 'production_targets', ['finca_id'], unique=False)
    op.create_index('ix_production_target_animal_id', 'production_targets', ['animal_id'], unique=False)
    op.create_index('ix_production_target_period', 'production_targets', ['period'], unique=False)
    op.create_index('ix_user_finca_is_active', 'user_finca', ['is_active'], unique=False)
    op.create_index('ix_user_finca_user_finca', 'user_finca', ['user_id', 'finca_id'], unique=True)
    op.create_index('ix_user_finca_is_primary', 'user_finca', ['is_primary'], unique=False)
    op.create_index('ix_user_finca_user_id', 'user_finca', ['user_id'], unique=False)
    op.create_index('ix_user_finca_finca_id', 'user_finca', ['finca_id'], unique=False)
    op.create_index('ix_push_subscription_endpoint', 'push_subscription', ['endpoint'], unique=True)
    op.create_index('ix_push_subscription_is_active', 'push_subscription', ['is_active'], unique=False)
    op.create_index('ix_push_subscription_user_id', 'push_subscription', ['user_id'], unique=False)
    op.create_index('ix_join_request_type', 'join_requests', ['request_type'], unique=False)
    op.create_index('ix_join_request_token', 'join_requests', ['invitation_token'], unique=False)
    op.create_index('ix_join_request_user_finca', 'join_requests', ['user_id', 'finca_id'], unique=False)
    op.create_index('ix_join_request_expires', 'join_requests', ['expires_at'], unique=False)
    op.create_index('ix_join_request_status', 'join_requests', ['status'], unique=False)
    op.create_index('ix_chat_messages_finca_id', 'chat_messages', ['finca_id'], unique=False)
    op.create_index('ix_user_locations_finca_id', 'user_locations', ['finca_id'], unique=False)
    op.create_index('ix_transactions_date', 'transactions', ['date'], unique=False)
    op.create_index('ix_transactions_animal_id', 'transactions', ['animal_id'], unique=False)
    op.create_index('ix_transactions_finca_id', 'transactions', ['finca_id'], unique=False)
    op.create_index('ix_tasks_due_date', 'tasks', ['due_date'], unique=False)
    op.create_index('ix_tasks_finca_status', 'tasks', ['finca_id', 'status'], unique=False)
    op.create_index('ix_operational_costs_finca_id', 'operational_costs', ['finca_id'], unique=False)
    op.create_index('ix_animal_groups_finca_id', 'animal_groups', ['finca_id'], unique=False)
    op.create_index('ix_pasture_aforos_finca_field_created', 'pasture_aforos', ['finca_id', 'field_id', 'created_at'], unique=False)
    op.create_index('ix_pasture_aforos_finca_id', 'pasture_aforos', ['finca_id'], unique=False)
    op.create_index('ix_infrastructure_finca_id', 'infrastructure', ['finca_id'], unique=False)
    op.create_index('ix_farm_expenses_finca_id', 'farm_expenses', ['finca_id'], unique=False)
    op.create_index('ix_devices_finca_status', 'devices', ['finca_id', 'status'], unique=False)
    op.create_index('ix_sync_operations_cursor', 'sync_operations', ['finca_id', 'id'], unique=False)
    op.create_index('ix_sync_operations_finca_status', 'sync_operations', ['finca_id', 'status'], unique=False)
    op.create_index('ix_sync_sessions_finca_id', 'sync_sessions', ['finca_id'], unique=False)
    op.create_index('ix_sync_receipts_finca_id', 'sync_operation_receipts', ['finca_id'], unique=False)
    op.create_index('ix_sync_conflicts_finca_id', 'sync_conflicts', ['finca_id'], unique=False)
    op.create_index('ix_attachment_blobs_finca_id', 'attachment_blobs', ['finca_id'], unique=False)
    op.create_index('ix_node_messages_finca_recipient', 'node_messages', ['finca_id', 'recipient_user_id'], unique=False)
    op.create_index('ix_node_messages_finca_node', 'node_messages', ['finca_id', 'recipient_node_id'], unique=False)
    op.create_index('ix_community_nodes_finca_id', 'community_nodes', ['finca_id'], unique=False)
    op.create_index('ix_crop_plots_finca_status', 'crop_plots', ['finca_id', 'status'], unique=False)
    op.create_index('ix_crop_plots_crop_name', 'crop_plots', ['crop_name'], unique=False)
    op.create_index('ix_crop_activities_plot_date', 'crop_activities', ['crop_plot_id', 'activity_date'], unique=False)
    op.create_index('ix_crop_activities_finca_type', 'crop_activities', ['finca_id', 'activity_type'], unique=False)
    op.create_index('ix_water_sources_finca_type', 'water_sources', ['finca_id', 'source_type'], unique=False)
    op.create_index('ix_water_measurements_finca_id', 'water_measurements', ['finca_id'], unique=False)
    op.create_index('ix_water_measurements_source_date', 'water_measurements', ['water_source_id', 'measured_at'], unique=False)
    op.create_index('ix_climate_risk_alerts_valid_until', 'climate_risk_alerts', ['valid_until'], unique=False)
    op.create_index('ix_climate_risk_alerts_finca_severity', 'climate_risk_alerts', ['finca_id', 'severity'], unique=False)
    op.create_index('ix_market_offers_finca_status', 'market_offers', ['finca_id', 'status'], unique=False)
    op.create_index('ix_market_offers_product', 'market_offers', ['product_name'], unique=False)
    op.create_index('ix_assistance_territory_category', 'technical_assistance_requests', ['territory_id', 'category'], unique=False)
    op.create_index('ix_assistance_finca_status', 'technical_assistance_requests', ['finca_id', 'status'], unique=False)
    op.create_index('ix_learning_territory_category', 'offline_learning_materials', ['territory_id', 'category'], unique=False)
    op.create_index('ix_learning_is_active', 'offline_learning_materials', ['is_active'], unique=False)
    op.create_index('ix_kb_rec_categoria', 'kb_recomendaciones', ['categoria'], unique=False)
    op.create_index('ix_kb_rec_urgencia', 'kb_recomendaciones', ['urgencia'], unique=False)
    op.create_index('ix_sinigan_animal_id', 'sinigan_registrations', ['animal_id'], unique=False)
    op.create_index('ix_sinigan_finca_id', 'sinigan_registrations', ['finca_id'], unique=False)
    op.create_index('ix_sinigan_arete', 'sinigan_registrations', ['arete_sinigan'], unique=True)
    op.create_index('ix_mgmt_plans_dates', 'management_plans', ['start_date', 'end_date'], unique=False)
    op.create_index('ix_mgmt_plans_finca_status', 'management_plans', ['finca_id', 'status'], unique=False)
    op.create_index('ix_producer_profile_user', 'producer_profiles', ['user_id'], unique=True)
    op.create_index('ix_producer_type', 'producer_profiles', ['producer_type'], unique=False)
    op.create_index('ix_professional_credential_user', 'professional_credentials', ['user_id'], unique=True)
    op.create_index('ix_professional_credential_status', 'professional_credentials', ['status'], unique=False)
    op.create_index('ix_health_history_type', 'animal_health_history', ['event_type'], unique=False)
    op.create_index('ix_health_history_finca', 'animal_health_history', ['finca_id'], unique=False)
    op.create_index('ix_health_history_animal_date', 'animal_health_history', ['animal_id', 'event_date'], unique=False)
    op.create_index('ix_prod_metrics_finca', 'animal_production_metrics', ['finca_id'], unique=False)
    op.create_index('ix_prod_metrics_animal_date', 'animal_production_metrics', ['animal_id', 'recorded_date'], unique=False)
    op.create_index('ix_prod_metrics_type', 'animal_production_metrics', ['metric_type'], unique=False)
    op.create_index('ix_bgs_breed_sex_stage', 'breed_growth_standards', ['breed_id', 'sex', 'growth_stage'], unique=False)
    op.create_index('ix_bgs_age_months', 'breed_growth_standards', ['age_months'], unique=False)
    op.create_index('ix_bcs_animal_date', 'body_condition_scores', ['animal_id', 'score_date'], unique=False)
    op.create_index('ix_bcs_finca_date', 'body_condition_scores', ['finca_id', 'score_date'], unique=False)
    op.create_index('ix_weather_records_recorded_at', 'weather_records', ['recorded_at'], unique=False)
    op.create_index('ix_weather_records_finca_recorded_at', 'weather_records', ['finca_id', 'recorded_at'], unique=False)
    op.create_index('ix_weather_records_finca_id', 'weather_records', ['finca_id'], unique=False)
    op.create_index('ix_weather_alerts_valid_until', 'weather_alerts', ['valid_until'], unique=False)
    op.create_index('ix_weather_alerts_is_active', 'weather_alerts', ['is_active'], unique=False)
    op.create_index('ix_weather_alerts_finca_severity', 'weather_alerts', ['finca_id', 'severity'], unique=False)
    op.create_index('ix_weather_alerts_finca_id', 'weather_alerts', ['finca_id'], unique=False)


def downgrade():
    """Borra en orden inverso al de creación."""

    op.drop_table('weather_alerts')
    op.drop_table('weather_records')
    op.drop_table('seasonal_adjustments')
    op.drop_table('body_condition_scores')
    op.drop_table('breed_growth_standards')
    op.drop_table('animal_production_metrics')
    op.drop_table('animal_health_history')
    op.drop_table('professional_credentials')
    op.drop_table('producer_profiles')
    op.drop_table('management_plans')
    op.drop_table('sinigan_registrations')
    op.drop_table('kb_calendario')
    op.drop_table('kb_reglas')
    op.drop_table('kb_recomendaciones')
    op.drop_table('offline_learning_materials')
    op.drop_table('technical_assistance_requests')
    op.drop_table('market_offers')
    op.drop_table('climate_risk_alerts')
    op.drop_table('water_measurements')
    op.drop_table('water_sources')
    op.drop_table('crop_activities')
    op.drop_table('crop_plots')
    op.drop_table('community_nodes')
    op.drop_table('territories')
    op.drop_table('node_messages')
    op.drop_table('attachment_blobs')
    op.drop_table('sync_conflicts')
    op.drop_table('sync_operation_receipts')
    op.drop_table('sync_sessions')
    op.drop_table('sync_operations')
    op.drop_table('devices')
    op.drop_table('farm_expenses')
    op.drop_table('infrastructure')
    op.drop_table('pasture_aforos')
    op.drop_table('animal_group_membership')
    op.drop_table('animal_groups')
    op.drop_table('operational_costs')
    op.drop_table('milk_summary')
    op.drop_table('financial_summary')
    op.drop_table('livestock_summary')
    op.drop_table('tasks')
    op.drop_table('transactions')
    op.drop_table('user_locations')
    op.drop_table('chat_messages')
    op.drop_table('join_requests')
    op.drop_table('push_subscription')
    op.drop_table('user_finca')
    op.drop_table('production_targets')
    op.drop_table('lactation_cycles')
    op.drop_table('milk_production')
    op.drop_table('offspring')
    op.drop_table('reproductive_events')
    op.drop_table('user_favorites')
    op.drop_table('treatment_recommendation_controls')
    op.drop_table('treatment_recommendations')
    op.drop_table('system_contents')
    op.drop_table('membership_request')
    op.drop_table('finca_images')
    op.drop_table('animal_movements')
    op.drop_table('farm_entity_alerts')
    op.drop_table('farm_entity_alert_configs')
    op.drop_table('animal_alerts')
    op.drop_table('animal_alert_configs')
    op.drop_table('activity_daily_agg')
    op.drop_table('activity_log')
    op.drop_table('animal_images')
    op.drop_table('route_administrations')
    op.drop_table('genetic_improvements')
    op.drop_table('food_types')
    op.drop_table('control')
    op.drop_table('treatment_vaccines')
    op.drop_table('treatment_medications')
    op.drop_table('inventory_movements')
    op.drop_table('inventory_lots')
    op.drop_table('treatments')
    op.drop_table('medications')
    op.drop_table('vaccines')
    op.drop_table('vaccinations')
    op.drop_table('animal_fields')
    op.drop_table('animal_diseases')
    op.drop_table('diseases')
    op.drop_table('fields')
    op.drop_table('breeds')
    op.drop_table('species')
    op.drop_table('animals')
    op.drop_table('user')
    op.drop_table('finca')

