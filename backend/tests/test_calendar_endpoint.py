"""
Tests de integración HTTP para el Calendario Global.

Cubre el ciclo completo del endpoint /api/v1/analytics/calendar/:
- Auth requerida (401 sin token)
- Estructura APIResponse con BD vacía
- Eventos de vacuna próxima (next_due_date), fin de retiro y tareas
- Filtro por rango de fechas y error de formato inválido
"""
from datetime import date, datetime, timedelta

from app import db
from app.models import Breeds, Species
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.alerts import AnimalAlert, AlertPriority, AlertType
from app.models.diseases import Diseases
from app.models.route_administration import RouteAdministration
from app.models.tasks import Tasks
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.vaccines import Vaccines, VaccineType

BASE = "/api/v1"


def _seed_calendar_data(finca_id: int) -> None:
    """Crea animal, vacuna con próxima dosis, tratamiento con retiro y tarea."""
    species = Species(name="Bovino Test Calendar")
    db.session.add(species)
    db.session.commit()
    breed = Breeds(name="Raza Test Calendar", species_id=species.id)
    db.session.add(breed)
    db.session.commit()

    animal = Animals.create(
        record="TST-CAL-001",
        sex=Sex.Hembra,
        weight=380.0,
        birth_date=date(2022, 1, 15),
        breeds_id=breed.id,
        finca_id=finca_id,
        status=AnimalStatus.Vivo,
    )
    disease = Diseases.create(
        name="Fiebre Aftosa Test",
        symptoms="Fiebre, vesículas",
        details="Enfermedad de declaración obligatoria ICA",
        finca_id=finca_id,
    )
    route = RouteAdministration.create(name="Subcutánea Test", finca_id=finca_id)
    vaccine = Vaccines.create(
        name="Aftosa Test Calendar",
        dosis="2ml",
        route_administration_id=route.id,
        vaccination_interval="180 días",
        type=VaccineType.Inactivada,
        national_plan="Plan Nacional ICA",
        target_disease_id=disease.id,
        finca_id=finca_id,
    )

    tomorrow = date.today() + timedelta(days=1)
    Vaccinations.create(
        animal_id=animal.id,
        vaccine_id=vaccine.id,
        vaccination_date=date.today() - timedelta(days=180),
        next_due_date=tomorrow,
        finca_id=finca_id,
    )
    Treatments.create(
        treatment_date=date.today() - timedelta(days=5),
        description="Antibiótico mastitis",
        frequency="Única",
        dosis="10ml IM",
        withdrawal_days=7,
        withdrawal_end_date=tomorrow + timedelta(days=2),
        animal_id=animal.id,
        finca_id=finca_id,
    )
    Tasks.create(
        title="Revisar cerca del lote 3",
        due_date=datetime.combine(tomorrow, datetime.min.time()),
        finca_id=finca_id,
    )
    db.session.commit()


class TestCalendarAuth:
    def test_sin_token(self, client):
        resp = client.get(f"{BASE}/analytics/calendar/")
        assert resp.status_code == 401

    def test_con_token_estructura_ok(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/calendar/",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        data = body["data"]
        assert "events" in data and "count" in data and "range" in data
        assert isinstance(data["events"], list)
        assert data["count"] == len(data["events"])

    def test_formato_fecha_invalido(self, client, token_for):
        resp = client.get(
            f"{BASE}/analytics/calendar/?start_date=19-07-2026",
            headers=token_for("Administrador"),
        )
        assert resp.status_code == 400
        assert resp.get_json()["success"] is False


class TestCalendarEventosFuturos:
    """Vacunas próximas, retiros y tareas deben aparecer como eventos."""

    def _seed_with_auth_finca(self, app, headers) -> None:
        from flask_jwt_extended import decode_token
        token_str = headers["Authorization"].split(" ")[1]
        finca_id = decode_token(token_str)["finca_id"]
        with app.app_context():
            _seed_calendar_data(finca_id)

    def test_eventos_futuros_en_rango(self, app, client, token_for):
        headers = token_for("Administrador")
        self._seed_with_auth_finca(app, headers)

        start = date.today().isoformat()
        end = (date.today() + timedelta(days=10)).isoformat()
        resp = client.get(
            f"{BASE}/analytics/calendar/?start_date={start}&end_date={end}",
            headers=headers,
        )
        assert resp.status_code == 200
        events = resp.get_json()["data"]["events"]
        types = {e["type"] for e in events}
        assert "vaccine_due" in types
        assert "withdrawal_end" in types
        assert "task" in types
        for e in events:
            assert "title" in e and "start" in e and "color" in e

    def test_eventos_fuera_de_rango_excluidos(self, app, client, token_for):
        headers = token_for("Administrador")
        self._seed_with_auth_finca(app, headers)

        start = (date.today() + timedelta(days=60)).isoformat()
        end = (date.today() + timedelta(days=90)).isoformat()
        resp = client.get(
            f"{BASE}/analytics/calendar/?start_date={start}&end_date={end}",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["count"] == 0


class TestCalendarAlertVolume:
    """El calendario no debe materializar todas las alertas del periodo."""

    @staticmethod
    def _seed_alerts(headers, total=60):
        from flask_jwt_extended import decode_token

        token_str = headers["Authorization"].split(" ")[1]
        finca_id = decode_token(token_str)["finca_id"]
        now = datetime.now().replace(microsecond=0)
        for index in range(total):
            db.session.add(AnimalAlert(
                animal_id=None,
                finca_id=finca_id,
                alert_type=AlertType.PREDICTIVE,
                message=f"Alerta de volumen {index}",
                priority=(
                    AlertPriority.CRITICAL
                    if index % 2 == 0
                    else AlertPriority.HIGH
                ),
                is_read=False,
                triggered_at=now,
            ))
        db.session.commit()
        return now.date()

    def test_resumen_agrupa_alertas_por_dia(self, client, token_for):
        headers = token_for("Administrador")
        event_date = self._seed_alerts(headers)

        resp = client.get(
            f"{BASE}/analytics/calendar/?start_date={event_date}"
            f"&end_date={event_date}",
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        alert_events = [event for event in data["events"] if event["type"] == "alert"]
        assert len(alert_events) == 1
        assert alert_events[0]["is_summary"] is True
        assert alert_events[0]["count"] == 60
        assert data["counts_by_type"]["alert"] == 60
        assert data["total_count"] == 60

    def test_detalle_respeta_limite(self, client, token_for):
        headers = token_for("Administrador")
        event_date = self._seed_alerts(headers)

        resp = client.get(
            f"{BASE}/analytics/calendar/?start_date={event_date}"
            f"&end_date={event_date}&alert_mode=details"
            "&alert_limit=10&only_alerts=true",
            headers=headers,
        )

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data["events"]) == 10
        assert data["alerts"]["total"] == 60
        assert data["alerts"]["loaded"] == 10
        assert data["alerts"]["truncated"] is True
