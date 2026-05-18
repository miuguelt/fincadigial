#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sprint 1 - Seed de Datos Base VillaLuz
=======================================
1. Territorios (veredas/municipios colombianos)
2. Vacunas completas (todas las del calendario KB)
3. Usuarios con roles (Propietario, Capataz, Operario, Veterinario)
4. Asignación de animales a potreros (animal_fields)
"""

import sys, os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.territory import Territory, ConnectivityLevel
from app.models.vaccines import Vaccines, VaccineType
from app.models.route_administration import RouteAdministration
from app.models.diseases import Diseases
from app.models.user import User, Role, ApprovalStatus
from app.models.user_finca import UserFinca
from app.models.finca import Finca
from app.models.animals import Animals
from app.models.fields import Fields
from app.models.animalFields import AnimalFields


def seed_territories(app):
    """Poblar territorios rurales colombianos representativos"""
    print("\n🌍 [1/4] Poblando territories...")

    territorios = [
        {
            "name": "Vereda El Jardín",
            "municipality": "Rionegro",
            "department": "Antioquia",
            "vereda": "El Jardín",
            "connectivity": ConnectivityLevel.LOW,
            "latitude": 6.1538, "longitude": -75.3741,
        },
        {
            "name": "Vereda La Palma",
            "municipality": "Marinilla",
            "department": "Antioquia",
            "vereda": "La Palma",
            "connectivity": ConnectivityLevel.NONE,
            "latitude": 6.1751, "longitude": -75.3317,
        },
        {
            "name": "Vereda San Isidro",
            "municipality": "El Carmen de Viboral",
            "department": "Antioquia",
            "vereda": "San Isidro",
            "connectivity": ConnectivityLevel.LOW,
            "latitude": 6.0881, "longitude": -75.3460,
        },
        {
            "name": "Vereda Las Mercedes",
            "municipality": "Guarne",
            "department": "Antioquia",
            "vereda": "Las Mercedes",
            "connectivity": ConnectivityLevel.INTERMITTENT,
            "latitude": 6.2769, "longitude": -75.4491,
        },
        {
            "name": "Vereda Tres Esquinas",
            "municipality": "Fredonia",
            "department": "Antioquia",
            "vereda": "Tres Esquinas",
            "connectivity": ConnectivityLevel.NONE,
            "latitude": 5.9337, "longitude": -75.6742,
        },
        # Region Santander (Provincia de Vélez y aledaños)
        {
            "name": "Vereda Santa Cruz",
            "municipality": "Vélez",
            "department": "Santander",
            "vereda": "Santa Cruz",
            "connectivity": ConnectivityLevel.LOW,
            "latitude": 6.0125, "longitude": -73.6738,
        },
        {
            "name": "Vereda Cite",
            "municipality": "Barbosa",
            "department": "Santander",
            "vereda": "Cite",
            "connectivity": ConnectivityLevel.INTERMITTENT,
            "latitude": 5.9287, "longitude": -73.6190,
        },
        {
            "name": "Vereda San Juan",
            "municipality": "El Peñón",
            "department": "Santander",
            "vereda": "San Juan",
            "connectivity": ConnectivityLevel.NONE,
            "latitude": 6.0500, "longitude": -73.8166,
        },
        {
            "name": "Vereda Puerto Olaya",
            "municipality": "Cimitarra",
            "department": "Santander",
            "vereda": "Puerto Olaya",
            "connectivity": ConnectivityLevel.LOW,
            "latitude": 6.3117, "longitude": -73.9667,
        },
        {
            "name": "Vereda El Centro",
            "municipality": "Landázuri",
            "department": "Santander",
            "vereda": "El Centro",
            "connectivity": ConnectivityLevel.NONE,
            "latitude": 6.2250, "longitude": -73.8122,
        },
    ]

    created = 0
    for t in territorios:
        existing = Territory.query.filter_by(
            name=t["name"], municipality=t["municipality"]
        ).first()
        if not existing:
            terr = Territory(
                name=t["name"],
                municipality=t["municipality"],
                department=t["department"],
                vereda=t["vereda"],
                connectivity_level=t["connectivity"],
                latitude=t["latitude"],
                longitude=t["longitude"],
            )
            db.session.add(terr)
            created += 1
    db.session.commit()

    # Vincular la finca al primer territorio via SQL directo
    finca = Finca.query.first()
    territory = Territory.query.first()
    if finca and territory:
        try:
            db.session.execute(
                db.text("UPDATE finca SET territory_id = :tid WHERE id = :fid AND (territory_id IS NULL OR territory_id = 0)"),
                {"tid": territory.id, "fid": finca.id}
            )
            db.session.commit()
        except Exception:
            db.session.rollback()

    print(f"  ✅ {created} territorios creados | Finca → {territory.name if territory else '?'}")
    return created


def seed_vaccines_complete(app):
    """Poblar todas las vacunas referenciadas en el calendario KB"""
    print("\n💉 [2/4] Poblando vacunas completas (KB-sync)...")

    # Paso 0 — crear enfermedades que faltan para ser target de vacunas
    enfermedades_extra = [
        ("Rabia Silvestre",        "Sialorrea, ataxia, agresividad o parálisis progresiva", "Zoonosis viral por Desmodus rotundus — Res. ICA 001279/2006"),
        ("Carbón Sintomático",     "Cojera súbita, hinchazón muscular caliente, muerte rápida", "Clostridiosis por Clostridium chauvoei en suelos contaminados"),
        ("IBR-DVB",                "Secreción nasal, conjuntivitis, abortos, neumonía", "Rinotraqueítis Infecciosa Bovina + Diarrea Viral Bovina"),
        ("Leptospirosis",          "Abortos tardíos, ictericia, disminución leche", "Infección bacteriana zoonótica Leptospira spp."),
        ("Deficiencia Vitamínica", "Ceguera nocturna, baja inmunidad, retardo reproductivo", "Deficiencia ADE en pasturas pobres"),
    ]
    for name, symptoms, details in enfermedades_extra:
        if not Diseases.query.filter_by(name=name).first():
            try:
                Diseases.create(name=name, symptoms=symptoms, details=details)
                print(f"    + Enfermedad creada: {name}")
            except Exception as e:
                db.session.rollback()
                print(f"    ⚠ Enfermedad {name}: {e}")

    db.session.commit()

    # Paso 1 — rutas de administración
    im = RouteAdministration.query.filter(RouteAdministration.name.ilike('%muscul%')).first()
    sc = RouteAdministration.query.filter(RouteAdministration.name.ilike('%subcutan%')).first()

    if not im or not sc:
        print("  ❌ Rutas de administración no encontradas. Verifique seed_initial_data.")
        return 0

    def get_d(name):
        return Diseases.query.filter_by(name=name).first()

    # fallback por si alguna enfermedad falló
    fallback_disease = get_d("Aftosa") or Diseases.query.first()

    # Enumeración válida: Atenuada, Inactivada, Toxoide, Subunidad, Conjugada, Recombinante, Adn, Arn
    vacunas_kb = [
        # (nombre, VaccineType, ruta, intervalo, plan, nombre_enfermedad, dosis)
        ("Vacuna Aftosa Bivalente",         VaccineType.Inactivada,  sc,  "6 meses",                "Plan Nacional ICA Fiebre Aftosa",    "Aftosa",              "2ml SC"),
        ("Brucelosis RB51",                  VaccineType.Atenuada,    sc,  "Única vez (3-8 meses)", "Plan Nacional ICA Brucelosis",       "Brucelosis",          "2ml SC"),
        ("Antirrábica Bovina",               VaccineType.Inactivada,  im,  "12 meses",              "Plan Nacional ICA Rabia",            "Rabia Silvestre",     "2ml IM"),
        ("Clostridial Carbón Sintomático",   VaccineType.Inactivada,  sc,  "12 meses",              "Preventivo FEDEGAN",                 "Carbón Sintomático",  "2ml SC"),
        ("IBR-DVB Bivalente",                VaccineType.Inactivada,  im,  "12 meses",              "Preventivo FEDEGAN",                 "IBR-DVB",             "5ml IM"),
        ("Leptovac Leptospirosis",           VaccineType.Inactivada,  sc,  "6 meses",               "Preventivo SENA",                   "Leptospirosis",       "5ml SC"),
        ("Vitamina ADE Inyectable",           VaccineType.Subunidad,   im,  "6 meses",               "Suplementación SENA",               "Deficiencia Vitamínica", "5ml IM"),
    ]

    created = 0
    for name, vtype, route, interval, plan, disease_name, dosis in vacunas_kb:
        if Vaccines.query.filter_by(name=name).first():
            continue

        disease = get_d(disease_name) or fallback_disease
        try:
            Vaccines.create(
                name=name,
                dosis=dosis,
                route_administration_id=route.id,
                vaccination_interval=interval,
                type=vtype,
                national_plan=plan,
                target_disease_id=disease.id,
            )
            created += 1
            print(f"    ✓ {name}")
        except Exception as e:
            db.session.rollback()
            print(f"    ⚠ Error con {name}: {e}")

    db.session.commit()
    total = Vaccines.query.count()
    print(f"  ✅ {created} vacunas nuevas | Total en DB: {total}")
    return created


def seed_users_with_roles(app):
    """Crear usuarios con todos los roles del sistema"""
    print("\n👥 [3/4] Poblando usuarios con roles...")

    finca = Finca.query.first()
    if not finca:
        print("  ❌ No hay finca. Abortar.")
        return 0

    usuarios = [
        {
            "identification": 11111111,
            "fullname": "Carlos Propietario",
            "email": "propietario@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3101111111",
            "role": Role.Propietario,
        },
        {
            "identification": 22222222,
            "fullname": "Pedro Capataz",
            "email": "capataz@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3102222222",
            "role": Role.Capataz,
        },
        {
            "identification": 33333333,
            "fullname": "María Operaria",
            "email": "operaria@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3103333333",
            "role": Role.Operario,
        },
        {
            "identification": 44444444,
            "fullname": "Dr. Martínez Veterinario",
            "email": "veterinario@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3104444444",
            "role": Role.Veterinario,
        },
        {
            "identification": 55555555,
            "fullname": "Juan Instructor SENA",
            "email": "instructor@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3105555555",
            "role": Role.Instructor,
        },
        {
            "identification": 66666666,
            "fullname": "Ana Aprendiz SENA",
            "email": "aprendiz@villaluz.com",
            "password": "DevMiguel2024!",
            "phone": "3106666666",
            "role": Role.Aprendiz,
        },
    ]

    created = 0
    for u_data in usuarios:
        existing = User.query.filter_by(email=u_data["email"]).first()
        if not existing:
            try:
                user = User.create(
                    identification=u_data["identification"],
                    fullname=u_data["fullname"],
                    email=u_data["email"],
                    password=u_data["password"],
                    phone=u_data["phone"],
                    role=u_data["role"],
                    finca_id=finca.id,
                    status=True,
                    approval_status=ApprovalStatus.Approved,
                )
                created += 1
                print(f"    ✓ {user.fullname} ({user.role.value})")
            except Exception as e:
                db.session.rollback()
                print(f"    ⚠ Error con {u_data['email']}: {e}")

    total = User.query.count()
    print(f"  ✅ {created} usuarios creados | Total en DB: {total}")
    return created


def seed_animal_fields(app):
    """Asignar animales a potreros"""
    print("\n🌾 [4/4] Asignando animales a potreros...")

    animals = Animals.query.filter_by(is_deleted=False).all()
    fields = Fields.query.filter_by(
        finca_id=Finca.query.first().id,
        is_deleted=False
    ).all()

    if not animals:
        print("  ⚠ No hay animales para asignar.")
        return 0
    if not fields:
        print("  ⚠ No hay potreros disponibles.")
        return 0

    created = 0
    potrero_principal = next(
        (f for f in fields if "Principal" in f.name), fields[0]
    )

    for i, animal in enumerate(animals):
        # Verificar si ya tiene potrero activo
        existing = AnimalFields.query.filter_by(
            animal_id=animal.id,
            removal_date=None
        ).first()

        if not existing:
            field = fields[i % len(fields)]
            try:
                af = AnimalFields.create(
                    animal_id=animal.id,
                    field_id=field.id,
                    finca_id=animal.finca_id,
                    assignment_date=date.today() - timedelta(days=30),
                )
                created += 1
                print(f"    ✓ {animal.record} → {field.name}")
            except Exception as e:
                db.session.rollback()
                print(f"    ⚠ Error asignando {animal.record}: {e}")

    print(f"  ✅ {created} asignaciones animal↔potrero creadas")
    return created


def run_sprint1():
    app = create_app()
    with app.app_context():
        print("\n" + "="*60)
        print("🚀 SPRINT 1 — SEED DE DATOS BASE VILLALUZ")
        print("="*60)

        t = seed_territories(app)
        v = seed_vaccines_complete(app)
        u = seed_users_with_roles(app)
        a = seed_animal_fields(app)

        print("\n" + "="*60)
        print("📊 RESUMEN SPRINT 1")
        print("="*60)
        print(f"  🌍 Territorios:  {t}")
        print(f"  💉 Vacunas:      {v}")
        print(f"  👥 Usuarios:     {u}")
        print(f"  🌾 Asignaciones: {a}")
        print("="*60)
        total = t + v + u + a
        print(f"  🎯 TOTAL REGISTROS CREADOS: {total}")
        print("="*60)


if __name__ == "__main__":
    run_sprint1()

