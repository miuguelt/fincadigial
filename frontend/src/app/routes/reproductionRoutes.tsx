import { lazy } from 'react';
import { Route } from 'react-router-dom';

/**
 * Rutas del módulo reproductivo.
 *
 * Viven aparte de `AppRoutes` porque el módulo tiene varias pantallas propias
 * (registro, fertilidad, reproductores, indicadores del hato) y se montan bajo
 * dos prefijos distintos: el genérico por rol y el explícito de administración.
 */

const ReproductionPage = lazy(() => import('@/pages/dashboard/admin/reproduction/index.tsx'));
const FertilityDashboard = lazy(() => import('@/pages/dashboard/admin/reproduction/FertilityDashboard.tsx'));
const SirePerformance = lazy(() => import('@/pages/dashboard/admin/reproduction/SirePerformance.tsx'));
const HerdKpisPage = lazy(() => import('@/pages/dashboard/admin/reproduction/HerdKpis.tsx'));

/** Sufijo de ruta → pantalla, único lugar donde se declara el módulo. */
const REPRODUCTION_SCREENS: Array<[string, React.ReactElement]> = [
  ['', <ReproductionPage />],
  ['/fertility', <FertilityDashboard />],
  ['/sire-performance', <SirePerformance />],
  ['/kpis', <HerdKpisPage />],
];

/** Rutas de reproducción montadas bajo el prefijo indicado. */
export const reproductionRoutes = (prefix: string) =>
  REPRODUCTION_SCREENS.map(([suffix, element]) => (
    <Route key={`${prefix}${suffix}`} path={`${prefix}/reproduction${suffix}`} element={element} />
  ));

export default reproductionRoutes;
