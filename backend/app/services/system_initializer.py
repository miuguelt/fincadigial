import logging
from datetime import date
from app import db
from app.models.species import Species
from app.models.breeds import Breeds
from app.models.diseases import Diseases
from app.models.vaccines import Vaccines, VaccineType
from app.models.medications import Medications
from app.models.route_administration import RouteAdministration
from app.models.finca import Finca, FarmType
from app.models.user import User, Role, ApprovalStatus
from werkzeug.security import generate_password_hash
from app.services.default_alert_configs import seed_default_configs_for_finca

logger = logging.getLogger(__name__)

def run_core_initialization():
    """
    Inicializa los catálogos base del sistema (especies, razas, enfermedades, etc.)
    que son comunes a todas las fincas.
    """
    logger.info("Iniciando inicialización de datos base del sistema...")
    
    try:
        # 0. Finca y Usuario por Defecto (Bootstrap)
        default_finca = Finca.query.filter_by(id=1).first()
        if not default_finca:
            default_finca = Finca(
                id=1,
                name="Finca Villa Luz (Default)",
                type=FarmType.Educativa,
                nit="900.123.456-1",
                ica_registration="REG-ICA-25001-2024",
                municipality="Prueba",
                department="Cundinamarca",
                address="Vereda El Centro"
            )
            db.session.add(default_finca)
            db.session.flush()
            logger.info("Finca por defecto creada (ID: 1)")

        default_user = User.query.filter_by(email="instructor@finca.com").first()
        if not default_user:
            default_user = User(
                identification=11111111,
                fullname="Administrador del Sistema",
                email="instructor@finca.com",
                phone="3001234567",
                role=Role.Instructor,
                password=generate_password_hash("Instructor1234!"),
                status=True,
                approval_status=ApprovalStatus.Approved,
                finca_id=default_finca.id
            )
            db.session.add(default_user)
            logger.info("Usuario instructor por defecto creado: instructor@finca.com")

        admin_user = User.query.filter_by(email="admin@villaluz.com").first()
        if not admin_user:
            admin_user = User(
                identification=12345678,
                fullname="Admin VillaLuz E2E",
                email="admin@villaluz.com",
                phone="3009998881",
                role=Role.Administrador,
                password=generate_password_hash("test123"),
                status=True,
                approval_status=ApprovalStatus.Approved,
                finca_id=default_finca.id
            )
            db.session.add(admin_user)

        op_user = User.query.filter_by(email="op1@villaluz.com").first()
        if not op_user:
            op_user = User(
                identification=11112222,
                fullname="Operario VillaLuz E2E",
                email="op1@villaluz.com",
                phone="3009998882",
                role=Role.Operario,
                password=generate_password_hash("test123"),
                status=True,
                approval_status=ApprovalStatus.Approved,
                finca_id=default_finca.id
            )
            db.session.add(op_user)

        # 1. Especies y Razas
        species_data = {
            "Bovino": ["Holstein", "Angus", "Simmental", "Brahman", "Cebú", "Jersey", "Normando", "Gyr", "Guzerat"],
            "Porcino": ["Duroc", "Landrace", "Hampshire", "Yorkshire", "Pietrain"],
            "Equino": ["Cuarto de Milla", "Paso Fino", "Árabe", "Pura Sangre", "Appaloosa"],
            "Caprino": ["Saanen", "Alpina", "Toggenburg", "Boer"]
        }
        
        for s_name, breeds in species_data.items():
            species = Species.query.filter_by(name=s_name).first()
            if not species:
                species = Species(name=s_name)
                db.session.add(species)
                db.session.flush() # Para obtener el ID
                logger.info(f"Especie creada: {s_name}")
            
            for b_name in breeds:
                if not Breeds.query.filter_by(name=b_name, species_id=species.id).first():
                    db.session.add(Breeds(name=b_name, species_id=species.id))
                    logger.debug(f"Raza creada: {b_name} ({s_name})")

        # 2. Rutas de Administración
        routes = [
            {"name": "Intramuscular", "description": "Inyección en el músculo profundo."},
            {"name": "Subcutánea", "description": "Inyección bajo la piel."},
            {"name": "Intravenosa", "description": "Inyección directa en vena."},
            {"name": "Oral", "description": "Administración por la boca (bebible o sólida)."},
            {"name": "Tópica", "description": "Aplicación sobre la piel o mucosas externas."},
            {"name": "Intramamaria", "description": "Administración a través del pezón (uñas)."},
        ]
        for r in routes:
            if not RouteAdministration.query.filter_by(name=r["name"]).first():
                db.session.add(RouteAdministration(**r))
                logger.info(f"Ruta de administración creada: {r['name']}")
        
        db.session.flush()
        im_route = RouteAdministration.query.filter_by(name="Intramuscular").first()
        sc_route = RouteAdministration.query.filter_by(name="Subcutánea").first()

        # 3. Enfermedades Comunes (Ganadería Colombiana)
        diseases_data = [
            {"name": "Fiebre Aftosa", "symptoms": "Fiebre, vesículas en boca y patas", "details": "Viral, notificación obligatoria ICA."},
            {"name": "Brucelosis", "symptoms": "Abortos, esterilidad", "details": "Bacteriana zoonótica, control oficial."},
            {"name": "Mastitis", "symptoms": "Inflamación ubre, leche anormal", "details": "Infección de la glándula mamaria."},
            {"name": "Rabin Silvestre", "symptoms": "Parálisis, agresividad, muerte", "details": "Viral transmitida por murciélagos hematófagos."},
            {"name": "Carbón Bacteridiano", "symptoms": "Muerte súbita, sangre por orificios", "details": "Bacillus anthracis, alta resistencia."},
            {"name": "Clostridiosis", "symptoms": "Edemas, enfisema, muerte rápida", "details": "Complejo clostridial (Mancha, Edema)."},
            {"name": "Anaplasmosis/Babesiosis", "symptoms": "Anemia, ictericia, fiebre", "details": "Hemoparásitos transmitidos por garrapatas."},
        ]
        for dd in diseases_data:
            if not Diseases.query.filter_by(name=dd["name"]).first():
                db.session.add(Diseases(**dd))
                logger.info(f"Enfermedad registrada: {dd['name']}")
        
        db.session.flush()
        aftosa_dis = Diseases.query.filter_by(name="Fiebre Aftosa").first()
        brucelosis_dis = Diseases.query.filter_by(name="Brucelosis").first()
        clostridiosis_dis = Diseases.query.filter_by(name="Clostridiosis").first()

        # 4. Vacunas del Plan Sanitario Nacional
        vaccines_data = [
            {"name": "Vacuna Antiaftosa (Ciclo ICA)", "dosis": "2ml", "route_administration_id": im_route.id if im_route else None,
             "vaccination_interval": "6 meses", "type": VaccineType.Inactivada, "national_plan": "Si", "target_disease_id": aftosa_dis.id if aftosa_dis else None},
            {"name": "Vacuna Brucelosis (RB51 / Cepa 19)", "dosis": "2ml", "route_administration_id": sc_route.id if sc_route else None,
             "vaccination_interval": "Única (terneras)", "type": VaccineType.Atenuada, "national_plan": "Si", "target_disease_id": brucelosis_dis.id if brucelosis_dis else None},
            {"name": "Vacuna Triple (Carbón, Edema, Septicemia)", "dosis": "5ml", "route_administration_id": sc_route.id if sc_route else None,
             "vaccination_interval": "Anual", "type": VaccineType.Toxoide, "national_plan": "No", "target_disease_id": clostridiosis_dis.id if clostridiosis_dis else None},
        ]
        for vd in vaccines_data:
            if not Vaccines.query.filter_by(name=vd["name"]).first():
                db.session.add(Vaccines(**vd))
                logger.info(f"Vacuna registrada: {vd['name']}")

        # 5. Medicamentos Básicos
        meds_data = [
            {"name": "Ivermectina 1%", "description": "Antiparasitario de amplio espectro.", "route_administration_id": sc_route.id if sc_route else None},
            {"name": "Oxitetraciclina", "description": "Antibiótico de amplio espectro.", "route_administration_id": im_route.id if im_route else None},
            {"name": "Complejo B + B12", "description": "Reconstituyente vitamínico.", "route_administration_id": im_route.id if im_route else None},
        ]
        for md in meds_data:
            if not Medications.query.filter_by(name=md["name"]).first():
                db.session.add(Medications(**md))
                logger.info(f"Medicamento registrado: {md['name']}")

        db.session.commit()
        logger.info("Inicialización de datos base completada exitosamente.")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error durante la inicialización de datos base: {e}")
        raise e

def initialize_finca_defaults(finca_id: int):
    """
    Asegura que una finca tenga todas las configuraciones predeterminadas (alertas, etc.)
    """
    try:
        seed_default_configs_for_finca(finca_id)
        logger.info(f"Configuraciones predeterminadas aplicadas a finca {finca_id}")
    except Exception as e:
        logger.error(f"Error al inicializar defaults para finca {finca_id}: {e}")
