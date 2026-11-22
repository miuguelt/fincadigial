"""Pruebas de integración para sincronización rural offline-first y replay idempotente.

Verifica:
1. Despacho exitoso de operaciones en lote vía POST /api/v1/sync/push.
2. Idempotencia y deduplicación exacta al retransmitir el mismo lote (replay sin duplicación).
3. Emisión de recibos SyncOperationReceipt para el dispositivo que retransmite.
4. Descarga incremental vía POST /api/v1/sync/pull preservando cursores.
5. Manejo seguro de operaciones malformadas en lista de conflictos sin romper el lote.
"""

import uuid
from app import db
from app.models.sync import SyncOperation, SyncOperationReceipt, SyncOperationStatus


def test_sync_push_batch_success(client, auth_headers, app):
    """Verifica que un lote de operaciones offline se persista correctamente."""
    with app.app_context():
        device_id = f"tablet-rugged-{uuid.uuid4().hex[:6]}"
        op_id_1 = f"op-anim-{uuid.uuid4().hex[:8]}"
        op_id_2 = f"op-pad-{uuid.uuid4().hex[:8]}"

        payload = {
            "device_id": device_id,
            "device_name": "Tablet Potrero Sur",
            "platform": "Android 14 Rural",
            "operations": [
                {
                    "operation_id": op_id_1,
                    "entity_type": "Animals",
                    "entity_id": "991",
                    "operation": "CREATE",
                    "payload": {"record": "NOV-OFF-01", "weight": 380.0},
                    "base_version": 1,
                    "logical_clock": 101,
                },
                {
                    "operation_id": op_id_2,
                    "entity_type": "Paddocks",
                    "entity_id": "12",
                    "operation": "UPDATE",
                    "payload": {"status": "EnDescanso"},
                    "base_version": 2,
                    "logical_clock": 102,
                },
            ],
        }

        resp = client.post("/api/v1/sync/push", json=payload, headers=auth_headers)
        assert resp.status_code == 202
        data = resp.get_json()["data"]
        assert op_id_1 in data["accepted"]
        assert op_id_2 in data["accepted"]
        assert len(data["duplicates"]) == 0
        assert len(data["conflicts"]) == 0

        # Verificar persistencia en base de datos
        op1 = SyncOperation.query.filter_by(operation_id=op_id_1).first()
        assert op1 is not None
        assert op1.entity_type == "Animals"
        assert op1.origin_device_id == device_id
        assert op1.status == SyncOperationStatus.PENDING


def test_sync_push_idempotent_replay(client, auth_headers, app):
    """Verifica que reenviar el mismo lote no duplique registros y genere recibos."""
    with app.app_context():
        device_id = f"tablet-replay-{uuid.uuid4().hex[:6]}"
        op_id = f"op-replay-{uuid.uuid4().hex[:8]}"

        payload = {
            "device_id": device_id,
            "operations": [
                {
                    "operation_id": op_id,
                    "entity_type": "MilkProduction",
                    "entity_id": "88",
                    "operation": "CREATE",
                    "payload": {"liters": 16.5, "milking_time": "Mañana"},
                }
            ],
        }

        # Primer envío: debe ser aceptado con 202
        resp1 = client.post("/api/v1/sync/push", json=payload, headers=auth_headers)
        assert resp1.status_code == 202
        assert op_id in resp1.get_json()["data"]["accepted"]

        # Segundo envío idéntico (simulando reconexión / retry)
        resp2 = client.post("/api/v1/sync/push", json=payload, headers=auth_headers)
        assert resp2.status_code == 202
        data2 = resp2.get_json()["data"]

        # Debe marcarlo como duplicado y no en aceptados
        assert op_id in data2["duplicates"]
        assert op_id not in data2["accepted"]

        # No debe haber duplicación en la tabla de operaciones
        count = SyncOperation.query.filter_by(operation_id=op_id).count()
        assert count == 1

        # Debe existir recibo de confirmación para el dispositivo
        receipt = SyncOperationReceipt.query.filter_by(
            operation_id=op_id, device_id=device_id
        ).first()
        assert receipt is not None


def test_sync_push_handles_conflicts_gracefully(client, auth_headers, app):
    """Verifica que operaciones incompletas se reporten en conflicts sin abortar."""
    with app.app_context():
        device_id = f"device-conflict-{uuid.uuid4().hex[:6]}"
        invalid_op_id = f"op-invalid-{uuid.uuid4().hex[:8]}"

        payload = {
            "device_id": device_id,
            "operations": [
                {
                    "operation_id": invalid_op_id,
                    # Falta entity_type y operation
                    "payload": {"some": "data"},
                }
            ],
        }

        resp = client.post("/api/v1/sync/push", json=payload, headers=auth_headers)
        assert resp.status_code == 202
        data = resp.get_json()["data"]
        assert len(data["conflicts"]) == 1
        assert data["conflicts"][0]["operation_id"] == invalid_op_id
        assert "requeridos" in data["conflicts"][0]["reason"]


def test_sync_pull_operations(client, auth_headers, app):
    """Verifica la recuperación incremental de cambios mediante POST /api/v1/sync/pull."""
    with app.app_context():
        device_id = f"device-puller-{uuid.uuid4().hex[:6]}"
        op_id = f"op-pull-{uuid.uuid4().hex[:8]}"

        # Crear una operación inicial
        push_payload = {
            "device_id": f"device-pusher-{uuid.uuid4().hex[:6]}",
            "operations": [
                {
                    "operation_id": op_id,
                    "entity_type": "Animals",
                    "entity_id": "555",
                    "operation": "UPDATE",
                    "payload": {"weight": 412.0},
                }
            ],
        }
        client.post("/api/v1/sync/push", json=push_payload, headers=auth_headers)

        # Solicitar cambios desde cursor 0
        pull_payload = {
            "device_id": device_id,
            "last_cursor": 0,
            "limit": 10,
        }

        resp = client.post("/api/v1/sync/pull", json=pull_payload, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "operations" in data
        assert any(op["operation_id"] == op_id for op in data["operations"])
        assert "next_cursor" in data
