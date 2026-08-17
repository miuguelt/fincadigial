"""
⚠️ SIMULACIÓN — NO USAR EN PRODUCCIÓN
Genera datos simulados de tareas, alertas, producción.
"""

import os
import sys

_ALLOW_SIM = os.getenv("ALLOW_SIMULATION_SCRIPTS", "").lower() == "true"
if not _ALLOW_SIM:
    print("⛔ Simulación deshabilitada. ALLOW_SIMULATION_SCRIPTS=true para permitir.")
    sys.exit(0)

import random
from datetime import datetime, date, timedelta

backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def simulate_active_usage():
    from app import create_app, db
    from app.models.finca import Finca
    from app.models.user import User
    from app.models.animals import Animals
    from app.models.fields import Fields, LandStatus
    from app.models.tasks import Tasks, TaskStatus, TaskPriority
    from app.models.activity_log import ActivityLog
    from app.models.alerts import AnimalAlert, AlertType, AlertPriority
    from app.models.milk_production import MilkProduction, MilkSession
    from app.models.financial import Transaction, TransactionType, TransactionCategory
    from decimal import Decimal

    app = create_app("development")
    with app.app_context():
        print("🚜 [SIMULACIÓN] Iniciando simulación de finca activa...")

        fincas = Finca.query.all()
        if not fincas:
            print("❌ [ERROR] No se encontraron fincas en el sistema.")
            return

        users = User.query.all()
        if not users:
            print("❌ [ERROR] No se encontraron usuarios en el sistema.")
            return

        # Limpiar datos antiguos de simulación para evitar colisiones
        print("🧹 [SIMULACIÓN] Limpiando datos operativos previos de simulación...")
        # Limpiar tareas y alertas simuladas previas
        Tasks.query.filter(
            Tasks.title.like("%Simulado%") | Tasks.description.like("%Simulado%")
        ).delete(synchronize_session=False)
        AnimalAlert.query.filter(AnimalAlert.message.like("%Simulado%")).delete(
            synchronize_session=False
        )
        ActivityLog.query.filter(
            ActivityLog.title.like("%Simulado%") | ActivityLog.description.like("%Simulado%")
        ).delete(synchronize_session=False)
        db.session.commit()

        # Lista de tareas típicas de finca para inyectar
        task_templates = [
            {
                "title": "[Simulado] Ordeño matutino",
                "desc": "Realizar ordeño de vacas del lote de alta producción en sala de ordeño AM.",
                "priority": TaskPriority.HIGH,
                "dept": "Producción",
            },
            {
                "title": "[Simulado] Ordeño vespertino",
                "desc": "Realizar ordeño vespertino PM y registrar litros individuales en la app.",
                "priority": TaskPriority.MEDIUM,
                "dept": "Producción",
            },
            {
                "title": "[Simulado] Vacunación preventiva contra Fiebre Aftosa",
                "desc": "Aplicar dosis de vacuna según calendario sanitario a terneros de destete.",
                "priority": TaskPriority.URGENT,
                "dept": "Salud",
            },
            {
                "title": "[Simulado] Control de peso y biometría mensual",
                "desc": "Pesar lote de novillas de levante para graficar curva de crecimiento.",
                "priority": TaskPriority.MEDIUM,
                "dept": "Ganado",
            },
            {
                "title": "[Simulado] Rotación al Potrero Norte 4",
                "desc": "Trasladar el lote de vacas paridas debido a rebrote óptimo de pasto estrella.",
                "priority": TaskPriority.HIGH,
                "dept": "Rotación",
            },
            {
                "title": "[Simulado] Limpieza y desinfección de saladeros",
                "desc": "Limpiar comederos y reponer sales minerales en el potrero central.",
                "priority": TaskPriority.LOW,
                "dept": "Mantenimiento",
            },
            {
                "title": "[Simulado] Reparación de cerca perimetral oeste",
                "desc": "Revisar y tensar postes de púa que colindan con la quebrada.",
                "priority": TaskPriority.MEDIUM,
                "dept": "Mantenimiento",
            },
            {
                "title": "[Simulado] Aplicación de desparasitante oral",
                "desc": "Administrar desparasitante de amplio espectro al lote de terneras.",
                "priority": TaskPriority.HIGH,
                "dept": "Salud",
            },
            {
                "title": "[Simulado] Suplementación con silo de maíz",
                "desc": "Suministrar ración de silo extra a vacas de primer parto en corral.",
                "priority": TaskPriority.LOW,
                "dept": "Nutrición",
            },
            {
                "title": "[Simulado] Revisión de tanques de agua",
                "desc": "Limpiar flotador y verificar nivel de agua en el potrero sur.",
                "priority": TaskPriority.HIGH,
                "dept": "Infraestructura",
            },
        ]

        # Enfermedades de simulación para alertas
        alert_templates = [
            {
                "type": AlertType.HEALTH,
                "prio": AlertPriority.CRITICAL,
                "msg": "[Simulado] Cow {record} muestra signos febriles y mastitis clínica sospechada en cuarto posterior izquierdo.",
                "rec": "Separar de la línea de ordeño inmediatamente y administrar tratamiento antibiótico prescrito por veterinario.",
            },
            {
                "type": AlertType.PRODUCTION,
                "prio": AlertPriority.HIGH,
                "msg": "[Simulado] Cow {record} tiene una caída de producción de leche del 40% en comparación con su promedio de 7 días.",
                "rec": "Revisar alimentación, estado de pezones y chequear posibles signos de cojera o estrés por calor.",
            },
            {
                "type": AlertType.REPRODUCTION,
                "prio": AlertPriority.MEDIUM,
                "msg": "[Simulado] Novilla {record} cumple período de celo proyectado para monta o inseminación artificial activa hoy.",
                "rec": "Proceder con la detección visual de celo y alistar pajilla en termo de nitrógeno si es positivo.",
            },
            {
                "type": AlertType.HEALTH,
                "prio": AlertPriority.HIGH,
                "msg": "[Simulado] Ternero {record} reporta ganancia de peso negativa en el último control biométrico.",
                "rec": "Verificar presencia de parásitos internos o coccidias. Suplementar ración con concentrado iniciador.",
            },
        ]

        activity_templates = [
            {
                "action": "create",
                "entity": "milk_production",
                "title": "[Simulado] Ordeño diario completado",
                "desc": "Se registraron {liters} litros de leche totales en la sesión de ordeño {session} con óptimo porcentaje de grasa.",
                "sev": "info",
            },
            {
                "action": "update",
                "entity": "animals",
                "title": "[Simulado] Rotación de potrero realizada",
                "desc": "Lote de animales trasladado exitosamente del potrero anterior a {field} para descanso de pastura.",
                "sev": "info",
            },
            {
                "action": "create",
                "entity": "treatments",
                "title": "[Simulado] Tratamiento preventivo aplicado",
                "desc": "Se aplicó desparasitante a {count} animales bajo supervisión del operario en turno.",
                "sev": "info",
            },
            {
                "action": "create",
                "entity": "alerts",
                "title": "[Simulado] Alerta de salud crítica disparada",
                "desc": "Alerta crítica disparada por sospecha de mastitis para el animal {record}.",
                "sev": "warning",
            },
        ]

        for finca in fincas:
            print(f"\n🌱 [SIMULACIÓN] Procesando Finca ID: {finca.id} - {finca.name}")

            # 1. Obtener animales e identificar hembras
            animals = Animals.query.filter_by(finca_id=finca.id).all()
            females = [
                a
                for a in animals
                if str(a.sex) == "Hembra" or getattr(a.sex, "value", "") == "Hembra"
            ]
            # Si no hay hembras, crear algunas vacas lecheras base
            if not females:
                print("⚠️ [SIMULACIÓN] Creando 5 vacas lecheras base para simulación...")
                from app.models.breeds import Breeds

                breed = Breeds.query.first()
                if breed:
                    for i in range(5):
                        female = Animals(
                            record=f"VACA-LECHE-{finca.id}-{i}",
                            sex="Hembra",
                            breeds_id=breed.id,
                            birth_date=date.today() - timedelta(days=1200),
                            weight=480.0,
                            status="Vivo",
                            finca_id=finca.id,
                        )
                        db.session.add(female)
                        females.append(female)
                    db.session.commit()

            # 2. Obtener potreros
            fields = Fields.query.filter_by(finca_id=finca.id).all()
            if not fields:
                print("⚠️ [SIMULACIÓN] Creando potreros base...")
                from app.models.foodTypes import FoodTypes

                food_type = FoodTypes.query.filter_by(finca_id=finca.id).first()
                if not food_type:
                    food_type = FoodTypes(
                        food_type="Pasto Estrella",
                        sowing_date=date.today() - timedelta(days=120),
                        area=10,
                        handlings="Pastoreo rotacional",
                        gauges="15",
                        finca_id=finca.id,
                    )
                    db.session.add(food_type)
                    db.session.commit()

                for i in range(3):
                    fld = Fields(
                        name=f"Potrero Simulado {i + 1}",
                        ubication=f"Sector Central {i + 1}",
                        capacity="40",
                        state=LandStatus.Ocupado if i == 0 else LandStatus.Disponible,
                        handlings="Rotacional",
                        area="15",
                        food_type_id=food_type.id,
                        finca_id=finca.id,
                    )
                    db.session.add(fld)
                    fields.append(fld)
                db.session.commit()

            # 3. Obtener usuarios asignables
            finca_users = User.query.filter_by(finca_id=finca.id).all()
            operarios = [
                u
                for u in finca_users
                if str(u.role) in ["Operario", "Aprendiz", "Capataz"]
                or getattr(u.role, "value", "") in ["Operario", "Aprendiz", "Capataz"]
            ]
            if not operarios:
                operarios = finca_users  # Fallback a cualquier usuario de la finca

            # 4. Generar Tareas Operativas Activas
            print(
                "📋 [SIMULACIÓN] Creando 15 tareas operativas (Pendientes, En Progreso, Completadas)..."
            )
            random.seed(finca.id)
            for i in range(15):
                template = random.choice(task_templates)
                status = random.choice(
                    [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]
                )
                due = datetime.now() + timedelta(days=random.randint(-5, 5))
                assigned = random.choice(operarios) if operarios else None
                animal = random.choice(animals) if animals and random.random() > 0.6 else None
                field = random.choice(fields) if fields and random.random() > 0.6 else None

                task = Tasks(
                    title=f"{template['title']} #{i + 1}",
                    description=f"{template['desc']} [Simulado para pruebas operativas]",
                    status=status,
                    priority=template["priority"],
                    due_date=due,
                    assigned_to=assigned.id if assigned else None,
                    animal_id=animal.id if animal else None,
                    field_id=field.id if field else None,
                    finca_id=finca.id,
                )
                db.session.add(task)

            # 5. Generar Alertas Sanitarias de IA
            print("🚨 [SIMULACIÓN] Generando alertas de salud y producción...")
            for i in range(5):
                template = random.choice(alert_templates)
                animal = random.choice(animals) if animals else None
                field = random.choice(fields) if fields and random.random() > 0.7 else None
                rec_record = animal.record if animal else "ANIM-MOCK"

                alert = AnimalAlert(
                    animal_id=animal.id if animal else None,
                    field_id=field.id if field else None,
                    alert_type=template["type"],
                    message=template["msg"].format(record=rec_record),
                    recommendation=template["rec"],
                    priority=template["prio"],
                    is_read=random.choice([True, False, False]),
                    triggered_at=datetime.now() - timedelta(days=random.randint(0, 10)),
                    finca_id=finca.id,
                )
                db.session.add(alert)

            # 6. Generar Bitácora de Actividades del Operario
            print("📝 [SIMULACIÓN] Inyectando bitácoras de labor en el registro de actividad...")
            for i in range(12):
                template = random.choice(activity_templates)
                actor = random.choice(operarios) if operarios else None
                animal = random.choice(animals) if animals else None
                field = random.choice(fields) if fields else None

                lit = round(random.uniform(150, 450), 1)
                sess = random.choice(["AM", "PM"])
                fld_name = field.name if field else "Potrero Principal"
                rec_record = animal.record if animal else "ANIM-MOCK"

                desc_formatted = template["desc"].format(
                    liters=lit,
                    session=sess,
                    field=fld_name,
                    record=rec_record,
                    count=random.randint(5, 18),
                )

                log = ActivityLog(
                    action=template["action"],
                    entity=template["entity"],
                    title=template["title"],
                    description=desc_formatted,
                    severity=template["sev"],
                    actor_id=actor.id if actor else None,
                    animal_id=animal.id if animal else None,
                    finca_id=finca.id,
                )
                # Forzar fechas en los últimos 30 días
                log.created_at = datetime.now() - timedelta(days=random.randint(0, 30))
                db.session.add(log)

            # 7. Generar Pesajes de Producción Láctea Adicionales (Mañana/Tarde)
            # Sembrar producción para los últimos 90 días si no tienen suficientes
            print(
                f"🥛 [SIMULACIÓN] Generando producción diaria AM/PM para {len(females)} vacas lecheras..."
            )
            for day in range(90):
                d = date.today() - timedelta(days=day)
                for female in females:
                    # Probabilidad del 90% de que la vaca sea ordeñada hoy
                    if random.random() > 0.1:
                        # Sesión AM
                        liters_am = round(random.uniform(6.0, 18.0), 1)
                        db.session.add(
                            MilkProduction(
                                animal_id=female.id,
                                finca_id=finca.id,
                                date=d,
                                liters=liters_am,
                                milking_session=MilkSession.AM,
                                fat_percentage=round(random.uniform(3.2, 4.6), 1),
                                protein_percentage=round(random.uniform(2.9, 3.9), 1),
                                somatic_cells=random.randint(120000, 280000),
                            )
                        )
                        # Sesión PM
                        liters_pm = round(random.uniform(4.0, 14.0), 1)
                        db.session.add(
                            MilkProduction(
                                animal_id=female.id,
                                finca_id=finca.id,
                                date=d,
                                liters=liters_pm,
                                milking_session=MilkSession.PM,
                                fat_percentage=round(random.uniform(3.2, 4.6), 1),
                                protein_percentage=round(random.uniform(2.9, 3.9), 1),
                            )
                        )

            # 8. Generar transacciones financieras extra para robustecer el balance
            print("💵 [SIMULACIÓN] Generando balance financiero activo...")
            categories_income = [
                TransactionCategory.Milk,
                TransactionCategory.Animal,
                TransactionCategory.Other,
            ]
            categories_expense = [
                TransactionCategory.Medication,
                TransactionCategory.Food,
                TransactionCategory.Service,
                TransactionCategory.Other,
            ]
            for day in range(60):
                d = date.today() - timedelta(days=day)
                # 1 a 3 transacciones por día
                for _ in range(random.randint(1, 3)):
                    t_type = random.choice(
                        [TransactionType.Income, TransactionType.Expense, TransactionType.Income]
                    )
                    if t_type == TransactionType.Income:
                        cat = random.choice(categories_income)
                        amount = Decimal(str(round(random.uniform(80000, 600000), 2)))
                    else:
                        cat = random.choice(categories_expense)
                        amount = Decimal(str(round(random.uniform(15000, 250000), 2)))

                    db.session.add(
                        Transaction(
                            finca_id=finca.id,
                            date=d,
                            transaction_type=t_type,
                            category=cat,
                            amount=amount,
                            description=f"[Simulado] Operación de finca - {cat.value}",
                        )
                    )

            db.session.commit()
            print(f"✔️ [SIMULACIÓN] Datos inyectados exitosamente para Finca: {finca.name}")

        # 9. Recalcular todos los resúmenes del dashboard
        print("\n🔄 [SIMULACIÓN] Recalculando resúmenes de Ganado, Leche y Finanzas...")
        from app.models.extended_summaries import FinancialSummary, MilkSummary
        from app.models.livestock_summary import LivestockSummary

        for finca in fincas:
            print(f"🔄 Recalculando resúmenes para Finca ID {finca.id} - {finca.name}...")

            f_summary = FinancialSummary.get_for_finca(finca.id)
            f_summary.recalculate()

            m_summary = MilkSummary.get_for_finca(finca.id)
            m_summary.recalculate()

            try:
                l_summary = LivestockSummary.get_for_finca(finca.id)
                l_summary.recalculate()
            except Exception as e:
                print(f"⚠️ Error recalculando ganado en finca {finca.id} (ignorado): {e}")

        db.session.commit()
        print(
            "\n✨ [SIMULACIÓN] ¡Proceso completado exitosamente! La finca está activa y los paneles están poblados."
        )


if __name__ == "__main__":
    simulate_active_usage()
