/**
 * Funciones de utilidad para manejo de fechas con zona horaria de Colombia
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para la zona horaria de Colombia (America/Bogota)
 * @returns {string} Fecha actual en formato YYYY-MM-DD
 */
export const getTodayColombia = (): string => {
  const now = new Date();
  
  // Opción 1: Usar toLocaleString con zona horaria específica
  const colombiaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  // Formatear a YYYY-MM-DD
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha y hora actual en formato ISO para la zona horaria de Colombia
 * @returns {string} Fecha y hora actual en formato ISO con zona horaria de Colombia
 */
export const getNowColombiaISO = (): string => {
  const now = new Date();
  
  // Usar toLocaleString con zona horaria específica y luego formatear
  const colombiaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  const hours = String(colombiaDate.getHours()).padStart(2, '0');
  const minutes = String(colombiaDate.getMinutes()).padStart(2, '0');
  const seconds = String(colombiaDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Convierte una fecha a formato YYYY-MM-DD en la zona horaria de Colombia
 * @param {Date | string} date - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatDateColombia = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Usar toLocaleString con zona horaria específica
  const colombiaDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  
  const year = colombiaDate.getFullYear();
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Verifica si una fecha es hoy en la zona horaria de Colombia
 * @param {Date | string} date - Fecha a verificar
 * @returns {boolean} True si la fecha es hoy
 */
export const isTodayColombia = (date: Date | string): boolean => {
  const today = getTodayColombia();
  const dateToCheck = formatDateColombia(date);
  return today === dateToCheck;
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param {Date | string} birthDate - Fecha de nacimiento
 * @returns {string} Edad formateada (ej. "3 años", "3 años, 3 meses")
 */
export const calculateAge = (birthDate?: Date | string): string => {
  if (!birthDate) return '';
  try {
    const today = new Date();
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    if (isNaN(birth.getTime())) return '';

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) return '';

    const parts: string[] = [];
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
    }

    if (parts.length === 0) {
      return '0 meses';
    }

    return parts.join(', ');
  } catch {
    return '';
  }
};

/**
 * Formatea un valor numérico a moneda colombiana (COP)
 * Ejemplo: 2500000 -> $2.500.000
 */
export const formatCurrencyColombia = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea un valor numérico abreviado para cards
 * Ejemplo: 1500 -> 1.5k, 1200000 -> 1.2M
 */
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.0', '')}k`;
  }
  return value.toString();
};

/**
 * Formatea una fecha a lenguaje natural (estilo Colombia)
 * Ejemplo: 2025-01-15 -> 15 de enero de 2025
 */
export const formatLongDateColombia = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Fecha no válida';

  // Forzar UTC o asegurar que no cambie el día por la hora
  // En este contexto usualmente recibimos YYYY-MM-DD
  const [year, month, day] = (typeof date === 'string' ? date.split('T')[0] : formatDateColombia(date)).split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(localDate);
};
