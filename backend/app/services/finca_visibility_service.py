from app import db
from app.models.system_content import SystemContent

VISIBILITY_KEY = "finca.public_visibility"

def get_finca_visibility(finca_id: int) -> str:
    entry = SystemContent.get_by_key(VISIBILITY_KEY, finca_id=finca_id)
    if entry and entry.content in ("minimal", "standard", "full"):
        return entry.content
    return "minimal"

def set_finca_visibility(finca_id: int, visibility: str) -> bool:
    if visibility not in ("minimal", "standard", "full"):
        return False
    entry = SystemContent.get_by_key(VISIBILITY_KEY, finca_id=finca_id)
    if entry:
        entry.content = visibility
    else:
        SystemContent.create(
            key=VISIBILITY_KEY,
            content=visibility,
            description="Visibilidad pública de la finca en lista pública",
            finca_id=finca_id,
        )
    db.session.commit()
    return True