#!/usr/bin/env python3
"""
Setup Organizer & Backup - Villa Luz
Implementación completa de organización y backup en un solo paso
"""

import sys
from pathlib import Path


def main():
    print("=" * 70)
    print("  SETUP ORGANIZER & BACKUP - VILLA LUZ")
    print("=" * 70)

    project_root = Path(__file__).parent.parent

    print(f"\n📁 Proyecto: {project_root}")

    # Paso 1: Organizar archivos
    print("\n🔧 PASO 1: Organizando archivos...")
    try:
        sys.path.append(str(project_root))
        from scripts.tools.organize_project import ProjectOrganizer

        organizer = ProjectOrganizer(project_root)
        organizer.run_organization()
        print("✅ Organización completada")
    except Exception as e:
        print(f"❌ Error en organización: {e}")
        return False

    # Paso 2: Crear primer backup
    print("\n💾 PASO 2: Creando backup inicial...")
    try:
        sys.path.append(str(project_root / "scripts" / "backup"))
        from auto_backup import BackupSystem

        backup = BackupSystem(project_root)
        backup.create_backup(
            backup_type="snapshot",
            description="Post-organization backup",
            tags=["organization", "initial"],
        )
        print("✅ Backup inicial creado")
    except Exception as e:
        print(f"❌ Error en backup: {e}")
        return False

    # Paso 3: Configurar tareas programadas
    print("\n📅 PASO 3: Configurando tareas programadas...")
    print("⚠️ Ejecute los siguientes comandos como Administrador:")
    print()

    # Backup diario
    daily_cmd = f'schtasks /create /tn "VillaLuz_Backup_daily" /tr "python \\"{project_root}\\scripts\\backup\\auto_backup.py\\" --type daily" /sc DAILY /st 02:00 /f'
    print("   # Backup diario (2:00 AM):")
    print(f"   {daily_cmd}")
    print()

    # Backup semanal
    weekly_cmd = f'schtasks /create /tn "VillaLuz_Backup_weekly" /tr "python \\"{project_root}\\scripts\\backup\\auto_backup.py\\" --type weekly" /sc WEEKLY /st 03:00 /f'
    print("   # Backup semanal (Domingo 3:00 AM):")
    print(f"   {weekly_cmd}")
    print()

    print("💡 O copie y ejecute el archivo setup_tasks.bat (creado a continuación)")

    # Paso 4: Crear batch file para facilitar setup
    batch_content = f"""@echo off
echo Configurando tareas programadas de backup - Villa Luz
echo.

echo Creando tarea de backup diario...
schtasks /create /tn "VillaLuz_Backup_daily" /tr "python \\"{project_root}\\scripts\\backup\\auto_backup.py\\" --type daily" /sc DAILY /st 02:00 /f

echo Creando tarea de backup semanal...
schtasks /create /tn "VillaLuz_Backup_weekly" /tr "python \\"{project_root}\\scripts\\backup\\auto_backup.py\\" --type weekly" /sc WEEKLY /st 03:00 /f

echo.
echo Tareas programadas configuradas!
echo.
echo Para verificar tareas:
echo   schtasks /query /tn "VillaLuz_Backup_daily"
echo   schtasks /query /tn "VillaLuz_Backup_weekly"
echo.
echo Para eliminar tareas:
echo   schtasks /delete /tn "VillaLuz_Backup_daily"
echo   schtasks /delete /tn "VillaLuz_Backup_weekly"
echo.
pause
"""

    batch_file = project_root / "scripts" / "backup" / "setup_tasks.bat"
    batch_file.parent.mkdir(parents=True, exist_ok=True)
    with open(batch_file, "w") as f:
        f.write(batch_content)

    print(f"✅ Archivo batch creado: {batch_file}")

    # Paso 5: Crear快捷方式
    print("\n📋 PASO 5: Creando atajos...")

    shortcuts = {
        "Backup Manual": f'python "{project_root}\\scripts\\backup\\auto_backup.py" --type snapshot --description "Backup manual"',
        "Ver Backups": f'python "{project_root}\\scripts\\backup\\restore.py" --list',
        "Restaurar Backup": f'python "{project_root}\\scripts\\backup\\restore.py"',
    }

    shortcuts_file = project_root / "scripts" / "backup" / "shortcuts.txt"
    with open(shortcuts_file, "w") as f:
        f.write("# Atajos de Backup - Villa Luz\n\n")
        for name, cmd in shortcuts.items():
            f.write(f"# {name}\n")
            f.write(f"{cmd}\n\n")

    print(f"✅ Atajos guardados en: {shortcuts_file}")

    # Resumen final
    print("\n" + "=" * 70)
    print("  SETUP COMPLETADO")
    print("=" * 70)
    print("✅ Organización: Archivos reorganizados en carpetas")
    print("✅ Backup: Sistema de backup versionado activo")
    print("✅ Tareas: Listas para configurar (ejecute setup_tasks.bat)")
    print()
    print("📁 Estructura creada:")
    print("   📁 backend/scripts/          - Scripts organizados")
    print("   📁 backend/tests/            - Tests centralizados")
    print("   📁 docs/mcp/                 - Documentación MCP")
    print("   📁 docs/project/             - Docs del proyecto")
    print("   📁 Documentos/Backups/VillaLuz - Sistema de backup externo")
    print("   📁 archive/                  - Archivos históricos")
    print()
    print("🚀 Próximos pasos:")
    print("   1. Ejecute setup_tasks.bat como Administrador")
    print("   2. Verifique backups con: python scripts/backup/restore.py --list")
    print("   3. Pruebe restauración: python scripts/backup/restore.py")
    print()
    print("💡 Comandos útiles:")
    print("   # Backup manual:")
    print(
        "   python scripts/backup/auto_backup.py --type snapshot --description 'Antes de cambios'"
    )
    print()
    print("   # Ver backups:")
    print("   python scripts/backup/restore.py --list")
    print()
    print("   # Restaurar interactivo:")
    print("   python scripts/backup/restore.py")
    print()
    print("🎯 Sistema listo para uso con backup automático!")


if __name__ == "__main__":
    main()
