#!/usr/bin/env python3
"""
Script de Auditoría y Poblamiento de Base de Datos VillaLuz
===========================================================

Este script audita el estado de todas las tablas y poblas las vacías
usando los servicios del frontend.

Uso:
    python db_audit_and_seed.py [--audit-only] [--seed-only] [--table TABLE_NAME]

Autor: DevBrain System
Fecha: 2026-04-29
"""

import sys
import os
import json
import argparse
from datetime import datetime, date, timedelta
from random import choice, randint, uniform

# Agregar el path del backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'BackFinca'))

def get_db_status():
    """Obtener el estado actual de la base de datos"""
    from app import create_app
    from app.extensions import db
    from sqlalchemy import inspect, text

    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        result = {
            'total_tables': len(tables),
            'tables_with_data': [],
            'empty_tables': [],
            'total_records': 0,
            'timestamp': datetime.now().isoformat()
        }

        for table in sorted(tables):
            try:
                count = db.session.execute(text(f'SELECT COUNT(*) FROM {table}')).scalar()
                result['total_records'] += count

                table_info = {
                    'name': table,
                    'records': count
                }

                if count == 0:
                    result['empty_tables'].append(table_info)
                else:
                    result['tables_with_data'].append(table_info)
            except Exception as e:
                print(f"[ERROR] No se pudo consultar {table}: {e}")

        return result

def print_audit_report(status: dict):
    """Imprimir reporte de auditoría"""
    print("\n" + "="*70)
    print("📊 REPORTE DE AUDITORÍA - BASE DE DATOS VILLALUZ")
    print("="*70)
    print(f"Fecha: {status['timestamp']}")
    print(f"Total de tablas: {status['total_tables']}")
    print(f"Tablas con datos: {len(status['tables_with_data'])}")
    print(f"Tablas vacías: {len(status['empty_tables'])}")
    print(f"Total de registros: {status['total_records']}")

    print("\n" + "-"*70)
    print("✅ TABLAS CON DATOS:")
    print("-"*70)
    for table in status['tables_with_data']:
        print(f"  ✓ {table['name']}: {table['records']} registros")

    if status['empty_tables']:
        print("\n" + "-"*70)
        print("⚠️  TABLAS VACÍAS (requieren atención):")
        print("-"*70)
        for table in status['empty_tables']:
            print(f"  ⚠ {table['name']}: {table['records']} registros")

    print("\n" + "="*70)

def seed_animal_images(app, db):
    """Poblar tabla animal_images"""
    from app.models import Animals
    from app.models.animal_images import AnimalImages

    print("\n📸 [1/10] Poblando animal_images...")

    animals = Animals.query.limit(10).all()
    if not animals:
        print("  ⚠ No hay animales para asignar imágenes")
        return 0

    sample_images = [
        {'filename': 'vaca_001.jpg', 'filepath': '/uploads/animals/vaca_001.jpg', 'mime_type': 'image/jpeg'},
        {'filename': 'vaca_002.jpg', 'filepath': '/uploads/animals/vaca_002.jpg', 'mime_type': 'image/jpeg'},
        {'filename': 'toro_001.jpg', 'filepath': '/uploads/animals/toro_001.jpg', 'mime_type': 'image/jpeg'},
        {'filename': 'ternero_001.jpg', 'filepath': '/uploads/animals/ternero_001.jpg', 'mime_type': 'image/jpeg'},
    ]

    created = 0
    for i, animal in enumerate(animals):
        img_data = sample_images[i % len(sample_images)].copy()
        img_data['animal_id'] = animal.id
        img_data['finca_id'] = animal.finca_id
        img_data['is_primary'] = (i == 0)
        img_data['file_size'] = randint(50000, 500000)

        try:
            AnimalImages.create(**img_data)
            created += 1
        except Exception as e:
            print(f"  ⚠ Error creando imagen para animal {animal.id}: {e}")

    print(f"  ✅ Creadas {created} imágenes de animales")
    return created

