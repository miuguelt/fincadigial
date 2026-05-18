import pymysql
import uuid
import datetime

DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3307,
    'user': 'villaluz',
    'password': 'villaluz_pass',
    'database': 'finca_db'
}

import time

def run_audit():
    retries = 5
    conn = None
    while retries > 0:
        try:
            conn = pymysql.connect(**DB_CONFIG)
            break
        except Exception as e:
            print(f"⏳ Esperando a la base de datos... ({retries} intentos restantes)")
            time.sleep(3)
            retries -= 1
    
    if not conn:
        print("❌ No se pudo conectar tras varios intentos.")
        return

    cur = conn.cursor()
    
    try:
        print("🚀 Iniciando Auditoría CRUD - Finca VillaLuz")
        
        # 1. CRUD: Species
        print("\n--- [SPECIES] ---")
        test_species = f"AuditSpecies_{uuid.uuid4().hex[:6]}"
        cur.execute("INSERT INTO species (name) VALUES (%s)", (test_species,))
        species_id = conn.insert_id()
        print(f"✅ CREATE: Especie '{test_species}' creada (ID: {species_id})")
        
        cur.execute("SELECT name FROM species WHERE id = %s", (species_id,))
        res = cur.fetchone()
        print(f"✅ READ: Especie encontrada: {res[0]}")
        
        new_name = test_species + "_UPD"
        cur.execute("UPDATE species SET name = %s WHERE id = %s", (new_name, species_id))
        print(f"✅ UPDATE: Nombre actualizado a '{new_name}'")
        
        cur.execute("DELETE FROM species WHERE id = %s", (species_id,))
        print(f"✅ DELETE: Especie eliminada")

        # 2. CRUD: Finca (Fundamental para Animals)
        # Buscamos la finca principal o creamos una temporal
        cur.execute("SELECT id FROM finca LIMIT 1")
        finca_res = cur.fetchone()
        if not finca_res:
             cur.execute("INSERT INTO finca (name, location) VALUES ('Audit Finca', 'Test Location')")
             finca_id = conn.insert_id()
        else:
             finca_id = finca_res[0]
        print(f"\n--- [FINCA ID: {finca_id}] ---")

        # 3. CRUD: Animals
        print("\n--- [ANIMALS] ---")
        cur.execute("SELECT id FROM species LIMIT 1")
        # species_id no parece estar directamente en animals, sino a través de breeds.
        # animals tiene breeds_id.
        cur.execute("SELECT id FROM breeds LIMIT 1")
        real_breed_id = cur.fetchone()[0]

        record_tag = f"AUDIT_{uuid.uuid4().hex[:4]}"
        cur.execute("""
            INSERT INTO animals (record, sex, birth_date, weight, status, finca_id, breeds_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (record_tag, "Macho", datetime.date.today(), 50.5, "Vivo", finca_id, real_breed_id))
        animal_id = conn.insert_id()
        print(f"✅ CREATE: Animal '{record_tag}' creado (ID: {animal_id})")

        cur.execute("SELECT record, sex FROM animals WHERE id = %s", (animal_id,))
        res = cur.fetchone()
        print(f"✅ READ: Animal: {res[0]}, Sexo: {res[1]}")

        cur.execute("UPDATE animals SET weight = 60.0 WHERE id = %s", (animal_id,))
        print(f"✅ UPDATE: Peso del animal actualizado")

        cur.execute("DELETE FROM animals WHERE id = %s", (animal_id,))
        print(f"✅ DELETE: Animal eliminado")

        # 4. CRUD: User (Access Audit)
        print("\n--- [USER] ---")
        email = f"audit_{uuid.uuid4().hex[:4]}@test.com"
        # Columnas reales: identification, fullname, password, email, phone, role, status, approval_status, finca_id
        cur.execute("""
            INSERT INTO user (identification, email, fullname, password, phone, role, status, approval_status, finca_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (99999001, email, "Audit User", "hashed_password", "3000000000", "Operario", 1, "Approved", finca_id))
        user_id = conn.insert_id()
        print(f"✅ CREATE: Usuario '{email}' creado (ID: {user_id})")

        cur.execute("UPDATE user SET fullname = 'Audit User Updated' WHERE id = %s", (user_id,))
        print(f"✅ UPDATE: Nombre de usuario actualizado")

        cur.execute("DELETE FROM user WHERE id = %s", (user_id,))
        print(f"✅ DELETE: Usuario eliminado")

        conn.commit()
        print("\n🎉 AUDITORÍA COMPLETADA EXITOSAMENTE")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR DURANTE LA AUDITORÍA: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_audit()
