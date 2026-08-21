import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Eye, EyeOff, User, Mail, Lock, UserPlus, Phone, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { usersService } from '@/entities/user/api/user.service';
import { getUserProfile } from '@/features/auth/api/auth.service';
import { useToast } from '@/app/providers/ToastContext';
import {
  buildValidationErrors,
  mapBackendValidationErrors,
  type FormErrors,
  type SignUpFormData,
} from './validation';

const RegisterUserPage: React.FC = () => {
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

  /** Pinta en cada casilla el error que devolvió el backend. */
  const applyBackendErrors = (details: any) => {
    const backendErrors = mapBackendValidationErrors(details);
    if (Object.keys(backendErrors).length === 0) return;
    setErrors((prev) => ({ ...prev, ...backendErrors }));
  };

  const validationSnapshot = useMemo(() => buildValidationErrors(formData), [formData]);
  const isFormValid = useMemo(() => Object.keys(validationSnapshot).length === 0, [validationSnapshot]);

  const getFieldError = (field: keyof FormErrors) => {
    const existing = errors[field];
    if (existing) return existing;
    if (!hasInteracted) return undefined;
    if (!submitAttempted && !touched[field as keyof SignUpFormData]) return undefined;
    return validationSnapshot[field];
  };

  const [hasInteracted, setHasInteracted] = useState(false);

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
    if (!hasInteracted) setHasInteracted(true);
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

      if (import.meta.env.DEV) {
        console.log('[RegisterUser] Sending user data:', {
          ...userData,
          password: '***',
          password_confirmation: '***'
        });
      }

      const created = (await usersService.createPublicUser(userData)) as any;
      const message = created?.message || created?.detail || 'Cuenta creada exitosamente. Por favor inicia sesión.';

      setSuccessMessage(message);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login', {
          state: {
            message,
            email: formData.email
          }
        });
      }, 1800);

    } catch (error: any) {
      console.error('Error registering user:', error);

      const attemptAuthenticatedCreate = async () => {
        try {
          const profile = await getUserProfile();
          if (!profile?.user) return { ok: false as const };
        } catch {
          return { ok: false as const };
        }

        try {
          const created = (await usersService.createUser(userData as any)) as any;
          return { ok: true as const, created };
        } catch (authError: any) {
          return { ok: false as const, error: authError };
        }
      };

      const initialStatus = error?.response?.status ?? error?.status;
      let effectiveError: any = error;

      if (initialStatus === 401 || initialStatus === 403) {
        const fallback = await attemptAuthenticatedCreate();
        if (fallback.ok) {
          setSuccessMessage('Usuario creado exitosamente con sesión autenticada.');
          setSuccess(true);
          setTimeout(() => navigate('/login'), 1500);
          setLoading(false);
          return;
        }
        if (fallback.error) {
          effectiveError = fallback.error;
        }
      }

      const status = effectiveError?.response?.status ?? effectiveError?.status;
      const errorData = effectiveError?.response?.data ?? effectiveError?.data;

      if (status === 400) {
        const details = errorData?.details ?? errorData?.validation_errors ?? errorData?.errors ?? errorData;
        applyBackendErrors({ validation_errors: details, errors: details });
        const generalMsg = errorData?.message || errorData?.error;
        if (generalMsg) {
          setFieldError('general', generalMsg);
          showToast(generalMsg, 'error');
        }
      } else if (status === 409) {
        const msg = errorData?.message || errorData?.detail || 'El usuario ya existe (email o identificación duplicada).';
        setFieldError('general', msg);
        showToast(msg, 'error');
      } else if (status === 422) {
        applyBackendErrors(errorData);
        const msg = errorData?.message || errorData?.error || 'Datos inválidos. Verifique los campos.';
        setFieldError('general', msg);
        showToast(msg, 'error');
      } else {
        const fallbackMsg = effectiveError?.message || 'Error de conexión. Intente nuevamente.';
        setFieldError('general', fallbackMsg);
        showToast(fallbackMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg mb-4">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Crear Cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Regístrate para unirte a una finca existente
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">¡Registro Exitoso!</h3>
                <p className="text-muted-foreground text-sm">{successMessage}</p>
                <p className="text-muted-foreground text-xs mt-4">Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertDescription>{errors.general}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Nombre Completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={getFieldError('name') ? 'border-destructive' : ''}
                  />
                  {getFieldError('name') && (
                    <p className="text-destructive text-xs">{getFieldError('name')}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Correo
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={getFieldError('email') ? 'border-destructive' : ''}
                    />
                    {getFieldError('email') && (
                      <p className="text-destructive text-xs">{getFieldError('email')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="3001234567"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={getFieldError('phone') ? 'border-destructive' : ''}
                    />
                    {getFieldError('phone') && (
                      <p className="text-destructive text-xs">{getFieldError('phone')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identification_number" className="text-sm font-medium">
                    Número de Identificación
                  </Label>
                  <Input
                    id="identification_number"
                    name="identification_number"
                    type="text"
                    placeholder="Ej: 1234567890"
                    value={formData.identification_number}
                    onChange={handleInputChange}
                    disabled={loading}
                    className={getFieldError('identification_number') ? 'border-destructive' : ''}
                  />
                  {getFieldError('identification_number') && (
                    <p className="text-destructive text-xs">{getFieldError('identification_number')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">Rol Solicitado</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Aprendiz">Aprendiz (SENA)</option>
                    <option value="Instructor">Instructor (SENA)</option>
                    <option value="Operario">Operario</option>
                    <option value="Capataz">Capataz</option>
                    <option value="Veterinario">Veterinario</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={getFieldError('password') ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFieldError('password') && (
                    <p className="text-destructive text-xs">{getFieldError('password')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={getFieldError('confirmPassword') ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFieldError('confirmPassword') && (
                    <p className="text-destructive text-xs">{getFieldError('confirmPassword')}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Crear Cuenta
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-success hover:text-success font-medium">
                  Inicia sesión
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                ¿Eres propietario y quieres crear tu finca?{' '}
                <Link to="/register/finca" className="text-success hover:text-success font-medium">
                  <Building2 className="inline h-3 w-3 mr-1" />
                  Registrar finca
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterUserPage;