def seed_milk_production(app, db):
    """Poblar tabla milk_production"""
    from app.models import Animals
    from app.models.animals import AnimalStatus
    from app.models.milk_production import MilkProduction, MilkSession

    print("\n🥛 [2/10] Poblando milk_production...")

    # Buscar hembras vivas
    animals = Animals.query.filter(
        Animals.sex == 'Hembra',
        Animals.status == AnimalStatus.Vivo
    ).limit(5).all()

    if not animals:
        print("  ⚠ No se encontraron hembras para producción de leche")
        return 0

    created = 0
    sessions = [MilkSession.AM, MilkSession.PM]

    for animal in animals:
        # Crear registros de los últimos 7 días
        for days_ago in range(7):
            for session in sessions:
                try:
                    record_date = date.today() - timedelta(days=days_ago)
                    MilkProduction.create(
                        animal_id=animal.id,
                        finca_id=animal.finca_id,
                        date=record_date,
                        liters=round(uniform(5.0, 25.0), 2),
                        milking_session=session,
                        fat_percentage=round(uniform(3.0, 5.0), 2),
                        protein_percentage=round(uniform(3.0, 4.0), 2),
                        somatic_cells=randint(100000, 500000),
                        notes=f"Ordeño {session.value} - {record_date}"
                    )
                    created += 1
                except Exception as e:
                    print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creados {created} registros de producción láctea")
    return created

def seed_reproductive_events(app, db):
    """Poblar tabla reproductive_events"""
    from app.models import Animals
    from app.models.animals import AnimalStatus
    from app.models.reproduction import ReproductiveEvent, EventType, InseminationTechnique

    print("\n🐄 [3/10] Poblando reproductive_events...")

    # Buscar hembras
    females = Animals.query.filter(
        Animals.sex == 'Hembra',
        Animals.status == AnimalStatus.Vivo
    ).limit(5).all()

    # Buscar machos
    males = Animals.query.filter(
        Animals.sex == 'Macho',
        Animals.status == AnimalStatus.Vivo
    ).limit(3).all()

    if not females:
        print("  ⚠ No se encontraron hembras para eventos reproductivos")
        return 0

    created = 0

    for female in females:
        try:
            # Evento de celo
            ReproductiveEvent.create(
                animal_id=female.id,
                event_type=EventType.Celo,
                event_date=date.today() - timedelta(days=30),
                finca_id=female.finca_id,
                notes="Celo detectado por comportamiento"
            )
            created += 1

            # Evento de inseminación
            sire = choice(males) if males else None
            ReproductiveEvent.create(
                animal_id=female.id,
                event_type=EventType.Inseminacion,
                event_date=date.today() - timedelta(days=25),
                sire_id=sire.id if sire else None,
                technique=InseminationTechnique.Artificial,
                finca_id=female.finca_id,
                notes="Inseminación artificial"
            )
            created += 1

            # Evento de diagnóstico
            ReproductiveEvent.create(
                animal_id=female.id,
                event_type=EventType.Diagnostico,
                event_date=date.today() - timedelta(days=10),
                diagnosis_result='Positivo',
                finca_id=female.finca_id,
                notes="Diagnóstico positivo de preñez"
            )
            created += 1

        except Exception as e:
            print(f"  ⚠ Error creando eventos: {e}")

    print(f"  ✅ Creados {created} eventos reproductivos")
    return created

def seed_offspring(app, db):
    """Poblar tabla offspring"""
    from app.models import Animals
    from app.models.reproduction import ReproductiveEvent, Offspring, EventType

    print("\n🐮 [4/10] Poblando offspring...")

    # Buscar eventos de parto o crear uno
    events = ReproductiveEvent.query.filter_by(event_type=EventType.Parto).all()

    if not events:
        # Crear un evento de parto
        mothers = Animals.query.filter(Animals.sex == 'Hembra').limit(3).all()
        for mother in mothers:
            try:
                event = ReproductiveEvent.create(
                    animal_id=mother.id,
                    event_type=EventType.Parto,
                    event_date=date.today() - timedelta(days=30),
                    finca_id=mother.finca_id,
                    alive_count=1,
                    dead_count=0,
                    notes="Parto normal"
                )
                events.append(event)
            except Exception as e:
                print(f"  ⚠ Error creando evento de parto: {e}")

    created = 0
    for event in events:
        try:
            Offspring.create(
                birth_event_id=event.id,
                sex=choice(['Macho', 'Hembra']),
                alive=True,
                birth_weight=randint(25, 45),
                notes="Cría saludable"
            )
            created += 1
        except Exception as e:
            print(f"  ⚠ Error creando offspring: {e}")

    print(f"  ✅ Creados {created} registros de crías")
    return created

