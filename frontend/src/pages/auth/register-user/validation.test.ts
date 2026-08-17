import { describe, expect, it } from 'vitest';
import { buildValidationErrors, mapBackendValidationErrors, type SignUpFormData } from './validation';

const form = (overrides: Partial<SignUpFormData> = {}): SignUpFormData => ({
  name: 'Ana Pérez',
  email: 'ana@finca.co',
  phone: '3001234567',
  password: 'Contrasena1',
  confirmPassword: 'Contrasena1',
  identification_number: '1094123456',
  role: 'Aprendiz',
  address: '',
  ...overrides,
});

describe('buildValidationErrors', () => {
  it('acepta un formulario completo y correcto', () => {
    expect(buildValidationErrors(form())).toEqual({});
  });

  it('exige los campos obligatorios', () => {
    const errors = buildValidationErrors(
      form({ name: '  ', email: '', phone: '', identification_number: '', password: '', confirmPassword: '' }),
    );

    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.identification_number).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });

  it('rechaza correo y teléfono con formato inválido', () => {
    const errors = buildValidationErrors(form({ email: 'ana@finca', phone: '123' }));

    expect(errors.email).toContain('válido');
    expect(errors.phone).toContain('válido');
  });

  it('pide contraseña con largo, mayúscula y número', () => {
    expect(buildValidationErrors(form({ password: 'corta1A', confirmPassword: 'corta1A' })).password)
      .toContain('8 caracteres');
    expect(buildValidationErrors(form({ password: 'sinmayuscula1', confirmPassword: 'sinmayuscula1' })).password)
      .toContain('mayúscula');
    expect(buildValidationErrors(form({ password: 'SinNumeroAqui', confirmPassword: 'SinNumeroAqui' })).password)
      .toContain('número');
  });

  it('avisa cuando la confirmación no coincide', () => {
    expect(buildValidationErrors(form({ confirmPassword: 'Otra1234' })).confirmPassword)
      .toContain('no coinciden');
  });
});

describe('mapBackendValidationErrors', () => {
  it('traduce los nombres del backend a los campos del formulario', () => {
    const errors = mapBackendValidationErrors({
      validation_errors: {
        fullname: 'El nombre ya existe',
        identification: ['Ya registrado'],
        email: [{ message: 'Correo en uso' }],
      },
    });

    expect(errors.name).toBe('El nombre ya existe');
    expect(errors.identification_number).toBe('Ya registrado');
    expect(errors.email).toBe('Correo en uso');
  });

  it('junta varios mensajes del mismo campo', () => {
    const errors = mapBackendValidationErrors({ errors: { phone: ['Muy corto', 'Ya registrado'] } });

    expect(errors.phone).toBe('Muy corto • Ya registrado');
  });

  it('ignora payloads vacíos o de otra forma', () => {
    expect(mapBackendValidationErrors(null)).toEqual({});
    expect(mapBackendValidationErrors('error')).toEqual({});
    expect(mapBackendValidationErrors({ campo_desconocido: 'algo' })).toEqual({});
  });
});
