import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import * as Icons from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';

const routeConfig: Record<string, string> = {
  'admin': 'Administración',
  'animals': 'Animales',
  'fields': 'Potreros',
  'controls': 'Registros',
  'reproduction': 'Cría y Reproducción',
  'food-types': 'Alimentación',
  'treatments': 'Tratamientos',
  'disease-animals': 'Salud',
  'analytics': 'Informes',
  'executive': 'Resumen',
  'reports': 'Reportes',
  'campesino': 'Mi Espacio',
  'user-approval': 'Por Aprobar',
  'users': 'Personas',
  'membership': 'Mi Finca y Permisos',
  'tasks': 'Herramientas',
  'data-overview': 'Ajustes',
  'dashboard': 'Mi Finca',
  'courses': 'Capacitación',
  'lessons': 'Lecciones',
  'basics': 'Manejo Básico',
  'health': 'Sanidad Animal',
  'records': 'Registro ICA',
  'registro-operativo': 'Mi registro diario',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // No mostrar en el home principal o si no hay paths
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return (
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Home className="h-4 w-4 text-primary" />
            <span>Mi Finca</span>
        </div>
    );
  }

  // Filtrar prefijos de rol
  const displayPaths = pathnames.filter(p => !['admin', 'instructor', 'veterinario', 'apprentice', 'operario'].includes(p));
  const currentLabel = displayPaths.length > 0 
    ? (routeConfig[displayPaths[displayPaths.length - 1]] || displayPaths[displayPaths.length - 1]) 
    : 'Mi Finca';

  return (
    <>
      {/* Vista Móvil: Flecha atrás + Nivel actual */}
      <div className="flex sm:hidden items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          aria-label="Volver"
        >
          <Icons.IconChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-foreground fit-clamp max-w-[150px]">
          {currentLabel}
        </span>
      </div>

      {/* Vista Desktop: Breadcrumb completo */}
      <nav className="hidden sm:flex items-center text-sm font-medium" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 sm:gap-2">
          <li>
            <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors flex items-center">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          
          {displayPaths.slice(0, 3).map((value, index) => {
            const last = index === displayPaths.length - 1 || index === 2;
            const label = routeConfig[value] || value.charAt(0).toUpperCase() + value.slice(1);
            
            return (
              <React.Fragment key={value}>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                <li className={cn(
                  "fit-clamp max-w-[100px] sm:max-w-[150px]",
                  last ? "font-bold text-foreground" : "text-muted-foreground hover:text-primary transition-colors"
                )}>
                  {last ? (
                    <span>{label}</span>
                  ) : (
                    <span className="cursor-default">{label}</span>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
