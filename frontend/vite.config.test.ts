import { describe, expect, it } from 'vitest';
import { resolveDevelopmentProfilePassword } from './src/shared/config/developmentProfilePassword';

describe('resolución de contraseña para perfiles de desarrollo', () => {
  it('prioriza la contraseña del backend sobre una variable Vite desactualizada', () => {
    expect(
      resolveDevelopmentProfilePassword(
        { VITE_DEV_PROFILE_PASSWORD: 'frontend-desactualizada' },
        { DEV_SEED_PASSWORD: 'backend-configurado' },
        {},
      ),
    ).toBe('backend-configurado');
  });

  it('usa la variable pública del frontend solo como respaldo local', () => {
    expect(
      resolveDevelopmentProfilePassword(
        { VITE_DEV_PROFILE_PASSWORD: 'respaldo-local' },
        {},
        {},
      ),
    ).toBe('respaldo-local');
  });
});