def seed_transactions(app, db):
    """Poblar tabla transactions"""
    from app.models import Animals
    from app.models.financial import Transaction, TransactionType, TransactionCategory

    print("\n💰 [5/10] Poblando transactions...")

    animals = Animals.query.limit(5).all()
    finca_id = animals[0].finca_id if animals else 1

    transactions_data = [
        {'type': TransactionType.Income, 'category': TransactionCategory.Milk, 'amount': 2500000, 'desc': 'Venta mensual de leche'},
        {'type': TransactionType.Income, 'category': TransactionCategory.Animal, 'amount': 3500000, 'desc': 'Venta de novilla'},
        {'type': TransactionType.Expense, 'category': TransactionCategory.Food, 'amount': 800000, 'desc': 'Compra de concentrado'},
        {'type': TransactionType.Expense, 'category': TransactionCategory.Medication, 'amount': 450000, 'desc': 'Vacunación general'},
        {'type': TransactionType.Expense, 'category': TransactionCategory.Service, 'amount': 600000, 'desc': 'Servicio veterinario'},
        {'type': TransactionType.Expense, 'category': TransactionCategory.Other, 'amount': 200000, 'desc': 'Mantenimiento de potreros'},
    ]

    created = 0
    for i, trans in enumerate(transactions_data):
        try:
            Transaction.create(
                finca_id=finca_id,
                animal_id=animals[i % len(animals)].id if animals else None,
                transaction_type=trans['type'],
                category=trans['category'],
                amount=trans['amount'],
                date=date.today() - timedelta(days=i*5),
                description=trans['desc']
            )
            created += 1
        except Exception as e:
            print(f"  ⚠ Error creando transacción: {e}")

    print(f"  ✅ Creadas {created} transacciones financieras")
    return created

def seed_inventory_movements(app, db):
    """Poblar tabla inventory_movements"""
    from app.models.inventory import InventoryLot, InventoryMovement, MovementType

    print("\n📦 [6/10] Poblando inventory_movements...")

    lots = InventoryLot.query.limit(5).all()
    if not lots:
        print("  ⚠ No hay lotes de inventario")
        return 0

    created = 0
    movement_types = [MovementType.Salida, MovementType.Ajuste]

    for lot in lots:
        try:
            InventoryMovement.create(
                lot_id=lot.id,
                movement_type=choice(movement_types),
                quantity=randint(1, 5),
                reference_type='treatment',
                reference_id=randint(1, 10),
                notes=f"Movimiento automático para lote {lot.lot_number}",
                finca_id=lot.finca_id
            )
            created += 1
        except Exception as e:
            print(f"  ⚠ Error creando movimiento: {e}")

    print(f"  ✅ Creados {created} movimientos de inventario")
    return created

def seed_user_finca(app, db):
    """Poblar tabla user_finca"""
    from app.models import User, Finca
    from app.models.user_finca import UserFinca

    print("\n👥 [7/10] Poblando user_finca...")

    users = User.query.all()
    fincas = Finca.query.all()

    if not users or not fincas:
        print("  ⚠ No hay usuarios o fincas suficientes")
        return 0

    created = 0
    roles = ['Administrador', 'Capataz', 'Operario', 'Veterinario']

    for user in users:
        for finca in fincas:
            # Verificar si ya existe
            existing = UserFinca.query.filter_by(user_id=user.id, finca_id=finca.id).first()
            if not existing:
                try:
                    UserFinca.assign(
                        user_id=user.id,
                        finca_id=finca.id,
                        role=choice(roles),
                        is_active=True,
                        is_primary=(finca.id == user.finca_id)
                    )
                    created += 1
                except Exception as e:
                    print(f"  ⚠ Error asignando usuario {user.id} a finca {finca.id}: {e}")

    print(f"  ✅ Creadas {created} relaciones usuario-finca")
    return created

def seed_treatment_medications(app, db):
    """Poblar tabla treatment_medications"""
    from app.models import Treatments, Medications
    from app.models.treatment_medications import TreatmentMedications

    print("\n💊 [8/10] Poblando treatment_medications...")

    treatments = Treatments.query.limit(10).all()
    medications = Medications.query.limit(10).all()

    if not treatments or not medications:
        print("  ⚠ No hay tratamientos o medicamentos suficientes")
        return 0

    created = 0
    for i, treatment in enumerate(treatments):
        med = medications[i % len(medications)]
        try:
            # Verificar si ya existe
            existing = TreatmentMedications.query.filter_by(
                treatment_id=treatment.id,
                medication_id=med.id
            ).first()

            if not existing:
                TreatmentMedications.create(
                    treatment_id=treatment.id,
                    medication_id=med.id
                )
                created += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creadas {created} relaciones tratamiento-medicamento")
    return created

