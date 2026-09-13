"""Immutable evidence of the legal acceptances made by a user."""

from app import db


class UserConsent(db.Model):
    __tablename__ = "user_consents"
    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "purpose",
            "version",
            name="uq_user_consent_purpose_version",
        ),
        db.Index("ix_user_consents_user_id", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    purpose = db.Column(db.String(64), nullable=False)
    version = db.Column(db.String(32), nullable=False)
    consent_text_hash = db.Column(db.String(64), nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=False)
    source = db.Column(db.String(64), nullable=False)

    user = db.relationship(
        "User",
        backref=db.backref("consents", lazy="dynamic"),
    )
