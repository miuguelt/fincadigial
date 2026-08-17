#!/usr/bin/env python3
import sqlite3
import os

db_path = os.path.join("backend", "instance", "finca.db")

if not os.path.exists(db_path):
    print(f"Base de datos no encontrada: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== Usuarios Operario y Veterinario con finca_id ===")
cursor.execute(
    "SELECT id, identification, fullname, role, status, finca_id FROM user WHERE role IN ('Operario', 'Veterinario')"
)
users = cursor.fetchall()

for user in users:
    print(
        f"ID: {user[0]}, Identificación: {user[1]}, Nombre: {user[2]}, Rol: {user[3]}, Estado: {user[4]}, Finca ID: {user[5]}"
    )

print("\n=== Fincas disponibles ===")
cursor.execute("SELECT id, name, type, is_active FROM finca")
fincas = cursor.fetchall()

for finca in fincas:
    print(f"ID: {finca[0]}, Nombre: {finca[1]}, Tipo: {finca[2]}, Activa: {finca[3]}")

conn.close()
