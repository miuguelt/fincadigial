
import sqlite3
import os
from datetime import datetime

db_path = 'BackFinca/instance/finca.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Super Admin ID is 6 (based on audit)
admin_id = 6
# Finca IDs are 1 and 2
finca_ids = [1, 2]

print(f"Assigning User {admin_id} to Fincas {finca_ids}...")

for f_id in finca_ids:
    # Check if already exists
    cursor.execute("SELECT id FROM user_finca WHERE user_id = ? AND finca_id = ?", (admin_id, f_id))
    if cursor.fetchone():
        print(f"User {admin_id} already assigned to Finca {f_id}")
        continue
    
    # Assign as Propietario
    now = datetime.now().isoformat()
    is_primary = (f_id == 1) # Set first one as primary
    cursor.execute(
        "INSERT INTO user_finca (user_id, finca_id, role, is_active, is_primary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (admin_id, f_id, 'Propietario', 1, 1 if is_primary else 0, now, now)
    )

conn.commit()
print("Success!")

# Verify
cursor.execute("SELECT * FROM user_finca")
print("\n--- NEW USER_FINCA ASSIGNMENTS ---")
for row in cursor.fetchall():
    print(row)

conn.close()
