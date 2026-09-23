import logging
import os
import secrets
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
from app.utils.seed_identities import get_seed_identity

logger = logging.getLogger("startup")


def seed_territories():
    logger.info("🌍 Poblando territorios (Antioquia y Santander)...")
    territorios = [
        {
            "name": "Vereda El Jardín",
            "municipality": "Rionegro",
            "department": "Antioquia",
            "connectivity": ConnectivityLevel.LOW,
            "lat": 6.1538,
            "lon": -75.3741,
        },
        {
            "name": "Vereda Santa Cruz",
            "municipality": "Vélez",
            "department": "Santander",
            "connectivity": ConnectivityLevel.LOW,
            "lat": 6.0125,
            "lon": -73.6738,
        },
        {
            "name": "Vereda Cite",
            "municipality": "Barbosa",
            "department": "Santander",
            "connectivity": ConnectivityLevel.INTERMITTENT,
            "lat": 5.9287,
            "lon": -73.6190,
        },
        {
            "name": "Vereda San Juan",
            "municipality": "El Peñón",
            "department": "Santander",
            "connectivity": ConnectivityLevel.NONE,
            "lat": 6.0500,
            "lon": -73.8166,
        },
    ]
    for t in territorios:
        if not Territory.query.filter_by(
            name=t["name"], municipality=t["municipality"]
        ).first():
            db.session.add(
                Territory(
                    name=t["name"],
                    municipality=t["municipality"],
                    department=t["department"],
                    vereda=t["name"].replace("Vereda ", ""),
                    connectivity_level=t["connectivity"],
                    latitude=t["lat"],
                    longitude=t["lon"],
                )
            )
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

    im = RouteAdministration.query.filter(
        RouteAdministration.name.ilike("%muscul%")
    ).first()
    sc = RouteAdministration.query.filter(
        RouteAdministration.name.ilike("%subcut%")
    ).first()
    if not im or not sc:
        return

    def get_d(n):
        return Diseases.query.filter_by(name=n).first()

    vacunas = [
        (
            "Vacuna Aftosa Bivalente",
            VaccineType.Inactivada,
            sc,
            "6 meses",
            "Plan Nacional ICA Fiebre Aftosa",
            "Aftosa",
            "2ml SC",
        ),
        (
            "Brucelosis RB51",
            VaccineType.Atenuada,
            sc,
            "Única vez",
            "Plan Nacional ICA Brucelosis",
            "Brucelosis",
            "2ml SC",
        ),
        (
            "Antirrábica Bovina",
            VaccineType.Inactivada,
            im,
            "12 meses",
            "Plan Nacional ICA Rabia",
            "Rabia Silvestre",
            "2ml IM",
        ),
    ]
    for name, vtype, route, interval, plan, d_name, dosis in vacunas:
        if not Vaccines.query.filter_by(name=name).first():
            Vaccines.create(
                name=name,
                dosis=dosis,
                route_administration_id=route.id,
                vaccination_interval=interval,
                type=vtype,
                national_plan=plan,
                target_disease_id=get_d(d_name).id,
                finca_id=finca.id,
            )
    db.session.commit()


SENA_FINCA = "SENA Regional Vélez - Granja Educativa"
CAMPESINA_FINCA = "Finca Ganadera Campesina"

# Reparto del ecosistema regional: qué finca y qué tipo de productor le toca a
# cada rol. Documento, correo y nombre salen de la tabla canónica de identidades,
# porque el seeder de arranque borra a quien ocupe un correo objetivo con otro
# documento.
_MASTER_ASSIGNMENTS = [
    (Role.Administrador, "3000001098", SENA_FINCA, ProducerType.Institucional),
    (Role.Instructor, "3000000001", SENA_FINCA, ProducerType.Institucional),
    (Role.Aprendiz, "3000000002", SENA_FINCA, ProducerType.Educativo),
    (Role.Capataz, "3000000005", SENA_FINCA, ProducerType.Institucional),
    (Role.Propietario, "3000000003", CAMPESINA_FINCA, ProducerType.Comercial_Pequeno),
    (Role.Operario, "3000000004", CAMPESINA_FINCA, ProducerType.Subsistencia),
    (Role.Veterinario, "3000000006", CAMPESINA_FINCA, ProducerType.Comercial_Pequeno),
]


def build_master_user_profiles():
    """Devuelve el elenco regional con las identidades canónicas resueltas."""
    profiles = []
    for role, phone, finca, producer_type in _MASTER_ASSIGNMENTS:
        identity = get_seed_identity(role.value)
        profiles.append(
            {
                "id": identity["identification"],
                "name": identity["fullname"],
                "email": identity["email"],
                "phone": phone,
                "role": role,
                "finca": finca,
                "ptype": producer_type,
            }
        )
    return profiles


