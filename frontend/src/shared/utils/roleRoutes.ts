/**
 * Prefijos de ruta por rol.
 * La implementación vive en `@/shared/lib/routeAccess` junto con la política
 * de acceso, para que prefijo y permiso no se desincronicen.
 */
export { getRolePrefix, toRolePath, canAccessRoutePath } from "@/shared/lib/routeAccess";
