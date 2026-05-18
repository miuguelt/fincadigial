
import sqlite3
db_path = 'BackFinca/instance/finca.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- FINCAS ---")
cursor.execute("SELECT id, name, type, is_active FROM finca")
for row in cursor.fetchall():
    print(row)

print("\n--- USER_FINCA RELATIONS ---")
cursor.execute("SELECT uf.id, u.fullname, f.name, uf.role, uf.is_active FROM user_finca uf JOIN user u ON uf.user_id = u.id JOIN finca f ON uf.finca_id = f.id")
for row in cursor.fetchall():
    print(row)

conn.close()
