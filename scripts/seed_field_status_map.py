"""Seed: Mapa de estado de potreros → health status en system_contents."""

import os
import sys

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app import create_app, db
from app.models.system_content import SystemContent

MAPPING = {
    "Activo": "healthy",
    "Disponible": "healthy",
    "Ocupado": "warning",
    "Mantenimiento": "resting",
    "Restringido": "critical",
    "Dañado": "critical",
}

app = create_app("development")
with app.app_context():
    entry = SystemContent.get_by_key("config.field_status_map")
    if not entry:
        db.session.execute(
            db.text(
                "INSERT INTO system_contents (key, content, category, content_type, extra) "
                "VALUES (:key, :content, :cat, :ct, :extra)"
            ),
            {
                "key": "config.field_status_map",
                "content": "Mapa de estados de potrero a indicador visual de salud",
                "cat": "config",
                "ct": "json",
                "extra": MAPPING,
            },
        )
        print("  ✅ config.field_status_map creado")
    else:
        entry.extra = MAPPING
        print("  ✅ config.field_status_map actualizado")

    db.session.commit()
    print("\n Mapa de estados de potrero listo en system_contents.")
