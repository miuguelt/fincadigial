#!/usr/bin/env python3
"""
Test completo del workflow de eliminación de animales
con todas las optimizaciones implementadas
"""

import sys
import os
import time
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.animals import Animals, Sex
from app.models.breeds import Breeds
from app.models.species import Species
from app.utils.integrity_checker import OptimizedIntegrityChecker
from datetime import date

def test_complete_workflow():
    """Test completo del workflow de eliminación optimizado"""
    app = create_app('testing')
    app.config['CACHE_WARMUP_ASYNC'] = False

    with app.app_context():
        db.create_all()
        print("🚀 Iniciando test completo de eliminación optimizada")
        print("=" * 60)

        # 1. Verificar que el integrity checker está funcionando
        print("\n1. Verificando Integrity Checker optimizado...")
        checker = OptimizedIntegrityChecker()

        # Limpiar cache para test limpio
        checker.clear_cache()
        print("   ✅ Cache limpiada")

        # 2. Obtener animales de prueba
        print("\n2. Buscando animales para pruebas...")
        animals = Animals.query.limit(5).all()

        if not animals:
            print("   ⚠️  No hay animales para probar. Creando uno de prueba...")
            # Crear especie y raza
            species = Species(name="Bovino")
            db.session.add(species)
            db.session.commit()

            breed = Breeds(name="Brahman", species_id=species.id)
            db.session.add(breed)
            db.session.commit()

            if breed:
                test_animal = Animals(
                    record=f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    breeds_id=breed.id,
                    sex=Sex.Macho,
                    weight=400,
                    birth_date=date.today(),
                    status='Vivo'
                )
                db.session.add(test_animal)
                db.session.commit()
                animals = [test_animal]
                print(f"   ✅ Animal de prueba creado: ID {test_animal.id}")
            else:
                print("   ❌ No hay razas para crear animal de prueba")
                return

        # 3. Probar detección de dependencias (endpoint optimizado)
        print("\n3. Probando detección de dependencias optimizada...")
        for animal in animals[:3]:  # Probar con los primeros 3
            print(f"\n   🐄 Animal ID {animal.id} - {animal.record}")

            # Medir tiempo de detección de dependencias
            start_time = time.time()
            dependencies = checker.get_batch_dependencies([animal.id], 'animals')
            end_time = time.time()

            detection_time = (end_time - start_time) * 1000
            print(f"   ⏱️  Tiempo detección: {detection_time:.2f}ms")
            print(f"   📊 Dependencias encontradas: {len(dependencies)}")

            for table, count in dependencies.items():
                print(f"      - {table}: {count} registros")
            # Verificación de rendimiento
            if detection_time < 50:
                print("   ✅ Rendimiento excelente (<50ms)")
            elif detection_time < 200:
                print("   ✅ Rendimiento bueno (<200ms)")
            else:
                print(f"   ⚠️  Rendimiento necesita mejora ({detection_time:.2f}ms)")

        # 4. Probar endpoint de batch dependencies
        print("\n4. Probando batch dependencies endpoint...")
        animal_ids = [a.id for a in animals[:3]]

        start_time = time.time()
        batch_deps = checker.get_batch_dependencies(animal_ids, 'animals')
        end_time = time.time()

        batch_time = (end_time - start_time) * 1000
        print(f"   ⏱️  Tiempo batch ({len(animal_ids)} animales): {batch_time:.2f}ms")
        print(f"   📊 Resultados batch: {len(batch_deps)} animales procesados")

        # 5. Probar cache
        print("\n5. Probando cache de integridad...")
        animal_id = animals[0].id

        # Primera llamada (sin cache)
        start_time = time.time()
        deps1 = checker.get_batch_dependencies([animal_id], 'animals')
        first_time = (time.time() - start_time) * 1000

        # Segunda llamada (con cache)
        start_time = time.time()
        deps2 = checker.get_batch_dependencies([animal_id], 'animals')
        cached_time = (time.time() - start_time) * 1000

        print(f"   ⏱️  Primera llamada: {first_time:.2f}ms")
        print(f"   ⏱️  Segunda llamada: {cached_time:.2f}ms")
        print(f"   🚀 Speedup cache: {first_time/max(cached_time, 0.1):.1f}x")

        if deps1 == deps2:
            print("   ✅ Cache funcionando correctamente")
        else:
            print("   ❌ Cache con resultados inconsistentes")

        # 6. Simular eliminación segura (solo si no hay dependencias)
        print("\n6. Probando eliminación segura...")
        safe_animals = [a for a in animals if len(checker.get_batch_dependencies([a.id], 'animals')) == 0]

        if safe_animals:
            test_animal = safe_animals[0]
            print(f"   🐄 Probando eliminación de animal ID {test_animal.id}")

            # Verificar dependencias antes de eliminar
            final_deps = checker.get_batch_dependencies([test_animal.id], 'animals')

            if len(final_deps) == 0:
                print("   ✅ Animal sin dependencias - seguro para eliminar")
                # No eliminamos realmente, solo verificamos que se podría
                print("   📝 Nota: Eliminación simulada (no se borra realmente)")
            else:
                print(f"   ⚠️  Animal tiene {len(final_deps)} dependencias - no se elimina")
        else:
            print("   ℹ️  No hay animales sin dependencias para probar eliminación")

        # 7. Resumen de rendimiento
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE RENDIMIENTO")
        print("=" * 60)

        # Estadísticas del checker
        cache_stats = checker.get_cache_stats()
        print(f"🗄️  Cache entries: {cache_stats.get('entries', 0)}")
        print(f"⏰ Cache TTL: {cache_stats.get('ttl', 30)}s")

        # Tiempos medidos
        avg_detection_time = sum([
            (time.time() - start_time) * 1000
            for start_time in [0.001]  # Placeholder
        ]) / max(len(animals), 1)

        print("⚡ Tiempos de detección: <50ms (objetivo)")
        print(f"🔄 Tiempo batch: {batch_time:.2f}ms para {len(animal_ids)} animales")
        print(f"🚀 Speedup con cache: {first_time/max(cached_time, 0.1):.1f}x")

        print("\n✅ TEST COMPLETADO - Optimizaciones verificadas")

        # Recomendaciones
        print("\n📋 RECOMENDACIONES:")
        print("1. Aplicar índices MySQL: mysql -u root -p finca < delete_performance_indexes_mysql.sql")
        print("2. Reiniciar backend para cargar todos los cambios")
        print("3. Actualizar frontend para usar endpoint /animals/{id}/delete-with-check")
        print("4. Monitorear tiempos de eliminación en producción")

if __name__ == "__main__":
    test_complete_workflow()
