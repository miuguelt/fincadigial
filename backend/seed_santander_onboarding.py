#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, os, requests
from datetime import date, timedelta
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.finca import Finca, FarmType
from app.models.user import User, Role, ApprovalStatus
from app.models.user_finca import UserFinca
from app.models.producer_profiles import ProducerProfile, ProducerType
from app.models.territory import Territory
from app.models.campesino import OfflineLearningMaterial, LearningContentType

def download_pdf(url, filename):
    try:
        static_dir = os.path.join(os.path.dirname(__file__), 'static', 'uploads', 'learning')
        os.makedirs(static_dir, exist_ok=True)
        filepath = os.path.join(static_dir, filename)
        
        # Si ya existe, no volver a descargar
        if os.path.exists(filepath):
            return f"/static/uploads/learning/{filename}"
            
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return f"/static/uploads/learning/{filename}"
    except Exception as e:
        print(f"    ⚠ Error descargando PDF {filename}: {e}")
    return None

def seed_onboarding_santander():
    app = create_app()
    with app.app_context():
        print("\n" + "="*60)
        print("🌱 ONBOARDING SANTANDER (Provincia de Vélez)")
        print("="*60)

        # 1. Obtener territorios de Santander (creados en Sprint 1 update)
        velez = Territory.query.filter_by(municipality="Vélez").first()
        barbosa = Territory.query.filter_by(municipality="Barbosa").first()

        if not velez or not barbosa:
            print("❌ No se encontraron territorios de Santander. Ejecute Sprint 1 primero.")
            return

        # 2. Crear Fincas
        fincas_data = [
            {"name": "SENA Regional Vélez - Granja Educativa", "type": FarmType.Educativa, "territory_id": velez.id, "municipality": "Vélez", "department": "Santander"},
            {"name": "Finca La Panelera Campesina", "type": FarmType.Tradicional, "territory_id": barbosa.id, "municipality": "Barbosa", "department": "Santander"},
        ]
        
        fincas_creadas = {}
        for fd in fincas_data:
            f = Finca.query.filter_by(name=fd["name"]).first()
            if not f:
                f = Finca(name=fd["name"], type=fd["type"], territory_id=fd["territory_id"], municipality=fd["municipality"], department=fd["department"], is_active=True)
                db.session.add(f)
                db.session.flush()
            fincas_creadas[fd["name"]] = f

        # 3. Crear Usuarios y Asignarlos
        usuarios_data = [
            # SENA
            {"id": 1001, "name": "Instructor Agro Vélez", "email": "instructor_velez@sena.edu.co", "phone": "3000000001", "role": Role.Instructor, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Institucional},
            {"id": 1002, "name": "Aprendiz SENA Uno", "email": "aprendiz_uno@sena.edu.co", "phone": "3000000002", "role": Role.Aprendiz, "finca": "SENA Regional Vélez - Granja Educativa", "ptype": ProducerType.Educativo},
            # Rural
            {"id": 2001, "name": "Don Carlos Panelero", "email": "carlos_panelero@gmail.com", "phone": "3000000003", "role": Role.Propietario, "finca": "Finca La Panelera Campesina", "ptype": ProducerType.Comercial_Pequeno},
            {"id": 2002, "name": "Marta Operaria", "email": "marta_operaria@gmail.com", "phone": "3000000004", "role": Role.Operario, "finca": "Finca La Panelera Campesina", "ptype": ProducerType.Subsistencia},
        ]

        users_dict = {}
        for ud in usuarios_data:
            u = User.query.filter_by(email=ud["email"]).first()
            finca = fincas_creadas[ud["finca"]]
            if not u:
                u = User.create(
                    identification=ud["id"], fullname=ud["name"], email=ud["email"],
                    password="password123", phone=ud["phone"], role=ud["role"], finca_id=finca.id,
                    status=True, approval_status=ApprovalStatus.Approved
                )
            users_dict[ud["email"]] = u
            
            # Asignar a Finca (si no está ya asignado por create())
            if not UserFinca.query.filter_by(user_id=u.id, finca_id=finca.id).first():
                UserFinca.assign(user_id=u.id, finca_id=finca.id, role=ud["role"].value)
                
            # Crear perfil de productor
            if not ProducerProfile.query.filter_by(user_id=u.id).first():
                pp = ProducerProfile(user_id=u.id, producer_type=ud["ptype"], land_tenure="Propia" if ud["role"] == Role.Propietario else "Otra", notes="Perfil Onboarding Santander")
                db.session.add(pp)
                
        # Asignar supervisor: Instructor supervisa al aprendiz
        instructor = users_dict["instructor_velez@sena.edu.co"]
        aprendiz = users_dict["aprendiz_uno@sena.edu.co"]
        uf_aprendiz = UserFinca.query.filter_by(user_id=aprendiz.id, finca_id=fincas_creadas["SENA Regional Vélez - Granja Educativa"].id).first()
        if uf_aprendiz:
            uf_aprendiz.supervisor_id = instructor.id

        db.session.commit()
        print("  ✅ Fincas y Usuarios Creados.")

        # 4. Materiales Educativos (PDFs)
        print("\n📚 Descargando y registrando Materiales Offline (PDFs)...")
        materiales = [
            {
                "title": "Manual de Buenas Prácticas Ganaderas",
                "category": "Sanidad Animal",
                "url": "https://www.ica.gov.co/getattachment/3b1b9e28-2b81-432d-b570-3d7f4fb2cba8/Manual-de-Buenas-Practicas-Ganaderas.pdf.aspx",
                "filename": "manual_bpg_ica.pdf",
                "summary": "Guía oficial del ICA para buenas prácticas en la producción ganadera."
            },
            {
                "title": "Guía Técnica: Cultivo de Caña Panelera",
                "category": "Agricultura",
                "url": "https://repository.agrosavia.co/bitstream/handle/20.500.12324/13606/43088_55877.pdf",
                "filename": "guia_cana_panelera.pdf",
                "summary": "Manual técnico de Agrosavia para el cultivo y manejo de la caña panelera."
            }
        ]

        for m in materiales:
            uri = download_pdf(m["url"], m["filename"])
            if uri:
                existing_mat = OfflineLearningMaterial.query.filter_by(title=m["title"]).first()
                if not existing_mat:
                    mat = OfflineLearningMaterial(
                        territory_id=velez.id,
                        title=m["title"],
                        category=m["category"],
                        content_type=LearningContentType.PDF if hasattr(LearningContentType, 'PDF') else LearningContentType.DOCUMENT,
                        summary=m["summary"],
                        local_uri=uri,
                        language="es"
                    )
                    db.session.add(mat)
                    print(f"    ✓ {m['title']} registrado ({uri})")
        
        db.session.commit()
        print("="*60)
        print("✅ ONBOARDING SANTANDER COMPLETADO")

if __name__ == "__main__":
    seed_onboarding_santander()
