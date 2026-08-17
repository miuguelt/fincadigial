#!/usr/bin/env python3
"""
Emisor de Notificaciones de Prueba - VillaLuz
=============================================

Script para emitir notificaciones de prueba vía SSE (Server-Sent Events)
al frontend conectado. Útil para verificar que el sistema de notificaciones
en tiempo real funciona correctamente.

Uso:
    python emit_test_notifications.py [intervalo_segundos]

Ejemplo:
    python emit_test_notifications.py 5    # Emitir cada 5 segundos
    python emit_test_notifications.py      # Emitir cada 3 segundos (default)

Autor: DevBrain System
Fecha: 2026-04-29
"""

import sys
import os
import time
import json
import random
import argparse
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def emit_notification(event_bus, notification_type="info"):
    """Emitir una notificación de prueba"""

    notifications = {
        "info": {
            "title": "Actualización del Sistema",
            "message": "Los datos de producción han sido sincronizados exitosamente.",
            "data": {"synced_records": random.randint(10, 100)},
        },
        "success": {
            "title": "Tarea Completada",
            "message": f"El proceso de ordeño #{random.randint(100, 999)} ha finalizado.",
            "data": {"milk_liters": round(random.uniform(15, 25), 1)},
        },
        "warning": {
            "title": "Alerta de Stock",
            "message": f'El medicamento "{random.choice(["Vacuna A", "Antibiótico B", "Suplemento C"])}" está por debajo del nivel mínimo.',
            "data": {"current_stock": random.randint(2, 5), "min_stock": 10},
        },
        "error": {
            "title": "Error de Conexión",
            "message": "No se pudo sincronizar con el dispositivo de báscula. Verifique la conexión Bluetooth.",
            "data": {"device_id": f"SCALE_{random.randint(100, 999)}"},
        },
        "reproduction": {
            "title": "Alerta de Celo Detectado",
            "message": f"La vaca {random.choice(['Luna', 'Estrella', 'Esperanza', 'Linda'])} presenta signos de celo.",
            "data": {
                "animal_id": random.randint(1, 20),
                "recommendation": "Programar inseminación en las próximas 12 horas",
            },
            "action": {"label": "Ver animal", "url": "/dashboard/animals"},
        },
        "production": {
            "title": "Producción Diaria",
            "message": f"La producción de hoy ha superado el promedio en un {random.randint(5, 15)}%.",
            "data": {
                "today_liters": round(random.uniform(180, 220), 1),
                "average_liters": round(random.uniform(160, 180), 1),
            },
        },
        "inventory": {
            "title": "Vencimiento Próximo",
            "message": f"El lote #{random.randint(1000, 9999)} de {random.choice(['Vacunas', 'Medicamentos', 'Alimentos'])} vence en {random.randint(5, 15)} días.",
            "data": {"lot_id": random.randint(1000, 9999), "days_to_expire": random.randint(5, 15)},
            "action": {"label": "Gestionar inventario", "url": "/dashboard/inventory"},
        },
    }

    # Seleccionar notificación según tipo o aleatorio
    if notification_type == "random":
        notif_data = random.choice(list(notifications.values()))
        notif_type = [k for k, v in notifications.items() if v == notif_data][0]
    else:
        notif_type = notification_type if notification_type in notifications else "info"
        notif_data = notifications[notif_type]

    # Construir payload SSE
    payload = {
        "id": f"notif-{int(time.time() * 1000)}",
        "type": notif_type
        if notif_type not in ["reproduction", "production", "inventory"]
        else "warning",
        "title": notif_data["title"],
        "message": notif_data["message"],
        "timestamp": datetime.now().isoformat(),
        "data": notif_data.get("data", {}),
        "action": notif_data.get("action"),
    }

    # Emitir al bus de eventos
    event_bus.publish(json.dumps(payload))

    print(f"📤 Notificación emitida: [{notif_type.upper()}] {notif_data['title']}")
    return payload


def main():
    parser = argparse.ArgumentParser(description="Emisor de notificaciones de prueba")
    parser.add_argument(
        "--interval",
        "-i",
        type=int,
        default=3,
        help="Intervalo entre notificaciones en segundos (default: 3)",
    )
    parser.add_argument(
        "--count",
        "-c",
        type=int,
        default=0,
        help="Número de notificaciones a emitir (0 = infinito)",
    )
    parser.add_argument(
        "--type",
        "-t",
        type=str,
        default="random",
        choices=[
            "random",
            "info",
            "success",
            "warning",
            "error",
            "reproduction",
            "production",
            "inventory",
        ],
        help="Tipo de notificación a emitir",
    )

    args = parser.parse_args()

    print("=" * 70)
    print("🔔 EMISOR DE NOTIFICACIONES DE PRUEBA - VILLALUZ")
    print("=" * 70)
    print(f"Intervalo: {args.interval} segundos")
    print(f"Tipo: {args.type}")
    print(f"Cantidad: {'infinito' if args.count == 0 else args.count}")
    print("=" * 70)

    try:
        from app import create_app
        from app.utils.redis_bus import RedisEventBus, InMemoryEventBus

        app = create_app()

        with app.app_context():
            # Obtener o crear bus de eventos
            event_bus = app.extensions.get("event_bus")

            if not event_bus:
                # Crear bus en memoria si no existe
                redis_client = app.extensions.get("redis")
                if redis_client:
                    event_bus = RedisEventBus(redis_client)
                    print("✅ Usando RedisEventBus")
                else:
                    event_bus = InMemoryEventBus()
                    print("✅ Usando InMemoryEventBus")

                app.extensions["event_bus"] = event_bus
            else:
                print("✅ Usando event_bus existente")

            print("\n🚀 Iniciando emisión de notificaciones...")
            print("Presione Ctrl+C para detener\n")

            count = 0
            while args.count == 0 or count < args.count:
                try:
                    emit_notification(event_bus, args.type)
                    count += 1

                    if args.count > 0:
                        print(f"   ({count}/{args.count})")
                    else:
                        print(f"   (#{count})")

                    time.sleep(args.interval)

                except KeyboardInterrupt:
                    break
                except Exception as e:
                    print(f"❌ Error emitiendo notificación: {e}")
                    time.sleep(1)

            print(f"\n✅ Total de notificaciones emitidas: {count}")

    except ImportError as e:
        print(f"❌ Error importando módulos: {e}")
        print("Asegúrese de ejecutar desde el directorio backend")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
