import { useContext } from 'react';
import { AuthContext } from '@/app/providers/AuthContext';

/**
 * Hook personalizado para acceder al estado de autenticación y metadatos NO sensibles
 * Ahora no depende de un JWT almacenado en el cliente. Si se necesita expiry,
 * debe provenir del contexto (p.ej., de /auth/me) o calcularse a partir de metadatos.
 */
export const useJWT = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useJWT must be used within an AuthProvider');
  }

  // Derivar tiempo hasta expiración a partir de context.tokenExpiry (si estuviera disponible)
  const tokenExpiryDate = (context as any).tokenExpiry as Date | null | undefined;
  const timeToExpiry = tokenExpiryDate instanceof Date ? Math.max(0, tokenExpiryDate.getTime() - Date.now()) : 0;
  const isTokenExpiringSoon = timeToExpiry > 0 && timeToExpiry < 10 * 60 * 1000; // < 10 minutos

  return {
    ...context,
    tokenExpiry: tokenExpiryDate ?? null,
    isTokenExpiringSoon,
    timeToExpiry,
  };
};

/**
 * Hook para verificar permisos basados en el rol del usuario
 */
export const usePermissions = () => {
  const { role, isAuthenticated } = useJWT();

  return {
    isAdmin: role === 'Administrador',
    isInstructor: role === 'Instructor',
    isApprentice: role === 'Aprendiz',
    hasPermission: (requiredRole: string) => {
      if (!isAuthenticated) return false;

      const roleHierarchy: Record<string, number> = {
        'Administrador': 7,
        'Propietario':   6,
        'Capataz':       5,
        'Instructor':    4,
        'Veterinario':   3,
        'Operario':      2,
        'Aprendiz':      1,
      };

      const userLevel = roleHierarchy[role as string] ?? 0;
      const requiredLevel = roleHierarchy[requiredRole] ?? 0;
      // Strings que no son roles (p.ej. 'system:read') tienen nivel 0 → pasa cualquier usuario autenticado
      return userLevel >= requiredLevel;
    }
  };
};
