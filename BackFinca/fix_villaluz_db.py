import sqlite3
import os

db_path = 'instance/finca.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} no existe")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column_if_not_exists(table, column, type_def):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [c[1] for c in cursor.fetchall()]
    if column not in columns:
        print(f"Adding column {column} to {table}...")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
        return True
    return False

def rename_column_if_exists(table, old_name, new_name):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [c[1] for c in cursor.fetchall()]
    if old_name in columns and new_name not in columns:
        print(f"Renaming column {old_name} to {new_name} in {table}...")
        # SQLite 3.25.0+ supports RENAME COLUMN
        try:
            cursor.execute(f"ALTER TABLE {table} RENAME COLUMN {old_name} TO {new_name}")
            return True
        except Exception as e:
            print(f"Error renaming column: {e}")
            return False
    return False

# Fix MilkProduction
rename_column_if_exists('milk_production', 'session', 'milking_session')

# Ensure other critical columns exist in Animals (as per models/animals.py)
# Note: models/animals.py uses idFather/idMother, birth_date, record, sex, weight, status
# inspect_db.py showed they mostly exist.

conn.commit()
conn.close()
print("Database fix completed.")
