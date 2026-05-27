import React, { useState, useEffect, useCallback } from "react";
import {
  IconSearch,
  IconMapPin,
  IconInfoCircle,
  IconLoader2,
  IconBuilding,
  IconUserPlus,
  IconArrowRight,
  IconSparkles,
  IconShieldCheck,
  IconCircleX,
  IconCircleCheck,
  IconBuildingFarm,
  IconClock,
  IconMail
} from "@/shared/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  membershipService,
} from "@/entities/user/api/membership.service";
import { fincaService } from "@/entities/finca/api/finca.service";
import { useNavigate } from "react-router-dom";

interface MembershipGestions {
  requests_to_approve: any[];
  invitations_received: any[];
}
import { useToast } from "@/app/providers/ToastContext";
import { cn } from "@/shared/ui/cn";
import { useAuth } from "@/features/auth/model/useAuth";
import { useNotifications } from "@/shared/hooks/useNotifications";
export const JoinFincaPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshUserData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [fincas, setFincas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const { notifications, refresh } = useNotifications();
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fincaListResp = await fincaService.getPublicFincas();
      setFincas(fincaListResp?.data || []);
      refresh();
    } catch (err) {
      showToast("Error al sincronizar datos de acceso", "error");    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const handleRequestJoin = async (fincaId: number) => {
    setRequestingId(fincaId);
    try {
      const resp = await membershipService.createGestion({ finca_id: fincaId });
      if (resp.success) {
        showToast("Solicitud enviada correctamente", "success");
        refresh();
      } else {
        showToast(resp.message || "Error al enviar solicitud", "error");
      }
    } catch (err: any) {
      showToast("Error de comunicación", "error");
    } finally {
      setRequestingId(null);
    }
  };
  const filteredFincas = fincas.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.municipality?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-muted/50 /50">
      {" "}
      <div className="p-6 sm:p-10 space-y-12 max-w-7xl mx-auto pb-32">
        {" "}
        {/* HEADER CRYSTAL */} 
        <header className="relative flex flex-col md:flex-row items-center justify-between gap-6 py-8 px-6 sm:px-8 rounded-[2rem] bg-surface-raised border border-border shadow-sm overflow-hidden h-auto md:h-[120px]"> 
          <div className="relative z-10 space-y-1 w-full md:w-auto"> 
            <h1 className="text-2xl font-black text-foreground"> 
              Explorar fincas 
            </h1> 
            <p className="text-sm text-muted-foreground font-medium"> 
              Encuentra fincas productivas, solicita unirte o responde invitaciones pendientes. 
            </p> 
          </div> 
          <div className="relative group w-full md:w-80 shrink-0 z-10"> 
            <Input
              placeholder="Busca por nombre o ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border border-border pl-12 text-sm bg-card/50 shadow-inner focus:border-primary transition-all"
            /> 
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" /> 
          </div> 
        </header> 
        {/* EXPLORADOR DE FINCAS */}
        <section className="space-y-10">
          {" "}
          <div className="flex items-center justify-between border-b-2 border-border pb-6">
            {" "}
            <div className="flex items-center gap-4">
              {" "}
              <div className="h-12 w-12 rounded-lg bg-card dark:bg-card flex items-center justify-center">
                {" "}
                <IconBuilding className="h-6 w-6 text-white dark:text-foreground" />{" "}
              </div>{" "}
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Fincas disponibles
              </h2>{" "}
            </div>{" "}
            <div className="hidden sm:flex gap-4 items-center">
              {" "}
              <span className="font-medium text-sm text-muted-foreground">
                {" "}
                {filteredFincas.length} fincas{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-32 gap-6 text-center">
              {" "}
              <div className="relative h-24 w-24">
                {" "}
                <IconLoader2 className="h-24 w-24 animate-spin text-primary/20 absolute inset-0" />{" "}
                <div className="absolute inset-0 flex items-center justify-center">
                  {" "}
                  <IconBuilding className="h-10 w-10 text-primary animate-pulse" />{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
                Escaneando Red Productiva...
              </p>{" "}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {" "}
              <AnimatePresence>
                {" "}
                {filteredFincas.map((finca) => {
                  const joinRequest = notifications.find(n => n.finca_id === finca.id && n.type === 'JOIN_REQUEST' && n.status === 'pending');
                  const invitation = notifications.find(n => n.finca_id === finca.id && n.type === 'INVITATION_RECEIVED' && n.status === 'pending');
                  const isManaged = finca.is_member || false; // Assuming API might return this. If not, fallback.
                  return (
                    <motion.div
                      key={finca.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -8 }}
                      className="group"
                    >
                      {" "}
                      <Card className="rounded-[2.5rem] border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-md">
                        {" "}
                        <div className="h-40 bg-muted /30 relative flex items-center justify-center overflow-hidden">
                          {" "}
                          {finca.logo_url ? (
                            <img
                              src={finca.logo_url}
                              alt={finca.name}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <IconBuildingFarm className="h-16 w-16 text-foreground/50 group-hover:scale-110 transition-transform duration-500" />
                          )}{" "}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />{" "}
                          <Badge className="absolute top-4 right-4 bg-card/90 /90 text-foreground border-none text-[8px] font-semibold text-sm px-3 py-1 rounded-[var(--radius-full)] backdrop-blur-md">
                            {" "}
                            {finca.type || "Tradicional"}{" "}
                          </Badge>{" "}
                        </div>{" "}
                        <CardContent className="p-8 space-y-6">
                          {" "}
                          <div className="space-y-2">
                            {" "}
                            <h3 className="text-2xl font-black text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors">
                              {finca.name}
                            </h3>{" "}
                            <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-[0.1em]">
                              {" "}
                              <IconMapPin className="h-3.5 w-3.5 text-primary" />{" "}
                              {finca.municipality || "Boyacá, COL"}{" "}
                            </div>{" "}
                          </div>{" "}
                          <div className="pt-6 border-t border-border flex items-center justify-between">
                            {" "}
                            <div className="flex flex-col">
                              {" "}
                              <span className="text-[10px] font-medium text-muted-foreground mb-1">
                                Población
                              </span>{" "}
                              <div className="flex items-center gap-1.5">
                                {" "}
                                <span className="text-lg font-bold text-foreground tabular-nums">
                                  {finca.animal_count || 0}
                                </span>{" "}
                                <span className="text-[10px] text-muted-foreground">
                                  cabezas
                                </span>{" "}
                              </div>{" "}
                            </div>{" "}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
                            >
                            <Button
                              onClick={() => {
                                if (isManaged) navigate('/dashboard');
                                else if (invitation) {/* open panel maybe? or do nothing */}
                                else handleRequestJoin(finca.id);
                              }}
                              disabled={
                                requestingId === finca.id || !!joinRequest
                              }
                              className={cn(
                                "rounded-lg h-10 px-6 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm active:scale-95 transition-all",
                                isManaged
                                  ? "bg-surface-raised border border-border text-foreground hover:bg-muted"
                                  : joinRequest
                                  ? "bg-warning/20 text-warning border border-warning/30"
                                  : invitation
                                  ? "bg-info/10 text-info border border-info/30 hover:bg-info/20"
                                  : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                              )}
                            >
                              {" "}
                              {requestingId === finca.id ? (
                                <IconLoader2 className="h-4 w-4 animate-spin" />
                              ) : isManaged ? (
                                <>Ir a la finca <IconArrowRight className="h-4 w-4" /></>
                              ) : joinRequest ? (
                                <>Solicitud enviada <IconClock className="h-4 w-4" /></>
                              ) : invitation ? (
                                <>Ver invitación <IconMail className="h-4 w-4" /></>
                              ) : (
                                <>Unirme <IconUserPlus className="h-4 w-4" /></>
                              )}{" "}
                            </Button>{" "}
                            </motion.div>
                          </div>{" "}
                        </CardContent>{" "}
                      </Card>{" "}
                    </motion.div>
                  );
                })}{" "}
              </AnimatePresence>{" "}
            </div>
          )}{" "}
          {!loading && filteredFincas.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-32 text-center bg-card rounded-[4rem] border-4 border-dashed border-border flex flex-col items-center gap-8 shadow-inner"
            >
              {" "}
              <div className="h-28 w-28 rounded-[var(--radius-full)] bg-muted /50 flex items-center justify-center">
                {" "}
                <IconCircleX className="h-10 w-10 text-foreground/80" />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <h3 className="text-foreground font-black text-3xl uppercase tracking-tighter">
                  Sin coincidencias
                </h3>{" "}
                <p className="text-muted-foreground font-bold text-sm max-w-xs mx-auto leading-relaxed">
                  No pudimos encontrar predios que coincidan con"
                  <span className="text-primary">{searchQuery}</span>". Prueba
                  con otros términos.
                </p>{" "}
              </div>{" "}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="rounded-xl border-2 font-black uppercase text-xs h-12 px-8"
              >
                Limpiar búsqueda
              </Button>{" "}
              </motion.div>
            </motion.div>
          )}{" "}
        </section>{" "}
        {/* PROPIETARIOS CRYSTAL FOOTER */}{" "}
        <section className="relative group">
          {" "}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />{" "}
          <div className="bg-card rounded-[3.5rem] p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-md relative overflow-hidden border border-white/5">
            {" "}
            <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />{" "}
            <div className="flex items-center gap-8 relative z-10">
              {" "}
              <div className="h-20 w-20 rounded-xl bg-card/10 flex items-center justify-center border border-white/20 backdrop-blur-md shadow-md group-hover:scale-110 transition-transform duration-500">
                {" "}
                <IconInfoCircle className="h-10 w-10 text-primary" />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <h4 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                  ¿Gestionas tu propio predio?
                </h4>{" "}
                <p className="text-muted-foreground font-medium text-lg leading-snug max-w-xl">
                  {" "}
                  Registra tu finca en el sistema para digitalizar tus procesos,
                  gestionar operarios y recibir solicitudes de aprendices del
                  SENA.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
            <Button 
              onClick={() => navigate('/register/finca')}
              className="rounded-xl h-20 px-12 bg-card text-foreground hover:bg-muted font-black uppercase text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-white/20 transition-all active:scale-95 group-hover:translate-x-2"
            >
              Comenzar ahora <IconArrowRight className="ml-3 h-5 w-5" />
            </Button>{" "}
            </motion.div>
          </div>{" "}
        </section>{" "}
      </div>{" "}
    </div>
  );
};
export default JoinFincaPage;
