#!/usr/bin/env python3
"""
Database Maintenance - Villa Luz
Herramientas de mantenimiento y optimización de base de datos
"""
import os
import sys

# Agregar backend al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

class DatabaseMaintenance:
    def __init__(self):
        self.app = app
        
    def get_table_stats(self):
        """Obtiene estadísticas de tablas"""
        with self.app.app_context():
            try:
                # Tablas y conteos
                tables = [
                    'fincas', 'users', 'animals', 'species', 'breeds',
                    'fields', 'diseases', 'vaccines', 'medications',
                    'food_types', 'animal_groups', 'infrastructure', 'tasks'
                ]
                
                stats = {}
                for table in tables:
                    try:
                        result = db.session.execute(text(f'SELECT COUNT(*) FROM {table}'))
                        count = result.scalar()
                        stats[table] = count
                    except:
                        stats[table] = 'N/A'
                
                return stats
            except Exception as e:
                return {'error': str(e)}
    
    def check_connections(self):
        """Verifica conexiones activas"""
        with self.app.app_context():
            try:
                result = db.session.execute(text(
                    "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
                ))
                connections = result.scalar()
                return {'active_connections': connections}
            except Exception as e:
                return {'error': str(e)}
    
    def get_db_size(self):
        """Obtiene tamaño de la base de datos"""
        with self.app.app_context():
            try:
                result = db.session.execute(text(
                    "SELECT pg_size_pretty(pg_database_size(current_database()))"
                ))
                size = result.scalar()
                return {'database_size': size}
            except Exception as e:
                return {'error': str(e)}
    
    def run_maintenance(self):
        """Ejecuta mantenimiento completo"""
        print("=" * 70)
        print("  DATABASE MAINTENANCE - VILLA LUZ")
        print("=" * 70)
        
        # Table stats
        print("\n📊 Estadísticas de Tablas:")
        stats = self.get_table_stats()
        if 'error' not in stats:
            for table, count in sorted(stats.items()):
                if count != 'N/A' and isinstance(count, int):
                    print(f"   {table:20} {count:6} registros")
                else:
                    print(f"   {table:20} {count}")
        else:
            print(f"   Error: {stats['error']}")
        
        # DB Size
        print("\n💾 Tamaño de Base de Datos:")
        size = self.get_db_size()
        if 'error' not in size:
            print(f"   {size['database_size']}")
        
        # Connections
        print("\n🔗 Conexiones Activas:")
        conn = self.check_connections()
        if 'error' not in conn:
            print(f"   {conn['active_connections']} conexiones")
        
        print("\n" + "=" * 70)
        print("  ✅ Mantenimiento completado")
        print("=" * 70)

if __name__ == "__main__":
    maint = DatabaseMaintenance()
    maint.run_maintenance()
