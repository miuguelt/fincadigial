import sys
import os

# Append the absolute path of the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models.reproduction import ReproductiveEvent, EventType
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    try:
        # Contar cuántas inseminaciones no tienen técnica
        invalid_tech_count = db.session.query(ReproductiveEvent).filter(
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.technique == None
        ).count()

        print(f"🥛 Encontradas {invalid_tech_count} inseminaciones históricas sin técnica especificada (NULL).")

        if invalid_tech_count > 0:
            print("🚀 Actualizando inseminaciones huérfanas a la técnica predeterminada: 'Natural'...")

            # Ejecutamos el update quirúrgico
            # Dado que el campo es un tipo Enum de SQLAlchemy (PostgreSQL ENUM o VARCHAR según DB local),
            # actualizamos el atributo usando el modelo de SQLAlchemy o SQL directo.
            # SQL directo garantiza compatibilidad total con la base de datos subyacente.
            db.session.execute(text(
                "UPDATE reproductive_events "
                "SET technique = 'Natural' "
                "WHERE event_type = 'Inseminacion' AND technique IS NULL"
            ))
            db.session.commit()

            print("✅ Actualización completada exitosamente.")
        else:
            print("✨ Todos los eventos de inseminación ya tienen técnicas asignadas válidas.")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al corregir técnicas de inseminación: {e}")
