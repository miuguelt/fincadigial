import os
import sys
import json
import sqlite3
from test_credentials import get_seed_password
from datetime import date

# Añadir ruta del backend al path
backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def audit_db_physical():
    print("🔍 [AUDIT] Iniciando auditoría física de finca.db...")
    db_path = "backend/instance/finca.db"
    if not os.path.exists(db_path):
        db_path = "backend/finca.db"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(animals)")
    columns = {col[1]: col[2] for col in cursor.fetchall()}

    new_features = ["idFather", "idMother"]
    missing = [f for f in new_features if f not in columns]

    if not missing:
        print("✅ [AUDIT] La tabla 'animals' cuenta con las columnas de genealogía.")
    else:
        print(f"❌ [AUDIT] Faltan columnas en 'animals': {missing}")

    cursor.execute("PRAGMA foreign_key_list(animals)")
    fks = cursor.fetchall()
    print(f"🔗 [AUDIT] Llaves foráneas encontradas: {len(fks)}")
    conn.close()
    return missing


def run_operations():
    from app import create_app, db

    # Importar modelos DESPUÉS de crear la app para que se registren en el mismo MetaData
    from app.models.animals import Animals, Sex, AnimalStatus
    from app.models.breeds import Breeds
    from app.models.user import User, Role

    app = create_app("development")
    seed_password = get_seed_password()

    with app.app_context():
        # Asegurar que existe un administrador
        from werkzeug.security import generate_password_hash

        admin = User.query.filter_by(identification=99999999).first()
        if not admin:
            admin = User(
                identification=99999999,
                fullname="Super Administrador",
                email="admin@finca.com",
                phone="9999999",
                role=Role.Administrador if hasattr(Role, "Administrador") else "Administrador",
                password=generate_password_hash(seed_password),
                status=True,
            )
            db.session.add(admin)
            db.session.commit()
            print("✅ [INIT] Administrador creado exitosamente.")

        print("🌱 [SEED] Poblando base de datos con genealogía...")
        breed = Breeds.query.first()
        if not breed:
            print("❌ [SEED] No hay razas. Ejecuta seed_data.py.")
            return

        father = Animals.query.filter_by(record="FATHER-001").first()
        if not father:
            father = Animals.create(
                record="FATHER-001",
                sex=Sex.Macho,
                breeds_id=breed.id,
                birth_date=date(2018, 1, 1),
                weight=600,
                status=AnimalStatus.Vivo,
            )
            print("✅ [SEED] Padre creado.")

        mother = Animals.query.filter_by(record="MOTHER-001").first()
        if not mother:
            mother = Animals.create(
                record="MOTHER-001",
                sex=Sex.Hembra,
                breeds_id=breed.id,
                birth_date=date(2018, 2, 1),
                weight=500,
                status=AnimalStatus.Vivo,
            )
            print("✅ [SEED] Madre creado.")

        son = Animals.query.filter_by(record="SON-001").first()
        if not son:
            son = Animals.create(
                record="SON-001",
                sex=Sex.Macho,
                breeds_id=breed.id,
                birth_date=date(2024, 1, 1),
                weight=80,
                status=AnimalStatus.Vivo,
                idFather=father.id,
                idMother=mother.id,
            )
            print("✅ [SEED] Hijo creado con genealogía.")
        else:
            son.idFather, son.idMother = father.id, mother.id
            son.save()
            print("✅ [SEED] Genealogía actualizada.")

        print("🖥️ [CRUD] Simulación de CRUD con Administrador...")
        client = app.test_client()

        login_data = {"identification": 99999999, "password": seed_password}
        response = client.post("/api/v1/auth/login", json=login_data)

        if response.status_code == 200:
            print("✅ [CRUD] Login Admin OK.")
            token = response.get_json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"} if token else {}

            # 1. Test Genealogía vía API
            son = Animals.query.filter_by(record="SON-001").first()
            if son:
                print(f"🌳 [TREE] Verificando árbol de ancestros para animal {son.id}...")
                res = client.get(
                    f"/api/v1/animals/tree/ancestors?animal_id={son.id}", headers=headers
                )
                if res.status_code == 200:
                    tree_data = res.get_json()["data"]
                    print(f"✅ [TREE] Árbol generado: {json.dumps(tree_data, indent=2)[:200]}...")
                else:
                    print(f"❌ [TREE] Fallo al obtener árbol: {res.data}")

            # 2. Ciclo CRUD Completo
            new_animal = {
                "record": "CRUD-VERIFIED-001",
                "sex": "Macho",
                "birth_date": "2023-01-01",
                "weight": 100,
                "breeds_id": breed.id,
                "status": "Vivo",
            }

            # Create
            res = client.post("/api/v1/animals/", json=new_animal, headers=headers)
            assert res.status_code == 201, f"Fallo Create: {res.data}"
            aid = res.get_json()["data"]["id"]
            print(f"✅ [CRUD] Create OK: ID {aid}")

            # Read
            res = client.get(f"/api/v1/animals/{aid}", headers=headers)
            assert res.status_code == 200, f"Fallo Read: {res.data}"
            print("✅ [CRUD] Read OK")

            # Update (Administrador requerido)
            res = client.put(f"/api/v1/animals/{aid}", json={"weight": 135}, headers=headers)
            assert res.status_code == 200, f"Fallo Update: {res.data}"
            print("✅ [CRUD] Update OK (Peso actualizado a 135)")

            # Delete (Administrador requerido)
            res = client.delete(f"/api/v1/animals/{aid}", headers=headers)
            assert res.status_code == 200, f"Fallo Delete: {res.data}"
            print("✅ [CRUD] Delete OK")

            print("\n🚀 [VERIFICATION] Aplicación auditada y verificada al 100%.")
        else:
            print(f"❌ [CRUD] Login Admin falló: {response.data}")


if __name__ == "__main__":
    missing = audit_db_physical()
    if missing:
        sql = (
            "BEGIN TRANSACTION;\n"
            + "".join(
                [
                    f"ALTER TABLE animals ADD COLUMN {c} INTEGER REFERENCES animals(id);\n"
                    for c in missing
                ]
            )
            + "COMMIT;"
        )
        db_path = (
            "backend/instance/finca.db"
            if os.path.exists("backend/instance/finca.db")
            else "backend/finca.db"
        )
        conn = sqlite3.connect(db_path)
        conn.executescript(sql)
        conn.close()
        print("✅ [MIGRATION] DB actualizada.")

    try:
        import subprocess

        subprocess.run([sys.executable, "backend/seed_data.py"], capture_output=True)
        run_operations()
    except Exception as e:
        print(f"🔥 [FATAL] {e}")
