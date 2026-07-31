import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  DollarSign,
  FileText,
  Library,
  Wrench,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from './SectionHeading';

interface AdminLink {
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
}

const LINKS: AdminLink[] = [
  { label: 'Personal', description: 'Usuarios y permisos', icon: Users, path: '/admin/users' },
  { label: 'Herramientas', description: 'Scanner y utilidades', icon: Wrench, path: '/admin/tasks' },
  { label: 'Inventario', description: 'Insumos y existencias', icon: Boxes, path: '/admin/inventory' },
  { label: 'Reportes', description: 'ICA y gerenciales', icon: FileText, path: '/admin/reports' },
  { label: 'Financiero', description: 'Costos e ingresos', icon: DollarSign, path: '/admin/financial' },
  { label: 'Analítica', description: 'KPIs ejecutivos', icon: BarChart3, path: '/admin/analytics/executive' },
  { label: 'Catálogos', description: 'Vacunas, razas, alimentos', icon: Library, path: '/admin/data-overview' },
];

/**
 * Pie de administración: lo que un administrador necesita alcanzar sin que
 * ocupe el espacio de las decisiones diarias del campo.
 */
export function AdminLinksRow() {
  const navigate = useNavigate();

  return (
    <section>
      <SectionHeading icon={Library} title="Administración" subtitle="Configuración y consulta, fuera de la operación diaria" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {LINKS.map(({ label, description, icon: Icon, path }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className="flex min-h-[76px] flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold leading-tight text-foreground">{label}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default AdminLinksRow;
