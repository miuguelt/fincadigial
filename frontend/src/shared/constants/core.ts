/**
 * CONSTANTES PURAS (Leaf Node)
 * Este archivo NO debe importar nada de otras carpetas del proyecto.
 * Su único propósito es servir como ancla de verdad para evitar dependencias circulares.
 */

export const AUTH_STORAGE_KEY = 'finca_access_token';
export const ACCESS_TOKEN_KEY = 'access_token';
export const AUTH_SESSION_ACTIVE_KEY = 'auth:session_active';

export enum Role {
  Administrador = 'Administrador',
  Propietario = 'Propietario',
  Capataz = 'Capataz',
  Instructor = 'Instructor',
  Veterinario = 'Veterinario',
  Aprendiz = 'Aprendiz',
  Operario = 'Operario',
}

export const DEFAULT_API_TIMEOUT = 30000;
export const DEFAULT_TOAST_DEDUP_MS = 3000;
