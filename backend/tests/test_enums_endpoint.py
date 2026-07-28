"""Contrato del endpoint de opciones configurables desde PostgreSQL."""


def test_enums_publica_la_configuracion_de_la_base_de_datos(client):
    response = client.get("/api/v1/enums")

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload, dict)
    for key in (
        "vaccine_types",
        "field_states",
        "animal_disease_statuses",
        "animal_disease_severities",
        "administration_routes",
        "animal_genders",
        "animal_states",
    ):
        if key in payload:
            assert isinstance(payload[key], list)
