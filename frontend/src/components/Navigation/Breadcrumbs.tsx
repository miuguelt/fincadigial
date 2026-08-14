import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeMap: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/dashboard': 'Panel',
  '/admin/animals': 'Animales',
  '/admin/fields': 'Potreros',
  '/admin/reproduction': 'Reproducción',
  '/admin/reproduction/fertility': 'Fertilidad',
  '/admin/reproduction/sire-performance': 'Toros',
  '/admin/treatments': 'Tratamientos',
  '/admin/vaccinations': 'Vacunaciones',
  '/admin/inventory': 'Inventario',
  '/admin/users': 'Usuarios',
  '/admin/regulatory-reports': 'Reportes ICA',
  '/admin/reports': 'Reportes',
  '/admin/analytics/reports': 'Reportes Personalizados',
  '/admin/analytics/ica-compliance': 'Cumplimiento ICA',
  '/apprentice/dashboard': 'Panel',
  '/operario/dashboard': 'Panel',
  '/instructor/dashboard': 'Panel',
  '/veterinario/dashboard': 'Panel',
};

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
      const label = routeMap[currentPath] || name.charAt(0).toUpperCase() + name.slice(1);
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
