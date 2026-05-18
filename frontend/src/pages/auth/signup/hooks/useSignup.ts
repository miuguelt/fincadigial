import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersService } from '@/entities/user/api/user.service';
import { getUserProfile } from '@/features/auth/api/auth.service';
import { useToast } from '@/app/providers/ToastContext';
import { SignUpFormData, FormErrors } from '../types';

const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
  { id: 'uppercase', label: 'Al menos una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Al menos un número', test: (value: string) => /\d/.test(value) },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{7,15}$/;

export const useSignup = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    identification_number: '',
    role: 'Aprendiz',
    address: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const setFieldError = (fieldName: keyof FormErrors, message?: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: message }));
  };

  const mapBackendFieldToUI = (field: string): keyof FormErrors | undefined => {
    const m: Record<string, keyof FormErrors> = {
      fullname: 'name',
      name: 'name',
      email: 'email',
      phone: 'phone',
      identification: 'identification_number',
      identification_number: 'identification_number',
      address: 'address',
      password: 'password',
      confirm_password: 'confirmPassword',
      confirmPassword: 'confirmPassword',
    };
    return m[field];
  };

  const labelForField = (field: string): string => {
    const map: Record<string, string> = {
      email: 'correo',
      fullname: 'nombre',
      name: 'nombre',
      phone: 'teléfono',
      identification: 'número de identificación',
      identification_number: 'número de identificación',
      address: 'dirección',
    };
    return map[field] || field;
  };

  const mapBackendValidationErrors = (details: any) => {
    if (!details || typeof details !== 'object') return;
    const validation = (details as any).validation_errors || (details as any).errors || details;
    if (!validation || typeof validation !== 'object') return;

    const map: Record<string, keyof FormErrors> = {
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

    const newFieldErrors: FormErrors = {};
    Object.entries(validation).forEach(([key, val]) => {
      const uiKey = map[key];
      if (!uiKey) return;
      const messages = Array.isArray(val) ? val : [val];
      const msg = messages
        .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.detail || e))
        .filter(Boolean)
        .join(' • ');
      if (msg) newFieldErrors[uiKey] = msg;
    });

    if (Object.keys(newFieldErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newFieldErrors }));
    }
  };

  const buildValidationErrors = (data: SignUpFormData): FormErrors => {
    const newErrors: FormErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    const emailVal = data.email.trim();
    if (!emailVal) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!EMAIL_REGEX.test(emailVal)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    }

    const phoneVal = data.phone.trim();
    if (!phoneVal) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!PHONE_REGEX.test(phoneVal)) {
      newErrors.phone = 'Ingrese un teléfono válido (7-15 dígitos)';
    }

    const idValue = data.identification_number.trim();
    if (!idValue) {
      newErrors.identification_number = 'El número de identificación es obligatorio';
    } else if (!/^\d+$/.test(idValue)) {
      newErrors.identification_number = 'El número de identificación debe contener solo dígitos';
    } else if (idValue.length < 5) {
      newErrors.identification_number = 'El número de identificación debe tener al menos 5 dígitos';
    } else if (parseInt(idValue, 10) <= 0) {
      newErrors.identification_number = 'El número de identificación debe ser un número positivo';
    }

    const unmetPasswordRules = PASSWORD_RULES.filter((rule) => !rule.test(data.password));
    if (!data.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (unmetPasswordRules.length) {
      newErrors.password = `La contraseña debe cumplir: ${unmetPasswordRules.map((rule) => rule.label.toLowerCase()).join(', ')}`;
    }

    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'La confirmación de contraseña es obligatoria';
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(formData.password) })),
    [formData.password]
  );
  
  const validationSnapshot = useMemo(() => buildValidationErrors(formData), [formData]);
  const isFormValid = Object.keys(validationSnapshot).length === 0;
  const hasInteracted = submitAttempted || Object.keys(touched).length > 0;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.target.name as keyof SignUpFormData;
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const getFieldError = (field: keyof FormErrors) => {
    const existing = errors[field];
    if (existing) return existing;
    if (!hasInteracted) return undefined;
    if (!submitAttempted && !touched[field as keyof SignUpFormData]) return undefined;
    return validationSnapshot[field];
  };

  const blockingReasons = useMemo(() => {
    if (isFormValid) return [];

    const FIELD_LABELS: Partial<Record<keyof FormErrors, string>> = {
      name: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      identification_number: 'Número de identificación',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
    };

    return (Object.entries(validationSnapshot) as Array<[keyof FormErrors, string | undefined]>)
      .filter(([, message]) => Boolean(message))
      .map(([field, message]) => {
        const label = FIELD_LABELS[field] || String(field);
        return `${label}: ${message}`;
      })
      .slice(0, 4);
  }, [isFormValid, validationSnapshot]);

  const validateForm = (): boolean => {
    const newErrors = buildValidationErrors(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setTouched((prev) =>
      prev[name as keyof SignUpFormData] ? prev : { ...prev, [name]: true }
    );

    if (errors[name as keyof FormErrors] || errors.general) {
      setErrors(prev => {
        const next = { ...prev, [name]: undefined } as FormErrors;
        if (prev.general) next.general = undefined;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setSuccessMessage('');
    setSubmitAttempted(true);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    let userData: any = null;

    try {
      const cleanedPhone = formData.phone.replace(/[\s-]+/g, '').trim();
      userData = {
        fullname: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanedPhone,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        identification: parseInt(formData.identification_number.trim(), 10),
        role: formData.role as "Administrador" | "Instructor" | "Aprendiz",
        address: formData.address?.trim() || undefined,
      };

      const created = (await usersService.createPublicUser(userData)) as any;
      const message = created?.message || created?.detail || 'Cuenta creada exitosamente. Por favor inicia sesión.';

      setSuccessMessage(message);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login', {
          state: { message, email: formData.email }
        });
      }, 1800);

    } catch (error: any) {
      const initialStatus = error?.response?.status ?? error?.status;
      let effectiveError: any = error;

      if (initialStatus === 401 || initialStatus === 403) {
          try {
              const profile = await getUserProfile();
              if (profile?.user) {
                  const created = (await usersService.createUser(userData as any)) as any;
                  const message = created?.message || created?.detail || 'Cuenta creada exitosamente. Por favor inicia sesión.';
                  setSuccessMessage(message);
                  setSuccess(true);
                  setTimeout(() => {
                    navigate('/login', { state: { message, email: formData.email } });
                  }, 1800);
                  return;
              }
          } catch { /* ignore */ }
      }

      const data = (effectiveError as any)?.original?.response?.data || effectiveError?.response?.data || effectiveError?.data;
      const status = (effectiveError as any)?.status ?? effectiveError?.response?.status ?? effectiveError?.status;
      const backendMessage = effectiveError?.message || data?.message || data?.detail || data?.error;
      const detailedReason = backendMessage || data?.details?.message || (typeof data === 'string' ? data : undefined);

      const details = (effectiveError as any)?.details || data?.error?.details || data?.details;
      const validationErrors = (effectiveError as any)?.validationErrors || details?.validation_errors || details?.errors || data?.details?.validation_errors || data?.validation_errors || data?.errors;

      if (status === 403) {
        setErrors({ general: backendMessage || 'El registro público no está disponible.' });
      } else if (status === 401) {
        setErrors({ general: backendMessage || 'Se requiere autenticación de administrador.' });
      } else if (status === 409) {
        let msg = detailedReason || 'Conflicto de datos';
        const conflict = details?.conflict;
        if (conflict?.field) {
            const uiField = mapBackendFieldToUI(conflict.field);
            if (uiField) setFieldError(uiField, msg);
        }
        setErrors((prev) => ({ ...prev, general: msg }));
      } else if (status === 422 || validationErrors) {
        mapBackendValidationErrors(validationErrors || details || data);
        setErrors((prev) => ({ ...prev, general: 'Errores de validación.' }));
      } else {
        setErrors((prev) => ({ ...prev, general: detailedReason || 'Ocurrió un error.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    errors,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    success,
    successMessage,
    passwordChecks,
    isFormValid,
    hasInteracted,
    blockingReasons,
    handleInputChange,
    handleBlur,
    handleSubmit,
    getFieldError,
  };
};

