#!/usr/bin/env python3
"""
Restore System - Villa Luz
Restaura backups versionados con interfaz interactiva
"""
import os
import sqlite3
from pathlib import Path
from datetime import datetime
import json

class RestoreSystem:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent.parent
        self.backup_root = self.project_root / "backups"
        self.db_path = self.backup_root / "backup_index.db"
    
    def list_backups(self, backup_type=None, limit=20):
        """Lista backups disponibles con detalles"""
        if not self.db_path.exists():
            print("❌ No hay base de datos de backups. Ejecute: auto_backup.py --list")
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if backup_type:
            cursor.execute('''
                SELECT timestamp, type, size, compressed_size, description, tags
                FROM backups 
                WHERE type = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (backup_type, limit))
        else:
            cursor.execute('''
                SELECT timestamp, type, size, compressed_size, description, tags
                FROM backups 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
        
        backups = cursor.fetchall()
        conn.close()
        
        return backups
    
    def display_backups(self, backups):
        """Muestra backups de forma legible"""
        if not backups:
            print("❌ No hay backups disponibles")
            return
        
        print(f"\n📋 Backups Disponibles:")
        print("-" * 100)
        print(f"{'#':<3} {'Timestamp':<17} {'Type':<10} {'Size':<10} {'Compressed':<12} {'Description':<30} {'Tags'}")
        print("-" * 100)
        
        for i, (timestamp, btype, size, comp_size, desc, tags) in enumerate(backups, 1):
            # Formatear tamaño
            size_str = self.format_size(size)
            comp_str = self.format_size(comp_size) if comp_size != size else "N/A"
            
            # Parsear tags
            try:
                tags_list = json.loads(tags) if tags else []
                tags_str = ", ".join(tags_list[:2])  # Mostrar solo primeros 2 tags
                if len(tags_list) > 2:
                    tags_str += "..."
            except:
                tags_str = ""
            
            # Truncar descripción
            desc_str = desc[:27] + "..." if len(desc) > 30 else desc
            
            print(f"{i:<3} {timestamp:<17} {btype:<10} {size_str:<10} {comp_str:<12} {desc_str:<30} {tags_str}")
        
        print("-" * 100)
        return backups
    
    def format_size(self, size_bytes):
        """Formatea tamaño en bytes"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f}TB"
    
    def get_backup_info(self, timestamp):
        """Obtiene información detallada de un backup"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT path, size, compressed_size, description, tags
            FROM backups 
            WHERE timestamp = ?
        ''', (timestamp,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return None
        
        path, size, comp_size, desc, tags = result
        
        # Leer metadata si existe
        metadata_path = Path(path) / "metadata.json"
        metadata = {}
        if metadata_path.exists():
            try:
                with open(metadata_path) as f:
                    metadata = json.load(f)
            except:
                pass
        
        return {
            "timestamp": timestamp,
            "path": path,
            "size": size,
            "compressed_size": comp_size,
            "description": desc,
            "tags": json.loads(tags) if tags else [],
            "metadata": metadata
        }
    
    def restore_backup(self, timestamp, target_path=None, dry_run=False):
        """Restaura backup específico"""
        backup_info = self.get_backup_info(timestamp)
        
        if not backup_info:
            print(f"❌ Backup {timestamp} no encontrado")
            return False
        
        # Determinar ruta de restauración
        if target_path:
            target = Path(target_path)
        else:
            timestamp_clean = timestamp.replace("_", "").replace("-", "")
            target = self.project_root / f"restored_{timestamp_clean}"
        
        if dry_run:
            print(f"🔍 MODO SIMULACIÓN - Restauración de {timestamp}")
            print(f"   Origen: {backup_info['path']}")
            print(f"   Destino: {target}")
            print(f"   Tamaño: {self.format_size(backup_info['size'])}")
            return True
        
        print(f"🔄 Restaurando backup {timestamp}")
        print(f"   Origen: {backup_info['path']}")
        print(f"   Destino: {target}")
        
        # Verificar que el backup existe
        backup_path = Path(backup_info['path'])
        if not backup_path.exists():
            print(f"❌ El directorio de backup no existe: {backup_path}")
            return False
        
        # Crear directorio destino
        target.mkdir(parents=True, exist_ok=True)
        
        # Contar archivos primero
        file_count = len(list(backup_path.rglob("*")))
        print(f"   Archivos a restaurar: {file_count}")
        
        # Restaurar archivos
        import shutil
        import gzip
        
        restored_count = 0
        for item in backup_path.rglob("*"):
            if item.is_file() and item.name != "metadata.json":
                rel_path = item.relative_to(backup_path)
                target_file = target / rel_path
                
                # Crear directorios
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                try:
                    # Restaurar (descomprimir si es necesario)
                    if item.suffix == '.gz':
                        # Descomprimir
                        with gzip.open(item, 'rb') as f_in:
                            with open(target_file, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                    else:
                        # Copiar normal
                        shutil.copy2(item, target_file)
                    
                    restored_count += 1
                    
                    if restored_count % 100 == 0:
                        print(f"   Progreso: {restored_count}/{file_count} archivos...")
                
                except Exception as e:
                    print(f"   ⚠️ Error restaurando {rel_path}: {e}")
        
        print(f"✅ Restauración completada:")
        print(f"   Archivos restaurados: {restored_count}")
        print(f"   Ubicación: {target}")
        
        # Crear archivo de info de restauración
        restore_info = {
            "restored_at": datetime.now().isoformat(),
            "original_timestamp": timestamp,
            "original_path": str(backup_path),
            "restored_files": restored_count,
            "backup_info": backup_info
        }
        
        with open(target / "restore_info.json", 'w') as f:
            json.dump(restore_info, f, indent=2)
        
        return True
    
    def interactive_restore(self):
        """Restauración interactiva"""
        print("=" * 70)
        print("  RESTORE SYSTEM - VILLA LUZ")
        print("=" * 70)
        
        # Listar backups
        backups = self.list_backups()
        if not backups:
            return
        
        # Mostrar backups
        self.display_backups(backups)
        
        # Seleccionar backup
        while True:
            try:
                choice = input(f"\n🔍 Seleccione backup (1-{len(backups)}) o 'q' para salir: ").strip()
                
                if choice.lower() == 'q':
                    print("👋 Saliendo...")
                    return
                
                choice_num = int(choice)
                if 1 <= choice_num <= len(backups):
                    break
                else:
                    print(f"❌ Seleccione un número entre 1 y {len(backups)}")
            except ValueError:
                print("❌ Ingrese un número válido")
        
        selected_backup = backups[choice_num - 1]
        timestamp = selected_backup[0]
        
        # Mostrar detalles
        print(f"\n📋 Backup seleccionado: {timestamp}")
        backup_info = self.get_backup_info(timestamp)
        if backup_info:
            print(f"   Tipo: {backup_info['metadata'].get('type', 'N/A')}")
            print(f"   Descripción: {backup_info['description']}")
            print(f"   Archivos: {backup_info['metadata'].get('file_count', 'N/A')}")
            print(f"   Tamaño: {self.format_size(backup_info['size'])}")
        
        # Confirmar restauración
        confirm = input(f"\n⚠️ ¿Restaurar este backup? (s/N): ").strip().lower()
        if confirm != 's':
            print("❌ Cancelado")
            return
        
        # Ruta destino
        custom_path = input("📁 Ruta destino (Enter para default): ").strip()
        target_path = custom_path if custom_path else None
        
        # Restaurar
        success = self.restore_backup(timestamp, target_path)
        
        if success:
            print("\n✅ ¡Restauración completada con éxito!")
            print("💡 Puede navegar a la carpeta restaurada para verificar los archivos")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Sistema de Restauración - Villa Luz")
    parser.add_argument("--list", action="store_true", help="Listar backups disponibles")
    parser.add_argument("--type", choices=["daily", "weekly", "snapshot"], help="Filtrar por tipo")
    parser.add_argument("--restore", help="Timestamp del backup a restaurar")
    parser.add_argument("--target", help="Ruta de restauración")
    parser.add_argument("--dry-run", action="store_true", help="Simular restauración")
    parser.add_argument("--info", help="Mostrar información de backup específico")
    
    args = parser.parse_args()
    
    restore = RestoreSystem()
    
    if args.list:
        backups = restore.list_backups(args.type)
        restore.display_backups(backups)
    elif args.info:
        info = restore.get_backup_info(args.info)
        if info:
            print(f"\n📋 Información del Backup {args.info}:")
            print(f"   Tipo: {info['metadata'].get('type', 'N/A')}")
            print(f"   Descripción: {info['description']}")
            print(f"   Tags: {', '.join(info['tags'])}")
            print(f"   Archivos: {info['metadata'].get('file_count', 'N/A')}")
            print(f"   Tamaño: {restore.format_size(info['size'])}")
            print(f"   Comprimido: {restore.format_size(info['compressed_size'])}")
            print(f"   Ratio: {info['metadata'].get('compression_ratio', 0):.1f}%")
            print(f"   Creado: {info['metadata'].get('created_by', 'N/A')}")
        else:
            print(f"❌ Backup {args.info} no encontrado")
    elif args.restore:
        restore.restore_backup(args.restore, args.target, args.dry_run)
    else:
        # Modo interactivo
        restore.interactive_restore()

if __name__ == "__main__":
    main()
