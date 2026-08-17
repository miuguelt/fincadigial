import { Check, Eye, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconBuildingCottage } from '@/shared/ui/icons';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { cn } from '@/shared/ui/cn';

interface Props {
  fincas: any[];
  activeFincaId?: number | null;
  onNavigate?: () => void;
}

/**
 * Cambio de finca dentro del menú del perfil.
 */
export function ProfileFincaItems({ fincas, activeFincaId, onNavigate }: Props) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { switchFinca, switching } = useMultiFinca();

  return (
    <>
      <DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                <IconBuildingCottage
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')}
                />
                <span className="fit-clamp">{displayName}</span>
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </div>

      <DropdownMenuSeparator className="my-1 border-border/30" />

      <DropdownMenuItem
        onClick={() => {
          navigate('/admin/analytics/multi-finca');
          onNavigate?.();
        }}
        className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
      >
        <Eye className="h-4 w-4 shrink-0" />
        Vista Panorámica Multi-Finca
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => {
          const nextParams = new URLSearchParams(window.location.search);
          nextParams.set('modal', 'create-finca');
          setSearchParams(nextParams, { replace: true });
          onNavigate?.();
        }}
        className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary"
      >
        <Plus className="h-4 w-4 shrink-0" />
        Agregar nueva finca
      </DropdownMenuItem>
    </>
  );
}
