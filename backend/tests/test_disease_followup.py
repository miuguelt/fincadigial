"""Flujo de seguimiento sanitario de episodios de enfermedad.

Cubre el ciclo completo: creación del episodio con gravedad, registro de
avances clínicos (peso/temperatura/estado), vinculación de tratamientos,
vacunaciones y recomendaciones al episodio, consulta del seguimiento
agregado y cierre del caso con su fecha de alta.
"""

import json
from datetime import date

from flask_jwt_extended import decode_token

from app import db
from app.models import (
    AnimalDisease,
    AnimalDiseaseProgress,
    Animals,
    Breeds,
    Diseases,
    Species,
    Treatments,
)
from app.models.animals import AnimalStatus, Sex
from app.models.user import User
from app.models.vaccines import Vaccines


def _d(offset: int) -> str:
    """Fecha ISO de hace ``offset`` días relativa a hoy (evita fechas futuras)."""
    from datetime import timedelta

    return (date.today() + timedelta(days=offset)).isoformat()


def _seed_farm(app, auth_headers):
    """Crea especie, raza, animal, enfermedad y devuelve sus ids."""
    with app.app_context():
        token_str = auth_headers["Authorization"].split(" ")[1]
        claims = decode_token(token_str)
        finca_id = claims["finca_id"]

        species = Species(name="Bovino Test Seguimiento")
        db.session.add(species)
        db.session.commit()

        breed = Breeds(name="Raza Test Seguimiento", species_id=species.id)
        db.session.add(breed)
        db.session.commit()

        animal = Animals.create(
            record="BOV-SEG-001",
            sex=Sex.Hembra,
            weight=320.0,
            birth_date=date.today(),
            breeds_id=breed.id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()

        disease = Diseases.create(
            name="Mastitis Test Seguimiento",
            symptoms="induración y dolor",
            details="caso clínico moderado",
            finca_id=finca_id,
        )
        db.session.commit()

        return finca_id, animal.id, disease.id


def _instructor_id(app, auth_headers):
    with app.app_context():
        admin = User.query.filter_by(email="admin@villaluz.com").first()
        return admin.id


def test_disease_followup_full_flow(client, auth_headers, app):
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    # 1. Crear el episodio de enfermedad vía API
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-9),
            "status": "Activo",
            "severity": "Moderada",
            "notes": "Res con fiebre y baja de peso",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    episode = resp.get_json()["data"]
    episode_id = episode["id"]
    assert episode["severity"] == "Moderada"
    assert episode["recovery_date"] is None

    # 2. Registrar dos avances clínicos del episodio vía API
    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-7),
            "weight": 315.0,
            "temperature": 40.1,
            "status": "En tratamiento",
            "observation": "Antibiótico intramuscular aplicado, come poco",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-4),
            "weight": 318.0,
            "temperature": 38.9,
            "status": "Observación",
            "observation": "Temperatura normalizada, apetito recuperado",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    # 3. Vincular un tratamiento con medicamento y una vacunación al episodio
    resp = client.post(
        "/api/v1/treatments",
        json={
            "treatment_date": _d(-7),
            "description": "Aplicación de antibiótico por mastitis",
            "frequency": "Diario 3 días",
            "dosis": "5 ml IM",
            "animal_id": animal_id,
            "animal_disease_id": episode_id,
            "cost": "25000.00",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    treatment_id = resp.get_json()["data"]["id"]

    with app.app_context():
        from app.models import RouteAdministration
        from app.models.medications import Medications

        route = RouteAdministration(
            name="Intramuscular Test Seg",
            description="test",
            status=True,
            finca_id=finca_id,
        )
        db.session.add(route)
        db.session.commit()
        med = Medications.create(
            name="Oxitetraciclina Test Seg",
            description="antibiótico",
            indications="mastitis",
            dosis="5 ml",
            route_administration_id=route.id,
            finca_id=finca_id,
            availability=True,
        )
        db.session.commit()
        vaccine = Vaccines.create(
            name="Vacuma Fiebre Test Seg",
            dosis="2 ml",
            route_administration_id=route.id,
            vaccination_interval="12 meses",
            type="Inactivada",
            national_plan="Plan Nacional",
            target_disease_id=disease_id,
            finca_id=finca_id,
        )
        db.session.commit()
        vaccine_id = vaccine.id

    resp = client.post(
        "/api/v1/vaccinations",
        json={
            "animal_id": animal_id,
            "vaccine_id": vaccine_id,
            "vaccination_date": _d(-6),
            "dosis": "2 ml",
            "animal_disease_id": episode_id,
            "notes": "Refuerzo por el caso activo",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    # 4. Vinculación inválida: tratamiento cuyo episodio es de otro animal
    with app.app_context():
        other_animal = Animals.create(
            record="BOV-SEG-002",
            sex=Sex.Macho,
            weight=280.0,
            birth_date=date.today(),
            breeds_id=Breeds.query.first().id,
            finca_id=finca_id,
            status=AnimalStatus.Vivo,
        )
        db.session.commit()
        other_animal_id = other_animal.id

    # Un PATCH que cambie solo la res tampoco puede dejar atrás el caso
    # clínico ya vinculado.
    resp = client.patch(
        f"/api/v1/treatments/{treatment_id}",
        json={"animal_id": other_animal_id},
        headers=auth_headers,
    )
    assert resp.status_code in (400, 422), resp.get_data(as_text=True)

    resp = client.post(
        "/api/v1/treatments",
        json={
            "treatment_date": _d(-5),
            "description": "Tratamiento cruzado",
            "frequency": "Una vez",
            "dosis": "2 ml",
            "animal_id": other_animal_id,
            "animal_disease_id": episode_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code in (400, 422), resp.get_data(as_text=True)

    # 5. Consultar el seguimiento agregado del episodio
    resp = client.get(
        f"/api/v1/animal-diseases/{episode_id}/followup", headers=auth_headers
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    followup = resp.get_json()["data"]
    assert followup["episode"]["id"] == episode_id
    assert len(followup["progress"]) == 2
    assert len(followup["treatments"]) == 1
    assert len(followup["vaccinations"]) == 1
    chart_dates = [row["date"] for row in followup["chart"]["series"]]
    assert chart_dates == sorted(chart_dates)

    # 6. Cerrar el caso: estado Recuperado + fecha de alta
    resp = client.post(
        f"/api/v1/animal-diseases/{episode_id}/followup/close",
        json={"status": "Recuperado", "recovery_date": _d(-1)},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    closed = resp.get_json()["data"]
    assert closed["status"] == "Recuperado"
    assert closed["recovery_date"] == _d(-1)

    resp = client.get(
        f"/api/v1/animal-diseases/{episode_id}/followup", headers=auth_headers
    )
    followup = resp.get_json()["data"]
    assert any(item["code"] == "CLOSED" for item in followup["closed"])
    assert any(item["code"] == "DURATION" for item in followup["closed"])

    # 7. Gravedad inválida rechazada
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-9),
            "status": "Activo",
            "severity": "Insostenible",
        },
        headers=auth_headers,
    )
    assert resp.status_code in (400, 422), resp.get_data(as_text=True)


def test_progress_updates_episode_when_resolved(client, auth_headers, app):
    """Un avance con estado de recuperación debe cerrar el episodio solo."""
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-9),
            "status": "Activo",
        },
        headers=auth_headers,
    )
    episode_id = resp.get_json()["data"]["id"]

    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-1),
            "weight": 330.0,
            "temperature": 38.6,
            "status": "Recuperado",
            "observation": "Sin signos clínicos",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    with app.app_context():
        episode = AnimalDisease.query.get(episode_id)
        assert episode.status == "Recuperado"
        assert episode.recovery_date and episode.recovery_date.isoformat() == _d(-1)


def test_progress_mirrors_health_history(client, auth_headers, app):
    """Los avances se espejan en la bitácora unificada y se retiran al borrar."""
    from app.models.animal_health_history import AnimalHealthHistory, HealthEventType

    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-5),
            "status": "Activo",
        },
        headers=auth_headers,
    )
    episode_id = resp.get_json()["data"]["id"]

    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-3),
            "weight": 328.0,
            "temperature": 39.8,
            "status": "En tratamiento",
            "observation": "Comenzó el tratamiento con antibiótico",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    progress_id = resp.get_json()["data"]["id"]

    with app.app_context():
        event = (
            AnimalHealthHistory.query.filter_by(
                event_type=HealthEventType.Disease,
                reference_id=progress_id,
            )
            .order_by(AnimalHealthHistory.id.desc())
            .first()
        )
        assert event is not None
        assert event.animal_id == animal_id
        assert event.weight == 328.0
        assert event.temperature == 39.8
        assert event.health_status == "En tratamiento"
        assert "antibiótico" in (event.description or "")
        assert not event.is_deleted

    # Al eliminar el avance, su espejo desaparece de la bitácora
    resp = client.delete(f"/api/v1/animal-disease-progress/{progress_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.get_data(as_text=True)

    with app.app_context():
        remaining = AnimalHealthHistory.query.filter_by(
            event_type=HealthEventType.Disease,
            reference_id=progress_id,
        ).count()
        assert remaining == 0


def test_health_statistics_includes_episodes(client, auth_headers, app):
    """El endpoint de analítica de salud incluye episodios y sus métricas."""
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    # Un episodio abierto y uno cerrado (con duración)
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-3),
            "status": "Activo",
            "severity": "Leve",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-8),
            "status": "Recuperado",
            "recovery_date": _d(-2),
            "severity": "Severa",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get(
        "/api/v1/analytics/health/statistics?months=12", headers=auth_headers
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    episodes = resp.get_json()["data"]["disease_episodes"]
    assert episodes["total"] == 2
    assert episodes["active"] == 1
    assert episodes["resolved"] == 1
    assert episodes["recovery_rate"] == 50.0
    assert episodes["avg_duration_days"] == 6.0
    assert episodes["by_status"].get("Activo") == 1
    assert episodes["by_status"].get("Recuperado") == 1
    assert episodes["by_severity"].get("Leve") == 1
    assert episodes["by_severity"].get("Severa") == 1
    assert episodes["by_month"], "Debe existir al menos un punto por mes"
    assert episodes["avg_duration_by_disease"], "Debe calcular la duración por enfermedad"


def test_control_weight_temperature_and_timeline(client, auth_headers, app):
    """El control registra peso/temperatura, actualiza el peso y aparece en la
    línea de tiempo junto a los avances del seguimiento."""
    from app.models.animals import Animals

    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    resp = client.post(
        "/api/v1/control",
        json={
            "animal_id": animal_id,
            "checkup_date": _d(-5),
            "health_status": "Bueno",
            "weight": 315.5,
            "height": 1.22,
            "temperature": 38.9,
            "description": "Control mensual de rutina",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    control = resp.get_json()["data"]
    assert control["weight"] == 315.5
    assert control["temperature"] == 38.9

    with app.app_context():
        animal = Animals.query.get(animal_id)
        assert animal.weight == 315.5, "El peso actual debe sincronizarse con el control"

    # Temperatura fuera de rango fisiológico debe rechazarse
    resp = client.post(
        "/api/v1/control",
        json={
            "animal_id": animal_id,
            "checkup_date": _d(-4),
            "health_status": "Bueno",
            "temperature": 52.0,
        },
        headers=auth_headers,
    )
    assert resp.status_code in (400, 422), resp.get_data(as_text=True)

    # Línea de tiempo clínica: control + episodio + avance del seguimiento
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-3),
            "status": "Activo",
        },
        headers=auth_headers,
    )
    episode_id = resp.get_json()["data"]["id"]

    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-2),
            "weight": 318.0,
            "temperature": 39.4,
            "status": "En tratamiento",
            "observation": "Fiebre controlada",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get(
        f"/api/v1/analytics/animals/{animal_id}/medical-history", headers=auth_headers
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    timeline = resp.get_json()["data"]["timeline"]
    types = [entry["type"] for entry in timeline]
    assert "control" in types
    assert "progress" in types
    assert "disease" in types
    summary = resp.get_json()["data"]["summary"]
    assert summary["total_controls"] == 1
    assert summary["total_progress"] == 1

    progress_entry = next(entry for entry in timeline if entry["type"] == "progress")
    assert "318.0" in progress_entry["subtitle"] or "318" in progress_entry["subtitle"]
    control_entry = next(entry for entry in timeline if entry["type"] == "control")
    assert "38.9" in control_entry["subtitle"]


def test_weight_deltas_csv_and_date_range(client, auth_headers, app):
    """Deltas de peso, export CSV de la serie y filtro por rango de fechas."""
    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    # Tres controles para el animal: -30d (290 kg), -10d (300 kg), -2d solo temperatura
    for offset, weight, temperature in [(-30, 290.0, None), (-10, 300.0, 38.7), (-2, None, 39.1)]:
        resp = client.post(
            "/api/v1/control",
            json={
                "animal_id": animal_id,
                "checkup_date": _d(offset),
                "health_status": "Bueno",
                "weight": weight,
                "temperature": temperature,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.get_data(as_text=True)

    # Delta entre los dos últimos controles con peso
    resp = client.get(
        f"/api/v1/analytics/health/weight-deltas?animal_ids={animal_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    entry = resp.get_json()["data"][str(animal_id)]
    assert entry["latest_weight"] == 300.0
    assert entry["prev_weight"] == 290.0
    assert entry["delta_pct"] == round((300.0 - 290.0) / 290.0 * 100, 1)

    # CSV: contiene controles y avances, con peso y temperatura
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-9),
            "status": "Activo",
        },
        headers=auth_headers,
    )
    episode_id = resp.get_json()["data"]["id"]
    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": episode_id,
            "progress_date": _d(-4),
            "weight": 303.0,
            "temperature": 39.2,
            "status": "En tratamiento",
            "observation": "Recuperándose",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    resp = client.get(
        f"/api/v1/exports/animal/{animal_id}/health-dataseries.csv", headers=auth_headers
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    csv_content = resp.get_data(as_text=True)
    assert "fecha,tipo,peso_kg,altura_m,temperatura_c,estado,observacion" in csv_content
    assert "Avance de seguimiento" in csv_content
    assert "39.2" in csv_content or "39,2" in csv_content

    # PDF de ficha sanitaria: incluye la sección de seguimiento clínico
    resp = client.get(
        f"/api/v1/exports/animal/{animal_id}/health-report.pdf", headers=auth_headers
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    pdf_bytes = resp.get_data()
    assert pdf_bytes[:4] == b"%PDF"

    def pdf_text(pdf_data):
        """Descomprime los streams FlateDecode para poder buscar texto."""
        import re
        import zlib

        streams = []
        for match in re.findall(rb"stream\r?\n(.+?)\r?\nendstream", pdf_data, re.DOTALL):
            try:
                streams.append(zlib.decompress(match))
            except zlib.error:
                continue
        return b"\n".join(streams)

    content = pdf_text(pdf_bytes)
    assert b"Seguimiento" in content, content[:400]
    assert b"Avances" in content, content[:400]

    # Filtro de rango de fechas sobre el listado de episodios
    resp = client.get(
        f"/api/v1/animal-diseases?diagnosis_date_from={_d(-9)}&diagnosis_date_to={_d(-9)}",
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    episodes = resp.get_json()["data"]
    assert len(episodes) == 1
    assert episodes[0]["id"] == episode_id


def test_sanitation_alert_rules_fever_and_followup(app, auth_headers, client):
    """El motor alerta por fiebre y por episodio activo sin avances recientes."""
    from app.services.alert_rules_health import evaluate_health_rules

    finca_id, animal_id, disease_id = _seed_farm(app, auth_headers)
    instructor_id = _instructor_id(app, auth_headers)

    # Control con fiebre alta (40.5 °C) y episodio activo sin avances desde hace 9 días
    resp = client.post(
        "/api/v1/control",
        json={
            "animal_id": animal_id,
            "checkup_date": _d(-2),
            "health_status": "Regular",
            "temperature": 40.5,
            "weight": 300.0,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    resp = client.post(
        "/api/v1/animal-diseases",
        json={
            "animal_id": animal_id,
            "disease_id": disease_id,
            "instructor_id": instructor_id,
            "diagnosis_date": _d(-8),
            "status": "En tratamiento",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    with app.app_context():
        from app.models.animals import Animals

        today = _d(0)
        from datetime import date

        today = date.fromisoformat(today)
        animal = Animals.query.get(animal_id)
        captured = []

        def trig(alert_type, message, priority):
            captured.append((str(alert_type.value), message, str(priority.value)))

        evaluate_health_rules(animal, finca_id, trig, today, 24)
        messages = " | ".join(message for _, message, _ in captured)
        priorities = dict(
            (message, priority) for _, message, priority in captured
        )

        assert any("Fiebre detectada" in m or "FIEBRE" in m for m in messages.split(" | ")), messages
        assert any("Seguimiento pendiente" in m or "Seguimiento CRÍTICO" in m for m in messages.split(" | ")), messages

        followup_msg = next(
            m for m in messages.split(" | ") if "Seguimiento" in m
        )
        assert followup_msg.split("hace")[1].split(" días")[0].strip() in ("9", "8"), followup_msg

    # Lo contrario: episodio con avance de hoy → sin alerta de seguimiento
    resp = client.post(
        "/api/v1/animal-disease-progress",
        json={
            "animal_disease_id": (
                client.get(
                    f"/api/v1/animal-diseases?animal_id={animal_id}", headers=auth_headers
                ).get_json()["data"][0]["id"]
            ),
            "progress_date": today.isoformat(),
            "status": "En tratamiento",
            "observation": "Control diario",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)

    with app.app_context():
        from app.models.animals import Animals

        animal = Animals.query.get(animal_id)
        captured.clear()

        def trig2(alert_type, message, priority):
            captured.append((str(alert_type.value), message, str(priority.value)))

        evaluate_health_rules(animal, finca_id, trig2, today, 24)
        assert not any(
            "Seguimiento" in message for _, message, _ in captured
        ), captured
