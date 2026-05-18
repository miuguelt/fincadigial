#!/usr/bin/env python3
"""
Project Organizer - Villa Luz
Reorganiza archivos y carpetas según estructura estándar
"""
import os
import shutil
from pathlib import Path
import json
from datetime import datetime

class ProjectOrganizer:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent.parent
        self.moved_files = []
        self.errors = []
        
        # Estructura deseada
        self.structure = {
            "backend": {
                "scripts": {
                    "maintenance": [
                        "db_audit_and_seed.py",
                        "db_maintenance.py",
                        "fix_villaluz_db.py",
                        "seed_100.py",
                        "seed_test_users.py",
                        "sync_schema.py",
                        "migrate_analytics.py",
                        "create_tables.py"
                    ],
                    "monitoring": [
                        "monitor_system.py",
                        "dashboard_cli.py",
                        "api_docs_generator.py",
                        "check_ollama.py",
                        "stress_test.py"
                    ],
                    "utilities": [
                        "check_users.py",
                        "list_users.py",
                        "reset_pass.py",
                        "reset_passwords.py",
                        "verify_pass.py",
                        "verify_data_integrity.py",
                        "inspect_db.py",
                        "test_db_conn.py",
                        "test_redis_conn.py",
                        "test_port.py",
                        "test_login.py"
                    ]
                },
                "tests": [
                    "test_crud.py",
                    "test_crud_v2.py", 
                    "test_crud_v3.py",
                    "test_frontend_crud.py",
                    "TEST_FINAL_DEFINITIVO.py",
                    "final_system_test.py",
                    "full_system_test.py",
                    "audit_system.py",
                    "final_check.py"
                ],
                "config": [
                    "config (1).py"  # Mover como backup
                ]
            },
            "docs": {
                "mcp": [
                    "MCP_AUDIT_REPORT.md",
                    "MCP_AUDIT_FINAL.txt", 
                    "MCP_CORRECTIONS_COMPLETE.txt",
                    "MCP_APPLY_FIXES.py",
                    "MCP_REPAIR_SCRIPT.ps1"
                ],
                "project": [
                    "RESUMEN_FINAL_TRABAJO.md",
                    "SISTEMA_100_PERCENT.txt",
                    "SISTEMA_COMPLETO_REPORTE.md",
                    "ORGANIZACION_Y_BACKUP.md"
                ],
                "reports": [
                    "TEST_100_PERCENT.py",
                    "TEST_EVERYTHING_FINAL.py"
                ]
            },
            "archive": {
                "old_logs": [
                    "backend_error.log",
                    "security.log",
                    "npu_bridge.log"
                ],
                "temp_files": [
                    "api_test_results.json",
                    "test_final_results_84445.json",
                    "test_report.pdf",
                    "test_token.txt",
                    "db_audit_report.json"
                ]
            }
        }
    
    def create_structure(self):
        """Crea estructura de carpetas"""
        print("📁 Creando estructura de carpetas...")
        
        for main_dir, subdirs in self.structure.items():
            main_path = self.project_root / main_dir
            main_path.mkdir(exist_ok=True)
            
            if isinstance(subdirs, dict):
                for subdir, files in subdirs.items():
                    subdir_path = main_path / subdir
                    subdir_path.mkdir(exist_ok=True)
            else:
                # Para archivos directos
                pass
        
        print("✅ Estructura creada")
    
    def move_file(self, source, target_dir, filename=None):
        """Mueve archivo a directorio destino"""
        source_path = self.project_root / source
        
        if not source_path.exists():
            return f"Archivo no encontrado: {source}"
        
        target_path = self.project_root / target_dir
        target_path.mkdir(parents=True, exist_ok=True)
        
        # Usar nombre original o especificado
        final_name = filename or source_path.name
        final_path = target_path / final_name
        
        # Si ya existe, añadir timestamp
        if final_path.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            name, ext = os.path.splitext(final_name)
            final_name = f"{name}_{timestamp}{ext}"
            final_path = target_path / final_name
        
        try:
            shutil.move(str(source_path), str(final_path))
            self.moved_files.append({
                "from": str(source),
                "to": str(final_path)
            })
            return f"Movido: {source} → {target_dir}/{final_name}"
        except Exception as e:
            self.errors.append(f"Error moviendo {source}: {e}")
            return f"❌ Error: {e}"
    
    def organize_files(self):
        """Organiza archivos según estructura"""
        print("\n🔄 Organizando archivos...")
        
        # Backend scripts
        backend_path = Path("backend")
        
        # Scripts de mantenimiento
        for script in self.structure["backend"]["scripts"]["maintenance"]:
            self.move_file(backend_path / script, "backend/scripts/maintenance")
        
        # Scripts de monitoreo
        for script in self.structure["backend"]["scripts"]["monitoring"]:
            self.move_file(backend_path / script, "backend/scripts/monitoring")
        
        # Scripts de utilidades
        for script in self.structure["backend"]["scripts"]["utilities"]:
            self.move_file(backend_path / script, "backend/scripts/utilities")
        
        # Tests
        for test in self.structure["backend"]["tests"]:
            self.move_file(backend_path / test, "backend/tests")
        
        # Config backup
        self.move_file(backend_path / "config (1).py", "backend/config", "config_backup.py")
        
        # Documentación MCP
        for doc in self.structure["docs"]["mcp"]:
            self.move_file(doc, "docs/mcp")
        
        # Documentación del proyecto
        for doc in self.structure["docs"]["project"]:
            self.move_file(doc, "docs/project")
        
        # Reportes
        for doc in self.structure["docs"]["reports"]:
            self.move_file(doc, "docs/reports")
        
        # Archivos antiguos
        for log in self.structure["archive"]["old_logs"]:
            self.move_file(log, "archive/old_logs")
        
        for temp in self.structure["archive"]["temp_files"]:
            self.move_file(temp, "archive/temp_files")
    
    def create_index_files(self):
        """Crea archivos índice en carpetas importantes"""
        print("\n📄 Creando archivos índice...")
        
        # Índice de scripts
        scripts_index = {
            "maintenance": [
                "db_audit_and_seed.py - Auditoría y seed de BD",
                "db_maintenance.py - Mantenimiento de base de datos",
                "fix_villaluz_db.py - Reparaciones de BD",
                "seed_100.py - Seed de 100 registros",
                "seed_test_users.py - Usuarios de prueba",
                "sync_schema.py - Sincronización de esquema",
                "migrate_analytics.py - Migración de analytics",
                "create_tables.py - Creación de tablas"
            ],
            "monitoring": [
                "monitor_system.py - Monitoreo del sistema",
                "dashboard_cli.py - Dashboard CLI",
                "api_docs_generator.py - Generador de docs API",
                "check_ollama.py - Verificación Ollama",
                "stress_test.py - Pruebas de estrés"
            ],
            "utilities": [
                "check_users.py - Verificación de usuarios",
                "list_users.py - Listado de usuarios",
                "reset_pass.py - Reset de contraseña",
                "reset_passwords.py - Reset de contraseñas",
                "verify_pass.py - Verificación de contraseña",
                "verify_data_integrity.py - Verificación de integridad",
                "inspect_db.py - Inspección de BD",
                "test_db_conn.py - Test conexión BD",
                "test_redis_conn.py - Test conexión Redis",
                "test_port.py - Test de puertos",
                "test_login.py - Test de login"
            ]
        }
        
        with open(self.project_root / "backend/scripts/README.md", 'w') as f:
            f.write("# Backend Scripts\n\n")
            for category, scripts in scripts_index.items():
                f.write(f"## {category.title()}\n\n")
                for script in scripts:
                    f.write(f"- {script}\n")
                f.write("\n")
        
        # Índice de tests
        with open(self.project_root / "backend/tests/README.md", 'w') as f:
            f.write("# Backend Tests\n\n")
            f.write("## Tests CRUD\n")
            f.write("- test_crud.py - Test básico CRUD\n")
            f.write("- test_crud_v2.py - Test CRUD v2\n")
            f.write("- test_crud_v3.py - Test CRUD v3\n")
            f.write("- test_frontend_crud.py - Test CRUD desde frontend\n\n")
            f.write("## Tests Sistema\n")
            f.write("- TEST_FINAL_DEFINITIVO.py - Test final definitivo\n")
            f.write("- final_system_test.py - Test final del sistema\n")
            f.write("- full_system_test.py - Test completo del sistema\n")
            f.write("- audit_system.py - Auditoría del sistema\n")
            f.write("- final_check.py - Verificación final\n")
    
    def generate_report(self):
        """Genera reporte de organización"""
        print("\n📊 Generando reporte...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "moved_files": self.moved_files,
            "errors": self.errors,
            "summary": {
                "files_moved": len(self.moved_files),
                "errors": len(self.errors)
            }
        }
        
        report_path = self.project_root / "docs" / "organization_report.json"
        report_path.parent.mkdir(exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Reporte guardado: {report_path}")
        
        return report
    
    def run_organization(self):
        """Ejecuta organización completa"""
        print("=" * 70)
        print("  PROJECT ORGANIZER - VILLA LUZ")
        print("=" * 70)
        
        # Crear estructura
        self.create_structure()
        
        # Organizar archivos
        self.organize_files()
        
        # Crear índices
        self.create_index_files()
        
        # Generar reporte
        report = self.generate_report()
        
        # Resumen
        print("\n" + "=" * 70)
        print("  ORGANIZACIÓN COMPLETADA")
        print("=" * 70)
        print(f"✅ Archivos movidos: {report['summary']['files_moved']}")
        print(f"❌ Errores: {report['summary']['errors']}")
        
        if self.errors:
            print("\n⚠️ Errores encontrados:")
            for error in self.errors:
                print(f"   - {error}")
        
        print("\n📁 Nueva estructura creada:")
        print("   📁 backend/scripts/     - Scripts organizados")
        print("   📁 backend/tests/       - Tests centralizados")
        print("   📁 docs/mcp/            - Documentación MCP")
        print("   📁 docs/project/        - Docs del proyecto")
        print("   📁 archive/             - Archivos históricos")
        
        print("\n🎯 Sugerencia: Ejecutar backup después de organizar")
        print("   python scripts/backup/auto_backup.py --type snapshot --description 'Post-organization'")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Organizador de Proyecto - Villa Luz")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin mover archivos")
    
    args = parser.parse_args()
    
    organizer = ProjectOrganizer()
    
    if args.dry_run:
        print("🔍 MODO SIMULACIÓN - No se moverán archivos")
        # TODO: Implementar modo simulación
    else:
        organizer.run_organization()

if __name__ == "__main__":
    main()
