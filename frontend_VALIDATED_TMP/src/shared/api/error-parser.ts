export type ApiErrorCode =
  | 'CSRF_ERROR'
  | 'TOKEN_EXPIRED'
  | 'MISSING_TOKEN'
  | 'JWT_ERROR'
  | 'ADMIN_ROLE_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONFLICT'
  | 'APPROVAL_PENDING'
  | string;

export type StandardApiErrorPayload = {
  success?: boolean;
  message?: string;
  details?: any;
  error?: {
    code?: ApiErrorCode;
    details?: any;
    trace_id?: string;
  };
};

export class ApiFetchError extends Error {
  code?: ApiErrorCode;
  details?: any;
  traceId?: string;
  status?: number;
  original?: unknown;
  validationErrors?: Record<string, any>;

  constructor(message: string, init?: Partial<ApiFetchError>) {
    super(message);
    this.name = 'ApiFetchError';
    Object.assign(this, init);
  }
}

export function readStandardErrorPayload(err: any): {
  status?: number;
  message: string;
  code?: ApiErrorCode;
  details?: any;
  traceId?: string;
  raw?: any;
  validationErrors?: Record<string, any>;
} {
  const status: number | undefined = err?.response?.status ?? err?.status;
  const raw: StandardApiErrorPayload | any = err?.response?.data ?? err?.data ?? {};

  // ---- Mensaje principal (siempre preferir raw.message) ----
  const message =
    raw?.message ||
    raw?.error?.message ||
    (typeof raw?.error === 'string' ? raw.error : undefined) ||
    raw?.detail ||
    err?.message ||
    'Error en la solicitud';

  // ---- Código (si no existe, inferir en casos comunes) ----
  let code: ApiErrorCode | undefined = raw?.error?.code;
  if (!code) {
    // CSRF legacy (algunos retornos no usan APIResponse)
    const msg = String(message || '').toUpperCase();
    if ((status === 401 || status === 400 || status === 403) && msg.includes('CSRF')) {
      code = 'CSRF_ERROR';
    } else if (status === 429) {
      code = 'RATE_LIMIT_EXCEEDED';
    } else if (status === 409) {
      code = 'CONFLICT';
    }
  }

  // ---- Details (fallback: raw.details cuando no viene error.details) ----
  const details =
    raw?.error?.details ??
    raw?.details ??
    // caso CRUD legacy: { success:false, error:'Invalid pagination', message:'...' }
    (typeof raw?.error === 'string' ? { legacy_error: raw.error } : undefined);

  const traceId = raw?.error?.trace_id;

  // ---- Validaciones: no siempre viene VALIDATION_ERROR ni validation_errors como string[] ----
  const maybeValidation =
    raw?.error?.details?.validation_errors ??
    raw?.details?.validation_errors ??
    raw?.validation_errors ??
    raw?.errors ??
    undefined;

  const validationErrors =
    maybeValidation && typeof maybeValidation === 'object' && !Array.isArray(maybeValidation)
      ? (maybeValidation as Record<string, any>)
      : undefined;

  // Inferir VALIDATION_ERROR si es 422 y vienen validation errors (aunque no haya error.code)
  if (!raw?.error?.code && status === 422 && validationErrors) {
    code = 'VALIDATION_ERROR';
  }

  return { status, message, code, details, traceId, raw, validationErrors };
}

export function formatMessageFromCode(input: {
  message: string;
  code?: ApiErrorCode;
  details?: any;
}): string {
  const { message, code, details } = input;
  if (!code) return message;

  if (code === 'RATE_LIMIT_EXCEEDED') {
    const wait = details?.retry_after_seconds ?? details?.retry_after;
    if (typeof wait === 'number' && Number.isFinite(wait) && wait > 0) {
      return `Demasiadas solicitudes. Espere ${wait} segundos e intente de nuevo.`;
    }
    if (typeof wait === 'string' && wait.trim() !== '' && !Number.isNaN(Number(wait))) {
      return `Demasiadas solicitudes. Espere ${Number(wait)} segundos e intente de nuevo.`;
    }
    return message;
  }

  if (code === 'ADMIN_ROLE_REQUIRED') {
    return 'No tiene permisos para realizar esta accion.';
  }

  if (code === 'CSRF_ERROR') {
    return 'Falta CSRF o la sesion expiro. Recargue la pagina e intente nuevamente.';
  }

  if (code === 'CONFLICT') {
    return message && message.trim().length ? message : 'Violación de unicidad';
  }

  if (code === 'APPROVAL_PENDING') {
    return message || 'Tu cuenta está pendiente de aprobación por un administrador.';
  }

  return message;
}
