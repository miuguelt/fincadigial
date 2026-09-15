import { Role } from '@/entities/user/model/types';

const isTestEnv =
  typeof (globalThis as any).process !== 'undefined' &&
  (!!((globalThis as any).process as any).env?.JEST_WORKER_ID ||
    !!((globalThis as any).process as any).env?.VITEST);

const prefetchedModules = new Set<string>();

function safePrefetch(key: string, loader: () => Promise<any>) {
  if (isTestEnv || prefetchedModules.has(key)) return;
  prefetchedModules.add(key);
  try {
    void loader();
  } catch {
    /* ignore prefetch failures */
  }
}

/**
 * Prefetch inteligente de rutas según el rol autenticado.
 * Carga el dashboard del rol y programa en tiempo ocioso (requestIdleCallback)
 * la descarga de los módulos operativos más visitados (Animales y Potreros).
 */
export function prefetchRoleRoutes(role?: string | Role | null) {
  if (isTestEnv) return;

  // Prefetch layout común del dashboard
  safePrefetch('layout', () => import('@/widgets/dashboard-layout/DashboardLayout'));

  switch (role) {
    case Role.Administrador:
    case 'Admin':
    case 'Administrador':
    case Role.Propietario:
    case 'Propietario':
    case Role.Capataz:
    case 'Capataz':
      safePrefetch('admin-dash', () => import('@/pages/dashboard/admin/AdminDashboard'));
      break;
    case Role.Instructor:
    case 'Instructor':
      safePrefetch('instructor-dash', () => import('@/pages/dashboard/instructor/InstructorDashboard'));
      break;
    case Role.Veterinario:
    case 'Veterinario':
      safePrefetch('vet-dash', () => import('@/pages/dashboard/veterinario/VeterinarioDashboard'));
      break;
    case Role.Aprendiz:
    case 'Apprentice':
    case 'Aprendiz':
      safePrefetch('apprentice-dash', () => import('@/pages/dashboard/apprentice/ApprenticeDashboard'));
      break;
    case Role.Operario:
    case 'Operario':
      safePrefetch('operario-dash', () => import('@/pages/dashboard/operario/OperarioDashboard'));
      break;
    case 'Campesino':
      safePrefetch('campesino-dash', () => import('@/pages/dashboard/campesino/CampesinoDashboard'));
      break;
    default:
      safePrefetch('landing', () => import('@/pages/landing/index'));
      safePrefetch('login', () => import('@/pages/auth/login/index'));
      break;
  }

  // En tiempo ocioso (idle), prefetch de los dos centros operativos principales de la finca
  if (role && role !== 'Invitado') {
    const scheduleIdle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 3000 })
        : (cb: () => void) => setTimeout(cb, 1500);

    scheduleIdle(() => {
      safePrefetch('animals', () => import('@/pages/dashboard/admin/animals/index'));
      safePrefetch('fields', () => import('@/pages/dashboard/admin/fields/index'));
    });
  }
}

/** Mapa de anticipación de ruta para interacción táctil o hover */
const ROUTE_PREFETCH_MAP: Array<{ match: string; key: string; loader: () => Promise<any> }> = [
  { match: 'animals', key: 'animals', loader: () => import('@/pages/dashboard/admin/animals/index') },
  { match: 'fields', key: 'fields', loader: () => import('@/pages/dashboard/admin/fields/index') },
  { match: 'tasks', key: 'tasks', loader: () => import('@/pages/dashboard/admin/tasks/index') },
  { match: 'reproduction', key: 'reproduction', loader: () => import('@/pages/dashboard/admin/reproduction/index') },
  { match: 'vaccin', key: 'vaccines', loader: () => import('@/pages/dashboard/admin/vaccinations/index') },
  { match: 'treatment', key: 'treatments', loader: () => import('@/pages/dashboard/admin/treatments/index') },
  { match: 'inventory', key: 'inventory', loader: () => import('@/pages/dashboard/admin/inventory/index') },
  { match: 'calendar', key: 'calendar', loader: () => import('@/pages/dashboard/calendar/CalendarPage') },
  { match: 'campesino', key: 'campesino', loader: () => import('@/pages/dashboard/campesino/CampesinoDashboard') },
  { match: 'ganaderia', key: 'ganaderia', loader: () => import('@/pages/dashboard/campesino/GanaderiaOperativaPage') },
];

/**
 * Prefetch anticipatorio disparado por `onMouseEnter` o `onTouchStart`.
 * Inicia la descarga del chunk JS antes de que el usuario termine el clic,
 * reduciendo la latencia de navegación percibida a 0 ms.
 */
export function prefetchRouteByPath(path: string) {
  if (isTestEnv || !path) return;
  const lower = path.toLowerCase();
  for (const item of ROUTE_PREFETCH_MAP) {
    if (lower.includes(item.match)) {
      safePrefetch(item.key, item.loader);
      break;
    }
  }
}
