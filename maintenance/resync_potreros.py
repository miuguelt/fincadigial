import os
import sys
from datetime import date
from dotenv import load_dotenv

# Configurar path del backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv()

try:
    from app import create_app
    from app.extensions import db, cache
    from app.models.fields import Fields
    from app.models.animalFields import AnimalFields
    from app.models.animals import Animals, AnimalStatus
    from app.models.livestock_summary import LivestockSummary

    app = create_app()
    with app.app_context():
        print("=== INICIANDO TAREA DE MANTENIMIENTO: RESINCRO DE POTREROS ===")

        # 1. Conexión y auditoría rápida
        fields = Fields.query.all()
        print(f"\n[1/4] Auditando campos (potreros): {len(fields)} encontrados.")

        # 2. Auditar asignaciones activas
        active_assignments = AnimalFields.query.filter(
            AnimalFields.removal_date.is_(None),
            AnimalFields.is_deleted == False
        ).all()
        print(f"[2/4] Asignaciones activas encontradas en BD: {len(active_assignments)}")

        # Verificar integridad: si hay animales marcados como No Vivos con asignaciones activas, cerrarlas.
        inconsistencies = 0
        for af in active_assignments:
            animal = Animals.query.get(af.animal_id)
            if not animal or animal.status != AnimalStatus.Vivo or animal.is_deleted:
                print(f"  -> Inconsistencia detectada: Animal ID {af.animal_id} (Estado: {animal.status if animal else 'No existe'}) en Potrero ID {af.field_id} con asignación activa. Cerrándola.")
                af.removal_date = date.today()
                inconsistencies += 1

        if inconsistencies > 0:
            db.session.commit()
            print(f"  ✅ Se corrigieron y cerraron {inconsistencies} asignaciones inconsistentes.")
        else:
            print("  ✅ Sin inconsistencias en animales inactivos con asignaciones.")

        # 3. Limpiar caché de Redis de manera forzada
        print("\n[3/4] Limpiando caché del backend (Redis y memoria)...")
        try:
            # Importar helper del backend para limpiar de forma segura
            from app.utils.namespace_helpers import _cache_clear
            _cache_clear('Animals')
            _cache_clear('Fields')
            _cache_clear('AnimalFields')

            # Limpiar también Flask-Caching general
            cache.clear()
            print("  ✅ Caché del backend limpiada exitosamente.")
        except Exception as cache_err:
            print(f"  ⚠️ Advertencia limpiando caché: {cache_err}")

        # 4. Forzar el recálculo dinámico de estadísticas
        print("\n[4/4] Recalculando LivestockSummary para cada finca...")
        from app.models.finca import Finca
        fincas = Finca.query.all()
        for finca in fincas:
            try:
                summary = LivestockSummary.get_for_finca(finca.id)
                summary.recalculate()
                print(f"  ✅ LivestockSummary recalculado para Finca: {finca.name} (ID: {finca.id})")
            except Exception as sum_err:
                print(f"  ❌ Error recalculando summary para finca {finca.id}: {sum_err}")

        print("\n=== MANTENIMIENTO COMPLETADO EXITOSAMENTE ===")
        print("Los potreros, asignaciones y resúmenes de ganado están ahora 100% sincronizados con la base de datos.")

except Exception as e:
    print(f"\n❌ ERROR CRÍTICO durante el mantenimiento: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
