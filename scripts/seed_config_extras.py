"""Seed: Configuración de roles admin y periodos en system_contents."""

import os
import sys

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app import create_app, db
from app.models.system_content import SystemContent

ENTRIES = [
    {
        "key": "config.admin_roles",
        "content": "Roles con permisos de administración en la finca",
        "category": "config",
        "content_type": "json",
        "extra": ["Administrador", "Propietario", "Capataz"],
    },
    {
        "key": "config.period_days",
        "content": "Mapeo de periodos predefinidos a días",
        "category": "config",
        "content_type": "json",
        "extra": {"6m": 180, "1y": 365, "2y": 730},
    },
]

app = create_app("development")
with app.app_context():
    for data in ENTRIES:
        entry = SystemContent.get_by_key(data["key"])
        if entry:
            entry.content = data["content"]
            entry.extra = data["extra"]
            entry.content_type = data["content_type"]
            print(f"  \u2705 {data['key']} actualizado")
        else:
            obj = SystemContent(**data)
            db.session.add(obj)
            print(f"  \u2705 {data['key']} creado")
    db.session.commit()
    print("\n \u2705 Configuraciones de admin_roles y period_days listas en system_contents.")
