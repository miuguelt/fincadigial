from app import create_app, db
from sqlalchemy import inspect
import sqlite3

def fix_schema():
    app = create_app('development')
    with app.app_context():
        # Obtener todas las tablas del modelo
        metadata = db.metadata
        conn = sqlite3.connect('instance/finca.db')
        cursor = conn.cursor()
        
        for table_name, table in metadata.tables.items():
            print(f"Checking table: {table_name}")
            
            # Obtener columnas actuales en la BD
            cursor.execute(f"PRAGMA table_info({table_name})")
            db_cols = {col[1] for col in cursor.fetchall()}
            
            if not db_cols:
                print(f"  Table {table_name} does not exist. Skipping (run create_tables.py first).")
                continue
            
            # Comparar con columnas del modelo
            for col_name, column in table.columns.items():
                if col_name not in db_cols:
                    print(f"  Missing column: {col_name} in {table_name}")
                    # Determinar tipo de dato simple para SQLite
                    col_type = "TEXT"
                    if "INTEGER" in str(column.type).upper(): col_type = "INTEGER"
                    elif "FLOAT" in str(column.type).upper() or "NUMERIC" in str(column.type).upper(): col_type = "REAL"
                    elif "BOOLEAN" in str(column.type).upper(): col_type = "BOOLEAN"
                    elif "DATE" in str(column.type).upper(): col_type = "DATE"
                    
                    try:
                        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                        print(f"  Column {col_name} added successfully.")
                    except Exception as e:
                        print(f"  Error adding column {col_name}: {e}")
        
        conn.commit()
        conn.close()
        print("Schema sync completed.")

if __name__ == "__main__":
    fix_schema()
