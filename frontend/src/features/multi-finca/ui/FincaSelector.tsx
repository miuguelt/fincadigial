import React from 'react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ChevronDown, Check, RefreshCw, LayoutDashboard, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';
import { useMultiFinca } from '../model/useMultiFinca';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/ui/cn';

export const FincaSelector: React.FC = () => {
  const { user } = useAuth();
  const { switchFinca, switching } = useMultiFinca();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const fincas = useMemo(
    () => (user?.fincas as any[]) || (user as any)?.finca_memberships || [],
    [user]
  );

  // Obtener el nombre de la finca activa
  const activeFincaName = useMemo(() => {
    if (fincas.length > 0 && user?.finca_id) {
      const active = fincas.find((f: any) => Number(f.finca_id ?? f.id) === Number(user?.finca_id));
      if (active) return active.name || active.finca_name || `Finca #${active.id ?? active.finca_id}`;
    }
    return user?.finca_name || 'Finca Villa Luz';
  }, [user, fincas]);

  if (!user?.finca_id) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-shrink-0 items-center gap-2"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={switching}
            data-testid="finca-selector"
            className={cn(
              'flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition-all duration-200 sm:px-3.5 sm:py-1.5 sm:text-sm',
              'hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
            )}
            aria-label={`Finca actual: ${activeFincaName}`}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[90px] fit-clamp font-medium sm:max-w-[130px]">{activeFincaName}</span>
            {switching ? (
              <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="z-[2000] mt-2 w-64 rounded-2xl border border-border/50 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Mis Fincas
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 border-border/30" />

          <div className="max-h-[240px] space-y-0.5 overflow-y-auto">
            {fincas.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">No hay fincas disponibles</div>
            ) : (
              fincas.map((f: any) => {
                const id = Number(f.finca_id ?? f.id);
                const isActive = Number(user.finca_id) === id;
                const displayName = f.name || f.finca_name || `Finca #${id}`;
                return (
                  <DropdownMenuItem
                    key={id}
                    disabled={switching}
                    data-testid="finca-option"
                    onClick={() => {
                      if (!isActive) void switchFinca(id);
                    }}
                    className={cn(
                      'flex min-h-[40px] cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-xs sm:text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-bold text-primary'
                        : 'text-foreground/80 hover:bg-primary/5 hover:text-foreground',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <LayoutDashboard
                        className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')}
                      />
                      <span className="fit-clamp">{displayName}</span>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator className="my-1 border-border/30" />

          <DropdownMenuItem
            onClick={() => navigate('/admin/analytics/multi-finca')}
            className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span>Vista Panorámica Multi-Finca</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              const nextParams = new URLSearchParams(window.location.search);
              nextParams.set('modal', 'create-finca');
              setSearchParams(nextParams, { replace: true });
            }}
            className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Agregar nueva finca</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
};
