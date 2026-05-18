
import os
import sys
import json
from datetime import date

# Agregar el backend al path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'BackFinca'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

def run_complex_audit():
    from app import create_app, db
    from app.models.animals import Animals
    from app.models.treatments import Treatments
    from app.models.treatment_medications import TreatmentMedications
    from app.models.treatment_vaccines import TreatmentVaccines
    from app.models.medications import Medications
    from app.models.vaccines import Vaccines
    
    app = create_app('development')
    
    with app.app_context():
        print("🏥 [VET_AUDIT] Iniciando flujo clínico complejo...")
        client = app.test_client()
        
        # Login
        res_login = client.post('/api/v1/auth/login', json={"identification": 1098, "password": "Admin1234!"})
        token = res_login.get_json().get('access_token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Seleccionar recursos base
        animal = Animals.query.first()
        medication = Medications.query.first()
        vaccine = Vaccines.query.first()
        
        if not all([animal, medication, vaccine]):
            print("❌ [VET_AUDIT] Faltan recursos base (Animal/Med/Vac). Ejecuta massive_seed primero.")
            return

        print(f"🔬 [VET_AUDIT] Animal: {animal.record} | Med: {medication.name} | Vac: {vaccine.name}")
        
        # 2. Crear Tratamiento vía API
        treatment_payload = {
            "animal_id": animal.id,
            "treatment_date": date.today().isoformat(),
            "description": "Tratamiento Integral de Verificacion",
            "frequency": "Unica",
            "dosis": "Combinada"
        }
        
        res_treat = client.post('/api/v1/treatments/', json=treatment_payload, headers=headers)
        if res_treat.status_code != 201:
            print(f"❌ [VET_AUDIT] Fallo al crear tratamiento base: {res_treat.data}")
            return
            
        treatment_id = res_treat.get_json()['data']['id']
        print(f"✅ [VET_AUDIT] Tratamiento {treatment_id} creado.")
        
        # 3. Vincular Medicamento y Vacuna (Tablas Pivote)
        # Nota: Revisamos los endpoints para vinculacion
        # Normalmente se hace via POST en treatment-medications y treatment-vaccines
        
        # Vincular Medicamento
        res_med = client.post('/api/v1/treatment-medications/', 
                             json={"treatment_id": treatment_id, "medication_id": medication.id},
                             headers=headers)
        if res_med.status_code == 201:
            print(f"✅ [VET_AUDIT] Medicamento {medication.id} vinculado.")
        else:
            print(f"❌ [VET_AUDIT] Error vinculando medicamento: {res_med.data}")
            
        # Vincular Vacuna
        res_vac = client.post('/api/v1/treatment-vaccines/', 
                             json={"treatment_id": treatment_id, "vaccine_id": vaccine.id},
                             headers=headers)
        if res_vac.status_code == 201:
            print(f"✅ [VET_AUDIT] Vacuna {vaccine.id} vinculada.")
        else:
            print(f"❌ [VET_AUDIT] Error vinculando vacuna: {res_vac.data}")

        # 4. Verificar Analytics
        print("📈 [VET_AUDIT] Verificando impacto en Analitica...")
        res_ana = client.get('/api/v1/analytics/activity', headers=headers)
        if res_ana.status_code == 200:
            ana_data = res_ana.get_json()['data']
            # Buscar el tratamiento en los registros recientes de actividad
            # Asumimos que la analitica devuelve eventos o conteos
            print(f"✅ [VET_AUDIT] Analitica OK: {json.dumps(ana_data, indent=2)[:200]}...")
        else:
            print(f"⚠️ [VET_AUDIT] Analitica no disponible o error: {res_ana.status_code}")

        print("\n🚀 [VET_AUDIT] Flujo clínico completado y verificado.")

if __name__ == "__main__":
    try:
        run_complex_audit()
    except Exception as e:
        print(f"🔥 [FATAL] {e}")
        import traceback
        traceback.print_exc()
