import type { CRUDFormField, CRUDFormSection } from '@/shared/types/crud';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export type FieldErrors = Record<string, string>;

const isEmptyValue = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const getLength = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === 'string') return value.trim().length;
  if (Array.isArray(value)) return value.length;
  return 0;
};

export function validateField(
  field: CRUDFormField<any>,
  value: any,
  _formData: Record<string, any>
): string | null {
  const label = field.label || String(field.name);
  const isRequired = field.required === true;
  const hasValue = !isEmptyValue(value);

  if (field.type === 'checkbox') {
    if (isRequired && !value) {
      return `Debe activar ${label.toLowerCase()}.`;
    }
  } else if (isRequired && (!hasValue || (field.type === 'select' || field.type === 'searchable-select') && value === 0)) {
    if (field.type === 'select' || field.type === 'searchable-select') {
      return `Debe seleccionar ${label.toLowerCase()}.`;
    }
    return 'Este campo es obligatorio.';
  }

  if (!hasValue) return null;

  if (field.type === 'number') {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return 'Debe ingresar un valor numerico valido.';
    }
    if (field.validation?.min != null && numericValue < field.validation.min) {
      return `Debe ser mayor o igual a ${field.validation.min}.`;
    }
    if (field.validation?.max != null && numericValue > field.validation.max) {
      return `Debe ser menor o igual a ${field.validation.max}.`;
    }
  }

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'multiselect') {
    const length = getLength(value);
    if (field.validation?.min != null && length < field.validation.min) {
      return `Debe tener al menos ${field.validation.min} caracteres.`;
    }
    if (field.validation?.max != null && length > field.validation.max) {
      return `Debe tener maximo ${field.validation.max} caracteres.`;
    }
  }

  if (field.type === 'date' && String(field.name) === 'birth_date') {
    const today = getTodayColombia();
    if (typeof value === 'string' && value > today) {
      return 'La fecha de nacimiento no puede ser futura.';
    }
  }

  if (field.validation?.pattern && typeof value === 'string') {
    if (!(field.validation.pattern as unknown as RegExp).test(value)) {
      return field.helperText || 'Formato inválido.';
    }
  }

  if ((field.validation as any)?.custom) {
    const customResult = (field.validation as any).custom(value);
    if (customResult) return customResult;
  }

  return null;
}

export function validateFormSections(
  sections: CRUDFormSection<any>[],
  formData: Record<string, any>
): { errors: FieldErrors; messages: string[] } {
  const errors: FieldErrors = {};
  const messages: string[] = [];

  sections.forEach((section) => {
    section.fields.forEach((field) => {
      const key = String(field.name);
      const error = validateField(field, formData[key], formData);
      if (error) {
        errors[key] = error;
        messages.push(`${field.label}: ${error}`);
      }
    });
  });

  return { errors, messages };
}

// ============================================================
// Sistema de Caché con TTL para Validaciones (P3.2)
// ============================================================

type CacheEntry<T> = {
  value: T;
  timestamp: number;
  ttl: number;
};

class ValidationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Genera una clave única para el caché basada en el campo y valor
   */
  private generateKey(field: CRUDFormField<any>, value: any): string {
    const fieldKey = `${String(field.name)}-${field.type}-${String(field.required)}`;
    const valueKey = typeof value === 'string' ? value : JSON.stringify(value);
    return `${fieldKey}:${valueKey}`;
  }

  /**
   * Obtiene un valor del caché si es válido (no expirado)
   */
  get<T>(field: CRUDFormField<any>, value: any): T | null {
    const key = this.generateKey(field, value);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entrada expirada, eliminarla
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Almacena un valor en el caché con TTL especificado
   */
  set<T>(field: CRUDFormField<any>, value: any, result: T, ttlMs: number = 60000): void {
    const key = this.generateKey(field, value);
    this.cache.set(key, {
      value: result,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Valida un campo usando caché con TTL
   */
  validateFieldCached(
    field: CRUDFormField<any>,
    value: any,
    formData: Record<string, any>,
    ttlMs: number = 60000
  ): string | null {
    // Intentar obtener del caché
    const cached = this.get<string | null>(field, value);
    if (cached !== null) {
      return cached;
    }

    // Calcular validación
    const result = validateField(field, value, formData);

    // Almacenar en caché
    this.set(field, value, result, ttlMs);

    return result;
  }

  /**
   * Limpia entradas expiradas del caché
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

// Instancia global del caché de validación
export const validationCache = new ValidationCache();

/**
 * Versión con caché de validateField
 */
export function validateFieldCached(
  field: CRUDFormField<any>,
  value: any,
  formData: Record<string, any>,
  ttlMs: number = 60000
): string | null {
  return validationCache.validateFieldCached(field, value, formData, ttlMs);
}

/**
 * Versión con caché de validateFormSections
 */
export function validateFormSectionsCached(
  sections: CRUDFormSection<any>[],
  formData: Record<string, any>,
  ttlMs: number = 60000
): { errors: FieldErrors; messages: string[] } {
  const errors: FieldErrors = {};
  const messages: string[] = [];

  sections.forEach((section) => {
    section.fields.forEach((field) => {
      const key = String(field.name);
      const error = validationCache.validateFieldCached(field, formData[key], formData, ttlMs);
      if (error) {
        errors[key] = error;
        messages.push(`${field.label}: ${error}`);
      }
    });
  });

  return { errors, messages };
}
