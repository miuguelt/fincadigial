import React from 'react';
// import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { IconEye, IconEyeOff, IconUser, IconMail, IconLock, IconPhone, IconCircleCheck, IconLoader2, IconUserPlus } from '@/shared/ui/icons';
import { SignUpFormData, FormErrors } from '../types';

interface SignupFormFieldsProps {
  formData: SignUpFormData;
  errors: FormErrors;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  passwordChecks: Array<{ id: string; label: string; valid: boolean }>;
  isFormValid: boolean;
  hasInteracted: boolean;
  blockingReasons: string[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  getFieldError: (field: keyof FormErrors) => string | undefined;
}

export const SignupFormFields: React.FC<SignupFormFieldsProps> = ({
  formData,
  errors,
  loading,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordChecks,
  isFormValid,
  hasInteracted,
  blockingReasons,
  handleInputChange,
  handleBlur,
  handleSubmit,
  getFieldError,
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Nombre */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre completo</Label>
        <div className="relative">
          <IconUser size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Tu nombre completo"
            value={formData.name}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 ${getFieldError('name') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="name"
          />
        </div>
        {getFieldError('name') && (
          <p className="text-sm text-destructive">{getFieldError('name')}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <div className="relative">
          <IconMail size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tu@email.com"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 ${getFieldError('email') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="email"
          />
        </div>
        {getFieldError('email') && (
          <p className="text-sm text-destructive">{getFieldError('email')}</p>
        )}
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <div className="relative">
          <IconPhone size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Tu número de teléfono"
            value={formData.phone}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 ${getFieldError('phone') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="tel"
          />
        </div>
        {getFieldError('phone') && (
          <p className="text-sm text-destructive">{getFieldError('phone')}</p>
        )}
      </div>

      {/* Dirección */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Dirección (opcional)</Label>
        <Input
          id="address"
          name="address"
          type="text"
          placeholder="Calle, ciudad, referencia"
          value={formData.address}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={loading}
          autoComplete="street-address"
        />
        {getFieldError('address') && (
          <p className="text-sm text-destructive">{getFieldError('address')}</p>
        )}
      </div>

      {/* Número de Identificación */}
      <div className="space-y-1.5">
        <Label htmlFor="identification_number">Número de identificación</Label>
        <div className="relative">
          <IconUser size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="identification_number"
            name="identification_number"
            type="text"
            placeholder="Tu número de identificación"
            value={formData.identification_number}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 ${getFieldError('identification_number') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="off"
          />
        </div>
        {getFieldError('identification_number') && (
          <p className="text-sm text-destructive">{getFieldError('identification_number')}</p>
        )}
      </div>

      {/* Rol */}
      <div className="space-y-1.5">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-success"
          disabled={loading}
        >
          <option value="Aprendiz">Aprendiz</option>
          <option value="Instructor">Instructor</option>
          <option value="Administrador">Administrador</option>
        </select>
      </div>

      {/* Contraseña */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <IconLock size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 pr-10 ${getFieldError('password') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            disabled={loading}
          >
            {showPassword ? <IconEyeOff size="sm" /> : <IconEye size="sm" />}
          </button>
        </div>
        {getFieldError('password') && (
          <p className="text-sm text-destructive">{getFieldError('password')}</p>
        )}
      </div>

      {/* Confirmar Contraseña */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
        <div className="relative">
          <IconLock size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`pl-10 pr-10 ${getFieldError('confirmPassword') ? 'border-destructive focus:border-destructive' : ''}`}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            disabled={loading}
          >
            {showConfirmPassword ? <IconEyeOff size="sm" /> : <IconEye size="sm" />}
          </button>
        </div>
        {getFieldError('confirmPassword') && (
          <p className="text-sm text-destructive">{getFieldError('confirmPassword')}</p>
        )}
      </div>

      {/* Requisitos de contraseña */}
      <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground/80 mb-2">Requisitos de contraseña</p>
        <ul className="space-y-1.5">
          {passwordChecks.map((rule) => (
            <li key={rule.id} className="flex items-center gap-2 text-sm">
              <IconCircleCheck
                size="sm"
                className={`${rule.valid ? 'text-success' : 'text-muted-foreground/60'}`}
                aria-hidden
              />
              <span className={rule.valid ? 'text-success' : 'text-muted-foreground'}>
                {rule.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Error general */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Botón de registro */}
      <Button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full py-2 px-4 bg-success hover:bg-green-700 text-white rounded-lg disabled:opacity-60 gap-2"
      >
        {loading ? (
          <>
            <IconLoader2 size="sm" className="animate-spin" />
            Creando cuenta...
          </>
        ) : (
          <>
            <IconUserPlus size="sm" />
            Crear cuenta
          </>
        )}
      </Button>

      {!loading && !isFormValid && hasInteracted && blockingReasons.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-warning/5 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">Para habilitar "Crear cuenta", revisa:</p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
};

