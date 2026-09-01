import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import * as Icons from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';

const routeConfig: Record<string, string> = {
  // Módulo Campesino y Operativo
  'campesino': 'Mi Espacio',
  'registro-operativo': 'Mi registro diario',
  'ganaderia': 'Ganadería operativa',
  'crop-plots': 'Cultivos y parcelas',
  'crop-activities': 'Labores de cultivo',
  'water-sources': 'Fuentes de agua',
  'climate-alerts': 'Alertas de clima',
  'weather': 'Clima y alertas',
  'market-offers': 'Mercado campesino',
  'technical-assistance': 'Asistencia técnica',
  'offline-learning': 'Capacitación',

  // Gestión General y Roles
  'admin': 'Administración',
  'dashboard': 'Mi Finca',
  'profile': 'Mi Perfil',
  'select-finca': 'Seleccionar Finca',
  'chat': 'Mensajes',
  'alerts': 'Alertas',
  'scanner': 'Escanear Chapeta',
  'user-approval': 'Solicitudes de Ingreso',
  'users': 'Personal de la Finca',
  'global': 'Usuarios del Sistema',
  'fincas': 'Todas las Fincas',
  'membership': 'Finca y Permisos',
  'tasks': 'Herramientas',
  'data-overview': 'Ajustes del Sistema',
  'operational': 'Operaciones',
  'activity-log': 'Bitácora de Actividades',
  'diagnostics': 'Diagnósticos',
  'calendar': 'Calendario',

  // Ganadería y Producción
  'animals': 'Animales',
  'fields': 'Potreros',
  'controls': 'Registros',
  'control': 'Registros',
  'reproduction': 'Cría y Reproducción',
  'fertility': 'Fertilidad',
  'sire-performance': 'Toros y Reproductores',
  'genetic-improvements': 'Mejoramiento Genético',
  'genetic_improvements': 'Mejoramiento Genético',
  'species': 'Especies',
  'breeds': 'Razas',
  'food-types': 'Alimentación y Forrajes',
  'milk-production': 'Producción de Leche',
  'growth': 'Crecimiento',
  'animal-fields': 'Animales en Potrero',

  // Sanidad Animal
  'health': 'Sanidad Animal',
  'disease-animals': 'Enfermedades y Alertas',
  'diseases': 'Enfermedades',
  'treatments': 'Tratamientos e Insumos',
  'treatment_medications': 'Tratamientos Médicos',
  'treatment_vaccines': 'Vacunación',
  'vaccinations': 'Vacunaciones',
  'vaccines': 'Vacunas',
  'medications': 'Medicamentos',
  'inventory': 'Inventario',

  // Analítica, Reportes e ICA
  'analytics': 'Informes',
  'executive': 'Indicadores de la Finca',
  'reports': 'Informes y Exportación',
  'regulatory-reports': 'Reportes ICA',
  'ica-compliance': 'Cumplimiento ICA',
  'multi-finca': 'Mis Fincas',
  'financial': 'Finanzas',

  // Herramientas y Capacitación
  'tools': 'Herramientas',
  'frame-calculator': 'Calculadora de Estructura',
  'ration-calculator': 'Calculadora de Ración',
  'courses': 'Capacitación',
  'lessons': 'Lecciones',
  'basics': 'Manejo Básico',
  'records': 'Registro ICA',

  // Rutas y Vistas Específicas
  'kpis': 'Indicadores del Hato',
  'estadisticas': 'Estadísticas',
  'alert-configs': 'Configuración de Alertas',
  'configs': 'Configuración',
  'form': 'Formulario',
  'detail': 'Detalle',
  'create': 'Crear',
  'edit': 'Editar',
};

function getSegmentLabel(segment: string): string {
  if (routeConfig[segment]) return routeConfig[segment];
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

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
    ? getSegmentLabel(displayPaths[displayPaths.length - 1])
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
            const label = getSegmentLabel(value);

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
