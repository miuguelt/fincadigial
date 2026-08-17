#!/usr/bin/env python3
"""
Auto Backup System - Villa Luz
Sistema de backup versionado automático con Git-style
"""

import os
import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
import hashlib
import gzip


class BackupSystem:
    def __init__(self, project_root=None):
        self.project_root = (
            Path(project_root) if project_root else Path(__file__).parent.parent.parent
        )
        configured_root = os.getenv("VILLALUZ_BACKUP_ROOT")
        self.backup_root = (
            Path(configured_root)
            if configured_root
            else (Path.home() / "Documents" / "Backups" / "VillaLuz")
        )
        try:
            self.backup_root.resolve().relative_to(self.project_root.resolve())
        except ValueError:
            pass
        else:
            raise ValueError(
                "VILLALUZ_BACKUP_ROOT no puede estar dentro del repositorio. "
                "Use una carpeta externa para evitar copias recursivas."
            )
        self.db_path = self.backup_root / "backup_index.db"
        self.config = self.load_config()

        # Asegurar directorios
        self.backup_root.mkdir(parents=True, exist_ok=True)
        (self.backup_root / "daily").mkdir(parents=True, exist_ok=True)
        (self.backup_root / "weekly").mkdir(parents=True, exist_ok=True)
        (self.backup_root / "snapshots").mkdir(parents=True, exist_ok=True)

        self.init_database()

    def load_config(self):
        """Carga configuración de backup"""
        return {
            "max_daily_backups": 30,
            "max_weekly_backups": 12,
            "max_snapshots": 24,
            "compression": True,
            "exclude_patterns": [
                "*.pyc",
                "__pycache__",
                ".git",
                "node_modules",
                "venv",
                ".venv",
                "*.log",
                ".pytest_cache",
                "_archive",
                "backups",
                "test-results",
                "playwright-report",
                "maintenance",
                ".env",
                "*.7z",
            ],
        }

    def init_database(self):
        """Inicializa base de datos de backup index"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT UNIQUE,
                type TEXT,
                path TEXT,
                size INTEGER,
                compressed_size INTEGER,
                checksum TEXT,
                description TEXT,
                tags TEXT
            )
        """)

        conn.commit()
        conn.close()

    def get_file_hash(self, filepath):
        """Calcula hash SHA256 de archivo"""
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def should_exclude(self, path):
        """Verifica si archivo debe ser excluido"""
        path_str = str(path)
        for pattern in self.config["exclude_patterns"]:
            if pattern.replace("*", "") in path_str:
                return True
        return False

    def create_backup(self, backup_type="snapshot", description="", tags=None):
        """Crea backup versionado"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{backup_type}_{timestamp}"
        backup_path = self.backup_root / backup_type / backup_name

        print(f"🔄 Creando backup {backup_type}: {backup_name}")

        # Crear directorio de backup
        backup_path.mkdir(exist_ok=True)

        # Copiar archivos con estructura relativa
        total_size = 0
        compressed_size = 0
        file_count = 0

        for item in self.project_root.rglob("*"):
            if item.is_file() and not self.should_exclude(item):
                # Calcular ruta relativa
                rel_path = item.relative_to(self.project_root)
                backup_file = backup_path / rel_path

                # Crear directorios si no existen
                backup_file.parent.mkdir(parents=True, exist_ok=True)

                # Copiar y opcionalmente comprimir
                if self.config["compression"] and item.suffix in [".py", ".json", ".md", ".txt"]:
                    # Comprimir archivos de texto
                    with open(item, "rb") as f_in:
                        with gzip.open(f"{backup_file}.gz", "wb") as f_out:
                            shutil.copyfileobj(f_in, f_out)
                    file_size = item.stat().st_size
                    compressed_file_size = os.path.getsize(f"{backup_file}.gz")
                    total_size += file_size
                    compressed_size += compressed_file_size
                else:
                    # Copiar sin compresión
                    shutil.copy2(item, backup_file)
                    file_size = item.stat().st_size
                    total_size += file_size
                    compressed_size += file_size

                file_count += 1

                if file_count % 100 == 0:
                    print(f"   Procesados: {file_count} archivos...")

        # Crear metadata
        metadata = {
            "timestamp": timestamp,
            "type": backup_type,
            "description": description,
            "tags": tags or [],
            "file_count": file_count,
            "total_size": total_size,
            "compressed_size": compressed_size,
            "compression_ratio": (compressed_size / total_size * 100) if total_size > 0 else 0,
            "created_by": "auto_backup.py",
        }

        with open(backup_path / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        # Guardar en base de datos
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO backups (timestamp, type, path, size, compressed_size, description, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                timestamp,
                backup_type,
                str(backup_path),
                total_size,
                compressed_size,
                description,
                json.dumps(tags or []),
            ),
        )
        conn.commit()
        conn.close()

        # Limpiar backups antiguos
        self.cleanup_old_backups(backup_type)

        print("✅ Backup completado:")
        print(f"   Archivos: {file_count}")
        print(f"   Tamaño: {self.format_size(total_size)}")
        if compressed_size != total_size:
            print(
                f"   Comprimido: {self.format_size(compressed_size)} ({metadata['compression_ratio']:.1f}%)"
            )
        print(f"   Ubicación: {backup_path}")

        return backup_path

    def cleanup_old_backups(self, backup_type):
        """Limpia backups antiguos según configuración"""
        max_backups = self.config.get(f"max_{backup_type}_backups", 30)

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Obtener backups antiguos
        cursor.execute(
            """
            SELECT timestamp, path FROM backups
            WHERE type = ?
            ORDER BY timestamp DESC
            LIMIT -1 OFFSET ?
        """,
            (backup_type, max_backups),
        )

        old_backups = cursor.fetchall()

        for timestamp, path in old_backups:
            try:
                if os.path.exists(path):
                    shutil.rmtree(path)
                    print(f"   🗑️ Eliminado backup antiguo: {timestamp}")

                cursor.execute("DELETE FROM backups WHERE timestamp = ?", (timestamp,))
            except Exception as e:
                print(f"   ⚠️ Error eliminando {timestamp}: {e}")

        conn.commit()
        conn.close()

    def list_backups(self, backup_type=None, limit=10):
        """Lista backups disponibles"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if backup_type:
            cursor.execute(
                """
                SELECT timestamp, type, size, compressed_size, description, tags
                FROM backups
                WHERE type = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """,
                (backup_type, limit),
            )
        else:
            cursor.execute(
                """
                SELECT timestamp, type, size, compressed_size, description, tags
                FROM backups
                ORDER BY timestamp DESC
                LIMIT ?
            """,
                (limit,),
            )

        backups = cursor.fetchall()
        conn.close()

        print("\n📋 Backups disponibles:")
        print("-" * 80)
        for timestamp, btype, size, comp_size, desc, tags in backups:
            tags_str = f" [{tags}]" if tags and tags != "[]" else ""
            print(f"  {timestamp} | {btype:10} | {self.format_size(size):10} | {desc}{tags_str}")

        return backups

    def restore_backup(self, timestamp, target_path=None):
        """Restaura backup específico"""
        target_path = (
            Path(target_path)
            if target_path
            else (self.backup_root / "restores" / f"restored_{timestamp}")
        )

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT path FROM backups WHERE timestamp = ?", (timestamp,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            print(f"❌ Backup {timestamp} no encontrado")
            return None

        backup_path = Path(result[0])
        print(f"🔄 Restaurando backup {timestamp} a {target_path}")

        target_path.mkdir(parents=True, exist_ok=True)

        file_count = 0
        for item in backup_path.rglob("*"):
            if item.is_file() and item.name != "metadata.json":
                rel_path = item.relative_to(backup_path)
                target_file = target_path / rel_path

                # Crear directorios
                target_file.parent.mkdir(parents=True, exist_ok=True)

                # Restaurar (descomprimir si es necesario)
                if item.suffix == ".gz":
                    # Descomprimir
                    with gzip.open(item, "rb") as f_in:
                        with open(target_file, "wb") as f_out:
                            shutil.copyfileobj(f_in, f_out)
                else:
                    # Copiar normal
                    shutil.copy2(item, target_file)

                file_count += 1

        print("✅ Restauración completada:")
        print(f"   Archivos restaurados: {file_count}")
        print(f"   Ubicación: {target_path}")

        return target_path

    def format_size(self, size_bytes):
        """Formatea tamaño en bytes"""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f}TB"

    def schedule_backup(self, backup_type="daily"):
        """Programa backup automático (usando Windows Task Scheduler)"""
        script_path = __file__
        command = f'python "{script_path}" --type {backup_type}'

        # Crear tarea programada de Windows
        task_name = f"VillaLuz_Backup_{backup_type}"

        if backup_type == "daily":
            trigger = "DAILY"
            time = "02:00"
        elif backup_type == "weekly":
            trigger = "WEEKLY"
            time = "03:00"
        else:
            print("❌ Solo se pueden programar backups diarios o semanales")
            return

        cmd = f'''
        schtasks /create /tn "{task_name}" /tr "{command}" /sc {trigger} /st {time} /f
        '''

        print(f"📅 Programando backup {backup_type}:")
        print(f"   Comando: {cmd.strip()}")

        # Nota: Ejecutar como administrador para crear tarea
        print("   ⚠️ Ejecutar como administrador para crear la tarea programada")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Sistema de Backup Versionado - Villa Luz")
    parser.add_argument(
        "--type", choices=["daily", "weekly", "snapshot"], default="snapshot", help="Tipo de backup"
    )
    parser.add_argument("--description", default="", help="Descripción del backup")
    parser.add_argument("--tags", nargs="*", default=[], help="Tags del backup")
    parser.add_argument("--list", action="store_true", help="Listar backups")
    parser.add_argument("--restore", help="Timestamp del backup a restaurar")
    parser.add_argument("--target", help="Ruta de restauración")
    parser.add_argument("--schedule", action="store_true", help="Programar backup automático")

    args = parser.parse_args()

    backup = BackupSystem()

    if args.list:
        backup.list_backups()
    elif args.restore:
        backup.restore_backup(args.restore, args.target)
    elif args.schedule:
        backup.schedule_backup(args.type)
    else:
        backup.create_backup(args.type, args.description, args.tags)


if __name__ == "__main__":
    main()
