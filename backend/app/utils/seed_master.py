import logging
from app import db
from app.models.finca import Finca, FarmType
from app.models.user import User, Role, ApprovalStatus
from app.models.user_finca import UserFinca
from app.models.producer_profiles import ProducerProfile, ProducerType
from app.models.territory import Territory, ConnectivityLevel
from app.models.campesino import OfflineLearningMaterial, LearningContentType
from app.models.vaccines import Vaccines, VaccineType
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app.models.foodTypes import FoodTypes
from app.models.fields import Fields, LandStatus

logger = logging.getLogger('startup')

def seed_territories():
    logger.info("🌍 Poblando territorios (Antioquia y Santander)...")
    territorios = [
        {"name": "Vereda El Jardín", "municipality": "Rionegro", "department": "Antioquia", "connectivity": ConnectivityLevel.LOW, "lat": 6.1538, "lon": -75.3741},
        {"name": "Vereda Santa Cruz", "municipality": "Vélez", "department": "Santander", "connectivity": ConnectivityLevel.LOW, "lat": 6.0125, "lon": -73.6738},
        {"name": "Vereda Cite", "municipality": "Barbosa", "department": "Santander", "connectivity": ConnectivityLevel.INTERMITTENT, "lat": 5.9287, "lon": -73.6190},
        {"name": "Vereda San Juan", "municipality": "El Peñón", "department": "Santander", "connectivity": ConnectivityLevel.NONE, "lat": 6.0500, "lon": -73.8166},
    ]
    for t in territorios:
        if not Territory.query.filter_by(name=t["name"], municipality=t["municipality"]).first():
            db.session.add(Territory(name=t["name"], municipality=t["municipality"], department=t["department"], vereda=t["name"].replace("Vereda ", ""), connectivity_level=t["connectivity"], latitude=t["lat"], longitude=t["lon"]))
    db.session.commit()

def seed_vaccines():
    """Catálogo sanitario base. Requiere que ya exista al menos una finca.

    Diseases, RouteAdministration y Vaccines llevan finca_id NOT NULL, así que
    sembrarlos antes de crear las fincas abortaba el master seed entero con
    `NOT NULL constraint failed: route_administrations.finca_id` y la instancia
    quedaba sin catálogo de vacunas.
    """
    logger.info("💉 Poblando vacunas maestras y enfermedades...")

    finca = Finca.query.order_by(Finca.id).first()
    if not finca:
        logger.warning("Sin fincas: se omite el catálogo sanitario")
        return

    enfermedades = [
        ("Aftosa", "Llagas boca/patas", "Resolución ICA Aftosa"),
        ("Brucelosis", "Abortos", "Resolución ICA Brucelosis"),
        ("Rabia Silvestre", "Ataxia, agresividad", "Zoonosis - Res. ICA"),
        ("Carbón Sintomático", "Hinchazón muscular, muerte", "Clostridium"),
        ("IBR-DVB", "Secreción nasal, abortos", "Complejo respiratorio"),
    ]
    for name, sym, det in enfermedades:
        if not Diseases.query.filter_by(name=name).first():
            Diseases.create(name=name, symptoms=sym, details=det, finca_id=finca.id)
    db.session.commit()

    for route_name in ("Intramuscular", "Subcutánea"):
        if not RouteAdministration.query.filter_by(name=route_name).first():
            RouteAdministration.create(name=route_name, finca_id=finca.id)
    db.session.commit()

    im = RouteAdministration.query.filter(RouteAdministration.name.ilike('%muscul%')).first()
    sc = RouteAdministration.query.filter(RouteAdministration.name.ilike('%subcut%')).first()
    if not im or not sc:
        return

    def get_d(n): return Diseases.query.filter_by(name=n).first()

    vacunas = [
        ("Vacuna Aftosa Bivalente", VaccineType.Inactivada, sc, "6 meses", "Plan Nacional ICA Fiebre Aftosa", "Aftosa", "2ml SC"),
        ("Brucelosis RB51", VaccineType.Atenuada, sc, "Única vez", "Plan Nacional ICA Brucelosis", "Brucelosis", "2ml SC"),
        ("Antirrábica Bovina", VaccineType.Inactivada, im, "12 meses", "Plan Nacional ICA Rabia", "Rabia Silvestre", "2ml IM"),
    ]
    for name, vtype, route, interval, plan, d_name, dosis in vacunas:
        if not Vaccines.query.filter_by(name=name).first():
            Vaccines.create(name=name, dosis=dosis, route_administration_id=route.id, vaccination_interval=interval, type=vtype, national_plan=plan, target_disease_id=get_d(d_name).id, finca_id=finca.id)
    db.session.commit()

