
import requests
import random
import string

BASE_URL = "http://127.0.0.1:8092/api/v1"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def random_ident():
    return random.randint(10000000, 99999999)

def log_test(step, success, message="", details=None):
    status = "✅" if success else "❌"
    print(f"{status} [{step}] {message}")
    if details:
        print(f"   Details: {details}")

class SystemAudit:
    def __init__(self):
        self.tokens = {} # user_id -> token
        self.fincas = {} # type -> finca_id
        self.users = {}  # user_id -> {role, finca_id, token}
        self.role_to_user_id = {} # role -> user_id

    def register_finca(self, name, type_finca):
        email = f"owner_{random_string()}@audit.com"
        ident = random_ident()
        payload = {
            "finca": {
                "name": name,
                "type": type_finca,
                "department": "AuditDept",
                "municipality": "AuditCity"
            },
            "owner": {
                "identification": ident,
                "fullname": f"Owner of {name}",
                "email": email,
                "phone": f"300{random.randint(1000000, 9999999)}",
                "password": "Password123!"
            }
        }

        response = requests.post(f"{BASE_URL}/public/register", json=payload)
        if response.status_code == 201:
            data = response.json()["data"]
            finca_id = data["finca"]["id"]
            user_id = data["user"]["id"]
            token = data["access_token"]
            role = data["user"]["role"]

            self.fincas[type_finca] = finca_id
            self.tokens[user_id] = token
            self.users[user_id] = {"role": role, "finca_id": finca_id, "token": token}
            self.role_to_user_id[role] = user_id

            log_test(f"Register {type_finca}", True, f"Finca {name} created (ID: {finca_id})")
            return user_id, token
        else:
            log_test(f"Register {type_finca}", False, f"Failed: {response.text}")
            return None, None

    def create_user(self, creator_token, role, finca_id):
        email = f"{role.lower()}_{random_string()}@audit.com"
        ident = random_ident()
        payload = {
            "identification": ident,
            "fullname": f"User {role}",
            "email": email,
            "phone": f"300{random.randint(1000000, 9999999)}",
            "password": "Password123!",
            "role": role,
            "finca_id": finca_id,
            "status": True,
            "approval_status": "Approved"
        }

        headers = {"Authorization": f"Bearer {creator_token}"}
        response = requests.post(f"{BASE_URL}/users", json=payload, headers=headers)
        if response.status_code == 201:
            user_data = response.json()["data"]
            user_id = user_data["id"]

            # Login to get token
            login_payload = {"identifier": email, "password": "Password123!"}
            login_resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
            token = login_resp.json()["data"]["access_token"]

            self.tokens[user_id] = token
            self.users[user_id] = {"role": role, "finca_id": finca_id, "token": token}
            self.role_to_user_id[role] = user_id
            log_test(f"Create User {role}", True, f"User created (ID: {user_id})")
            return user_id
        else:
            log_test(f"Create User {role}", False, f"Failed: {response.text}")
            return None

    def test_permission(self, user_id, entity, action, expected_success=True):
        user = self.users[user_id]
        token = user["token"]
        headers = {"Authorization": f"Bearer {token}"}

        url = f"{BASE_URL}/{entity}"
        if action == "read":
            resp = requests.get(url, headers=headers)
        elif action == "create":
            payload = {
                "record": f"AUDIT-{random_string(4).upper()}",
                "sex": "Macho",
                "birth_date": "2023-01-01",
                "weight": 250.5,
                "breeds_id": 1,
                "status": "Vivo"
            }
            resp = requests.post(url, json=payload, headers=headers)

        success = (resp.status_code < 400) if expected_success else (resp.status_code == 403)
        log_test(f"RBAC {user['role']} {action} {entity}", success, f"Got {resp.status_code}, expected {'success' if expected_success else '403'}")
        return success, resp.json() if resp.status_code < 500 else resp.text

    def test_isolation(self, user_id_a, user_id_b):
        token_a = self.users[user_id_a]["token"]
        finca_id_b = self.users[user_id_b]["finca_id"]

        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 1. User B creates an animal
        animal_payload = {
            "record": f"ISO-{random_string(4).upper()}",
            "sex": "Hembra",
            "birth_date": "2023-01-01",
            "weight": 280.0,
            "breeds_id": 1,
            "status": "Vivo"
        }
        headers_b = {"Authorization": f"Bearer {self.users[user_id_b]['token']}"}
        resp_b = requests.post(f"{BASE_URL}/animals", json=animal_payload, headers=headers_b)
        if resp_b.status_code != 201:
            log_test("Isolation", False, f"Could not create test animal in Finca B (Status {resp_b.status_code})")
            return

        animal_id_b = resp_b.json()["data"]["id"]

        # 2. User A tries to read that specific animal
        resp_a = requests.get(f"{BASE_URL}/animals/{animal_id_b}", headers=headers_a)

        # Should be 404 because of tenant isolation
        success = (resp_a.status_code == 404)
        log_test("Multi-Tenant Isolation", success, f"User A tried reading Animal from Finca B. Status: {resp_a.status_code} (Expected 404)")

def run_audit():
    audit = SystemAudit()

    print("\n--- PHASE 1: REGISTRATION ---")
    owner_trad_id, owner_trad_token = audit.register_finca(f"Audit Tradicional {random_string(4)}", "Tradicional")
    admin_educ_id, admin_educ_token = audit.register_finca(f"Audit Educativa {random_string(4)}", "Educativa")

    if not owner_trad_id or not admin_educ_id:
        print("Stopping audit due to registration failure.")
        return

    print("\n--- PHASE 2: USER CREATION ---")
    # Tradicional Roles
    capataz_id = audit.create_user(owner_trad_token, "Capataz", audit.fincas["Tradicional"])
    operario_id = audit.create_user(owner_trad_token, "Operario", audit.fincas["Tradicional"])

    # Educativa Roles
    aprendiz_id = audit.create_user(admin_educ_token, "Aprendiz", audit.fincas["Educativa"])

    print("\n--- PHASE 3: RBAC VERIFICATION ---")
    # Administrador/Propietario can do everything
    audit.test_permission(admin_educ_id, "animals", "create", True)
    audit.test_permission(owner_trad_id, "animals", "create", True)

    # Capataz: Read/Create animals
    audit.test_permission(capataz_id, "animals", "read", True)
    audit.test_permission(capataz_id, "animals", "create", True)

    # Operario: Read animals, Create NO
    audit.test_permission(operario_id, "animals", "read", True)
    audit.test_permission(operario_id, "animals", "create", False) # Expected 403

    # Aprendiz: Read animals, Create NO
    audit.test_permission(aprendiz_id, "animals", "read", True)
    audit.test_permission(aprendiz_id, "animals", "create", False) # Expected 403

    print("\n--- PHASE 4: ISOLATION VERIFICATION ---")
    audit.test_isolation(admin_educ_id, owner_trad_id)

    print("\n--- AUDIT COMPLETE ---")

if __name__ == "__main__":
    run_audit()
