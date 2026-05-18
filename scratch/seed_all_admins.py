
import sqlite3
import os
from datetime import datetime

db_path = 'BackFinca/instance/finca.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all Administrators
cursor.execute("SELECT id, fullname FROM user WHERE role = 'Administrador'")
admins = cursor.fetchall()

# Get all Fincas
cursor.execute("SELECT id, name FROM finca")
fincas = cursor.fetchall()

print(f"Found {len(admins)} Admins and {len(fincas)} Fincas.")

now = datetime.now().isoformat()

for admin_id, name in admins:
    print(f"Processing Admin: {name} (ID: {admin_id})")
    for f_id, f_name in fincas:
        # Check if already exists
        cursor.execute("SELECT id FROM user_finca WHERE user_id = ? AND finca_id = ?", (admin_id, f_id))
        if cursor.fetchone():
            print(f"  - Already assigned to {f_name}")
            continue
        
        # Assign as Propietario
        is_primary = (f_id == 1)
        cursor.execute(
            "INSERT INTO user_finca (user_id, finca_id, role, is_active, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (admin_id, f_id, 'Propietario', 1, 1 if is_primary else 0, now, now)
        )
        print(f"  - Assigned to {f_name}")

conn.commit()
conn.close()
print("\nDone!")
