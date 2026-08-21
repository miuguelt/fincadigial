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
    """Contrato HTTP del panel de indicadores del hato."""

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
