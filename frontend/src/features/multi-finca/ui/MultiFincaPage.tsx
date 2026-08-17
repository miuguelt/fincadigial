import React, { useState } from "react";
import {
  IconBuilding,
  IconCircleCheck,
  IconShieldCheck,
  IconSwitchHorizontal,
  IconLoader2,
  IconCirclePlus,
  IconPlus,
} from "@/shared/ui/icons";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useAuth } from "@/features/auth/model/useAuth";
import { useMultiFinca } from "../model/useMultiFinca";
import { useToast } from "@/app/providers/ToastContext";
import { cn } from "@/shared/ui/cn";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

export const MultiFincaPage: React.FC = () => {
  const { user } = useAuth();
  const { switchFinca, switching } = useMultiFinca();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const fincas = (user?.fincas as any[]) || (user as any)?.finca_memberships || [];

  const handleSwitchFinca = async (fincaId: number) => {
    if (fincaId === user?.finca_id) return;
    setSwitchingId(fincaId);
    try {
      await switchFinca(fincaId);
    } catch (err: any) {
      showToast("Error al cambiar de finca", "error");
    } finally {
      setSwitchingId(null);
    }
  };

  const openCreateFinca = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("modal", "create-finca");
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
            Mis Fincas
          </h1>
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">
            Gestiona tus predios activos y cambia de contexto
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/admin/analytics/multi-finca')}
            className="rounded-lg h-10 px-6 font-bold uppercase text-xs tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            <Eye className="h-4 w-4" /> Vista Panorámica Multi-Finca
          </Button>
          <Button
            variant="outline"
            onClick={openCreateFinca}
            className="rounded-lg h-10 px-6 font-bold uppercase text-xs tracking-widest gap-2 border-2"
          >
            <IconPlus className="h-4 w-4" /> Crear Nueva Finca
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/select-finca')}
            className="rounded-lg h-10 px-6 font-bold uppercase text-xs tracking-widest gap-2 border-2"
          >
            <IconCirclePlus className="h-4 w-4" /> Unirse a Otra Finca
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fincas.map((membership: any) => {
          const targetFincaId = Number(membership.finca_id ?? membership.id);
          const isActive = targetFincaId === Number(user?.finca_id);
          const fincaName = membership.finca_name || membership.name || `Finca #${targetFincaId}`;

          return (
            <motion.div
              key={targetFincaId}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <Card
                className={cn(
                  "rounded-3xl border-2 overflow-hidden transition-all duration-300 shadow-md",
                  isActive
                    ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-emerald-500/10"
                    : "border-border/60 bg-card hover:border-primary/30",
                )}
              >
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner border",
                        isActive
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      <IconBuilding className="h-7 w-7" />
                    </div>
                    {isActive ? (
                      <Badge className="bg-emerald-600 text-white border-none font-black uppercase text-[11px] tracking-widest px-3 py-1">
                        Finca Activa Ahora
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground"
                      >
                        Registrada
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-foreground leading-tight">
                      {fincaName}
                    </h3>
                    <p className="text-muted-foreground font-bold uppercase text-[11px] tracking-widest flex items-center gap-1.5">
                      <IconShieldCheck className="h-3.5 w-3.5 text-primary" /> Rol: {membership.role || "Miembro"}
                    </p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                        Registrada
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {membership.created_at
                          ? new Date(membership.created_at).toLocaleDateString('es-CO')
                          : 'Activa'}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleSwitchFinca(targetFincaId)}
                      disabled={isActive || switching || switchingId === targetFincaId}
                      className={cn(
                        "rounded-xl h-11 px-5 font-bold uppercase text-[11px] tracking-widest gap-2 transition-all shadow-sm",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
                          : "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      {switchingId === targetFincaId ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                      ) : isActive ? (
                        <IconCircleCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <IconSwitchHorizontal className="h-4 w-4" />
                      )}
                      {isActive ? "Finca Actual" : "Trabajar en esta Finca"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {fincas.length === 0 && (
          <div className="col-span-full p-12 sm:p-16 text-center bg-card/60 rounded-3xl border-2 border-dashed border-border">
            <IconBuilding className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-foreground font-black text-lg uppercase tracking-widest">
              No perteneces a ninguna finca todavía
            </p>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              Crea tu primera finca para comenzar a gestionar animales, potreros y producción lechera.
            </p>
            <Button
              onClick={openCreateFinca}
              className="mt-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <IconPlus className="h-4 w-4 mr-2" /> Crear Mi Primera Finca
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiFincaPage;
