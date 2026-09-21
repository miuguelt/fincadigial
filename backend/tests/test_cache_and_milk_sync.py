"""
Tests de integración para cache-busting con timestamp y sincronización de ordeños.
"""

BASE = "/api/v1"
ADMIN = "Administrador"


class TestCacheAndMilkSync:
    def test_cache_bust_timestamp_bypasses_cache(self, client, token_for):
        """Verifica que un timestamp numérico Date.now() en cache_bust omita la caché."""
        timestamp = 1725667890123
        resp = client.get(
            f"{BASE}/animals?cache_bust={timestamp}", headers=token_for(ADMIN)
        )
        assert resp.status_code == 200
        cc = resp.headers.get("Cache-Control", "")
        # Debe forzar revalidación inmediata (no-cache o max-age=0)
        assert "no-cache" in cc or "max-age=0" in cc

    def test_milk_production_get_and_cache_headers(self, client, token_for):
        """Verifica que el endpoint de ordeños responda con headers de revalidación."""
        resp = client.get(f"{BASE}/milk-production", headers=token_for(ADMIN))
        assert resp.status_code == 200
        cc = resp.headers.get("Cache-Control", "")
        assert "no-cache" in cc or "max-age=0" in cc

    def test_post_milk_production_requiere_animal(self, client, token_for):
        """Verifica validación al registrar ordeño sin animal."""
        resp = client.post(
            f"{BASE}/milk-production",
            json={"liters": 12.5, "milking_session": "AM"},
            headers=token_for(ADMIN),
        )
        assert resp.status_code in (400, 422)

    def test_milk_batch_post_sin_finca_o_entradas(self, client, token_for):
        """Verifica endpoint de lote de ordeños."""
        resp = client.post(
            f"{BASE}/milk-production/batch",
            json={"entries": []},
            headers=token_for(ADMIN),
        )
        assert resp.status_code in (400, 422)

    def test_post_milk_production_rechaza_no_lactante_o_macho(self, app, client, token_for):
        """Verifica que el ordeño solo se permita para vacas en lactancia activa."""
        from app import db
        from app.models.animals import Animals, Sex, AnimalStatus
        from app.models.breeds import Breeds
        from app.models.species import Species
        from app.models.finca import Finca, FarmType
        from datetime import date

        with app.app_context():
            finca = Finca.query.first() or Finca.create(name="Finca Leche", type=FarmType.Tradicional)
            species = Species.query.first() or Species.create(name="Bovino Test")
            breed = Breeds.query.first() or Breeds.create(name="Holstein", species_id=species.id)

            macho = Animals.create(
                record="MACHO-01",
                sex=Sex.Macho,
                weight=500.0,
                birth_date=date(2022, 1, 1),
                breeds_id=breed.id,
                finca_id=finca.id,
                status=AnimalStatus.Vivo,
                is_lactating=False,
            )
            vaca_seca = Animals.create(
                record="VACA-SECA-01",
                sex=Sex.Hembra,
                weight=450.0,
                birth_date=date(2021, 5, 1),
                breeds_id=breed.id,
                finca_id=finca.id,
                status=AnimalStatus.Vivo,
                is_lactating=False,
            )
            vaca_lactante = Animals.create(
                record="VACA-LAC-01",
                sex=Sex.Hembra,
                weight=460.0,
                birth_date=date(2021, 3, 1),
                breeds_id=breed.id,
                finca_id=finca.id,
                status=AnimalStatus.Vivo,
                is_lactating=True,
            )
            db.session.commit()
            macho_id = macho.id
            seca_id = vaca_seca.id
            lactante_id = vaca_lactante.id

        headers = token_for(ADMIN)

        # 1. Macho debe ser rechazado
        resp_macho = client.post(
            f"{BASE}/milk-production",
            json={"animal_id": macho_id, "liters": 10.0, "milking_session": "AM"},
            headers=headers,
        )
        assert resp_macho.status_code in (400, 422)
        macho_text = resp_macho.get_data(as_text=True).lower()
        assert "macho" in macho_text or "hembras" in macho_text

        # 2. Vaca seca debe ser rechazada
        resp_seca = client.post(
            f"{BASE}/milk-production",
            json={"animal_id": seca_id, "liters": 10.0, "milking_session": "AM"},
            headers=headers,
        )
        assert resp_seca.status_code in (400, 422)
        assert "lactancia" in resp_seca.get_data(as_text=True).lower()

        # 3. Vaca en lactancia debe ser aceptada
        resp_lac = client.post(
            f"{BASE}/milk-production",
            json={"animal_id": lactante_id, "liters": 12.5, "milking_session": "AM"},
            headers=headers,
        )
        assert resp_lac.status_code == 201

