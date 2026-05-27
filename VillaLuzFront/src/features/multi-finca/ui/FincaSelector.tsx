import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/features/auth/model/useAuth";
import { useMultiFinca } from "../model/useMultiFinca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MapPin, ChevronDown, Check, RefreshCw, LayoutDashboard, Plus } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { useNavigate } from "react-router-dom";

export const FincaSelector: React.FC = () => {
  const { user } = useAuth();
  const { switchFinca, switching } = useMultiFinca();
  const navigate = useNavigate();

  if (!user?.finca_id) return null;

  // Obtener el nombre de la finca activa con múltiples capas de seguridad
  const activeFincaName = React.useMemo(() => {
    if (user?.fincas && user.finca_id) {
      const active = user.fincas.find((f: any) => Number(f.finca_id) === Number(user.finca_id));
      if (active?.name) return active.name;
    }
    return user?.finca_name || "Villa Luz";
  }, [user]);

  const hasMultipleFincas = user?.fincas && user.fincas.length > 1;
  const hasFincas = user?.fincas && user.fincas.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-2 flex-shrink-0"
    >
      {hasMultipleFincas ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={switching}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-primary/20 bg-card/65 backdrop-blur-md text-foreground transition-all duration-300 shadow-sm",
                "hover:bg-primary/5 hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25",
                "disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]",
                "text-xs sm:text-sm font-semibold select-none"
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0 animate-pulse-subtle">
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <span className="truncate max-w-[80px] sm:max-w-[120px]">
                {activeFincaName}
              </span>
              {switching ? (
                <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin text-primary flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 mt-2 rounded-lg border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-300 z-[2000]"
          >
            <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Mis Fincas
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-border/30" />
            
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin space-y-0.5">
              {!hasFincas ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No hay fincas disponibles
                </div>
              ) : (
                <>
                  {(user.fincas || []).map((f: any) => {
                    const isActive = Number(f.finca_id) === Number(user.finca_id);
                    const displayName = f.finca_name || f.name || `Finca #${f.finca_id}`;
                    return (
                      <DropdownMenuItem
                        key={f.finca_id}
                        onClick={() => !isActive && switchFinca(Number(f.finca_id))}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-xs sm:text-sm",
                          isActive
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-primary/5 text-foreground/80 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <LayoutDashboard className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
                          <span className="truncate">{displayName}</span>
                        </div>
                        {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  
                  <DropdownMenuSeparator className="my-1 border-border/30" />
                  <DropdownMenuItem
                    onClick={() => navigate('/fincas/crear')}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-primary hover:bg-primary/5 font-bold text-xs sm:text-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Agregar nueva finca</span>
                  </DropdownMenuItem>
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        /* Estado Finca única — Con diseño premium idéntico */
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-primary/10 bg-primary/5 text-primary shadow-sm",
            "text-xs sm:text-sm font-semibold select-none"
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary/15 text-primary flex-shrink-0">
            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <span className="truncate max-w-[100px] sm:max-w-[140px]">
            {activeFincaName}
          </span>
          {switching && <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin text-primary flex-shrink-0" />}
        </div>
      )}
    </motion.div>
  );
};
