type EnvironmentValues = Record<string, string | undefined>;

const firstConfiguredValue = (...values: Array<string | undefined>): string => {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
};

/**
 * Resuelve la contraseña local sin permitir que una copia desactualizada del
 * frontend reemplace la contraseña configurada para los usuarios semilla.
 */
export function resolveDevelopmentProfilePassword(
  frontendEnv: EnvironmentValues,
  backendEnv: EnvironmentValues,
  processEnv: EnvironmentValues = {},
): string {
  return firstConfiguredValue(
    processEnv.DEV_SEED_PASSWORD,
    processEnv.ADMIN_PASSWORD,
    processEnv.TEST_USER_PASSWORD,
    backendEnv.DEV_SEED_PASSWORD,
    backendEnv.ADMIN_PASSWORD,
    backendEnv.TEST_USER_PASSWORD,
    frontendEnv.VITE_DEV_PROFILE_PASSWORD,
  );
}
