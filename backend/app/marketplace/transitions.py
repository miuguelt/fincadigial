"""Two-person agreement state machine. Events are append-only."""
from .validation import MarketError, require_version, text_field

LABELS = {"accept": "Aceptó las condiciones del intercambio.",
          "decline": "No aceptó la propuesta. Pueden conversar y hacer otra.",
          "complete": "Confirmó que realizó su parte del intercambio.",
          "cancel": "Canceló este intercambio.", "block": "Bloqueó el contacto."}


def transition(thread, user_id, payload):
    kind = payload.get("kind")
    if not isinstance(kind, str) or kind not in {"message", "proposal", *LABELS}:
        raise MarketError("Acción de conversación no válida.")
    if thread.status in {"completed", "cancelled", "blocked"}:
        raise MarketError("Este intercambio ya está cerrado. El historial sigue disponible.", 409)
    if kind != "message":
        require_version(thread.version, payload.get("version"))
    body = text_field(payload.get("body"), "body", 2000, kind in {"message", "proposal"})
    if kind == "proposal":
        if thread.status == "agreed":
            raise MarketError("Ya hay un acuerdo aceptado. Cancélenlo si no pueden cumplirlo.", 409)
        thread.status, thread.terms, thread.proposal_by = "proposed", body, user_id
    elif kind in {"accept", "decline"}:
        if thread.status != "proposed" or thread.proposal_by == user_id:
            raise MarketError("Solo la otra persona puede responder una propuesta vigente.", 409)
        thread.status = "agreed" if kind == "accept" else "talking"
        if kind == "decline":
            thread.terms, thread.proposal_by = None, None
    elif kind == "complete":
        if thread.status != "agreed":
            raise MarketError("Primero deben aceptar las condiciones del intercambio.", 409)
        field = "owner_confirmed" if user_id == thread.owner_id else "guest_confirmed"
        if getattr(thread, field):
            raise MarketError("Ya confirmaste tu parte. Falta la confirmación de la otra persona.", 409)
        setattr(thread, field, True)
        if thread.owner_confirmed and thread.guest_confirmed:
            thread.status = "completed"
    elif kind in {"cancel", "block"}:
        thread.status = "cancelled" if kind == "cancel" else "blocked"
    return kind, body or LABELS.get(kind, "")
