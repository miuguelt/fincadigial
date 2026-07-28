"""Seed: valores de configuración de caché y JWT blocklist."""
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import create_app
from app.models.system_content import SystemContent
from app import db

ENTRIES = [
    {
        'key': 'config.cache.default_timeout',
        'category': 'config',
        'content': '300',
        'title': 'Timeout por defecto de la caché (segundos)',
        'content_type': 'int',
    },
    {
        'key': 'param.jwt.blocklist_ttl',
        'category': 'param',
        'content': '3600',
        'title': 'TTL por defecto para tokens revocados (segundos)',
        'content_type': 'int',
    },
]

app = create_app('development')
with app.app_context():
    for entry_data in ENTRIES:
        existing = SystemContent.get_by_key(entry_data['key'])
        if existing:
            for k, v in entry_data.items():
                if k != 'key' and hasattr(existing, k):
                    setattr(existing, k, v)
            print(f"  \u2705 {entry_data['key']} actualizado")
        else:
            obj = SystemContent(**entry_data)
            db.session.add(obj)
            print(f"  \u2705 {entry_data['key']} creado")
    db.session.commit()
    print("\n \u2705 Configuración de caché y JWT blocklist lista en system_contents.")
