import React from 'react';
import { Activity, Droplet, Heart, Plus, QrCode, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const ROLE_PREFIX: Record<string, string> = {
  Administrador: '/admin',
  Propietario: '/admin',
  Capataz: '/admin',
  Instructor: '/instructor',
  Veterinario: '/veterinario',
  Aprendiz: '/apprentice',
  Operario: '/operario',
};

const SCANNER_BY_PREFIX: Record<string, string> = {
  '/instructor': '/instructor/scanner',
  '/veterinario': '/veterinario/scanner',
};

interface Action {
  label: string;
  path: string;
  icon: LucideIcon;
  color: string;
  group: 1 | 2;
}

function buildActions(prefix: string): Action[] {
  return [
    { label: 'Mis Animales', path: `${prefix}/animals`, icon: Activity, color: 'text-amber-500', group: 1 },
    { label: 'Mi Huerta', path: '/campesino', icon: Sprout, color: 'text-emerald-500', group: 1 },
    { label: 'Escáner QR', path: SCANNER_BY_PREFIX[prefix] || '/scanner', icon: QrCode, color: 'text-sky-500', group: 1 },
    { label: 'Registrar Leche', path: '/quick/milk', icon: Droplet, color: 'text-blue-500', group: 2 },
    { label: 'Salud Animal', path: '/quick/disease', icon: Heart, color: 'text-rose-500', group: 2 },
  ];
}

/** Atajos de finca del encabezado (antes embebidos dentro de `Header`). */
const HeaderQuickActions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefix = ROLE_PREFIX[user?.role as string] || '/admin';
  const actions = buildActions(prefix);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
          title="Atajos de Finca"
          aria-label="Atajos de finca"
        >
          <Plus className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[1050] mt-2 w-60 rounded-xl border border-border/40 bg-card/90 p-2 shadow-2xl backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Acciones rápidas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, index) => (
          <React.Fragment key={action.path}>
            {index > 0 && actions[index - 1].group !== action.group && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => navigate(action.path)}
              className="flex min-h-[44px] cursor-pointer items-center rounded-lg text-sm font-medium"
            >
              <action.icon className={`mr-2 h-4 w-4 ${action.color}`} />
              <span>{action.label}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderQuickActions;
