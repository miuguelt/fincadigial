import { Check, LayoutDashboard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenuItem, DropdownMenuLabel } from '@/shared/ui/dropdown-menu';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { cn } from '@/shared/ui/cn';

interface Props {
  fincas: any[];
  activeFincaId?: number | null;
  onNavigate?: () => void;
}

/**
 * Cambio de finca dentro del menú del perfil. Antes vivía en el menú lateral;
 * se movió aquí para que la hamburguesa sea únicamente la lista de secciones.
 */
export function ProfileFincaItems({ fincas, activeFincaId, onNavigate }: Props) {
  const navigate = useNavigate();
  const { switchFinca, switching } = useMultiFinca();

  return (
    <>
      <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Mis fincas
      </DropdownMenuLabel>

      <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
        {fincas.map((f: any) => {
          const id = Number(f.finca_id ?? f.id);
          const isActive = Number(activeFincaId) === id;
          const displayName = f.finca_name || f.name || `Finca #${id}`;
          return (
            <DropdownMenuItem
              key={id}
              disabled={switching}
              onClick={() => {
                if (!isActive) void switchFinca(id);
              }}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-sm',
                isActive ? 'bg-primary/10 font-bold text-primary' : 'text-foreground/80',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <LayoutDashboard
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')}
                />
                <span className="truncate">{displayName}</span>
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </div>

      <DropdownMenuItem
        onClick={() => {
          navigate('/fincas/crear');
          onNavigate?.();
        }}
        className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary"
      >
        <Plus className="h-4 w-4" />
        Agregar nueva finca
      </DropdownMenuItem>
    </>
  );
}
