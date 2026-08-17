"""Regression tests for the inventory read-side namespace boundary."""

import importlib

import pytest


@pytest.mark.unit
def test_inventory_insights_resources_have_a_dedicated_module():
    module = importlib.import_module("app.namespaces.farm.inventory_insights_namespace")

    assert module.inventory_insights_ns.path == "/inventory"
    assert module.InventorySummary.__module__ == module.__name__
    assert module.InventoryAlerts.__module__ == module.__name__


@pytest.mark.unit
def test_inventory_insights_keep_their_public_api_paths(client, token_for):
    headers = token_for("Administrador")

    summary = client.get("/api/v1/inventory/summary", headers=headers)
    alerts = client.get("/api/v1/inventory/alerts", headers=headers)

    assert summary.status_code == 200
    assert alerts.status_code == 200
    assert summary.get_json()["success"] is True
    assert alerts.get_json()["success"] is True