def seed_treatment_vaccines(app, db):
    """Poblar tabla treatment_vaccines"""
    from app.models import Treatments, Vaccines
    from app.models.treatment_vaccines import TreatmentVaccines

    print("\n💉 [9/10] Poblando treatment_vaccines...")

    treatments = Treatments.query.limit(10).all()
    vaccines = Vaccines.query.limit(10).all()

    if not treatments or not vaccines:
        print("  ⚠ No hay tratamientos o vacunas suficientes")
        return 0

    created = 0
    for i, treatment in enumerate(treatments):
        vaccine = vaccines[i % len(vaccines)]
        try:
            # Verificar si ya existe
            existing = TreatmentVaccines.query.filter_by(
                treatment_id=treatment.id,
                vaccine_id=vaccine.id
            ).first()

            if not existing:
                TreatmentVaccines.create(
                    treatment_id=treatment.id,
                    vaccine_id=vaccine.id
                )
                created += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creadas {created} relaciones tratamiento-vacuna")
    return created

def seed_livestock_summary(app, db):
    """Poblar tabla livestock_summary"""
    from app.models import Finca
    from app.models.livestock_summary import LivestockSummary

    print("\n📈 [10/10] Poblando livestock_summary...")

    fincas = Finca.query.all()
    created = 0

    for finca in fincas:
        try:
            summary = LivestockSummary.get_for_finca(finca.id)
            summary.recalculate()
            created += 1
        except Exception as e:
            print(f"  ⚠ Error calculando resumen para finca {finca.id}: {e}")

    print(f"  ✅ Calculados {created} resúmenes de ganado")
    return created

def seed_all_tables():
    """Poblar todas las tablas vacías"""
    from app import create_app
    from app.extensions import db

    app = create_app()

    with app.app_context():
        print("\n" + "="*70)
        print("🌱 INICIANDO POBLAMIENTO DE TABLAS")
        print("="*70)

        # Poblado de tablas principales
        results = {
            'animal_images': seed_animal_images(app, db),
            'milk_production': seed_milk_production(app, db),
            'reproductive_events': seed_reproductive_events(app, db),
            'offspring': seed_offspring(app, db),
            'transactions': seed_transactions(app, db),
            'inventory_movements': seed_inventory_movements(app, db),
            'user_finca': seed_user_finca(app, db),
            'treatment_medications': seed_treatment_medications(app, db),
            'treatment_vaccines': seed_treatment_vaccines(app, db),
            'livestock_summary': seed_livestock_summary(app, db),
        }

        # Poblado de tablas adicionales
        extra_results = {
            'activity_daily_agg': seed_activity_daily_agg(app, db),
            'chat_messages': seed_chat_messages(app, db),
            'membership_request': seed_membership_requests(app, db),
            'push_subscription': seed_push_subscriptions(app, db),
            'user_locations': seed_user_locations(app, db),
        }

        results.update(extra_results)
        total_created = sum(results.values())

        print("\n" + "="*70)
        print("📊 RESUMEN DE POBLAMIENTO")
        print("="*70)
        for table, count in results.items():
            status = "✅" if count > 0 else "⚠️"
            print(f"{status} {table}: {count} registros")
        print("-"*70)
        print(f"🎯 TOTAL: {total_created} registros creados")
        print("="*70)

        return results

