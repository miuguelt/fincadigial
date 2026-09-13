"""Pruebas unitarias para modelos de sincronización offline y redes mesh (devices, sync_operations, sync_sessions, sync_conflicts, attachment_blobs, community_nodes, node_messages)."""

from datetime import datetime, UTC
from uuid import uuid4
import pytest

from app.extensions import db
from app.models.finca import FarmType, Finca
from app.models.node_message import NodeMessage, NodeMessageStatus, NodeMessageType
from app.models.sync import (
    AttachmentBlob,
    Device,
    DeviceStatus,
    SyncConflict,
    SyncOperation,
    SyncOperationReceipt,
    SyncOperationStatus,
    SyncSession,
    SyncSessionStatus,
)
from app.models.territory import CommunityNode, ConnectivityLevel, Territory
from app.models.user import User


@pytest.fixture
def sync_context(app, db_session):
    """Crea una finca, usuario y territorio para pruebas de sincronización offline."""
    with app.app_context():
        import random
        n = random.randint(10000000, 99999999)
        finca = Finca.create(
            name=f"Hacienda Offline Mesh {n}",
            type=FarmType.Tradicional,
            is_active=True,
        )
        user = User.create(
            email=f"sync_operator_{n}@villaluz.co",
            password="SyncPassword123!",
            fullname="Operador Sync Offline",
            identification=str(n),
            phone=f"319{n}",
            role="Operario",
            finca_id=finca.id,
            status=True,
        )
        territory = Territory.create(
            name=f"Vereda El Porvenir {n}",
            municipality="Vélez",
            department="Santander",
            connectivity_level=ConnectivityLevel.INTERMITTENT,
        )
        db_session.session.commit()
        return finca, user, territory


class TestOfflineSyncModels:
    """Valida los modelos de sincronización offline (devices, operations, sessions, receipts, conflicts, blobs)."""

    def test_device_model(self, sync_context):
        finca, user, _ = sync_context
        dev_id = f"dev-{uuid4().hex[:8]}"
        device = Device.create(
            device_id=dev_id,
            name="Tablet Rural Rugged 01",
            platform="Android 14",
            status=DeviceStatus.ACTIVE,
            finca_id=finca.id,
            user_id=user.id,
        )
        assert device.id is not None
        assert device.device_id == dev_id
        assert device.status == DeviceStatus.ACTIVE

    def test_sync_operation_and_receipt(self, sync_context):
        finca, user, _ = sync_context
        op_id = f"op-{uuid4().hex[:12]}"
        operation = SyncOperation.create(
            operation_id=op_id,
            entity_type="Animals",
            entity_id="101",
            operation="CREATE",
            payload={"record": "BOV-999", "weight": 410.0},
            origin_device_id="tablet-01",
            author_user_id=user.id,
            finca_id=finca.id,
            status=SyncOperationStatus.APPLIED,
        )
        assert operation.id is not None
        assert operation.operation_id == op_id
        assert operation.status == SyncOperationStatus.APPLIED

        receipt = SyncOperationReceipt.create(
            operation_id=op_id,
            device_id="tablet-02",
            applied=True,
            finca_id=finca.id,
        )
        assert receipt.id is not None
        assert receipt.operation_ref.id == operation.id

    def test_sync_session_and_conflict(self, sync_context):
        finca, user, _ = sync_context
        sess_id = f"sess-{uuid4().hex[:10]}"
        session = SyncSession.create(
            session_id=sess_id,
            local_device_id="hub-local-01",
            peer_device_id="tablet-peer-02",
            transport="wifi-direct",
            status=SyncSessionStatus.COMPLETED,
            operations_sent=15,
            operations_received=12,
            conflicts_count=1,
            finca_id=finca.id,
        )
        assert session.id is not None
        assert session.status == SyncSessionStatus.COMPLETED

        op_id = f"op-conf-{uuid4().hex[:8]}"
        SyncOperation.create(
            operation_id=op_id,
            entity_type="Animals",
            entity_id="102",
            operation="UPDATE",
            origin_device_id="tablet-01",
            finca_id=finca.id,
        )
        conflict = SyncConflict.create(
            operation_id=op_id,
            entity_type="Animals",
            entity_id="102",
            local_payload={"weight": 420.0},
            incoming_payload={"weight": 425.0},
            resolution="latest_timestamp_wins",
            resolved_by=user.id,
            resolved_at=datetime.now(UTC),
            finca_id=finca.id,
        )
        assert conflict.id is not None
        assert conflict.resolution == "latest_timestamp_wins"

    def test_attachment_blob_model(self, sync_context):
        finca, user, _ = sync_context
        sha = uuid4().hex + uuid4().hex
        blob = AttachmentBlob.create(
            attachment_id=f"att-{uuid4().hex[:8]}",
            entity_type="Animals",
            entity_id="103",
            filename="foto_novilla.jpg",
            content_type="image/jpeg",
            sha256=sha[:64],
            total_size=1024000,
            received_size=1024000,
            storage_path="/uploads/foto_novilla.jpg",
            is_complete=True,
            finca_id=finca.id,
            uploaded_by=user.id,
        )
        assert blob.id is not None
        assert blob.is_complete is True
        assert blob.sha256 == sha[:64]


class TestCommunityNodeAndMessages:
    """Valida los nodos comunitarios (mesh) y mensajes de comunicación rural."""

    def test_community_node_model(self, sync_context):
        finca, _, territory = sync_context
        node = CommunityNode.create(
            node_id=f"node-mesh-{uuid4().hex[:8]}",
            name="Nodo Comunitario Vereda El Porvenir",
            territory_id=territory.id,
            finca_id=finca.id,
            host="192.168.1.100",
            port=8010,
            is_active=True,
        )
        assert node.id is not None
        assert node.is_active is True
        assert node.territory_id == territory.id

    def test_node_message_model(self, sync_context):
        finca, user, _ = sync_context
        msg = NodeMessage.create(
            message_id=f"msg-{uuid4().hex[:10]}",
            sender_user_id=user.id,
            sender_device_id="device-sender-01",
            recipient_user_id=user.id,
            recipient_node_id="node-mesh-02",
            message_type=NodeMessageType.ALERT,
            content="Aviso de vacunación obligatoria ciclo I",
            status=NodeMessageStatus.DELIVERED,
            priority=50,
            finca_id=finca.id,
        )
        assert msg.id is not None
        assert msg.message_type == NodeMessageType.ALERT
        assert msg.status == NodeMessageStatus.DELIVERED
        assert msg.finca_id == finca.id
