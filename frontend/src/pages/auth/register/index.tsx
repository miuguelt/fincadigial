import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
// import { Badge } from '@/shared/ui/badge';
import {
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { apiClient } from '@/shared/api/client';

interface FormData {
  finca: {
    name: string;
    type: 'Educativa' | 'Tradicional';
    department: string;
    municipality: string;
    nit: string;
  };
  owner: {
    identification: string;
    fullname: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    finca: {
      name: '',
      type: 'Tradicional',
      department: '',
      municipality: '',
      nit: '',
    },
    owner: {
      identification: '',
      fullname: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.finca.name.trim()) {
        newErrors['finca.name'] = 'El nombre de la finca es requerido';
      }
      if (!formData.finca.type) {
        newErrors['finca.type'] = 'Seleccione el tipo de finca';
      }
    }

    if (currentStep === 2) {
      if (!formData.owner.identification.trim()) {
        newErrors['owner.identification'] = 'La identificación es requerida';
      }
      if (!formData.owner.fullname.trim()) {
        newErrors['owner.fullname'] = 'El nombre completo es requerido';
      }
      if (!formData.owner.email.trim()) {
        newErrors['owner.email'] = 'El correo electrónico es requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner.email)) {
        newErrors['owner.email'] = 'Ingrese un correo válido';
      }
      if (!formData.owner.phone.trim()) {
        newErrors['owner.phone'] = 'El teléfono es requerido';
      }
    }

    if (currentStep === 3) {
      if (!formData.owner.password) {
        newErrors['owner.password'] = 'La contraseña es requerida';
      } else if (formData.owner.password.length < 8) {
        newErrors['owner.password'] = 'La contraseña debe tener al menos 8 caracteres';
      }
      if (formData.owner.password !== formData.owner.confirmPassword) {
        newErrors['owner.confirmPassword'] = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        finca: {
          name: formData.finca.name,
          type: formData.finca.type,
          department: formData.finca.department || undefined,
          municipality: formData.finca.municipality || undefined,
          nit: formData.finca.nit || undefined,
        },
        owner: {
          identification: parseInt(formData.owner.identification.replace(/\D/g, '')),
          fullname: formData.owner.fullname,
          email: formData.owner.email,
          phone: formData.owner.phone,
          password: formData.owner.password,
        },
      };

      const response = await apiClient.post('/api/v1/public/register', payload);

      if (response.data?.success) {
        showToast('¡Finca registrada exitosamente! Redirigiendo...', 'success');

        // Guardar tokens si vienen en la respuesta
        const { access_token, refresh_token } = response.data.data || {};
        if (access_token) {
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
        }

        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        showToast(response.data?.message || 'Error al registrar la finca', 'error');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al registrar la finca';
      const errorDetails = error.response?.data?.details;

      if (errorDetails && typeof errorDetails === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.entries(errorDetails).forEach(([key, value]) => {
          fieldErrors[key] = String(value);
        });
        setErrors(fieldErrors);
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (section: 'finca' | 'owner', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    // Limpiar error del campo
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success rounded-full mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">4VillaLuz</h1>
          <p className="text-muted-foreground mt-2">Registro de Nueva Finca</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${s <= step
                  ? 'bg-success text-white'
                  : 'bg-secondary text-muted-foreground'
                }`}>
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 ${s < step ? 'bg-success' : 'bg-secondary'
                  }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Paso 1: Información de la Finca'}
              {step === 2 && 'Paso 2: Datos del Propietario'}
              {step === 3 && 'Paso 3: Credenciales de Acceso'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Ingrese los datos básicos de su finca'}
              {step === 2 && 'Ingrese los datos del administrador/propietario'}
              {step === 3 && 'Establezca la contraseña para acceder al sistema'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Paso 1: Datos de la Finca */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="finca.name">Nombre de la Finca *</Label>
                  <Input
                    id="finca.name"
                    placeholder="Ej: Finca El Paraíso"
                    value={formData.finca.name}
                    onChange={(e) => updateField('finca', 'name', e.target.value)}
                    className={errors['finca.name'] ? 'border-destructive' : ''}
                  />
                  {errors['finca.name'] && (
                    <p className="text-sm text-destructive mt-1">{errors['finca.name']}</p>
                  )}
                </div>

                <div>
                  <Label>Tipo de Finca *</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => updateField('finca', 'type', 'Tradicional')}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.finca.type === 'Tradicional'
                          ? 'border-success bg-success/5'
                          : 'border-border hover:border-border'
                        }`}
                    >
                      <Building2 className="h-6 w-6 mb-2 text-success" />
                      <div className="font-medium">Tradicional</div>
                      <div className="text-sm text-muted-foreground">Gestión comercial</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('finca', 'type', 'Educativa')}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.finca.type === 'Educativa'
                          ? 'border-info bg-info/5'
                          : 'border-border hover:border-border'
                        }`}
                    >
                      <Building2 className="h-6 w-6 mb-2 text-info" />
                      <div className="font-medium">Educativa</div>
                      <div className="text-sm text-muted-foreground">Formación SENA</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="finca.department">Departamento</Label>
                    <Input
                      id="finca.department"
                      placeholder="Ej: Santander"
                      value={formData.finca.department}
                      onChange={(e) => updateField('finca', 'department', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="finca.municipality">Municipio</Label>
                    <Input
                      id="finca.municipality"
                      placeholder="Ej: Bucaramanga"
                      value={formData.finca.municipality}
                      onChange={(e) => updateField('finca', 'municipality', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="finca.nit">NIT (opcional)</Label>
                  <Input
                    id="finca.nit"
                    placeholder="Ej: 900123456-1"
                    value={formData.finca.nit}
                    onChange={(e) => updateField('finca', 'nit', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Paso 2: Datos del Propietario */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner.identification">Identificación *</Label>
                    <Input
                      id="owner.identification"
                      placeholder="Ej: 1234567890"
                      value={formData.owner.identification}
                      onChange={(e) => updateField('owner', 'identification', e.target.value)}
                      className={errors['owner.identification'] ? 'border-destructive' : ''}
                    />
                    {errors['owner.identification'] && (
                      <p className="text-sm text-destructive mt-1">{errors['owner.identification']}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="owner.fullname">Nombre Completo *</Label>
                    <Input
                      id="owner.fullname"
                      placeholder="Ej: Juan Pérez"
                      value={formData.owner.fullname}
                      onChange={(e) => updateField('owner', 'fullname', e.target.value)}
                      className={errors['owner.fullname'] ? 'border-destructive' : ''}
                    />
                    {errors['owner.fullname'] && (
                      <p className="text-sm text-destructive mt-1">{errors['owner.fullname']}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="owner.email">Correo Electrónico *</Label>
                  <Input
                    id="owner.email"
                    type="email"
                    placeholder="Ej: usuario@email.com"
                    value={formData.owner.email}
                    onChange={(e) => updateField('owner', 'email', e.target.value)}
                    className={errors['owner.email'] ? 'border-destructive' : ''}
                  />
                  {errors['owner.email'] && (
                    <p className="text-sm text-destructive mt-1">{errors['owner.email']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="owner.phone">Teléfono *</Label>
                  <Input
                    id="owner.phone"
                    placeholder="Ej: 3001234567"
                    value={formData.owner.phone}
                    onChange={(e) => updateField('owner', 'phone', e.target.value)}
                    className={errors['owner.phone'] ? 'border-destructive' : ''}
                  />
                  {errors['owner.phone'] && (
                    <p className="text-sm text-destructive mt-1">{errors['owner.phone']}</p>
                  )}
                </div>

                <div className="bg-info/5 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-info mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Rol asignado: {formData.finca.type === 'Educativa' ? 'Administrador' : 'Propietario'}
                      </p>
                      <p className="text-sm text-info mt-1">
                        {formData.finca.type === 'Educativa'
                          ? 'Tendrá acceso total a la finca educativa y podrá crear instructores y aprendices.'
                          : 'Tendrá acceso total a la finca tradicional y podrá crear capataces, operarios y veterinarios.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 3: Contraseña */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="owner.password">Contraseña *</Label>
                  <Input
                    id="owner.password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.owner.password}
                    onChange={(e) => updateField('owner', 'password', e.target.value)}
                    className={errors['owner.password'] ? 'border-destructive' : ''}
                  />
                  {errors['owner.password'] && (
                    <p className="text-sm text-destructive mt-1">{errors['owner.password']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="owner.confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="owner.confirmPassword"
                    type="password"
                    placeholder="Repita la contraseña"
                    value={formData.owner.confirmPassword}
                    onChange={(e) => updateField('owner', 'confirmPassword', e.target.value)}
                    className={errors['owner.confirmPassword'] ? 'border-destructive' : ''}
                  />
                  {errors['owner.confirmPassword'] && (
                    <p className="text-sm text-destructive mt-1">{errors['owner.confirmPassword']}</p>
                  )}
                </div>

                <div className="bg-warning/5 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Resumen del registro
                      </p>
                      <ul className="text-sm text-warning mt-2 space-y-1">
                        <li>• Finca: <strong>{formData.finca.name}</strong></li>
                        <li>• Tipo: <strong>{formData.finca.type}</strong></li>
                        <li>• Propietario: <strong>{formData.owner.fullname}</strong></li>
                        <li>• Correo electrónico: <strong>{formData.owner.email}</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de navegación */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              {step < 3 ? (
                <Button onClick={handleNext}>
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-success hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Registrar Finca
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Link a login */}
        <p className="text-center mt-6 text-muted-foreground">
          ¿Ya tiene una cuenta?{' '}
          <Link to="/login" className="text-success hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
