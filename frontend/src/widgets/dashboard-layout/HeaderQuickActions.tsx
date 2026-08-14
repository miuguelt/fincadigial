import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconCow, IconMilk, IconPlant2, IconQrcode, IconStethoscope } from '@/shared/ui/icons';
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

interface Action {
  label: string;
  path: string;
  icon: React.ElementType;
  color: string;
  group: 1 | 2;
}

function buildActions(prefix: string): Action[] {
  return [
    { label: 'Mi ganado', path: `${prefix}/animals`, icon: IconCow, color: 'text-amber-600', group: 1 },
    { label: 'Mi huerta', path: '/campesino', icon: IconPlant2, color: 'text-emerald-500', group: 1 },
    { label: 'Escáner QR', path: '/scanner', icon: IconQrcode, color: 'text-sky-500', group: 1 },
    { label: 'Registrar leche', path: '/quick/milk', icon: IconMilk, color: 'text-blue-500', group: 2 },
    { label: 'Reportar enfermedad', path: '/quick/disease', icon: IconStethoscope, color: 'text-rose-500', group: 2 },
  ];
}

/** Atajos de finca del encabezado (antes embebidos dentro de `Header`). */
const HeaderQuickActions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const prefix = ROLE_PREFIX[user?.role as string] || '/admin';
  const actions = buildActions(prefix);

  const openAction = (path: string) => {
    if (!path.startsWith('/quick/')) {
      navigate(path);
      return;
    }

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('quick', path.replace('/quick/', ''));
    setSearchParams(nextParams, { replace: true });
  };

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
              onClick={() => openAction(action.path)}
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
