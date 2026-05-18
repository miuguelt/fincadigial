"""
Mantenedor de contexto de proyecto en DevBrain PostgreSQL.

Uso:
  python scripts/update_project_context.py             # actualiza estado
  python scripts/update_project_context.py --show      # muestra estado actual
  python scripts/update_project_context.py --phase F6  # marca fase completada

DevBrain PostgreSQL: 172.19.44.126:5432
"""

import sys
import json
import argparse
from datetime import datetime, timezone

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Instalar: pip install psycopg2-binary")
    sys.exit(1)

CONN = {
    "host": "localhost",
    "port": 5432,
    "dbname": "devbrain",
    "user": "sennova",
    "password": "sennova123",
    "connect_timeout": 5,
}

PHASES = {
    "F1": {"name": "Modelo Finca + migración BD",        "status": "done"},
    "F2": {"name": "JWT + Tenant Context",               "status": "done"},
    "F3": {"name": "Unicidad por finca",                 "status": "done"},
    "F5": {"name": "RBAC 7 roles",                       "status": "done"},
    "F4": {"name": "Registro público finca+propietario", "status": "done"},
    "F6": {"name": "Mobile/PWA offline-first",           "status": "done",
           "items": {
               "useOfflineSync+badge": "done",
               "OperarioDashboard":    "done",
               "Docker Compose":       "done",
               "QR scanner":          "done",
               "Offline fallback page":"done",
               "Error Boundaries":    "done",
           }},
    "F7": {"name": "SSE real-time + IA predictiva",      "status": "done",
           "items": {
               "LiveStats SSE":        "done",
               "cortex_service base":  "done",
               "Endpoint API Claude":  "done",
               "Alertas predictivas":  "done",
               "Informe ICA":          "done",
           }},
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS villa_luz_context (
    id           SERIAL PRIMARY KEY,
    project      TEXT NOT NULL DEFAULT '_projects/villaluz',
    phase        TEXT NOT NULL,
    phase_name   TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    items        JSONB,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes        TEXT,
    UNIQUE(project, phase)
);

CREATE TABLE IF NOT EXISTS villa_luz_decisions (
    id           SERIAL PRIMARY KEY,
    project      TEXT NOT NULL DEFAULT '_projects/villaluz',
    category     TEXT NOT NULL,
    decision     TEXT NOT NULL,
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

DECISIONS = [
    ("architecture", "Row-level tenancy con finca_id en 16 tablas", "Simplicidad vs schema-per-tenant"),
    ("auth",         "JWT en cookies HttpOnly + withCredentials:true", "CSRF protection"),
    ("offline",      "IndexedDB (VillaLuzQueue) para cola offline", "Límite 5-10MB localStorage insuficiente"),
    ("offline",      "BackgroundSync en Service Worker para escrituras", "Opera aunque el tab esté cerrado"),
    ("api",          "food_types usa underscore, alias food-types→308", "Consistencia de naming en Flask"),
    ("api",          "Dashboard endpoint: /analytics/dashboard/complete", "No /analytics/dashboard (ceros)"),
    ("datetime",     "datetime.now(timezone.utc) en todo el backend", "datetime.utcnow() deprecado Python 3.12+"),
]


def get_conn():
    return psycopg2.connect(**CONN)


def setup_schema(cur):
    cur.execute(SCHEMA)


def upsert_phases(cur):
    for phase_id, data in PHASES.items():
        cur.execute(
            """
            INSERT INTO villa_luz_context (project, phase, phase_name, status, items, updated_at)
            VALUES ('_projects/villaluz', %s, %s, %s, %s, NOW())
            ON CONFLICT (project, phase) DO UPDATE
              SET phase_name = EXCLUDED.phase_name,
                  status     = EXCLUDED.status,
                  items      = EXCLUDED.items,
                  updated_at = NOW()
            """,
            (
                phase_id,
                data["name"],
                data["status"],
                json.dumps(data.get("items")) if "items" in data else None,
            ),
        )


def upsert_decisions(cur):
    for category, decision, reason in DECISIONS:
        cur.execute(
            """
            INSERT INTO villa_luz_decisions (project, category, decision, reason)
            SELECT '_projects/villaluz', %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM villa_luz_decisions
                WHERE project = '_projects/villaluz' AND decision = %s
            )
            """,
            (category, decision, reason, decision),
        )


def show_state(cur):
    cur.execute(
        "SELECT phase, phase_name, status, items, updated_at FROM villa_luz_context "
        "WHERE project='_projects/villaluz' ORDER BY phase"
    )
    rows = cur.fetchall()
    print("\n=== Estado del Proyecto VillaLuz ===")
    for phase, name, status, items, updated in rows:
        icon = {"done": "✓", "in_progress": "▶", "pending": "○"}.get(status, "?")
        print(f"  {icon} {phase}: {name} [{status}]  (actualizado: {updated:%Y-%m-%d})")
        if items:
            for item, s in items.items():
                sub_icon = "✓" if s == "done" else "○"
                print(f"       {sub_icon} {item}")
    print()


def mark_phase(cur, phase_id: str, status: str):
    cur.execute(
        "UPDATE villa_luz_context SET status=%s, updated_at=NOW() "
        "WHERE project='_projects/villaluz' AND phase=%s",
        (status, phase_id.upper()),
    )
    print(f"Fase {phase_id.upper()} marcada como '{status}'")


def main():
    parser = argparse.ArgumentParser(description="Context manager VillaLuz ↔ DevBrain")
    parser.add_argument("--show",  action="store_true", help="Mostrar estado actual")
    parser.add_argument("--phase", help="ID de fase (F1-F7)")
    parser.add_argument("--status", default="done", help="Status: done|in_progress|pending")
    args = parser.parse_args()

    try:
        conn = get_conn()
        conn.autocommit = False
        cur = conn.cursor()

        setup_schema(cur)
        upsert_phases(cur)
        upsert_decisions(cur)
        conn.commit()

        if args.show or not args.phase:
            show_state(cur)

        if args.phase:
            mark_phase(cur, args.phase, args.status)
            conn.commit()
            show_state(cur)

        cur.close()
        conn.close()
        print("DevBrain context actualizado.")

    except Exception as e:
        print(f"Error conectando a DevBrain PostgreSQL: {e}")
        print("Verificar: WSL activo, Redis/Postgres corriendo en 172.19.44.126")
        sys.exit(1)


if __name__ == "__main__":
    main()
