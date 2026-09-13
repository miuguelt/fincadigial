"""
Tests de integración HTTP para endpoints de Gestión Reproductiva.

Verifica: listado, creación individual, y creación por lote de eventos reproductivos.
"""

BASE = "/api/v1"
ADMIN = "Administrador"


class TestReproductionEndpoints:
    def test_get_events_list(self, client, token_for):
        resp = client.get(f"{BASE}/reproduction/events/", headers=token_for(ADMIN))
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_post_batch_reproduction_body_invalido(self, client, token_for):
        resp = client.post(
            f"{BASE}/reproduction/batch", json={}, headers=token_for(ADMIN)
        )
        assert resp.status_code in (400, 422)
        body = resp.get_json()
        assert body["success"] is False

    def test_post_batch_reproduction_invalida_animal_ids(self, client, token_for):
        resp = client.post(
            f"{BASE}/reproduction/batch",
            json={"animal_ids": [], "event_type": "Celo", "event_date": "2026-05-23"},
            headers=token_for(ADMIN),
        )
        assert resp.status_code in (400, 422)
        body = resp.get_json()
        assert body["success"] is False


class TestHerdKpisEndpoint:
    """Contrato HTTP del panel de indicadores del ganado."""

    def test_kpis_responde_el_contrato_completo(self, client, token_for):
        resp = client.get(f"{BASE}/reproduction/kpis?months=12", headers=token_for(ADMIN))
        assert resp.status_code == 200, resp.get_data(as_text=True)
        body = resp.get_json()
        assert body["success"] is True

        data = body["data"]
        assert set(data) >= {
            "period_months",
            "as_of",
            "targets",
            "inventory",
            "efficiency",
            "risk",
            "projection",
            "status",
        }
        assert data["period_months"] == 12
        assert set(data["efficiency"]) >= {
            "calving_interval_days",
            "days_open",
            "services_per_conception",
            "conception_rate_pct",
            "heat_detection_rate_pct",
            "pregnancy_rate_pct",
        }
        assert set(data["risk"]) >= {
            "open_over_limit",
            "repeat_breeders",
            "unconfirmed_services",
            "overdue_births",
            "due_for_dry_off",
            "upcoming_births",
        }

    def test_kpis_acota_el_periodo_solicitado(self, client, token_for):
        resp = client.get(f"{BASE}/reproduction/kpis?months=999", headers=token_for(ADMIN))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["period_months"] == 60

    def test_kpis_exige_autenticacion(self, client):
        assert client.get(f"{BASE}/reproduction/kpis").status_code in (401, 422)

    def test_evento_sobre_macho_es_rechazado_con_mensaje(self, client, token_for, app):
        from datetime import date

        from app import db
        from app.models.animals import Animals, AnimalStatus, Sex
        from app.models.breeds import Breeds
        from app.models.finca import Finca
        from app.models.species import Species

        headers = token_for(ADMIN)
        with app.app_context():
            finca = Finca.query.first()
            species = Species(name="Bovino macho")
            db.session.add(species)
            db.session.flush()
            breed = Breeds(name="Raza macho", species_id=species.id)
            db.session.add(breed)
            db.session.flush()
            sire = Animals(
                record="VALID-TORO",
                sex=Sex.Macho,
                birth_date=date(2020, 1, 1),
                weight=600,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id,
            )
            db.session.add(sire)
            db.session.commit()
            sire_id = sire.id

        resp = client.post(
            f"{BASE}/reproduction/events/",
            json={
                "animal_id": sire_id,
                "event_type": "Celo",
                "event_date": "2026-01-15",
            },
            headers=headers,
        )
        assert resp.status_code == 400
        assert "macho" in resp.get_json()["message"].lower()


class TestCalfRegistrationEndpoint:
    def test_registrar_cria_inexistente_devuelve_400(self, client, token_for):
        resp = client.post(
            f"{BASE}/reproduction/offspring/999999/register-animal",
            json={"record": "NO-EXISTE", "sex": "Hembra"},
            headers=token_for(ADMIN),
        )
        assert resp.status_code == 400
        assert resp.get_json()["success"] is False

    def test_registrar_cria_exige_autenticacion(self, client):
        resp = client.post(
            f"{BASE}/reproduction/offspring/1/register-animal",
            json={"record": "X", "sex": "Hembra"},
        )
        assert resp.status_code in (401, 422)


class TestAnimalReproductiveHistoryEndpoint:
    def test_historial_hembra_con_iep_y_dias_abiertos(self, app, client, token_for):
        from datetime import date
        from app import db
        from app.models.animals import Animals, AnimalStatus, Sex
        from app.models.breeds import Breeds
        from app.models.finca import Finca
        from app.models.reproduction import EventType, ReproductiveEvent

        headers = token_for(ADMIN)
        with app.app_context():
            finca = Finca.query.first()
            breed = Breeds.query.first()
            cow = Animals(
                record="COW-IEP-TEST",
                sex=Sex.Hembra,
                birth_date=date(2019, 1, 1),
                weight=450,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id if breed else 1,
            )
            db.session.add(cow)
            db.session.flush()

            # 2 partos separados por 400 días
            p1 = ReproductiveEvent(
                animal_id=cow.id,
                finca_id=finca.id,
                event_type=EventType.Parto,
                event_date=date(2023, 1, 1),
                alive_count=1,
            )
            p2 = ReproductiveEvent(
                animal_id=cow.id,
                finca_id=finca.id,
                event_type=EventType.Parto,
                event_date=date(2024, 2, 5),
                alive_count=1,
            )
            db.session.add_all([p1, p2])
            db.session.commit()
            cow_id = cow.id

        resp = client.get(
            f"{BASE}/reproduction/events/animal/{cow_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        data = body["data"]
        assert data["is_male"] is False
        assert data["metrics"]["total_births"] == 2
        assert data["metrics"]["iep_days"] == 400
        assert data["metrics"]["days_open"] is not None
        assert len(data["events"]) == 2

    def test_historial_macho_reproductor(self, app, client, token_for):
        from datetime import date
        from app import db
        from app.models.animals import Animals, AnimalStatus, Sex
        from app.models.breeds import Breeds
        from app.models.finca import Finca
        from app.models.reproduction import EventType, ReproductiveEvent

        headers = token_for(ADMIN)
        with app.app_context():
            finca = Finca.query.first()
            breed = Breeds.query.first()
            bull = Animals(
                record="BULL-HISTORY-TEST",
                sex=Sex.Macho,
                birth_date=date(2018, 1, 1),
                weight=700,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id if breed else 1,
            )
            cow = Animals(
                record="COW-SERV-TEST",
                sex=Sex.Hembra,
                birth_date=date(2020, 1, 1),
                weight=420,
                status=AnimalStatus.Vivo,
                finca_id=finca.id,
                breeds_id=breed.id if breed else 1,
            )
            db.session.add_all([bull, cow])
            db.session.flush()

            # Servicio donde el toro es sire_id
            service = ReproductiveEvent(
                animal_id=cow.id,
                sire_id=bull.id,
                finca_id=finca.id,
                event_type=EventType.Inseminacion,
                event_date=date(2025, 6, 1),
            )
            db.session.add(service)
            db.session.commit()
            bull_id = bull.id

        resp = client.get(
            f"{BASE}/reproduction/events/animal/{bull_id}",
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        data = body["data"]
        assert data["is_male"] is True
        assert data["metrics"]["total_inseminations"] == 1
        assert len(data["events"]) == 1

