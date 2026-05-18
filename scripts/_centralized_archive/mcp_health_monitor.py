#!/usr/bin/env python3
"""
MCP Health Monitor & Auto-Recovery System
Supervisa y mantiene vivos los servicios MCP de DevBrain

Uso:
    python mcp_health_monitor.py [--config PATH] [--interval SECONDS]

Ejemplos:
    # Monitoreo básico cada 30 segundos
    python mcp_health_monitor.py
    
    # Con configuración personalizada
    python mcp_health_monitor.py --config ~/.windsurf/mcp_config.json --interval 60
    
    # Ejecutar como servicio (background)
    pythonw mcp_health_monitor.py --daemon
"""

import subprocess
import json
import time
import sys
import os
import argparse
import signal
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Any


class MCPHealthMonitor:
    """
    Monitor de salud para servidores MCP (Model Context Protocol)
    
    Características:
    - Detecta MCPs caídos por transport closed
    - Reinicia automáticamente procesos fallidos
    - Mantiene logs de actividad
    - Soporta múltiples transportes (stdio, sse, websocket)
    """
    
    def __init__(self, config_path: Optional[str] = None, interval: int = 30):
        self.config_path = config_path or self._find_mcp_config()
        self.interval = interval
        self.mcp_processes: Dict[str, Dict[str, Any]] = {}
        self.health_status: Dict[str, Dict[str, Any]] = {}
        self.running = False
        
        # Configurar signal handlers para shutdown graceful
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Crear directorio de logs
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        
    def _signal_handler(self, signum, frame):
        """Maneja señales de terminación"""
        self.log("Señal de terminación recibida, deteniendo...")
        self.running = False
        
    def _find_mcp_config(self) -> Optional[str]:
        """Busca configuración MCP en ubicaciones comunes"""
        possible_paths = [
            Path.home() / ".windsurf" / "mcp_config.json",
            Path.home() / ".cursor" / "mcp_config.json", 
            Path.home() / ".vscode" / "mcp_config.json",
            Path.cwd() / ".windsurf" / "mcp_config.json",
            Path.cwd().parent / ".windsurf" / "mcp_config.json",
            Path("C:/") / "ProgramData" / "windsurf" / "mcp_config.json",
        ]
        
        for path in possible_paths:
            if path.exists():
                self.log(f"Configuración MCP encontrada: {path}")
                return str(path)
                
        self.log("ADVERTENCIA: No se encontró configuración MCP", level="WARN")
        return None
    
    def log(self, message: str, level: str = "INFO", mcp_name: str = None):
        """Escribe log a consola y archivo"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = f"[{timestamp}] [{level}]"
        if mcp_name:
            prefix += f" [{mcp_name}]"
            
        full_message = f"{prefix} {message}"
        print(full_message)
        
        # Escribir a archivo
        log_file = self.log_dir / "mcp_monitor.log"
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(full_message + "\n")
        except Exception as e:
            print(f"[ERROR] No se pudo escribir log: {e}")
    
    def load_mcp_config(self) -> dict:
        """Carga configuración de MCPs desde archivo JSON"""
        if not self.config_path:
            return {}
            
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                self.log(f"Configuración cargada: {len(config.get('mcpServers', {}))} MCPs")
                return config
        except FileNotFoundError:
            self.log(f"Archivo no encontrado: {self.config_path}", level="ERROR")
            return {}
        except json.JSONDecodeError as e:
            self.log(f"JSON inválido: {e}", level="ERROR")
            return {}
        except Exception as e:
            self.log(f"Error cargando config: {e}", level="ERROR")
            return {}
    
    def check_mcp_health_stdio(self, name: str, mcp_config: dict) -> bool:
        """
        Verifica salud de MCP usando transporte STDIO
        
        Estrategia: Intenta ejecutar el comando con --version o --help
        para verificar que el binario existe y responde
        """
        try:
            command = mcp_config.get('command', '')
            args = mcp_config.get('args', [])
            
            if not command:
                return False
                
            # Construir comando de prueba
            test_args = args[:1] if args else []
            
            # Verificar que el comando existe
            if command.startswith('node') or command.startswith('python'):
                # Es un intérprete, verificar que el script existe
                if test_args:
                    script_path = test_args[0]
                    if not os.path.exists(script_path):
                        self.log(f"Script no encontrado: {script_path}", level="ERROR", mcp_name=name)
                        return False
            elif not shutil.which(command):
                self.log(f"Comando no encontrado: {command}", level="ERROR", mcp_name=name)
                return False
            
            # Intentar ejecutar versión corta
            test_cmd = [command] + test_args + ['--version']
            
            result = subprocess.run(
                test_cmd,
                capture_output=True,
                timeout=10,
                text=True,
                env={**os.environ, **mcp_config.get('env', {})}
            )
            
            is_healthy = result.returncode == 0
            
            if not is_healthy:
                self.log(f"Health check falló: {result.stderr[:100]}", level="WARN", mcp_name=name)
                
            return is_healthy
            
        except subprocess.TimeoutExpired:
            self.log("Timeout en health check", level="WARN", mcp_name=name)
            return False
        except FileNotFoundError:
            self.log(f"Comando no encontrado: {command}", level="ERROR", mcp_name=name)
            return False
        except Exception as e:
            self.log(f"Error en health check: {e}", level="ERROR", mcp_name=name)
            return False
    
    def check_mcp_health_sse(self, name: str, url: str) -> bool:
        """Verifica salud de MCP usando transporte SSE (Server-Sent Events)"""
        try:
            import urllib.request
            
            req = urllib.request.Request(
                url,
                headers={'Accept': 'text/event-stream'}
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status == 200
                
        except Exception as e:
            self.log(f"Health check SSE falló: {e}", level="WARN", mcp_name=name)
            return False
    
    def check_mcp_health(self, name: str, mcp_config: dict) -> bool:
        """
        Verifica salud de un MCP usando la estrategia apropiada
        según el tipo de transporte
        """
        # Detectar tipo de transporte
        if 'url' in mcp_config:
            # Transporte SSE/WebSocket
            return self.check_mcp_health_sse(name, mcp_config['url'])
        else:
            # Transporte STDIO (default)
            return self.check_mcp_health_stdio(name, mcp_config)
    
    def start_mcp_stdio(self, name: str, mcp_config: dict) -> bool:
        """Inicia un proceso MCP con transporte STDIO"""
        try:
            command = mcp_config.get('command')
            args = mcp_config.get('args', [])
            env_vars = mcp_config.get('env', {})
            
            if not command:
                self.log("No hay comando definido", level="ERROR", mcp_name=name)
                return False
            
            # Preparar environment
            full_env = {**os.environ, **env_vars}
            
            # Iniciar proceso
            self.log(f"Iniciando: {command} {' '.join(args[:2])}...", mcp_name=name)
            
            process = subprocess.Popen(
                [command] + args,
                env=full_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                # Crear nuevo grupo de procesos para poder matarlo limpiamente
                start_new_session=True
            )
            
            # Esperar un momento para verificar que no falló inmediatamente
            time.sleep(1)
            
            if process.poll() is not None:
                # El proceso ya terminó (error al iniciar)
                stdout, stderr = process.communicate()
                self.log(f"Fallo inmediato: {stderr[:200]}", level="ERROR", mcp_name=name)
                return False
            
            self.mcp_processes[name] = {
                'process': process,
                'pid': process.pid,
                'started_at': datetime.now().isoformat(),
                'config': mcp_config,
                'transport': 'stdio'
            }
            
            self.log(f"Iniciado correctamente (PID: {process.pid})", mcp_name=name)
            return True
            
        except Exception as e:
            self.log(f"Error iniciando: {e}", level="ERROR", mcp_name=name)
            return False
    
    def stop_mcp(self, name: str) -> bool:
        """Detiene un proceso MCP de forma segura"""
        if name not in self.mcp_processes:
            return True
            
        try:
            process_info = self.mcp_processes[name]
            process = process_info.get('process')
            pid = process_info.get('pid')
            
            if process:
                # Verificar si sigue corriendo
                if process.poll() is None:
                    self.log(f"Deteniendo (PID: {pid})...", mcp_name=name)
                    
                    # Intentar terminación graceful
                    process.terminate()
                    
                    try:
                        process.wait(timeout=5)
                        self.log("Detenido gracefulmente", mcp_name=name)
                    except subprocess.TimeoutExpired:
                        # Forzar kill
                        self.log("Forzando kill...", level="WARN", mcp_name=name)
                        process.kill()
                        process.wait()
                else:
                    self.log("Proceso ya había terminado", mcp_name=name)
            
            # Limpiar de nuestro registro
            del self.mcp_processes[name]
            
            # Actualizar estado de salud
            if name in self.health_status:
                self.health_status[name]['running'] = False
                
            return True
            
        except Exception as e:
            self.log(f"Error deteniendo: {e}", level="ERROR", mcp_name=name)
            return False
    
    def restart_mcp(self, name: str, mcp_config: dict) -> bool:
        """Reinicia un MCP"""
        self.log("Reiniciando...", mcp_name=name)
        self.stop_mcp(name)
        time.sleep(2)  # Esperar entre stop y start
        return self.start_mcp_stdio(name, mcp_config)
    
    def get_status_report(self) -> dict:
        """Genera reporte de estado de todos los MCPs"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'config_path': self.config_path,
            'interval': self.interval,
            'mcps': {}
        }
        
        for name, status in self.health_status.items():
            process_info = self.mcp_processes.get(name, {})
            process = process_info.get('process')
            
            is_running = process and process.poll() is None
            
            report['mcps'][name] = {
                'healthy': status.get('healthy', False),
                'running': is_running,
                'pid': process_info.get('pid'),
                'started_at': process_info.get('started_at'),
                'last_check': status.get('last_check'),
                'last_error': status.get('last_error')
            }
            
        return report
    
    def save_status_report(self):
        """Guarda reporte de estado a archivo JSON"""
        try:
            report = self.get_status_report()
            report_file = self.log_dir / "mcp_status.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2)
        except Exception as e:
            self.log(f"Error guardando reporte: {e}", level="ERROR")
    
    def monitor_loop(self):
        """Loop principal de monitoreo"""
        config = self.load_mcp_config()
        mcp_servers = config.get('mcpServers', {})
        
        if not mcp_servers:
            self.log("No hay MCPs configurados para monitorear", level="ERROR")
            return
        
        self.log(f"=== MCP Health Monitor Iniciado ===")
        self.log(f"MCPs a monitorear: {list(mcp_servers.keys())}")
        self.log(f"Intervalo: {self.interval}s")
        self.log(f"Logs en: {self.log_dir}")
        self.log(f"Presiona Ctrl+C para detener\n")
        
        self.running = True
        
        try:
            while self.running:
                for name, mcp_config in mcp_servers.items():
                    if not self.running:
                        break
                        
                    is_healthy = self.check_mcp_health(name, mcp_config)
                    
                    # Actualizar estado
                    self.health_status[name] = {
                        'healthy': is_healthy,
                        'last_check': datetime.now().isoformat(),
                        'last_error': None if is_healthy else 'Health check failed'
                    }
                    
                    if is_healthy:
                        status_icon = "✓"
                        level = "INFO"
                    else:
                        status_icon = "✗"
                        level = "WARN"
                        
                        # Intentar reiniciar
                        self.log(f"{status_icon} No saludable, reiniciando...", level=level, mcp_name=name)
                        success = self.restart_mcp(name, mcp_config)
                        
                        if success:
                            self.log("✓ Reinicio exitoso", mcp_name=name)
                        else:
                            self.log("✗ Reinicio fallido", level="ERROR", mcp_name=name)
                    else:
                        self.log(f"{status_icon} Saludable", mcp_name=name)
                
                # Guardar reporte de estado
                self.save_status_report()
                
                # Esperar siguiente ciclo
                if self.running:
                    time.sleep(self.interval)
                    
        except KeyboardInterrupt:
            self.log("\nDetención manual solicitada...")
        finally:
            self.shutdown()
    
    def shutdown(self):
        """Limpieza al detener el monitor"""
        self.log("=== Deteniendo MCP Health Monitor ===")
        
        # Detener todos los MCPs iniciados por nosotros
        for name in list(self.mcp_processes.keys()):
            self.stop_mcp(name)
        
        self.log("Monitor detenido")
        self.save_status_report()


def main():
    """Punto de entrada principal"""
    parser = argparse.ArgumentParser(
        description='MCP Health Monitor - Supervisa y mantiene vivos los servidores MCP'
    )
    parser.add_argument(
        '--config', '-c',
        help='Ruta al archivo de configuración MCP (mcp_config.json)',
        default=None
    )
    parser.add_argument(
        '--interval', '-i',
        type=int,
        help='Intervalo de monitoreo en segundos (default: 30)',
        default=30
    )
    parser.add_argument(
        '--daemon', '-d',
        action='store_true',
        help='Ejecutar en modo daemon (background)'
    )
    
    args = parser.parse_args()
    
    # Validar argumentos
    if args.interval < 5:
        print("ERROR: El intervalo mínimo es 5 segundos")
        sys.exit(1)
    
    # Crear e iniciar monitor
    monitor = MCPHealthMonitor(
        config_path=args.config,
        interval=args.interval
    )
    
    if args.daemon:
        # En Windows, pythonw no tiene consola
        if sys.platform == 'win32':
            import ctypes
            ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
    
    # Iniciar loop de monitoreo
    monitor.monitor_loop()


if __name__ == '__main__':
    main()
