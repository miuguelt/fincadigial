"""Persistent exchange history; no message body is exposed to third parties."""
from datetime import UTC, datetime
from uuid import uuid4

from app import db


def new_id():
    return str(uuid4())


def now():
    return datetime.now(UTC).replace(tzinfo=None)


class MarketConversation(db.Model):
    __tablename__ = "market_conversations"
    __table_args__ = (db.UniqueConstraint("offer_id", "guest_id", name="uq_market_participants"),)
    id = db.Column(db.String(36), primary_key=True, default=new_id)
    offer_id = db.Column(db.Integer, db.ForeignKey("market_offers.id"), nullable=False)
    offer_snapshot = db.Column(db.JSON, nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    guest_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="talking")
    proposal_by = db.Column(db.Integer, nullable=True)
    terms = db.Column(db.Text, nullable=True)
    owner_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    guest_confirmed = db.Column(db.Boolean, nullable=False, default=False)
    owner_read_at = db.Column(db.DateTime, nullable=True)
    guest_read_at = db.Column(db.DateTime, nullable=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=now)
    updated_at = db.Column(db.DateTime, nullable=False, default=now)
    offer = db.relationship("MarketOffer")
    owner = db.relationship("User", foreign_keys=[owner_id])
    guest = db.relationship("User", foreign_keys=[guest_id])
    __mapper_args__ = {"version_id_col": version}


class MarketEvent(db.Model):
    __tablename__ = "market_events"
    __table_args__ = (
        db.UniqueConstraint("actor_id", "request_key", name="uq_market_event_request"),
        db.Index("ix_market_events_conversation_date", "conversation_id", "created_at"),
    )
    id = db.Column(db.String(36), primary_key=True, default=new_id)
    conversation_id = db.Column(db.String(36), db.ForeignKey("market_conversations.id"), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    kind = db.Column(db.String(20), nullable=False)
    body = db.Column(db.Text, nullable=False, default="")
    request_key = db.Column(db.String(36), nullable=False)
    request_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now)


class MarketBlock(db.Model):
    __tablename__ = "market_blocks"
    blocker_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    blocked_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now)


class MarketReport(db.Model):
    __tablename__ = "market_reports"
    __table_args__ = (db.UniqueConstraint("offer_id", "reporter_id", name="uq_market_report"),)
    id = db.Column(db.String(36), primary_key=True, default=new_id)
    offer_id = db.Column(db.Integer, db.ForeignKey("market_offers.id"), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    reason = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="open")
    created_at = db.Column(db.DateTime, nullable=False, default=now)
    offer = db.relationship("MarketOffer")
