import type { ReactNode } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { UserFormFields } from '../form.types';

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  if (typeof error === 'string') return <span>{error}</span>;
  if (typeof error === 'object' && error && 'message' in error) return <span>{String(error.message)}</span>;
  return null;
}

function FormField({ label, error, children }: { label: string; error: unknown; children: ReactNode }) {
  return <div><label>{label}</label>{children}<FormError error={error} /></div>;
}

interface UserFormFieldsProps {
  register: UseFormRegister<UserFormFields>;
  errors: FieldErrors<UserFormFields>;
  showPassword: boolean;
}

export function UserFormFields({ register, errors, showPassword }: UserFormFieldsProps) {
  return (
    <>
      <FormField label="Nombre completo" error={errors.fullname}>
        <input {...register('fullname', { required: 'El nombre es obligatorio' })} />
      </FormField>
      <FormField label="Identificación" error={errors.identification}>
        <input type="number" {...register('identification', { required: 'La identificación es obligatoria', valueAsNumber: true })} />
      </FormField>
      <FormField label="Correo electrónico" error={errors.email}>
        <input type="email" {...register('email', { required: 'El correo electrónico es obligatorio' })} />
      </FormField>
      <FormField label="Teléfono" error={errors.phone}>
        <input type="tel" {...register('phone', { required: 'El teléfono es obligatorio', minLength: { value: 7, message: 'El teléfono debe tener al menos 7 dígitos' } })} />
      </FormField>
      <FormField label="Rol" error={errors.role}>
        <select {...register('role', { required: 'El rol es obligatorio' })}>
          <option value="">Seleccione</option>
          <option value="Administrador">Administrador</option>
          <option value="Instructor">Instructor</option>
          <option value="Aprendiz">Aprendiz</option>
        </select>
      </FormField>
      {showPassword && <FormField label="Contraseña" error={errors.password}>
        <input type="password" {...register('password', { required: 'La contraseña es obligatoria' })} />
      </FormField>}
    </>
  );
}
