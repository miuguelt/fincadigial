/**
 * Scripts de Validación de Seguridad (P3.3)
 * Validaciones de seguridad para inputs, archivos, y datos de usuario
 */

// ============================================================
// 1. Validación de Input y Sanitización
// ============================================================

/**
 * Sanitiza un string para prevenir XSS
 * Elimina tags HTML y caracteres peligrosos
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '')           // Eliminar tags HTML básicos
    .replace(/javascript:/gi, '')   // Eliminar protocolos javascript
    .replace(/on\w+=/gi, '')        // Eliminar event handlers
    .replace(/&/g, '&amp;')         // Escapar ampersands
    .replace(/"/g, '&quot;')        // Escapar comillas dobles
    .replace(/'/g, '&#x27;')        // Escapar comillas simples
    .trim();
}

/**
 * Valida que el input no contenga código malicioso
 */
export function containsMaliciousCode(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

// ============================================================
// 2. Validación de Contraseñas
// ============================================================

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

/**
 * Valida la fortaleza de una contraseña
 * Requisitos: mínimo 8 caracteres, mayúscula, minúscula, número, símbolo
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  } else {
    score += 20;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una mayúscula');
    suggestions.push('Agrega letras mayúsculas');
  } else {
    score += 20;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una minúscula');
    suggestions.push('Agrega letras minúsculas');
  } else {
    score += 20;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
    suggestions.push('Agrega números');
  } else {
    score += 20;
  }

  if (!/[!@#$%^&*()_+\-=\x5B\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Debe contener al menos un símbolo especial');
    suggestions.push('Agrega símbolos como !@#$%');
  } else {
    score += 20;
  }

  // Patrones comunes a evitar
  const commonPatterns = [
    /password/i, /123456/, /qwerty/i, /abc123/, /letmein/i,
    /welcome/i, /admin/i, /login/i, /user/i, /monkey/,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('La contraseña es demasiado común');
    score = Math.max(0, score - 30);
  }

  // Determinar fortaleza
  let strength: PasswordStrength = 'weak';
  if (score >= 80 && errors.length === 0) {
    strength = 'strong';
  } else if (score >= 60) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    strength,
    score,
    errors,
    suggestions,
  };
}

// ============================================================
// 3. Validación de Emails
// ============================================================

/**
 * Valida formato de email con regex seguro
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 compliant regex simplificado
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email) && email.length <= 254;
}

// ============================================================
// 4. Validación de Archivos
// ============================================================

export type FileType = 'image' | 'document' | 'spreadsheet' | 'pdf' | 'all';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

const ALLOWED_EXTENSIONS: Record<FileType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  document: ['doc', 'docx', 'txt', 'rtf'],
  spreadsheet: ['xls', 'xlsx', 'csv'],
  pdf: ['pdf'],
  all: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Valida un archivo para subida segura
 */
export function validateFile(
  file: File,
  allowedType: FileType = 'all',
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // Validar tamaño
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `El archivo excede el tamaño máximo de ${maxSize / (1024 * 1024)}MB`,
    };
  }

  // Validar extensión
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExtensions = ALLOWED_EXTENSIONS[allowedType];

  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowedExtensions.join(', ')}`,
    };
  }

  // Validar nombre (no debe contener caracteres peligrosos)
  const dangerousChars = /[<>"|?*]/;
  if (dangerousChars.test(file.name)) {
    return {
      isValid: false,
      error: 'El nombre del archivo contiene caracteres no permitidos',
    };
  }

  return { isValid: true };
}

// ============================================================
// 5. Rate Limiting Helper
// ============================================================

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Verifica si se puede realizar una acción o si está rate-limited
   * @param key Identificador único (ej: userId + acción)
   * @param maxAttempts Máximo de intentos permitidos
   * @param windowMs Ventana de tiempo en ms
   */
  canProceed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Limpiar intentos antiguos
    const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);

    if (validAttempts.length >= maxAttempts) {
      return false;
    }

    // Registrar nuevo intento
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  /**
   * Obtiene tiempo restante antes de poder reintentar
   */
  getTimeRemaining(key: string, windowMs: number = 60000): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;

    const oldestAttempt = Math.min(...attempts);
    const timeRemaining = windowMs - (Date.now() - oldestAttempt);

    return Math.max(0, timeRemaining);
  }

  /**
   * Resetea los intentos para una key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Instancia global del rate limiter
export const rateLimiter = new RateLimiter();

// ============================================================
// 6. CSRF Token Helpers
// ============================================================

/**
 * Genera un token CSRF aleatorio
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Almacena el token CSRF en sessionStorage
 */
export function storeCSRFToken(token: string): void {
  sessionStorage.setItem('csrf_token', token);
}

/**
 * Obtiene el token CSRF almacenado
 */
export function getCSRFToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}

/**
 * Valida que el token CSRF coincida
 */
export function validateCSRFToken(token: string): boolean {
  const stored = getCSRFToken();
  return stored !== null && stored === token;
}

// ============================================================
// 7. Headers de Seguridad
// ============================================================

export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https:;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// ============================================================
// 8. Funciones de utilidad
// ============================================================

/**
 * Escapa HTML para prevenir XSS en renderizado
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

/**
 * Valida que un string sea un UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Detecta potencial SQL Injection en un string
 */
export function containsSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const sqlPatterns = [
    /(%27)|(')|(--)|(%23)|(#)/i,
    /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/i,
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TABLE|FROM|WHERE)\b/i,
    /(%27)|(')|(--)|(%23)|(#)/i,
    /(%22)|(")/i,
    /(%3B)|(;)/i,
    /(%3D)|(=)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// Exportar todo como objeto para facilitar imports
export const SecurityValidation = {
  sanitizeInput,
  containsMaliciousCode,
  validatePassword,
  isValidEmail,
  validateFile,
  rateLimiter,
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  validateCSRFToken,
  SECURITY_HEADERS,
  escapeHtml,
  isValidUUID,
  containsSQLInjection,
};
