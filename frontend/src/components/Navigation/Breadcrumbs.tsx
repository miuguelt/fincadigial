import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeMap: Record<string, string> = {
  '/admin': 'Administración',
  '/admin/dashboard': 'Mi Finca',
  '/admin/animals': 'Animales',
  '/admin/fields': 'Potreros',
  '/admin/reproduction': 'Cría y Reproducción',
  '/admin/reproduction/fertility': 'Fertilidad',
  '/admin/reproduction/sire-performance': 'Toros y Reproductores',
  '/admin/reproduction/kpis': 'Indicadores del Hato',
  '/admin/treatments': 'Tratamientos e Insumos',
  '/admin/vaccinations': 'Vacunaciones',
  '/admin/inventory': 'Inventario',
  '/admin/users': 'Personal de la Finca',
  '/admin/regulatory-reports': 'Reportes ICA',
  '/admin/reports': 'Informes y Exportación',
  '/admin/analytics/reports': 'Reportes Personalizados',
  '/admin/analytics/ica-compliance': 'Cumplimiento ICA',
  '/admin/analytics/executive': 'Indicadores de la Finca',
  '/admin/analytics/multi-finca': 'Mis Fincas',
  '/apprentice/dashboard': 'Mi Finca',
  '/operario/dashboard': 'Mi Finca',
  '/instructor/dashboard': 'Mi Finca',
  '/veterinario/dashboard': 'Mi Finca',
  '/campesino': 'Mi Espacio',
  '/campesino/registro-operativo': 'Mi registro diario',
  '/campesino/ganaderia': 'Ganadería operativa',
  '/campesino/crop-plots': 'Cultivos y parcelas',
  '/campesino/crop-activities': 'Labores de cultivo',
  '/campesino/water-sources': 'Fuentes de agua',
  '/campesino/climate-alerts': 'Alertas de clima',
  '/campesino/weather': 'Clima y alertas',
  '/campesino/market-offers': 'Mercado campesino',
  '/campesino/technical-assistance': 'Asistencia técnica',
};

function formatSegment(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function Breadcrumbs() {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Inicio', path: '/dashboard' }
    ];

    let currentPath = '';
    pathnames.forEach((name) => {
      currentPath += `/${name}`;
      const label = routeMap[currentPath] || formatSegment(name);
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground" aria-label="Navegación de migas de pan">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.slice(1).map((breadcrumb) => (
        <React.Fragment key={breadcrumb.path}>
          <ChevronRight className="h-4 w-4" />
          {breadcrumb.path === location.pathname ? (
            <span className="font-medium text-foreground">{breadcrumb.label}</span>
          ) : (
            <Link
              to={breadcrumb.path}
              className="hover:text-foreground transition-colors"
            >
              {breadcrumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