def seed_activity_daily_agg(app, db):
    """Poblar tabla activity_daily_agg"""
    from app.models import User, Animals
    from app.models.activity_daily_agg import ActivityDailyAgg

    print("\n📊 [Extra 1/5] Poblando activity_daily_agg...")

    # Hacer rollback si hay transacción pendiente
    db.session.rollback()

    users = User.query.limit(4).all()
    animals = Animals.query.limit(5).all()

    entities_actions = [
        ('animals', 'create', 'info'),
        ('treatments', 'create', 'info'),
        ('vaccinations', 'create', 'info'),
    ]

    created = 0
    # Solo crear un registro por combinación única
    existing_keys = set()

    for i in range(3):  # Solo 3 días para evitar duplicados
        agg_date = date.today() - timedelta(days=i)
        for user in users:
            for entity, action, severity in entities_actions:
                animal_id = choice(animals).id if animals else 0

                # Crear clave única
                key = (agg_date, user.id, entity, action, severity, animal_id)
                if key in existing_keys:
                    continue
                existing_keys.add(key)

                try:
                    # Verificar si ya existe en BD
                    existing = ActivityDailyAgg.query.filter_by(
                        date=agg_date,
                        actor_id=user.id,
                        entity=entity,
                        action=action,
                        severity=severity,
                        animal_id=animal_id
                    ).first()

                    if not existing:
                        agg = ActivityDailyAgg(
                            date=agg_date,
                            actor_id=user.id,
                            entity=entity,
                            action=action,
                            severity=severity,
                            animal_id=animal_id,
                            count=randint(1, 10),
                            finca_id=user.finca_id
                        )
                        db.session.add(agg)
                        db.session.commit()
                        created += 1
                except Exception as e:
                    db.session.rollback()
                    print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creados {created} registros de agregación diaria")
    return created

def seed_chat_messages(app, db):
    """Poblar tabla chat_messages"""
    from app.models import User, Finca
    from app.models.chat_message import ChatMessage

    print("\n💬 [Extra 2/5] Poblando chat_messages...")

    users = User.query.limit(4).all()
    fincas = Finca.query.all()

    if len(users) < 2:
        print("  ⚠ Se necesitan al menos 2 usuarios para chat")
        return 0

    sample_messages = [
        "Hola, ¿cómo va el ordeño hoy?",
        "Todo bien, ya terminamos en el potrero 3",
        "Perfecto, gracias por avisar",
        "Hay una vaca que parece tener problemas",
        "Voy a revisarla ahora mismo",
        "¿Ya le dieron el medicamento a la novilla?",
        "Sí, ya fue aplicada la vacuna",
    ]

    created = 0
    finca_id = fincas[0].id if fincas else 1

    for i in range(10):
        sender = users[i % len(users)]
        recipient = users[(i + 1) % len(users)]
        try:
            msg = ChatMessage(
                finca_id=finca_id,
                sender_id=sender.id,
                recipient_id=recipient.id,
                message=choice(sample_messages),
                is_read=(i < 5)  # Primeros 5 leídos
            )
            db.session.add(msg)
            created += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")

    db.session.commit()
    print(f"  ✅ Creados {created} mensajes de chat")
    return created

def seed_membership_requests(app, db):
    """Poblar tabla membership_request"""
    from app.models import User, Finca
    from app.models.membership_request import MembershipRequest, RequestStatus

    print("\n📝 [Extra 3/5] Poblando membership_request...")

    users = User.query.limit(4).all()
    fincas = Finca.query.all()

    if not users or not fincas:
        print("  ⚠ No hay usuarios o fincas suficientes")
        return 0

    roles = ['Operario', 'Veterinario', 'Capataz']
    statuses = [RequestStatus.Pending, RequestStatus.Approved, RequestStatus.Rejected]

    created = 0
    for user in users:
        finca = fincas[0]  # Primera finca
        try:
            # Verificar si ya existe
            existing = MembershipRequest.query.filter_by(
                user_id=user.id,
                finca_id=finca.id
            ).first()

            if not existing:
                MembershipRequest.create(
                    user_id=user.id,
                    finca_id=finca.id,
                    status=choice(statuses),
                    requested_role=choice(roles),
                    message="Solicito unirme a esta finca para colaborar"
                )
                created += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creadas {created} solicitudes de membresía")
    return created

def seed_push_subscriptions(app, db):
    """Poblar tabla push_subscription"""
    from app.models import User
    from app.models.push_subscription import PushSubscription

    print("\n🔔 [Extra 4/5] Poblando push_subscription...")

    users = User.query.limit(4).all()

    browsers = ['chrome', 'firefox', 'edge']
    platforms = ['desktop', 'mobile']

    created = 0
    for user in users:
        browser = choice(browsers)
        platform = choice(platforms)
        try:
            PushSubscription.create(
                user_id=user.id,
                endpoint=f'https://fcm.googleapis.com/fake-endpoint-{user.id}-{randint(1000,9999)}',
                p256dh='BIPUL' + 'A' * 50,
                auth='aBCd' + 'E' * 20,
                user_agent=f'Mozilla/5.0 ({platform}) {browser}/100.0',
                platform=platform,
                browser=browser
            )
            created += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")

    print(f"  ✅ Creadas {created} suscripciones push")
    return created

