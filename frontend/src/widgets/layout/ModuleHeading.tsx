import React from 'react';
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  Dna,
  FolderKanban,
  HeartPulse,
  History,
  Map,
  Package,
  PawPrint,
  Route,
  Settings,
  Sprout,
  Tags,
  Users,
  Wallet,
  Wheat,
} from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';

type IconComponent = React.ComponentType<{ className?: string }>;

const moduleIcons: Array<{ terms: string[]; icon: IconComponent }> = [
  { terms: ['animal', 'ganado', 'reses'], icon: PawPrint },
  { terms: ['usuario', 'persona', 'equipo'], icon: Users },
  { terms: ['finca'], icon: Building2 },
  { terms: ['potrero', 'campo'], icon: Map },
  { terms: ['tarea', 'labor', 'faena'], icon: ClipboardList },
  { terms: ['aliment', 'forraje'], icon: Wheat },
  { terms: ['sanidad', 'caso clínico', 'enfermedad', 'tratamiento', 'medicamento', 'vacun'], icon: HeartPulse },
  { terms: ['reproduc', 'genét', 'raza', 'especie'], icon: Dna },
  { terms: ['ordeño', 'leche', 'producción'], icon: Sprout },
  { terms: ['inventario', 'insumo'], icon: Package },
  { terms: ['gasto', 'financ', 'presupuesto'], icon: Wallet },
  { terms: ['proyecto', 'plan de manejo'], icon: FolderKanban },
  { terms: ['alerta', 'notific'], icon: Bell },
  { terms: ['bitácora', 'actividad', 'historial'], icon: History },
  { terms: ['ruta'], icon: Route },
  { terms: ['calendario', 'evento'], icon: CalendarDays },
  { terms: ['configur', 'administr'], icon: Settings },
  { terms: ['catálogo'], icon: Tags },
  { terms: ['finca'], icon: Building2 },
];

function resolveModuleIcon(title: React.ReactNode): IconComponent {
  const titleText = typeof title === 'string' ? title : '';
  const normalizedTitle = titleText.toLocaleLowerCase('es-CO');
  return moduleIcons.find(({ terms }) => terms.some((term) => normalizedTitle.includes(term)))?.icon ?? Building2;
}

export interface ModuleHeadingProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Semántica del título. `h1` es el valor predeterminado para encabezados de vista. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  titleClassName?: string;
  iconContainerClassName?: string;
}

/** Encabezado visual estándar para módulos y vistas de la aplicación. */
export function ModuleHeading({
  title,
  description,
  icon,
  headingLevel = 'h1',
  titleClassName,
  iconContainerClassName,
}: ModuleHeadingProps) {
  const Icon = resolveModuleIcon(title);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/20',
        iconContainerClassName,
      ].filter(Boolean).join(' ')}>
        {icon ?? <Icon className="h-5 w-5 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <FitText
          as={headingLevel}
          minScale={0.7}
          className={[
            'text-lg font-black tracking-tight text-foreground',
            titleClassName,
          ].filter(Boolean).join(' ')}
        >
          {title}
        </FitText>
        {description ? (
          <FitText as="p" minScale={0.8} className="text-xs font-medium text-muted-foreground">
            {description}
          </FitText>
        ) : null}
      </div>
    </div>
  );
}

export default ModuleHeading;
