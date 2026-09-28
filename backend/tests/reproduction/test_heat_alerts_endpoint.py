"""Contrato HTTP del detector de celos de la pestaña reproductiva."""

from datetime import date, timedelta

from app import db
from app.models.reproduction import DiagnosisResult, EventType

from .conftest import _event


BASE = "/api/v1/reproduction/heat-alerts"


class TestHeatAlertsEndpoint:
    def test_exige_autenticacion(self, client):
        response = client.get(BASE)

        assert response.status_code in (401, 422)

    def test_devuelve_hembras_en_ventana_ordenadas_por_prioridad(
        self, app, client, token_for, farm
    ):
        today = date.today()
        low = _event(farm["cow"], EventType.Celo, today - timedelta(days=18))
        high = _event(farm["heifer"], EventType.Celo, today - timedelta(days=22))
        db.session.flush()

        response = client.get(BASE, headers=token_for("Administrador"))

        assert response.status_code == 200
        alerts = response.get_json()["data"]
        assert [alert["animal_id"] for alert in alerts[:2]] == [farm["heifer"].id, farm["cow"].id]
        assert alerts[0]["priority"] == "Alta"
        assert alerts[1]["priority"] == "Baja"
        assert alerts[1]["days_since_last_heat"] == 18
        assert alerts[1]["age_days"] == (today - farm["cow"].birth_date).days

    def test_excluye_alerta_de_hembra_con_inseminacion_vigente(
        self, client, token_for, farm
    ):
        today = date.today()
        _event(farm["cow"], EventType.Celo, today - timedelta(days=21))
        _event(
            farm["cow"],
            EventType.Inseminacion,
            today - timedelta(days=20),
            expected_birth_date=today + timedelta(days=260),
        )
        db.session.flush()

        response = client.get(BASE, headers=token_for("Administrador"))

        assert response.status_code == 200
        alerts = response.get_json()["data"]
        assert all(alert["animal_id"] != farm["cow"].id for alert in alerts)

    def test_diagnostico_negativo_deja_a_la_hembra_disponible_para_alerta(
        self, client, token_for, farm
    ):
        today = date.today()
        _event(farm["cow"], EventType.Celo, today - timedelta(days=21))
        _event(
            farm["cow"],
            EventType.Inseminacion,
            today - timedelta(days=20),
            expected_birth_date=today + timedelta(days=260),
        )
        _event(
            farm["cow"],
            EventType.Diagnostico,
            today - timedelta(days=5),
            diagnosis_result=DiagnosisResult.Negativo,
        )
        db.session.flush()

        response = client.get(BASE, headers=token_for("Administrador"))

        assert response.status_code == 200
        alerts = response.get_json()["data"]
        assert any(alert["animal_id"] == farm["cow"].id for alert in alerts)

    def test_no_expone_hembras_fuera_de_la_ventana(self, client, token_for, farm):
        _event(farm["cow"], EventType.Celo, date.today() - timedelta(days=17))
        _event(farm["heifer"], EventType.Celo, date.today() - timedelta(days=24))
        db.session.flush()

        response = client.get(BASE, headers=token_for("Administrador"))

        assert response.status_code == 200
        assert response.get_json()["data"] == []
