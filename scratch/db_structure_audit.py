
import sqlite3

db_path = 'BackFinca/instance/finca.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- TABLES ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
for t in tables:
    print(t)

print("\n--- COLUMNS user_finca ---")
if 'user_finca' in tables:
    cursor.execute("PRAGMA table_info(user_finca)")
    for col in cursor.fetchall():
        print(col)
else:
    print("Table user_finca MISSING")

print("\n--- COLUMNS alert_config ---")
if 'alert_config' in tables:
    cursor.execute("PRAGMA table_info(alert_config)")
    for col in cursor.fetchall():
        print(col)
else:
    # Try other names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%alert%'")
    alert_tables = cursor.fetchall()
    print(f"Alert related tables: {alert_tables}")

conn.close()