def seed_user_locations(app, db):
    """Poblar tabla user_locations"""
    from app.models import User, Finca
    from app.models.user_location import UserLocation

    print("\n📍 [Extra 5/5] Poblando user_locations...")

    users = User.query.limit(4).all()
    fincas = Finca.query.all()

    if not users or not fincas:
        print("  ⚠ No hay usuarios o fincas suficientes")
        return 0

    # Coordenadas aproximadas para Colombia
    base_lat = 4.5
    base_lon = -74.2

    created = 0
    for user in users:
        finca = fincas[0]
        for i in range(3):  # 3 ubicaciones por usuario
            try:
                loc = UserLocation(
                    user_id=user.id,
                    finca_id=finca.id,
                    latitude=base_lat + uniform(-0.1, 0.1),
                    longitude=base_lon + uniform(-0.1, 0.1),
                    accuracy=uniform(5, 50),
                    detection_method=choice(['GPS', 'Mesh_Proximity']),
                    reported_by_node_id=f'node-{randint(1, 5)}'
                )
                db.session.add(loc)
                created += 1
            except Exception as e:
                print(f"  ⚠ Error: {e}")

    db.session.commit()
    print(f"  ✅ Creadas {created} ubicaciones de usuarios")
    return created

def main():
    parser = argparse.ArgumentParser(description='Auditoría y Poblamiento de BD VillaLuz')
    parser.add_argument('--audit-only', action='store_true', help='Solo auditar, no poblar')
    parser.add_argument('--seed-only', action='store_true', help='Solo poblar, no auditar inicial')
    parser.add_argument('--table', type=str, help='Poblar solo una tabla específica')

    args = parser.parse_args()

    if args.table:
        # Poblar solo una tabla
        from app import create_app
        from app.extensions import db
        app = create_app()
        with app.app_context():
            seed_functions = {
                'animal_images': seed_animal_images,
                'milk_production': seed_milk_production,
                'reproductive_events': seed_reproductive_events,
                'offspring': seed_offspring,
                'transactions': seed_transactions,
                'inventory_movements': seed_inventory_movements,
                'user_finca': seed_user_finca,
                'treatment_medications': seed_treatment_medications,
                'treatment_vaccines': seed_treatment_vaccines,
                'livestock_summary': seed_livestock_summary,
                'activity_daily_agg': seed_activity_daily_agg,
                'chat_messages': seed_chat_messages,
                'membership_request': seed_membership_requests,
                'push_subscription': seed_push_subscriptions,
                'user_locations': seed_user_locations,
            }
            if args.table in seed_functions:
                count = seed_functions[args.table](app, db)
                print(f"\n✅ Tabla {args.table}: {count} registros creados")
            else:
                print(f"\n❌ Tabla {args.table} no encontrada")
                print(f"Tablas disponibles: {', '.join(seed_functions.keys())}")
    elif args.seed_only:
        # Solo poblar
        seed_all_tables()
    elif args.audit_only:
        # Solo auditar
        status = get_db_status()
        print_audit_report(status)

        # Guardar reporte en JSON
        report_path = 'db_audit_report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(status, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Reporte guardado en: {report_path}")
    else:
        # Auditoría completa + Poblamiento
        print("="*70)
        print("🔍 AUDITORÍA INICIAL")
        print("="*70)
        initial_status = get_db_status()
        print_audit_report(initial_status)

        if initial_status['empty_tables']:
            # Poblar tablas vacías
            seed_all_tables()

            # Auditoría final
            print("\n" + "="*70)
            print("🔍 AUDITORÍA FINAL")
            print("="*70)
            final_status = get_db_status()
            print_audit_report(final_status)

            # Comparar resultados
            initial_empty = len(initial_status['empty_tables'])
            final_empty = len(final_status['empty_tables'])

            print("\n" + "="*70)
            print("📊 COMPARACIÓN")
            print("="*70)
            print(f"Tablas vacías inicial: {initial_empty}")
            print(f"Tablas vacías final: {final_empty}")
            print(f"Tablas pobladas: {initial_empty - final_empty}")
            print("="*70)
        else:
            print("\n✨ Todas las tablas ya tienen datos. No se requiere poblamiento.")

if __name__ == '__main__':
    main()