def seed_fincas_and_users():
    logger.info("👥 Configurando ecosistema regional Vélez (SENA y Campesina)...")
    admin_password = (
        os.getenv("SEED_ADMIN_PASSWORD")
        or os.getenv("ADMIN_PASSWORD")
        or secrets.token_urlsafe(24)
    )
    user_password = (
        os.getenv("SEED_USER_PASSWORD")
        or os.getenv("TEST_USER_PASSWORD")
        or secrets.token_urlsafe(24)
    )
    velez = Territory.query.filter_by(municipality="Vélez").first()
    barbosa = Territory.query.filter_by(municipality="Barbosa").first()

    fincas = [
        {
            "name": "SENA Regional Vélez - Granja Educativa",
            "type": FarmType.Educativa,
            "t_id": velez.id if velez else None,
            "mun": "Vélez",
            "dep": "Santander",
        },
        {
            "name": "Finca Ganadera Campesina",
            "type": FarmType.Tradicional,
            "t_id": barbosa.id if barbosa else None,
            "mun": "Barbosa",
            "dep": "Santander",
        },
    ]

    fincas_map = {}
    for f in fincas:
        fobj = Finca.query.filter_by(name=f["name"]).first()
        if not fobj:
            fobj = Finca(
                name=f["name"],
                type=f["type"],
                territory_id=f["t_id"],
                municipality=f["mun"],
                department=f["dep"],
                is_active=True,
            )
            db.session.add(fobj)
            db.session.flush()
        fincas_map[f["name"]] = fobj

    for ud in build_master_user_profiles():
        u = User.query.filter_by(identification=ud["id"]).first()
        if not u:
            u = User.create(
                identification=ud["id"],
                fullname=ud["name"],
                email=ud["email"],
                password=admin_password
                if ud["role"] == Role.Administrador
                else user_password,
                phone=ud["phone"],
                role=ud["role"],
                finca_id=fincas_map[ud["finca"]].id,
                status=True,
                approval_status=ApprovalStatus.Approved,
            )
        else:
            # Update existing user to avoid phone/email conflicts if they changed
            u.email = ud["email"]
            u.fullname = ud["name"]
            u.phone = ud["phone"]
            u.finca_id = fincas_map[ud["finca"]].id
            u.role = ud["role"]
        # Asegurar membresia
        if not UserFinca.query.filter_by(
            user_id=u.id, finca_id=fincas_map[ud["finca"]].id
        ).first():
            UserFinca.assign(
                user_id=u.id, finca_id=fincas_map[ud["finca"]].id, role=ud["role"].value
            )
        # Perfil Productor
        if not ProducerProfile.query.filter_by(user_id=u.id).first():
            db.session.add(
                ProducerProfile(
                    user_id=u.id,
                    producer_type=ud["ptype"],
                    land_tenure="Propia" if ud["role"] == Role.Propietario else "Otra",
                    notes="Onboarding Santander",
                )
            )
    db.session.commit()


