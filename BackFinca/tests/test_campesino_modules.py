BASE = "/api/v1"
ADMIN = "Administrador"


def _assert_created(resp):
    assert resp.status_code in (200, 201), resp.get_data(as_text=True)[:300]
    body = resp.get_json() or {}
    data = body.get("data") or body
    assert data.get("id")
    return data


def test_campesino_v1_crud_smoke(client, token_for):
    headers = token_for(ADMIN, finca_type="Tradicional")

    crop = _assert_created(client.post(
        f"{BASE}/crop-plots",
        json={"name": "Lote Maiz Norte", "crop_name": "Maiz", "status": "active"},
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/crop-activities",
        json={
            "crop_plot_id": crop["id"],
            "activity_type": "note",
            "activity_date": "2026-05-06",
            "description": "Observacion de campo offline",
        },
        headers=headers,
    ))

    water = _assert_created(client.post(
        f"{BASE}/water-sources",
        json={"name": "Nacimiento La Pena", "source_type": "stream", "is_potable": True},
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/water-measurements",
        json={
            "water_source_id": water["id"],
            "measured_at": "2026-05-06T08:30:00",
            "level_percent": 72,
            "ph": 7.1,
        },
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/climate-risks",
        json={"title": "Riesgo de helada", "risk_type": "helada", "severity": "high"},
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/market-offers",
        json={"offer_type": "sale", "product_name": "Queso campesino", "quantity": 20, "unit": "kg"},
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/technical-assistance",
        json={"title": "Plaga en cultivo", "category": "cultivos", "priority": "high"},
        headers=headers,
    ))

    _assert_created(client.post(
        f"{BASE}/offline-learning",
        json={"title": "Manejo basico de agua", "category": "agua", "content_type": "text"},
        headers=headers,
    ))

    for endpoint in [
        "crop-plots",
        "crop-activities",
        "water-sources",
        "water-measurements",
        "climate-risks",
        "market-offers",
        "technical-assistance",
        "offline-learning",
    ]:
        resp = client.get(f"{BASE}/{endpoint}", headers=headers)
        assert resp.status_code == 200, f"{endpoint}: {resp.get_data(as_text=True)[:300]}"
