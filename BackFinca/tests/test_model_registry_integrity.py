import importlib
import pkgutil

from sqlalchemy.orm import configure_mappers

import app.models
from app.extensions import db


def test_all_model_modules_import_without_mapper_errors():
    errors = []
    for module in pkgutil.iter_modules(app.models.__path__, app.models.__name__ + "."):
        try:
            importlib.import_module(module.name)
        except Exception as exc:  # pragma: no cover - assertion reports details
            errors.append((module.name, repr(exc)))

    configure_mappers()

    assert errors == []


def test_rural_first_tables_are_registered_in_metadata():
    expected_tables = {
        "animal_groups",
        "animal_group_membership",
        "infrastructure",
        "pasture_aforos",
        "devices",
        "sync_operations",
        "sync_sessions",
        "sync_operation_receipts",
        "sync_conflicts",
        "attachment_blobs",
        "node_messages",
        "territories",
        "community_nodes",
        "crop_plots",
        "crop_activities",
        "water_sources",
        "water_measurements",
        "climate_risk_alerts",
        "market_offers",
        "technical_assistance_requests",
        "offline_learning_materials",
    }

    assert expected_tables.issubset(set(db.metadata.tables.keys()))