def seed_learning_materials():
    logger.info("📚 Configurando materiales offline iniciales con literatura oficial colombiana...")
    velez = Territory.query.filter_by(municipality="Vélez").first()
    territory_id = velez.id if velez else None

    official_materials = [
        {
            "title": "Guía ICA de Buenas Prácticas Ganaderas (BPG) en Bovinos",
            "category": "Sanidad y Bioseguridad",
            "content_type": LearningContentType.PDF,
            "reading_level": "Técnico y Mayordomos",
            "summary": "Guía oficial del ICA con los requisitos sanitarios, control de botiquín, registro de medicamentos con tiempos de retiro y bioseguridad para certificación en BPG (Resolución 068167).",
            "uri": "https://www.ica.gov.co",
        },
        {
            "title": "Manual de Ganadería Bovina de Doble Propósito: Excelencia Sanitaria (AGROSAVIA)",
            "category": "Sanidad y Bioseguridad",
            "content_type": LearningContentType.PDF,
            "reading_level": "Productores y Mayordomos",
            "summary": "Publicación técnica de AGROSAVIA orientada a la medicina preventiva en hatos de doble propósito, control integral de parásitos y manejo sanitario del lote.",
            "uri": "https://repository.agrosavia.co",
        },
        {
            "title": "Cartilla de Aforo de Praderas y Manejo de Pasturas (FEDEGÁN - FNG)",
            "category": "Pastos y Aforo",
            "content_type": LearningContentType.PDF,
            "reading_level": "Práctico de Campo",
            "summary": "Metodología del marco de 1 metro cuadrado para estimar la oferta de forraje verde, cálculo de capacidad de carga animal y rotación técnica de potreros.",
            "uri": "https://www.fedegan.org.co",
        },
        {
            "title": "Buenas Prácticas en el Ordeño y Rutina Higiénica de la Leche (SENA - ICA)",
            "category": "Ordeño y Calidad",
            "content_type": LearningContentType.PDF,
            "reading_level": "Operarios y Ordeñadores",
            "summary": "Paso a paso de la rutina de ordeño limpio: despunte en tazón de fondo negro, prueba de mastitis CMT, lavado y secado con toalla individual y sellado de pezones.",
            "uri": "https://repositorio.sena.edu.co",
        },
        {
            "title": "Manual de Ensilaje Artesanal y Conservación de Forrajes (FEDEGÁN)",
            "category": "Nutrición y Forrajes",
            "content_type": LearningContentType.PDF,
            "reading_level": "Práctico de Campo",
            "summary": "Técnicas de picado, compactación anaeróbica y sellado en bolsa plástica o trinchera para conservar pastos de corte, maíz y sorgo forrajero ante sequías.",
            "uri": "https://www.fedegan.org.co",
        },
        {
            "title": "Establecimiento y Manejo de Sistemas Silvopastoriles Intensivos (CIPAV)",
            "category": "Sistemas Sostenibles",
            "content_type": LearningContentType.PDF,
            "reading_level": "General y Técnico",
            "summary": "Guía de campo para la siembra de bancos forrajeros con Botón de Oro (Tithonia diversifolia) y Matarratón (Gliricidia sepium), cercas vivas y sombrío en potreros.",
            "uri": "https://www.cipav.org.co",
        },
        {
            "title": "Guía de Atención del Ternero Neonato y Manejo del Calostro (AGROSAVIA - ICA)",
            "category": "Cría y Reproducción",
            "content_type": LearningContentType.PDF,
            "reading_level": "Mayordomos y Vaqueros",
            "summary": "Protocolo de desinfección de ombligo con tintura de yodo al 7%, calostrado antes de las primeras 4 horas de vida y prevención de diarreas neonatales.",
            "uri": "https://repository.agrosavia.co",
        },
        {
            "title": "Protección y Cosecha de Agua en Fincas Ganaderas (CIPAV - FAO)",
            "category": "Agua y Clima",
            "content_type": LearningContentType.PDF,
            "reading_level": "General",
            "summary": "Manejo y protección de nacimientos de agua, cosecha de lluvia, desinfección de bebederos y acueductos ganaderos para garantizar agua limpia al ganado.",
            "uri": "https://www.cipav.org.co",
        },
    ]

    for m in official_materials:
        existing = OfflineLearningMaterial.query.filter_by(title=m["title"]).first()
        if not existing:
            # También verificar por títulos similares heredados
            db.session.add(
                OfflineLearningMaterial(
                    territory_id=territory_id,
                    title=m["title"],
                    category=m["category"],
                    content_type=m["content_type"],
                    summary=m["summary"],
                    local_uri=m["uri"],
                    reading_level=m["reading_level"],
                    language="es",
                    is_active=True,
                )
            )
        elif not existing.local_uri or existing.local_uri == "":
            existing.local_uri = m["uri"]
            existing.summary = m["summary"]
            existing.reading_level = m["reading_level"]
            existing.category = m["category"]

    # Limpiar o enriquecer los registros heredados antiguos si existen con URI vacía
    legacy_bpg = OfflineLearningMaterial.query.filter_by(title="Manual de Buenas Prácticas Ganaderas (BPG)").first()
    if legacy_bpg and (not legacy_bpg.local_uri or legacy_bpg.local_uri == ""):
        legacy_bpg.local_uri = "https://www.ica.gov.co"
        legacy_bpg.summary = "Requisitos oficiales del ICA para la inocuidad en la producción primaria de carne y leche bovina."
        legacy_bpg.reading_level = "Técnico y Mayordomos"

    legacy_ica = OfflineLearningMaterial.query.filter_by(title="Guía de Bienestar Animal ICA").first()
    if legacy_ica and (not legacy_ica.local_uri or legacy_ica.local_uri == ""):
        legacy_ica.local_uri = "https://www.ica.gov.co"
        legacy_ica.summary = "Pautas oficiales para el trato compasivo, instalaciones seguras, transporte y manejo sin dolor del ganado bovino."
        legacy_ica.reading_level = "Mayordomos y Vaqueros"

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
                    finca_id=f.id,
                )
            food_map[a["name"]] = obj

        # 2. Crear Potreros vinculados
        if not Fields.query.filter_by(finca_id=f.id).first():
            db.session.add(
                Fields(
                    name="Potrero Principal",
                    finca_id=f.id,
                    area="2.5",
                    state=LandStatus.Activo,
                    food_type_id=food_map["Pasto Kikuyo"].id,
                )
            )
            db.session.add(
                Fields(
                    name="Potrero de Reserva",
                    finca_id=f.id,
                    area="1.5",
                    state=LandStatus.Disponible,
                    food_type_id=food_map["Pasto Estrella"].id,
                )
            )
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
