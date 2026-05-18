"""
Dashboard de monitoreo de seguridad
"""

from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt
from app.utils.response_handler import APIResponse
from app.utils.validators import SecurityValidator
from app.utils.rbac import require_permission
from datetime import datetime, timedelta, timezone
import logging
import os
import json

security_ns = Namespace(
    'security',
    description='🔐 Monitoreo y Dashboard de Seguridad',
    path='/security'
)

logger = logging.getLogger(__name__)

security_metrics_model = security_ns.model('SecurityMetrics', {
    'total_login_attempts': fields.Integer(description='Total de intentos de login'),
    'failed_login_attempts': fields.Integer(description='Intentos de login fallidos'),
    'success_rate': fields.Float(description='Tasa de éxito de autenticación'),
    'suspicious_activities': fields.Integer(description='Actividades sospechosas detectadas'),
    'rate_limit_violations': fields.Integer(description='Violaciones de rate limit'),
    'malicious_content_blocks': fields.Integer(description='Contenido malicioso bloqueado'),
    'active_sessions': fields.Integer(description='Sesiones activas'),
    'last_security_scan': fields.String(description='Último escaneo de seguridad')
})

@security_ns.route('/metrics')
class SecurityMetricsResource(Resource):
    @security_ns.doc('get_security_metrics', description='Métricas de seguridad')
    @require_permission('security', 'read')
    def get(self):
        try:
            metrics = analyze_security_logs()
            return APIResponse.success(data=metrics, message='Métricas de seguridad obtenidas exitosamente')
        except Exception as e:
            logger.error('Error obteniendo métricas de seguridad: %s', e, exc_info=True)
            return APIResponse.error('Error obteniendo métricas de seguridad', details={'error': str(e)}, status_code=500)

@security_ns.route('/audit')
class SecurityAuditResource(Resource):
    @security_ns.doc('get_security_audit', description='Logs de auditoría de seguridad')
    @require_permission('security', 'read')
    def get(self):
        """Endpoint de auditoría requerido por tests de integración."""
        try:
            alerts = get_recent_security_alerts()
            return APIResponse.success(data=alerts, message='Logs de auditoría obtenidos')
        except Exception as e:
            return APIResponse.error('Error en auditoría', details={'error': str(e)}, status_code=500)

@security_ns.route('/alerts')
class SecurityAlertsResource(Resource):
    @security_ns.doc('get_security_alerts',
                    description='Obtener alertas de seguridad recientes')
    @require_permission('security', 'read')
    def get(self):
        """Obtener alertas de seguridad del último período"""
        try:
            alerts = get_recent_security_alerts()
            
            return APIResponse.success(
                data=alerts,
                message='Alertas de seguridad obtenidas exitosamente'
            )
            
        except Exception as e:
            logger.error(f"Error obteniendo alertas de seguridad: {e}")
            return APIResponse.error(
                message='Error obteniendo alertas de seguridad',
                details={'error': str(e)},
                status_code=500
            )

@security_ns.route('/scan')
class SecurityScanResource(Resource):
    @security_ns.doc('run_security_scan',
                    description='Ejecutar escaneo de seguridad manual')
    @require_permission('security', 'update')
    def post(self):
        """Ejecutar escaneo de seguridad del sistema"""
        try:
            user_claims = get_jwt()
            
            # Ejecutar escaneo de seguridad
            scan_results = run_security_scan()
            
            # Log de la acción administrativa
            from app.utils.security_logger import log_admin_action
            log_admin_action(
                user_claims.get('id'),
                'SECURITY_SCAN',
                'System',
                changes={'scan_initiated': True}
            )
            
            return APIResponse.success(
                data=scan_results,
                message='Escaneo de seguridad completado'
            )
            
        except Exception as e:
            logger.error(f"Error ejecutando escaneo de seguridad: {e}")
            return APIResponse.error(
                message='Error ejecutando escaneo de seguridad',
                details={'error': str(e)},
                status_code=500
            )

def analyze_security_logs():
    """Analizar logs de seguridad y generar métricas"""
    metrics = {
        'total_login_attempts': 0,
        'failed_login_attempts': 0,
        'success_rate': 0.0,
        'suspicious_activities': 0,
        'rate_limit_violations': 0,
        'malicious_content_blocks': 0,
        'active_sessions': 0,
    'last_security_scan': datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    }
    
    try:
        # Leer logs de seguridad si existe el archivo
        security_log_path = 'security.log'
        if os.path.exists(security_log_path):
            with open(security_log_path, 'r') as f:
                lines = f.readlines()
                
            # Analizar las últimas 24 horas
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
            
            for line in lines:
                try:
                    if 'LOGIN_SUCCESS' in line:
                        metrics['total_login_attempts'] += 1
                    elif 'LOGIN_FAILED' in line:
                        metrics['total_login_attempts'] += 1
                        metrics['failed_login_attempts'] += 1
                    elif 'SUSPICIOUS_ACTIVITY' in line:
                        metrics['suspicious_activities'] += 1
                    elif 'RATE_LIMIT_EXCEEDED' in line:
                        metrics['rate_limit_violations'] += 1
                    elif 'malicious_content' in line.lower():
                        metrics['malicious_content_blocks'] += 1
                except Exception:
                    continue
            
            # Calcular tasa de éxito
            if metrics['total_login_attempts'] > 0:
                success_attempts = metrics['total_login_attempts'] - metrics['failed_login_attempts']
                metrics['success_rate'] = (success_attempts / metrics['total_login_attempts']) * 100
    
    except Exception as e:
        logger.error(f"Error analizando logs de seguridad: {e}")
    
    return metrics

