
import sqlite3
import os

db_path = 'BackFinca/instance/finca.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- USERS ---")
try:
    cursor.execute("SELECT id, identification, fullname, role FROM user LIMIT 10")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error reading users: {e}")

print("\n--- USER_FINCA ASSIGNMENTS ---")
try:
    cursor.execute("SELECT * FROM user_finca")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error reading user_finca: {e}")

print("\n--- FINCAS ---")
try:
    cursor.execute("SELECT id, name, type FROM finca")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error reading fincas: {e}")

conn.close()
