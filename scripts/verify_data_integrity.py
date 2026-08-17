#!/usr/bin/env python3
"""
Verificación de Integridad Referencial - VillaLuz
================================================

Script para verificar que los datos poblados mantienen integridad referencial
y cumplen con las reglas de negocio.

Uso:
    python verify_data_integrity.py [--full] [--table TABLE]

Autor: DevBrain System
Fecha: 2026-04-29
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def verify_milk_production():
    """Verificar integridad de producción láctea"""
    from app import create_app
    from app.extensions import db
    from app.models import Animals, MilkProduction
    from app.models.animals import AnimalStatus

    app = create_app()
    with app.app_context():
        print("\n🥛 Verificando MilkProduction...")

        issues = []

        # 1. Verificar que todos los animal_id existen
        orphaned = (
            db.session.query(MilkProduction)
            .filter(~MilkProduction.animal_id.in_(db.session.query(Animals.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} registros con animal_id huérfano")

        # 2. Verificar que solo hembras tienen producción
        males_with_milk = (
            db.session.query(MilkProduction)
            .join(Animals, MilkProduction.animal_id == Animals.id)
            .filter(Animals.sex == "Macho")
            .count()
        )

        if males_with_milk > 0:
            issues.append(f"⚠ {males_with_milk} machos con producción de leche")

        # 3. Verificar animales no vivos
        dead_with_milk = (
            db.session.query(MilkProduction)
            .join(Animals, MilkProduction.animal_id == Animals.id)
            .filter(Animals.status != AnimalStatus.Vivo)
            .count()
        )

        if dead_with_milk > 0:
            issues.append(f"⚠ {dead_with_milk} animales muertos/vendidos con producción")

        # 4. Verificar valores negativos
        negative_liters = MilkProduction.query.filter(MilkProduction.liters < 0).count()
        if negative_liters > 0:
            issues.append(f"⚠ {negative_liters} registros con litros negativos")

        # Resumen
        total = MilkProduction.query.count()
        if not issues:
            print(f"  ✅ {total} registros válidos")
            return {"table": "milk_production", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} registros, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {
                "table": "milk_production",
                "status": "WARNING",
                "count": total,
                "issues": issues,
            }


def verify_reproductive_events():
    """Verificar integridad de eventos reproductivos"""
    from app import create_app
    from app.extensions import db
    from app.models import Animals
    from app.models.reproduction import ReproductiveEvent, EventType

    app = create_app()
    with app.app_context():
        print("\n🐄 Verificando ReproductiveEvents...")

        issues = []

        # 1. Verificar animal_id existen
        orphaned = (
            db.session.query(ReproductiveEvent)
            .filter(~ReproductiveEvent.animal_id.in_(db.session.query(Animals.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} eventos con animal_id huérfano")

        # 2. Verificar que sire_id existe si está presente
        orphaned_sires = (
            db.session.query(ReproductiveEvent)
            .filter(
                ReproductiveEvent.sire_id != None,
                ~ReproductiveEvent.sire_id.in_(db.session.query(Animals.id)),
            )
            .count()
        )

        if orphaned_sires > 0:
            issues.append(f"⚠ {orphaned_sires} eventos con sire_id huérfano")

        # 3. Verificar técnicas válidas para inseminaciones
        invalid_tech = (
            db.session.query(ReproductiveEvent)
            .filter(
                ReproductiveEvent.event_type == EventType.Inseminacion,
                ReproductiveEvent.technique == None,
            )
            .count()
        )

        if invalid_tech > 0:
            issues.append(f"⚠ {invalid_tech} inseminaciones sin técnica")

        # 4. Verificar diagnósticos con resultado
        pending_diags = (
            db.session.query(ReproductiveEvent)
            .filter(
                ReproductiveEvent.event_type == EventType.Diagnostico,
                ReproductiveEvent.diagnosis_result == None,
            )
            .count()
        )

        if pending_diags > 0:
            issues.append(f"⚠ {pending_diags} diagnósticos sin resultado")

        total = ReproductiveEvent.query.count()
        if not issues:
            print(f"  ✅ {total} eventos válidos")
            return {"table": "reproductive_events", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} eventos, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {
                "table": "reproductive_events",
                "status": "WARNING",
                "count": total,
                "issues": issues,
            }


def verify_offspring():
    """Verificar integridad de crías"""
    from app import create_app
    from app.extensions import db
    from app.models import Animals
    from app.models.reproduction import Offspring, ReproductiveEvent

    app = create_app()
    with app.app_context():
        print("\n🐮 Verificando Offspring...")

        issues = []

        # 1. Verificar birth_event_id existen
        orphaned = (
            db.session.query(Offspring)
            .filter(~Offspring.birth_event_id.in_(db.session.query(ReproductiveEvent.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} crías con birth_event_id huérfano")

        # 2. Verificar que animal_id existe si está presente
        orphaned_animals = (
            db.session.query(Offspring)
            .filter(
                Offspring.animal_id != None, ~Offspring.animal_id.in_(db.session.query(Animals.id))
            )
            .count()
        )

        if orphaned_animals > 0:
            issues.append(f"⚠ {orphaned_animals} crías con animal_id huérfano")

        total = Offspring.query.count()
        if not issues:
            print(f"  ✅ {total} crías válidas")
            return {"table": "offspring", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} crías, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {"table": "offspring", "status": "WARNING", "count": total, "issues": issues}


def verify_transactions():
    """Verificar integridad de transacciones financieras"""
    from app import create_app
    from app.extensions import db
    from app.models import Transaction, Finca, Animals

    app = create_app()
    with app.app_context():
        print("\n💰 Verificando Transactions...")

        issues = []

        # 1. Verificar finca_id existen
        orphaned = (
            db.session.query(Transaction)
            .filter(~Transaction.finca_id.in_(db.session.query(Finca.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} transacciones con finca_id huérfano")

        # 2. Verificar animal_id existe si está presente
        orphaned_animals = (
            db.session.query(Transaction)
            .filter(
                Transaction.animal_id != None,
                ~Transaction.animal_id.in_(db.session.query(Animals.id)),
            )
            .count()
        )

        if orphaned_animals > 0:
            issues.append(f"⚠ {orphaned_animals} transacciones con animal_id huérfano")

        # 3. Verificar montos no negativos
        negative = Transaction.query.filter(Transaction.amount < 0).count()
        if negative > 0:
            issues.append(f"⚠ {negative} transacciones con monto negativo")

        total = Transaction.query.count()
        if not issues:
            print(f"  ✅ {total} transacciones válidas")
            return {"table": "transactions", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} transacciones, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {"table": "transactions", "status": "WARNING", "count": total, "issues": issues}


def verify_inventory_movements():
    """Verificar integridad de movimientos de inventario"""
    from app import create_app
    from app.extensions import db
    from app.models.inventory import InventoryLot, InventoryMovement

    app = create_app()
    with app.app_context():
        print("\n📦 Verificando InventoryMovements...")

        issues = []

        # 1. Verificar lot_id existen
        orphaned = (
            db.session.query(InventoryMovement)
            .filter(~InventoryMovement.lot_id.in_(db.session.query(InventoryLot.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} movimientos con lot_id huérfano")

        # 2. Verificar cantidades positivas
        negative = InventoryMovement.query.filter(InventoryMovement.quantity <= 0).count()
        if negative > 0:
            issues.append(f"⚠ {negative} movimientos con cantidad <= 0")

        total = InventoryMovement.query.count()
        if not issues:
            print(f"  ✅ {total} movimientos válidos")
            return {"table": "inventory_movements", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} movimientos, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {
                "table": "inventory_movements",
                "status": "WARNING",
                "count": total,
                "issues": issues,
            }


def verify_user_finca():
    """Verificar integridad de relaciones usuario-finca"""
    from app import create_app
    from app.extensions import db
    from app.models import User, Finca, UserFinca

    app = create_app()
    with app.app_context():
        print("\n👥 Verificando UserFinca...")

        issues = []

        # 1. Verificar user_id existen
        orphaned_users = (
            db.session.query(UserFinca)
            .filter(~UserFinca.user_id.in_(db.session.query(User.id)))
            .count()
        )

        if orphaned_users > 0:
            issues.append(f"⚠ {orphaned_users} relaciones con user_id huérfano")

        # 2. Verificar finca_id existen
        orphaned_fincas = (
            db.session.query(UserFinca)
            .filter(~UserFinca.finca_id.in_(db.session.query(Finca.id)))
            .count()
        )

        if orphaned_fincas > 0:
            issues.append(f"⚠ {orphaned_fincas} relaciones con finca_id huérfano")

        # 3. Verificar unicidad user_id + finca_id
        from sqlalchemy import func

        duplicates = (
            db.session.query(UserFinca.user_id, UserFinca.finca_id)
            .group_by(UserFinca.user_id, UserFinca.finca_id)
            .having(func.count() > 1)
            .all()
        )

        if duplicates:
            issues.append(f"⚠ {len(duplicates)} duplicados (user_id, finca_id)")

        total = UserFinca.query.count()
        if not issues:
            print(f"  ✅ {total} relaciones válidas")
            return {"table": "user_finca", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} relaciones, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {"table": "user_finca", "status": "WARNING", "count": total, "issues": issues}


def verify_animal_images():
    """Verificar integridad de imágenes de animales"""
    from app import create_app
    from app.extensions import db
    from app.models import Animals
    from app.models.animal_images import AnimalImages

    app = create_app()
    with app.app_context():
        print("\n📸 Verificando AnimalImages...")

        issues = []

        # 1. Verificar animal_id existen
        orphaned = (
            db.session.query(AnimalImages)
            .filter(~AnimalImages.animal_id.in_(db.session.query(Animals.id)))
            .count()
        )

        if orphaned > 0:
            issues.append(f"⚠ {orphaned} imágenes con animal_id huérfano")

        # 2. Verificar que hay máximo una imagen principal por animal
        from sqlalchemy import func

        primary_counts = (
            db.session.query(AnimalImages.animal_id, func.count().label("primary_count"))
            .filter(AnimalImages.is_primary == True)
            .group_by(AnimalImages.animal_id)
            .having(func.count() > 1)
            .all()
        )

        if primary_counts:
            issues.append(f"⚠ {len(primary_counts)} animales con múltiples imágenes primarias")

        total = AnimalImages.query.count()
        if not issues:
            print(f"  ✅ {total} imágenes válidas")
            return {"table": "animal_images", "status": "OK", "count": total, "issues": []}
        else:
            print(f"  ⚠ {total} imágenes, {len(issues)} problemas:")
            for issue in issues:
                print(f"     {issue}")
            return {"table": "animal_images", "status": "WARNING", "count": total, "issues": issues}


def run_all_verifications():
    """Ejecutar todas las verificaciones"""
    print("=" * 70)
    print("🔍 VERIFICACIÓN DE INTEGRIDAD REFERENCIAL - VILLALUZ")
    print("=" * 70)

    results = [
        verify_milk_production(),
        verify_reproductive_events(),
        verify_offspring(),
        verify_transactions(),
        verify_inventory_movements(),
        verify_user_finca(),
        verify_animal_images(),
    ]

    print("\n" + "=" * 70)
    print("📊 RESUMEN DE VERIFICACIÓN")
    print("=" * 70)

    ok_tables = [r for r in results if r["status"] == "OK"]
    warning_tables = [r for r in results if r["status"] == "WARNING"]

    print(f"✅ Tablas sin problemas: {len(ok_tables)}")
    print(f"⚠️ Tablas con advertencias: {len(warning_tables)}")

    total_issues = sum(len(r["issues"]) for r in results)
    print(f"🐛 Total de problemas encontrados: {total_issues}")

    if warning_tables:
        print("\n⚠️ TABLAS CON PROBLEMAS:")
        for r in warning_tables:
            print(f"  - {r['table']}: {len(r['issues'])} problemas")
    else:
        print("\n✨ Todas las tablas pasaron la verificación de integridad")

    print("=" * 70)

    return results


def main():
    parser = argparse.ArgumentParser(description="Verificación de integridad de datos")
    parser.add_argument("--table", type=str, help="Verificar solo una tabla específica")
    args = parser.parse_args()

    if args.table:
        verifiers = {
            "milk_production": verify_milk_production,
            "reproductive_events": verify_reproductive_events,
            "offspring": verify_offspring,
            "transactions": verify_transactions,
            "inventory_movements": verify_inventory_movements,
            "user_finca": verify_user_finca,
            "animal_images": verify_animal_images,
        }
        if args.table in verifiers:
            verifiers[args.table]()
        else:
            print(f"Tabla {args.table} no encontrada. Disponibles: {', '.join(verifiers.keys())}")
    else:
        run_all_verifications()


if __name__ == "__main__":
    main()
