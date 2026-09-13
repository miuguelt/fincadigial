"""Pruebas unitarias para modelos del marketplace (market_conversations, market_events, market_blocks, market_reports)."""

from uuid import uuid4
import pytest

from app.extensions import db
from app.marketplace.models import (
    MarketBlock,
    MarketConversation,
    MarketEvent,
    MarketReport,
)
from app.models.campesino import MarketOffer
from app.models.finca import FarmType, Finca
from app.models.user import User


@pytest.fixture
def marketplace_context(app, db_session):
    """Crea finca, usuarios y oferta de mercado para pruebas unitarias de modelos."""
    with app.app_context():
        import random
        n1 = random.randint(10000000, 49999999)
        n2 = random.randint(50000000, 89999999)
        finca = Finca.create(
            name=f"Finca Mercado {n1}",
            type=FarmType.Tradicional,
            is_active=True,
        )
        owner = User.create(
            email=f"vendedor_{n1}@villaluz.co",
            password="Password123!",
            fullname="Campesino Vendedor",
            identification=str(n1),
            phone=f"315{n1}",
            role="Operario",
            finca_id=finca.id,
            status=True,
        )
        buyer = User.create(
            email=f"comprador_{n2}@villaluz.co",
            password="Password123!",
            fullname="Campesino Comprador",
            identification=str(n2),
            phone=f"316{n2}",
            role="Operario",
            finca_id=finca.id,
            status=True,
        )
        offer = MarketOffer.create(
            finca_id=finca.id,
            created_by=owner.id,
            product_name="Yuca Criolla",
            offer_type="sale",
            quantity=50.0,
            unit="Bulto",
            price=45000.0,
            delivery_location="Vereda El Centro",
            community_visible=True,
        )
        db_session.session.commit()
        return finca, owner, buyer, offer


class TestMarketplaceModels:
    """Valida los modelos de persistencia del marketplace."""

    def test_market_conversation_and_event(self, marketplace_context):
        _, owner, buyer, offer = marketplace_context
        conv = MarketConversation(
            offer_id=offer.id,
            offer_snapshot={"product_name": offer.product_name, "price": offer.price},
            owner_id=owner.id,
            guest_id=buyer.id,
            status="talking",
        )
        db.session.add(conv)
        db.session.commit()

        assert conv.id is not None
        assert conv.version == 1
        assert conv.status == "talking"

        # Registrar un evento en la conversación
        req_key = str(uuid4())
        event = MarketEvent(
            conversation_id=conv.id,
            actor_id=buyer.id,
            kind="message",
            body="Buenas tardes, ¿aún tiene disponible?",
            request_key=req_key,
            request_hash=f"hash-{req_key}",
        )
        db.session.add(event)
        db.session.commit()

        assert event.id is not None
        assert event.conversation_id == conv.id
        assert event.actor_id == buyer.id

    def test_market_block(self, marketplace_context):
        _, owner, buyer, _ = marketplace_context
        block = MarketBlock(blocker_id=owner.id, blocked_id=buyer.id)
        db.session.add(block)
        db.session.commit()

        found = MarketBlock.query.filter_by(blocker_id=owner.id, blocked_id=buyer.id).first()
        assert found is not None
        assert found.blocker_id == owner.id

    def test_market_report(self, marketplace_context):
        _, _, buyer, offer = marketplace_context
        report = MarketReport(
            offer_id=offer.id,
            reporter_id=buyer.id,
            reason="Información de contacto desactualizada",
            status="open",
        )
        db.session.add(report)
        db.session.commit()

        assert report.id is not None
        assert report.status == "open"
        assert report.offer_id == offer.id
