export interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  identification_number: string;
  role: string;
  address?: string;
}

export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  identification_number?: string;
  address?: string;
  general?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{7,15}$/;

/** Nombres del backend → campos del formulario de registro. */
const BACKEND_FIELD_MAP: Record<string, keyof FormErrors> = {
  fullname: 'name',
  name: 'name',
  email: 'email',
  phone: 'phone',
  identification: 'identification_number',
  identification_number: 'identification_number',
  password: 'password',
  confirmPassword: 'confirmPassword',
  address: 'address',
};

/** Revisa el formulario de registro antes de enviarlo. */
export function buildValidationErrors(values: SignUpFormData): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) errors.name = 'El nombre completo es requerido';

  if (!values.email.trim()) {
    errors.email = 'El correo electrónico es requerido';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Ingrese un correo válido';
  }

  if (!values.phone.trim()) {
    errors.phone = 'El teléfono es requerido';
  } else if (!PHONE_REGEX.test(values.phone)) {
    errors.phone = 'Ingrese un teléfono válido';
  }

  if (!values.identification_number.trim()) {
    errors.identification_number = 'El número de identificación es requerido';
  }

  if (!values.password) {
    errors.password = 'La contraseña es requerida';
  } else {
    if (values.password.length < 8) errors.password = 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(values.password)) errors.password = 'Debe contener al menos una mayúscula';
    if (!/\d/.test(values.password)) errors.password = 'Debe contener al menos un número';
  }

  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  return errors;
}

/**
 * Convierte los errores que devuelve el registro en el backend a errores por
 * campo. Sin esto, un rechazo del servidor (cédula repetida, correo en uso)
 * solo dejaba un mensaje general y la persona no sabía qué casilla corregir.
 */
export function mapBackendValidationErrors(details: any): FormErrors {
  if (!details || typeof details !== 'object') return {};

  const validation = details.validation_errors || details.errors || details;
  if (!validation || typeof validation !== 'object') return {};

  const errors: FormErrors = {};
  Object.entries(validation).forEach(([key, value]) => {
    const field = BACKEND_FIELD_MAP[key];
    if (!field) return;

    const messages = Array.isArray(value) ? value : [value];
    const message = messages
      .map((entry: any) => (typeof entry === 'string' ? entry : entry?.message || entry?.detail || entry))
      .filter((entry: any) => typeof entry === 'string' && entry.trim())
      .join(' • ');

    if (message) errors[field] = message;
  });

  return errors;
}
