import sqlite3
import os

db_path = 'instance/finca.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} no existe")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print(f"Tables found: {tables}")

for table in tables:
    print(f"\n--- {table} ---")
    cursor.execute(f"PRAGMA table_info({table});")
    columns = cursor.fetchall()
    for col in columns:
        print(col)

conn.close()
