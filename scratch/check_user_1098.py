
import sqlite3
import os

db_path = 'BackFinca/instance/finca.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- USER 1098 ---")
cursor.execute("SELECT id, identification, fullname, role FROM user WHERE identification = '1098'")
user = cursor.fetchone()
print(user)

if user:
    user_id = user[0]
    print(f"\n--- USER_FINCA for ID {user_id} ---")
    cursor.execute("SELECT * FROM user_finca WHERE user_id = ?", (user_id,))
    for row in cursor.fetchall():
        print(row)

conn.close()
