/**
 * Definición del recorrido guiado de bienvenida para usuarios nuevos.
 *
 * Cada paso puede anclarse a un selector (`target`), visitar una ruta del
 * módulo del rol (`path`, se resuelve con el prefijo `/admin`, `/instructor`,
 * etc.) o ser una diapositiva centrada sin ancla (bienvenida / cierre).
 */

export type TourIcon =
  | 'welcome'
  | 'menu'
  | 'cow'
  | 'create'
  | 'search'
  | 'finish';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStepDef {
  id: string;
  icon: TourIcon;
  title: string;
  body: string;
  selector?: string;
  path?: string;
  placement?: TourPlacement;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    icon: 'welcome',
    title: '¡Bienvenido a Villa Luz!',
    body:
      'Esta es tu finca digital: registra tus animales, potreros, sanidad y ' +
      'producción desde el celular o el computador. En 5 pasos te muestro ' +
      'dónde empieza todo.',
  },
  {
    id: 'menu',
    icon: 'menu',
    selector: '#dashboard-sidebar',
    placement: 'right',
    title: 'El menú de la finca',
    body:
      'Este panel reúne todo lo de tu finca por grupos: Ganadería, Sanidad ' +
      'animal, Informes, Mi espacio y Configuración. Déjalo abierto mientras ' +
      'te guío.',
  },
  {
    id: 'menu-group-Ganadería',
    icon: 'cow',
    selector: '[data-tour="menu-group-Ganadería"]',
    placement: 'right',
    title: 'Ganadería: el corazón',
    body:
      'Aquí viven tus potreros, el ganado, la cría y reproducción y la ' +
      'alimentación. Todo lo que come y produce tu ganado se controla desde ' +
      'este grupo.',
  },
  {
    id: 'menu-item-Ganado',
    icon: 'cow',
    selector: '[data-tour="menu-item-Ganado"]',
    path: '/animals',
    placement: 'right',
    title: 'Ganado: tu inventario vivo',
    body:
      'Cada animal aparece con su arete, raza, sexo, peso y alertas. Es la ' +
      'pantalla en la que siempre aterrizarás: primero verás la ' +
      'recomendación para crear tu primer animal.',
  },
  {
    id: 'create',
    icon: 'create',
    selector: '[data-tour="entity-create"]',
    path: '/animals',
    placement: 'bottom',
    title: 'Registra tu primer animal',
    body:
      'Toca el botón ➕ Nuevo (o la franja verde "Crear mi primer animal"): ' +
      'pon el arete, raza, sexo y fecha de nacimiento. Solo lo que sabes de ' +
      'memoria; el historial lo arma la app.',
  },
  {
    id: 'search',
    icon: 'search',
    selector: '[data-tour="entity-search"]',
    path: '/animals',
    placement: 'bottom',
    title: 'Encuentra a tu animal',
    body:
      'Con el buscador encuentras cualquier animal por arete, nombre o ' +
      'categoría en segundos, incluso con cientos de reses en tu ganado.',
  },
  {
    id: 'finish',
    icon: 'finish',
    title: '¡Ya puedes empezar!',
    body:
      'Siguientes pasos: crea tus potreros para ubicar el ganado, registra ' +
      'controles sanitarios cuando vacunes y anota la producción de leche en ' +
      '"Mi registro diario". Si dudas, usa "Asistencia técnica" en Mi ' +
      'espacio.',
  },
];

/** Prefijo de ruta por rol (espejo del sidebar). */
export function rolePathPrefix(role?: string | null): string {
  switch (role) {
    case 'Instructor':
      return '/instructor';
    case 'Veterinario':
      return '/veterinario';
    case 'Aprendiz':
      return '/apprentice';
    case 'Operario':
      return '/operario';
    case 'Propietario':
    case 'Capataz':
    case 'Administrador':
    default:
      return '/admin';
  }
}
