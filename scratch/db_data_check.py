
import sqlite3
db_path = 'BackFinca/instance/finca.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- USERS ---")
cursor.execute("SELECT id, identification, fullname, role FROM user")
for row in cursor.fetchall():
    print(row)

print("\n--- USER_FINCA RELATIONS ---")
cursor.execute("SELECT * FROM user_finca")
for row in cursor.fetchall():
    print(row)

conn.close()
