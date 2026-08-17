"""
Tests de integración HTTP para los endpoints de Analytics.

Verifica que los endpoints devuelven 200 con estructura APIResponse correcta,
manejan auth y retornan datos coherentes (incluso con BD vacía).
"""

BASE = "/api/v1"


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class TestDashboard:
    def test_summary_sin_token(self, client):
        resp = client.get(f"{BASE}/analytics/dashboard")
        assert resp.status_code == 401

    def test_summary_con_token(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/dashboard", headers=token_for("Administrador")
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "data" in body

    def test_complete_sin_token(self, client):
        resp = client.get(f"{BASE}/analytics/dashboard/complete")
        assert resp.status_code == 401

    def test_complete_con_token(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/dashboard/complete", headers=token_for("Administrador")
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_dashboard_accesible_por_aprendiz(self, client, token_for):
        """Aprendiz puede GET analytics (es una ruta GET permitida)."""
        resp = client.get(f"{BASE}/analytics/dashboard", headers=token_for("Aprendiz"))
        assert resp.status_code == 200

    def test_dashboard_accesible_por_instructor(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/dashboard/complete", headers=token_for("Instructor")
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Analytics de animales
# ---------------------------------------------------------------------------


class TestAnimalAnalytics:
    def test_statistics_expose_sex_distribution_of_active_animals(
        self, client, token_for
    ):
        resp = client.get(
            f"{BASE}/analytics/animals/statistics",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "by_sex_active" in data

    def test_history_animal_inexistente(self, client, token_for):
        """Animal que no existe devuelve 404."""
        resp = client.get(
            f"{BASE}/analytics/animals/999999/history",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 404

    def test_ica_compliance_animal_inexistente(self, client, token_for):
        """ICA compliance para animal inexistente devuelve éxito con estado desconocido."""
        resp = client.get(
            f"{BASE}/analytics/animals/999999/ica-compliance",
            headers=token_for("Administrador"),
        )
        # Puede ser 200 con datos vacíos o 404; lo importante es que no es 500
        assert resp.status_code in (200, 404)

    def test_ica_compliance_report_hato(self, client, token_for):
        """Reporte ICA del hato devuelve 200."""
        resp = client.get(
            f"{BASE}/analytics/animals/ica-compliance-report",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_upcoming_events(self, client, token_for):
        """Upcoming events devuelve lista (puede ser vacía)."""
        resp = client.get(
            f"{BASE}/analytics/animals/upcoming-events?days=30",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_upcoming_events_parametro_dias(self, client, token_for):
        """Parámetro days se acepta sin error."""
        resp = client.get(
            f"{BASE}/analytics/animals/upcoming-events?days=7",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200

    def test_distribution_por_raza(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/animals/distribution?group_by=breed",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200

    def test_distribution_por_sexo(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/animals/distribution?group_by=sex",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200

    def test_veterinario_bloqueado_en_analytics_animales(self, client, token_for):
        """Veterinario solo puede acceder a health paths — analytics/animals no es health path."""
        resp = client.get(
            f"{BASE}/analytics/animals/upcoming-events",
            headers=token_for("Veterinario", finca_type="Tradicional"),
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Analytics de alertas
# ---------------------------------------------------------------------------


class TestAlertAnalytics:
    def test_lista_alertas_con_token(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/alerts", headers=token_for("Administrador")
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_lista_alertas_filtro_priority(self, client, token_for):
        for priority in ("Crítica", "Alta", "Media", "Baja"):
            resp = client.get(
                f"{BASE}/analytics/alerts?priority={priority}",
                headers=token_for("Administrador"),
            )
            assert resp.status_code == 200, f"Falló con priority={priority}"

    def test_lista_alertas_filtro_urgente(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/alerts?priority=urgente",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200

    def test_alertas_sin_token(self, client):
        resp = client.get(f"{BASE}/analytics/alerts")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Health checks (público)
# ---------------------------------------------------------------------------


class TestHealthEndpoints:
    def test_health_basico(self, client):
        resp = client.get(f"{BASE}/health")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_health_detailed(self, client):
        """health/detailed puede devolver 503 si Celery no está corriendo — aceptable en test."""
        resp = client.get(f"{BASE}/health/detailed")
        assert resp.status_code in (200, 503)

    def test_health_database(self, client):
        resp = client.get(f"{BASE}/health/database")
        assert resp.status_code == 200

    def test_health_cache(self, client):
        resp = client.get(f"{BASE}/health/cache")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Estructura de respuesta APIResponse
# ---------------------------------------------------------------------------


class TestAPIResponseStructure:
    """Verifica que todos los endpoints usan la estructura estándar."""

    def test_success_tiene_success_true(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/dashboard", headers=token_for("Administrador")
        )
        body = resp.get_json()
        assert "success" in body
        assert "data" in body
        assert body["success"] is True

    def test_error_tiene_success_false(self, client):
        resp = client.get(f"{BASE}/analytics/dashboard")
        body = resp.get_json()
        assert "success" in body
        assert body["success"] is False
        assert "error" in body or "message" in body

    def test_content_type_es_json(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/dashboard", headers=token_for("Administrador")
        )
        assert "application/json" in resp.content_type

    def test_x_response_time_header_presente(self, client, token_for):
        """El middleware de timing debe añadir X-Response-Time-ms."""
        resp = client.get(
            f"{BASE}/analytics/dashboard", headers=token_for("Administrador")
        )
        assert "X-Response-Time-ms" in resp.headers
        time_ms = float(resp.headers["X-Response-Time-ms"])
        assert time_ms >= 0


class TestProductionAnalyticsContract:
    def test_production_statistics_expose_only_database_derived_panel_metrics(
        self, client, token_for
    ):
        resp = client.get(
            f"{BASE}/analytics/production/statistics",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "field_metrics" in data
        assert "financial_metrics" in data
        assert "productivity_metrics" in data
        assert "monthly_expenses" in data["financial_metrics"]


class TestFinancialAnalyticsContract:
    def test_financial_list_and_summary_ignore_soft_deleted_transactions(
        self, client, token_for, db_session
    ):
        from datetime import date

        from app.models.finca import Finca
        from app.models.financial import (
            Transaction,
            TransactionCategory,
            TransactionType,
        )

        headers = token_for("Administrador")
        finca = Finca.query.first()
        db_session.session.add_all(
            [
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=100,
                    date=date.today(),
                    description="visible-financial-record",
                    is_deleted=False,
                ),
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=900,
                    date=date.today(),
                    description="deleted-financial-record",
                    is_deleted=True,
                ),
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=500,
                    date=date.today(),
                    description="[Simulado] synthetic-financial-record",
                    is_deleted=False,
                ),
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=700,
                    date=date.today(),
                    description="Transacción automática de Inventario",
                    is_deleted=False,
                ),
            ]
        )
        db_session.session.commit()

        listing = client.get(
            f"{BASE}/financial/transactions?limit=100", headers=headers
        )
        summary = client.get(f"{BASE}/financial/transactions/summary", headers=headers)

        assert listing.status_code == 200
        assert summary.status_code == 200
        items = listing.get_json()["data"]
        descriptions = {item["description"] for item in items}
        assert "visible-financial-record" in descriptions
        assert "deleted-financial-record" not in descriptions
        assert "[Simulado] synthetic-financial-record" not in descriptions
        assert "Transacción automática de Inventario" not in descriptions
        assert summary.get_json()["data"]["total_income"] == 100

    def test_custom_financial_report_is_database_derived_and_excludes_simulation(
        self, client, token_for, db_session
    ):
        from datetime import date

        from sqlalchemy import func

        from app.models.finca import Finca
        from app.models.financial import (
            Transaction,
            TransactionCategory,
            TransactionType,
        )

        headers = token_for("Administrador")
        finca = Finca.query.first()
        visible_query = Transaction.query.filter(
            Transaction.finca_id == finca.id,
            Transaction.transaction_type == TransactionType.Income,
            Transaction.is_deleted.is_(False),
        )
        from app.utils.financial_filters import exclude_simulated_transactions

        income_before = (
            exclude_simulated_transactions(visible_query, Transaction)
            .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
            .scalar()
        )

        db_session.session.add_all(
            [
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=125,
                    date=date.today(),
                    description="custom-report-visible-record",
                    is_deleted=False,
                ),
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=900,
                    date=date.today(),
                    description="[Simulado] custom-report-synthetic-record",
                    is_deleted=False,
                ),
                Transaction(
                    finca_id=finca.id,
                    transaction_type=TransactionType.Income,
                    category=TransactionCategory.Other,
                    amount=700,
                    date=date.today(),
                    description="Transacción automática de Reporte",
                    is_deleted=False,
                ),
            ]
        )
        db_session.session.commit()

        response = client.post(
            f"{BASE}/analytics/reports/custom",
            headers=headers,
            json={
                "period": "all",
                "metrics": ["finance"],
                "groupBy": [],
                "filters": {},
            },
        )

        assert response.status_code == 200
        report = response.get_json()["data"]["report"]
        assert report["summary"]["ingresos_totales"] == float(income_before) + 125
        movements = report["details"]["finanzas_y_economia"]["ultimos_movimientos"]
        descriptions = {movement["descripcion"] for movement in movements}
        assert "custom-report-visible-record" in descriptions
        assert "[Simulado] custom-report-synthetic-record" not in descriptions
        assert "Transacción automática de Reporte" not in descriptions