def get_recent_security_alerts():
    """Obtener alertas de seguridad recientes"""
    alerts = []
    
    try:
        security_log_path = 'security.log'
        if os.path.exists(security_log_path):
            with open(security_log_path, 'r') as f:
                lines = f.readlines()
            
            # Obtener alertas de las últimas 24 horas
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
            
            for line in reversed(lines[-1000:]):  # Últimas 1000 líneas
                try:
                    if any(keyword in line for keyword in ['WARNING', 'ERROR', 'SUSPICIOUS']):
                        # Parsear información básica del log
                        parts = line.split(' - ')
                        if len(parts) >= 3:
                            timestamp_str = parts[0]
                            level = parts[2]
                            message = ' - '.join(parts[3:]) if len(parts) > 3 else ''
                            
                            alert = {
                                'timestamp': timestamp_str,
                                'level': level.strip(),
                                'message': message.strip()[:200],  # Limitar longitud
                                'type': determine_alert_type(line)
                            }
                            alerts.append(alert)
                            
                            if len(alerts) >= 50:  # Limitar a 50 alertas más recientes
                                break
                except Exception:
                    continue
    
    except Exception as e:
        logger.error(f"Error obteniendo alertas de seguridad: {e}")
    
    return alerts

def determine_alert_type(log_line):
    """Determinar el tipo de alerta basado en el contenido del log"""
    log_lower = log_line.lower()
    
    if 'login_failed' in log_lower:
        return 'FAILED_LOGIN'
    elif 'suspicious_activity' in log_lower:
        return 'SUSPICIOUS_ACTIVITY'
    elif 'rate_limit' in log_lower:
        return 'RATE_LIMIT'
    elif 'malicious' in log_lower:
        return 'MALICIOUS_CONTENT'
    elif 'unauthorized' in log_lower:
        return 'UNAUTHORIZED_ACCESS'
    elif 'error' in log_lower:
        return 'SYSTEM_ERROR'
    else:
        return 'GENERAL_WARNING'

def run_security_scan():
    """Ejecutar escaneo de seguridad del sistema"""
    scan_results = {
    'scan_time': datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
        'status': 'completed',
        'findings': [],
        'recommendations': []
    }
    
    try:
        # Verificar configuraciones de seguridad
        security_checks = [
            check_jwt_configuration,
            check_cors_configuration,
            check_rate_limiting,
            check_logging_configuration,
            check_database_security
        ]
        
        for check in security_checks:
            try:
                result = check()
                if result['status'] == 'warning' or result['status'] == 'error':
                    scan_results['findings'].append(result)
                    
                if 'recommendation' in result:
                    scan_results['recommendations'].append(result['recommendation'])
            except Exception as e:
                scan_results['findings'].append({
                    'check': check.__name__,
                    'status': 'error',
                    'message': f'Error ejecutando verificación: {str(e)}'
                })
    
    except Exception as e:
        logger.error(f"Error en escaneo de seguridad: {e}")
        scan_results['status'] = 'error'
        scan_results['error'] = str(e)
    
    return scan_results

def check_jwt_configuration():
    """Verificar configuración de JWT"""
    import flask
    
    result = {
        'check': 'JWT Configuration',
        'status': 'ok',
        'message': 'Configuración JWT correcta'
    }
    
    # Verificar que JWT_SECRET_KEY no sea el valor por defecto
    jwt_secret = flask.current_app.config.get('JWT_SECRET_KEY', '')
    if len(jwt_secret) < 32:
        result['status'] = 'error'
        result['message'] = 'JWT_SECRET_KEY es demasiado corto'
        result['recommendation'] = 'Usar una clave de al menos 32 caracteres'
    
    return result

def check_cors_configuration():
    """Verificar configuración CORS"""
    import flask
    
    result = {
        'check': 'CORS Configuration',
        'status': 'ok',
        'message': 'Configuración CORS correcta'
    }
    
    cors_origins = flask.current_app.config.get('CORS_ORIGINS', [])
    if '*' in cors_origins:
        result['status'] = 'warning'
        result['message'] = 'CORS permite todos los orígenes'
        result['recommendation'] = 'Restringir CORS a dominios específicos'
    
    return result

def check_rate_limiting():
    """Verificar configuración de rate limiting"""
    import flask
    
    result = {
        'check': 'Rate Limiting',
        'status': 'ok',
        'message': 'Rate limiting configurado'
    }
    
    if not flask.current_app.config.get('RATE_LIMIT_ENABLED', True):
        result['status'] = 'warning'
        result['message'] = 'Rate limiting deshabilitado'
        result['recommendation'] = 'Habilitar rate limiting para prevenir abuso'
    
    return result

def check_logging_configuration():
    """Verificar configuración de logging"""
    result = {
        'check': 'Security Logging',
        'status': 'ok',
        'message': 'Logging de seguridad configurado'
    }
    
    if not os.path.exists('security.log'):
        result['status'] = 'warning'
        result['message'] = 'No se encontró archivo de logs de seguridad'
        result['recommendation'] = 'Verificar que el logging de seguridad esté funcionando'
    
    return result

def check_database_security():
    """Verificar seguridad de base de datos"""
    import flask
    
    result = {
        'check': 'Database Security',
        'status': 'ok',
        'message': 'Configuración de base de datos segura'
    }
    
    db_uri = flask.current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if 'password' in db_uri.lower() and len(db_uri.split('password')[0]) < 50:
        result['status'] = 'warning'
        result['message'] = 'Contraseña de base de datos podría ser débil'
        result['recommendation'] = 'Usar contraseña fuerte para base de datos'
    
    return result
