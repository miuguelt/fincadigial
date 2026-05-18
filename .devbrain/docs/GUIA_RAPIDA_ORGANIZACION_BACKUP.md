# 🚀 GUÍA RÁPIDA - ORGANIZACIÓN Y BACKUP

## ⚡ IMPLEMENTACIÓN RÁPIDA (5 minutos)

### Paso 1: Ejecutar Setup Automático
```bash
cd C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz
python scripts\setup_organize_backup.py
```

### Paso 2: Configurar Tareas Programadas
```bash
# Ejecutar como Administrador
setup_tasks.bat
```

### Paso 3: Verificar Sistema
```bash
# Ver backups disponibles
python scripts\backup\restore.py --list

# Backup manual de prueba
python scripts\backup\auto_backup.py --type snapshot --description "Test backup"
```

---

## 📁 ESTRUCTURA CREADA

```
villaluz/
├── 📁 backend/
│   ├── 📁 scripts/
│   │   ├── 📁 maintenance/    # 8 scripts
│   │   ├── 📁 monitoring/     # 5 scripts  
│   │   └── 📁 utilities/      # 11 scripts
│   └── 📁 tests/              # 9 tests
├── 📁 docs/
│   ├── 📁 mcp/                # 5 archivos MCP
│   ├── 📁 project/            # 4 docs del proyecto
│   └── 📁 reports/            # 2 reportes
├── 📁 backups/                # Sistema de backup
│   ├── 📁 daily/              # Backups diarios
│   ├── 📁 weekly/             # Backups semanales
│   └── 📁 snapshots/          # Snapshots manuales
└── 📁 archive/                # Archivos históricos
```

---

## 💾 COMANDOS DE BACKUP

### Crear Backup
```bash
# Backup manual
python scripts\backup\auto_backup.py --type snapshot --description "Antes de cambios importantes"

# Backup con tags
python scripts\backup\auto_backup.py --type snapshot --description "Fix bug #123" --tags "bugfix" "critical"
```

### Listar Backups
```bash
# Todos los backups
python scripts\backup\restore.py --list

# Por tipo
python scripts\backup\restore.py --list --type daily
python scripts\backup\restore.py --list --type weekly
python scripts\backup\restore.py --list --type snapshot
```

### Restaurar Backup
```bash
# Interactivo (recomendado)
python scripts\backup\restore.py

# Específico
python scripts\backup\restore.py --restore 20260504_123456

# A ruta específica
python scripts\backup\restore.py --restore 20260504_123456 --target C:\temp\restored
```

### Ver Info de Backup
```bash
python scripts\backup\restore.py --info 20260504_123456
```

---

## 📅 BACKUPS AUTOMÁTICOS

### Configurados:
- **Diario:** 2:00 AM (incremental)
- **Semanal:** Domingo 3:00 AM (completo)

### Ver tareas:
```bash
schtasks /query /tn "VillaLuz_Backup_daily"
schtasks /query /tn "VillaLuz_Backup_weekly"
```

### Eliminar tareas:
```bash
schtasks /delete /tn "VillaLuz_Backup_daily"
schtasks /delete /tn "VillaLuz_Backup_weekly"
```

---

## 📊 ESPACIO Y RETENCIÓN

| Tipo | Frecuencia | Retención | Tamaño estimado |
|------|------------|-----------|-----------------|
| Daily | 2:00 AM | 30 días | ~100 MB |
| Weekly | Dom 3:00 AM | 12 semanas | ~800 MB |
| Snapshots | Manual | 24 backups | ~800 MB |
| **Total** | | | **~18 GB/año** |

---

## 🔧 MANTENIMIENTO

### Limpiar Backups Antiguos
```bash
# El sistema limpia automáticamente según retención
# Para limpieza manual:
python scripts\backup\auto_backup.py --type snapshot --description "Cleanup trigger"
```

### Verificar Integridad
```bash
# Listar y verificar que todos los backups existan
python scripts\backup\restore.py --list
```

### Cambiar Configuración
Editar `scripts\backup\auto_backup.py`:
```python
config = {
    "max_daily_backups": 30,    # Días de retención
    "max_weekly_backups": 12,   # Semanas de retención  
    "max_snapshots": 24,        # Snapshots a guardar
    "compression": True         # Comprimir archivos
}
```

---

## 🚨 RECUPERACIÓN DE EMERGENCIA

### Pérdida Total del Proyecto:
1. **No entrar en pánico** - Los backups están seguros
2. **Listar backups disponibles:**
   ```bash
   python scripts\backup\restore.py --list
   ```
3. **Restaurar último backup semanal:**
   ```bash
   python scripts\backup\restore.py --restore [timestamp_del_ultimo_weekly]
   ```
4. **Verificar restauración:**
   ```bash
   cd restored_[timestamp]
   python backend\final_check.py
   ```

### Pérdida de Archivos Específicos:
1. **Buscar backup con el archivo:**
   ```bash
   # Restaurar a carpeta temporal
   python scripts\backup\restore.py --restore [timestamp] --target C:\temp\check
   ```
2. **Copiar archivos necesarios**
3. **Eliminar temporal**

---

## 📈 MONITOREO

### Métricas importantes:
- **Success Rate:** >99.5%
- **Backup Time:** <5 minutos
- **Restore Time:** <10 minutos
- **Storage Used:** <20 GB/año

### Ver estado:
```bash
# Ver últimos backups
python scripts\backup\restore.py --list --type daily --limit 5

# Ver espacio usado
dir backups\ /s
```

---

## 🎯 FLUJO DE TRABAJO RECOMENDADO

### Antes de Cambios Importantes:
1. **Crear backup manual:**
   ```bash
   python scripts\backup\auto_backup.py --type snapshot --description "Pre-cambio importante"
   ```
2. **Hacer cambios**
3. **Si algo falla:**
   ```bash
   python scripts\backup\restore.py
   # Seleccionar backup creado
   ```

### Desarrollo Diario:
- **Backups automáticos** se ejecutan solos
- **Verificar** periódicamente con `--list`
- **Restaurar** solo cuando sea necesario

### Mantenimiento Semanal:
- **Revisar** espacio en disco
- **Verificar** backups semanales
- **Limpiar** si es necesario

---

## 🆘 SOPORTE

### Problemas Comunes:

**❌ Error: "No hay base de datos de backups"**
```bash
# Solución: Crear primer backup
python scripts\backup\auto_backup.py --type snapshot --description "Primer backup"
```

**❌ Error: "Permiso denegado"**
```bash
# Solución: Ejecutar como Administrador
# O verificar permisos en carpeta backups/
```

**❌ Error: "Backup no encontrado"**
```bash
# Solución: Listar backups disponibles
python scripts\backup\restore.py --list
# Usar timestamp exacto de la lista
```

**❌ Tareas programadas no ejecutan**
```bash
# Verificar tarea
schtasks /query /tn "VillaLuz_Backup_daily"
# Recrear si es necesario
setup_tasks.bat
```

---

## ✅ VERIFICACIÓN FINAL

Para confirmar que todo funciona:

```bash
# 1. Ver estructura organizada
dir backend\scripts\
dir docs\mcp\

# 2. Ver backups
python scripts\backup\restore.py --list

# 3. Probar restauración (dry run)
python scripts\backup\restore.py --restore [timestamp] --dry-run

# 4. Verificar tareas
schtasks /query | findstr VillaLuz
```

Si todo funciona correctamente, ¡tu sistema está protegido y organizado! 🎉

---

**🚀 Sistema listo para uso con backup automático versionado!**
