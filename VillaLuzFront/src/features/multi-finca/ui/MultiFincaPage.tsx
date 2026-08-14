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
import { membershipService } from "@/entities/user/api/membership.service";
import { useToast } from "@/app/providers/ToastContext";
import { cn } from "@/shared/ui/cn";
export const MultiFincaPage: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const { showToast } = useToast();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  /* El usuario tiene finca_memberships inyectados por el AuthContext o cargados */   const fincas =
    (user as any)?.finca_memberships || [];
  const handleSwitchFinca = async (fincaId: number) => {
    if (fincaId === user?.finca_id) return;
    setSwitchingId(fincaId);
    try {
      const resp = await (membershipService as any).switchFinca(fincaId);
      if (resp.success) {
        showToast("Cambiando contexto de finca...", "success");
        /* Forzar recarga del usuario para obtener nuevo token con el nuevo finca_id */ if (
          refreshUserData
        )
          await refreshUserData();
        /* Recargar página para limpiar estados de React Query / Cache */ window.location.reload();
      } else {
        showToast(resp.message || "No se pudo cambiar de finca", "error");
      }
    } catch (err: any) {
      showToast("Error al cambiar de finca", "error");
    } finally {
      setSwitchingId(null);
    }
  };
  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-5xl mx-auto">
      {" "}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {" "}
        <div className="flex flex-col gap-2">
          {" "}
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
            Mis Fincas
          </h1>{" "}
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">
            Gestiona tus predios activos
          </p>{" "}
        </div>{" "}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = "/fincas/crear")
            }
            className="rounded-lg h-10 px-8 font-black uppercase text-xs tracking-widest gap-3 border-2"
          >
            <IconPlus className="h-5 w-5" /> Crear Nueva Finca{" "}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = `/${user?.role?.toLowerCase()}/join-finca`)
            }
            className="rounded-lg h-10 px-8 font-black uppercase text-xs tracking-widest gap-3 border-2"
          >
            {" "}
            <IconCirclePlus className="h-5 w-5" /> Unirse a Otra Finca{" "}
          </Button>{" "}
        </div>
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {" "}
        {fincas.map((membership: any) => {
          const isActive = membership.finca_id === user?.finca_id;
          return (
            <motion.div
              key={membership.finca_id}
              whileHover={{ y: -5 }}
              className="relative"
            >
              {" "}
              <Card
                className={cn(
                  "rounded-[2.5rem] border-4 overflow-hidden transition-all duration-500 shadow-md",
                  isActive
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-emerald-500/20"
                    : "border-slate-50 bg-card",
                )}
              >
                {" "}
                <CardContent className="p-8">
                  {" "}
                  <div className="flex items-start justify-between mb-6">
                    {" "}
                    <div
                      className={cn(
                        "h-16 w-16 rounded-[var(--radius-xl)] flex items-center justify-center shadow-inner border",
                        isActive
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {" "}
                      <IconBuilding className="h-8 w-8" />{" "}
                    </div>{" "}
                    {isActive ? (
                      <Badge className="bg-emerald-600 text-white border-none font-black uppercase text-[10px] tracking-widest px-3 py-1">
                        Activa Ahora
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold text-sm"
                      >
                        Inactiva
                      </Badge>
                    )}{" "}
                  </div>{" "}
                  <div className="space-y-1">
                    {" "}
                    <h3 className="text-2xl font-black text-foreground leading-tight">
                      {membership.finca_name}
                    </h3>{" "}
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                      {" "}
                      <IconShieldCheck size="sm" /> Rol: {membership.role}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                    {" "}
                    <div className="flex flex-col">
                      {" "}
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        Miembro desde
                      </span>{" "}
                      <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">
                        {" "}
                        {new Date(
                          membership.created_at,
                        ).toLocaleDateString('es-CO')}{" "}
                      </span>{" "}
                    </div>{" "}
                    <Button
                      onClick={() => handleSwitchFinca(membership.finca_id)}
                      disabled={isActive || switchingId === membership.finca_id}
                      className={cn(
                        "rounded-lg h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 transition-all shadow-sm",
                        isActive
                          ? "bg-muted text-muted-foreground cursor-default"
                          : "bg-card text-white hover:bg-emerald-600",
                      )}
                    >
                      {" "}
                      {switchingId === membership.finca_id ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                      ) : isActive ? (
                        <IconCircleCheck className="h-4 w-4" />
                      ) : (
                        <IconSwitchHorizontal className="h-4 w-4" />
                      )}{" "}
                      {isActive ? "Actual" : "Activar"}{" "}
                    </Button>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </motion.div>
          );
        })}{" "}
        {fincas.length === 0 && (
          <div className="col-span-full p-20 text-center bg-muted /50 rounded-[3rem] border-4 border-dashed border-border">
            {" "}
            <IconBuilding className="h-16 w-16 text-foreground/80 mx-auto mb-4" />{" "}
            <p className="text-muted-foreground font-black text-lg uppercase tracking-widest">
              No perteneces a ninguna finca todavía
            </p>{" "}
            <Button
              onClick={() =>
                (window.location.href = `/${user?.role?.toLowerCase()}/join-finca`)
              }
              className="mt-6 rounded-lg bg-emerald-600"
            >
              {" "}
              Buscar Finca para unirse{" "}
            </Button>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default MultiFincaPage;
