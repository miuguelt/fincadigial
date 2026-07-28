from datetime import date, timedelta

from flask_jwt_extended import decode_token

from app import db
from app.models import Animals, Breeds, Species
from app.models.animals import AnimalStatus, Sex
from app.services.alert_rules_recommendations import evaluate_recommendation_rules
from app.services.alert_engine import AlertEngine
from app.services.treatment_recommendation_service import TreatmentRecommendationService


def _animal_for_finca(finca_id: int) -> Animals:
    species = Species.create(name="Bovino recomendaciones")
    breed = Breeds.create(name="Raza recomendaciones", species_id=species.id)
    return Animals.create(
        record="REC-001",
        sex=Sex.Hembra,
        weight=320,
        birth_date=date(2022, 1, 1),
        breeds_id=breed.id,
        finca_id=finca_id,
        status=AnimalStatus.Vivo,
    )


def test_recommendation_flow_generates_and_updates_controls(client, auth_headers, app):
    with app.app_context():
        finca_id = decode_token(auth_headers["Authorization"].split(" ")[1])["finca_id"]
        animal = _animal_for_finca(finca_id)
        db.session.commit()
        start_date = date.today() - timedelta(days=10)
        end_date = start_date + timedelta(days=9)
        scheduled_dates = [
            start_date + timedelta(days=3),
            start_date + timedelta(days=6),
            end_date,
        ]

        response = client.post(
            "/api/v1/treatment-recommendations/",
            json={
                "animal_id": animal.id,
                "title": "Reposo por cojera",
                "recommendation": "Mantener en reposo y revisar el casco cada tres días.",
                "responsible": "Dra. Valentina Pérez",
                "start_date": start_date.isoformat(),
                "duration_days": 10,
                "control_interval_days": 3,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201, response.get_json()
        created = response.get_json()["data"]
        assert created["estimated_end_date"] == end_date.isoformat()
        assert [item["scheduled_date"] for item in created["controls"]] == [
            item.isoformat() for item in scheduled_dates
        ]

        control_id = created["controls"][0]["id"]
        control_response = client.put(
            f"/api/v1/treatment-recommendations/{created['id']}/controls/{control_id}",
            json={
                "completed": True,
                "control_date": scheduled_dates[0].isoformat(),
                "observation": "Mejoría visible y apoyo normal del animal.",
            },
            headers=auth_headers,
        )
        assert control_response.status_code == 200, control_response.get_json()
        assert control_response.get_json()["data"]["completed"] is True

        update_response = client.put(
            f"/api/v1/treatment-recommendations/{created['id']}",
            json={"status": "completado", "final_notes": "Manejo finalizado."},
            headers=auth_headers,
        )
        assert update_response.status_code == 200, update_response.get_json()
        assert update_response.get_json()["data"]["status"] == "completado"

        delete_response = client.delete(
            f"/api/v1/treatment-recommendations/{created['id']}",
            headers=auth_headers,
        )
        assert delete_response.status_code == 200
        assert client.get(
            f"/api/v1/treatment-recommendations/{created['id']}",
            headers=auth_headers,
        ).status_code == 404


def test_controls_are_placeholders_and_alert_rules_are_reused(
    client,
    app,
    db_session,
    auth_headers,
    monkeypatch,
):
    with app.app_context():
        finca_id = decode_token(auth_headers["Authorization"].split(" ")[1])["finca_id"]
        animal = _animal_for_finca(finca_id)
        recommendation = TreatmentRecommendationService.create_recommendation(
            {
                "animal_id": animal.id,
                "title": "Control de dieta",
                "recommendation": "Aumentar la fibra y revisar evolución.",
                "start_date": (date.today() - timedelta(days=5)).isoformat(),
                "duration_days": 10,
                "control_interval_days": 3,
            },
            finca_id,
            None,
        )

        alerts: list[str] = []
        monkeypatch.setattr(AlertEngine, "_get_param_int", staticmethod(lambda key: 3))
        # La recomendación empezó hace 5 días con controles cada 3, así que
        # evaluando hoy hay uno vencido. Una fecha fija haría que el resultado
        # dependiera del día en que se corra la suite.
        evaluate_recommendation_rules(
            animal,
            finca_id,
            lambda _kind, message, _priority: alerts.append(message),
            date.today(),
            48,
        )
        assert any("Control atrasado" in message for message in alerts)

        manual_control = client.post(
            f"/api/v1/treatment-recommendations/{recommendation.id}/controls",
            json={"scheduled_date": "2026-07-27"},
            headers=auth_headers,
        )
        assert manual_control.status_code == 405