def seed_fincas_and_users():
    logger.info("👥 Configurando ecosistema regional Vélez (SENA y Campesina)...")
    velez = Territory.query.filter_by(municipality="Vélez").first()
    barbosa = Territory.query.filter_by(municipality="Barbosa").first()

    fincas = [
        {"name": "SENA Regional Vélez - Granja Educativa", "type": FarmType.Educativa, "t_id": velez.id if velez else None, "mun": "Vélez", "dep": "Santander"},
        {"name": "Finca Ganadera Campesina", "type": FarmType.Tradicional, "t_id": barbosa.id if barbosa else None, "mun": "Barbosa", "dep": "Santander"}
    ]

    fincas_map = {}
    for f in fincas:
        fobj = Finca.query.filter_by(name=f["name"]).first()
        if not fobj:
            fobj = Finca(name=f["name"], type=f["type"], territory_id=f["t_id"], municipality=f["mun"], department=f["dep"], is_active=True)
            db.session.add(fobj)
            db.session.flush()
        fincas_map[f["name"]] = fobj

    users_data = [
        {"id": 1098, "name": "Administrador General", "email": "admin@villaluz.co", "phone": "3000001098", "role": Role.Administrador, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Institucional},
        {"id": 1001, "name": "Instructor Agro Vélez", "email": "instructor_velez@sena.edu.co", "phone": "3000000001", "role": Role.Instructor, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Institucional},
        {"id": 1002, "name": "Aprendiz SENA Uno", "email": "aprendiz_uno@sena.edu.co", "phone": "3000000002", "role": Role.Aprendiz, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Educativo},
        {"id": 1003, "name": "Capataz Eficiente", "email": "capataz@villaluz.co", "phone": "3000000005", "role": Role.Capataz, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Institucional},
        {"id": 2001, "name": "Don Carlos Ganadero", "email": "carlos_ganadero@gmail.com", "phone": "3000000003", "role": Role.Propietario, "finca": "Finca Ganadera Campesina", "ptype": ProducerType.Comercial_Pequeno},
        {"id": 2002, "name": "Marta Operaria", "email": "marta_operaria@gmail.com", "phone": "3000000004", "role": Role.Operario, "finca": "Finca Ganadera Campesina", "ptype": ProducerType.Subsistencia},
        {"id": 3001, "name": "Dr. Veterinario López", "email": "veterinario@villaluz.co", "phone": "3000000006", "role": Role.Veterinario, "finca": "Finca Ganadera Campesina", "ptype": ProducerType.Comercial_Pequeno},
    ]

    for ud in users_data:
        u = User.query.filter_by(identification=ud["id"]).first()
        if not u:
            u = User.create(
                identification=ud["id"], fullname=ud["name"], email=ud["email"],
                password="password123" if ud["role"] != Role.Administrador else "12345678",
                phone=ud["phone"], role=ud["role"], finca_id=fincas_map[ud["finca"]].id,
                status=True, approval_status=ApprovalStatus.Approved
            )
        else:
            # Update existing user to avoid phone/email conflicts if they changed
            u.email = ud["email"]
            u.fullname = ud["name"]
            u.phone = ud["phone"]
            u.finca_id = fincas_map[ud["finca"]].id
            u.role = ud["role"]
        # Asegurar membresia
        if not UserFinca.query.filter_by(user_id=u.id, finca_id=fincas_map[ud["finca"]].id).first():
            UserFinca.assign(user_id=u.id, finca_id=fincas_map[ud["finca"]].id, role=ud["role"].value)
        # Perfil Productor
        if not ProducerProfile.query.filter_by(user_id=u.id).first():
            db.session.add(ProducerProfile(user_id=u.id, producer_type=ud["ptype"], land_tenure="Propia" if ud["role"] == Role.Propietario else "Otra", notes="Onboarding Santander"))
    db.session.commit()

def seed_learning_materials():
    logger.info("📚 Configurando materiales offline iniciales...")
    velez = Territory.query.filter_by(municipality="Vélez").first()
    mats = [
        {"title": "Manual de Buenas Prácticas Ganaderas (BPG)", "category": "Sanidad Animal", "uri": ""},
        {"title": "Guía de Bienestar Animal ICA", "category": "Sanidad Animal", "uri": ""},
    ]
    for m in mats:
        if not OfflineLearningMaterial.query.filter_by(title=m["title"]).first():
            db.session.add(OfflineLearningMaterial(territory_id=velez.id if velez else None, title=m["title"], category=m["category"], content_type=LearningContentType.PDF if hasattr(LearningContentType, 'PDF') else LearningContentType.TEXT, summary=m["title"], local_uri=m["uri"]))
    db.session.commit()

def seed_feeding_infrastructure():
    logger.info("🌿 Configurando infraestructura de alimentación y potreros...")
    from datetime import date

    fincas = Finca.query.all()
    for f in fincas:
        # 1. Crear Tipos de Alimento por Finca (Requerido por el modelo)
        alimentos = [
            {"name": "Pasto Kikuyo", "management": "Pastoreo Directo"},
            {"name": "Pasto Estrella", "management": "Pastoreo Directo"},
        ]
        food_map = {}
        for a in alimentos:
            obj = FoodTypes.query.filter_by(food_type=a["name"], finca_id=f.id).first()
            if not obj:
                obj = FoodTypes.create(
                    food_type=a["name"],
                    handlings=a["management"],
                    sowing_date=date(2023, 1, 1),
                    area=1,
                    gauges="Medio",
                    finca_id=f.id
                )
            food_map[a["name"]] = obj

        # 2. Crear Potreros vinculados
        if not Fields.query.filter_by(finca_id=f.id).first():
            db.session.add(Fields(
                name="Potrero Principal", finca_id=f.id, area="2.5",
                state=LandStatus.Activo, food_type_id=food_map["Pasto Kikuyo"].id
            ))
            db.session.add(Fields(
                name="Potrero de Reserva", finca_id=f.id, area="1.5",
                state=LandStatus.Disponible, food_type_id=food_map["Pasto Estrella"].id
            ))
    db.session.commit()

def run_master_seed():
    """Ejecuta todos los seeds necesarios para que la instancia nazca 100% lista en producción."""
    try:
        from app.utils.seed_knowledge_base import seed_knowledge_base
        seed_knowledge_base()
        seed_territories()
        # Las fincas van antes del catálogo sanitario: Diseases, Vaccines y
        # RouteAdministration son tenant-scoped (finca_id NOT NULL).
        seed_fincas_and_users()
        seed_vaccines()
        seed_feeding_infrastructure()
        seed_learning_materials()
        logger.info("✅ DEPLOYMENT MASTER SEED COMPLETADO CON ÉXITO.")
    except Exception as e:
        logger.error(f"❌ Error en Master Seed: {e}")
        db.session.rollback()
