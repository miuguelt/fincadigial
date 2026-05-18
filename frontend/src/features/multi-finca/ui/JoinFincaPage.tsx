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
} from "@/shared/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  membershipService,
  MembershipGestions,
} from "@/entities/user/api/membership.service";
import { useToast } from "@/app/providers/ToastContext";
import { cn } from "@/shared/ui/cn";
import { useAuth } from "@/features/auth/model/useAuth";
export const JoinFincaPage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [fincas, setFincas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [gestions, setGestions] = useState<MembershipGestions>({
    requests_to_approve: [],
    invitations_received: [],
  });
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fincaList, pending] = await Promise.all([
        membershipService.getPublicFincas(),
        membershipService.getPendingGestions(),
      ]);
      setFincas(fincaList || []);
      setGestions(pending);
    } catch (err) {
      showToast("Error al sincronizar datos de membresía", "error");
    } finally {
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
        /* Actualizar localmente para mostrar el botón como Solicitado inmediatamente */ setGestions(
          (prev) => ({
            ...prev,
            requests_to_approve: [
              ...prev.requests_to_approve,
              { finca_id: fincaId, status: "pending" } as any,
            ],
          }),
        );
      } else {
        showToast(resp.message || "Error al enviar solicitud", "error");
      }
    } catch (err: any) {
      showToast("Error de comunicación", "error");
    } finally {
      setRequestingId(null);
    }
  };
  const handleRespond = async (id: number, approve: boolean) => {
    try {
      const resp = await membershipService.respondGestion(id, approve);
      if (resp.success) {
        showToast(
          approve ? "Has aceptado la invitación" : "Invitación rechazada",
          "success",
        );
        /* Actualizar UI localmente */ setGestions((prev) => ({
          ...prev,
          invitations_received: prev.invitations_received.filter(
            (inv) => inv.id !== id,
          ),
          requests_to_approve: prev.requests_to_approve.filter(
            (req) => req.id !== id,
          ),
        }));
        if (approve) {
          /* Refrescar el usuario para que vea la nueva finca en su lista */ refreshUser?.();
        }
      }
    } catch (err) {
      showToast("Error al procesar respuesta", "error");
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
        {/* HEADER CRYSTAL */}{" "}
        <header className="relative py-12 px-8 rounded-[3rem] overflow-hidden bg-card border border-border shadow-[var(--shadow-token-lg)]">
          {" "}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-[var(--radius-full)] blur-[100px] -mr-48 -mt-48" />{" "}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-[var(--radius-full)] blur-[80px] -ml-32 -mb-32" />{" "}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            {" "}
            <div className="space-y-4">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="p-2 bg-primary/10 rounded-xl">
                  {" "}
                  <IconSparkles className="h-5 w-5 text-primary" />{" "}
                </div>{" "}
                <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Ecosistema Villa Luz
                </span>{" "}
              </div>{" "}
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground uppercase leading-none">
                {" "}
                Expandir{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">
                  Horizontes
                </span>{" "}
              </h1>{" "}
              <p className="text-muted-foreground dark:text-muted-foreground font-bold uppercase text-xs tracking-widest max-w-lg leading-relaxed">
                {" "}
                Descubre nuevas fincas productivas, solicita unirte a ellas o
                responde a invitaciones de administradores.{" "}
              </p>{" "}
            </div>{" "}
            <div className="relative group w-full md:w-96">
              {" "}
              <Input
                placeholder="Busca por nombre o ubicación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-16 rounded-[var(--radius-lg)] border-2 border-border pl-14 font-bold text-lg bg-card/50 /50 backdrop-blur-xl shadow-inner focus:border-primary transition-all"
              />{" "}
              <IconSearch className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />{" "}
            </div>{" "}
          </div>{" "}
        </header>{" "}
        {/* SECCIÓN DE GESTIONES PENDIENTES */}{" "}
        <AnimatePresence mode="popLayout">
          {" "}
          {(gestions.invitations_received.length > 0 ||
            gestions.requests_to_approve.length > 0) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {" "}
              <div className="flex items-center gap-3 px-2">
                {" "}
                <div className="h-2.5 w-2.5 rounded-[var(--radius-full)] bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]" />{" "}
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">
                  Atención Requerida
                </h2>{" "}
              </div>{" "}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {" "}
                {/* Invitaciones para el Usuario */}{" "}
                {gestions.invitations_received.map((inv) => (
                  <motion.div key={inv.id} layout>
                    {" "}
                    <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/5 backdrop-blur-md p-6 shadow-[var(--shadow-token-lg)] relative overflow-hidden group">
                      {" "}
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        {" "}
                        <IconSparkles className="h-20 w-20 text-primary" />{" "}
                      </div>{" "}
                      <div className="flex items-center justify-between gap-4 relative z-10">
                        {" "}
                        <div className="flex items-center gap-5">
                          {" "}
                          <div className="h-16 w-16 rounded-[1.25rem] bg-card shadow-[var(--shadow-token-md)] flex items-center justify-center border border-primary/10">
                            {" "}
                            <IconBuilding className="h-8 w-8 text-primary" />{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 flex items-center gap-1.5">
                              {" "}
                              <IconShieldCheck size="sm" /> Invitación VIP{" "}
                            </p>{" "}
                            <h4 className="text-xl font-black text-foreground leading-tight">
                              {inv.finca_name}
                            </h4>{" "}
                            <div className="flex items-center gap-2 mt-1">
                              {" "}
                              <Badge
                                variant="outline"
                                className="bg-card/50 /50 text-[10px] border-primary/20 font-bold"
                              >
                                {" "}
                                {inv.requested_role}{" "}
                              </Badge>{" "}
                            </div>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex flex-col sm:flex-row gap-2">
                          {" "}
                          <Button
                            size="sm"
                            onClick={() => handleRespond(inv.id, true)}
                            className="rounded-xl bg-card dark:bg-card text-white dark:text-foreground font-black text-[10px] uppercase h-12 px-6 shadow-[var(--shadow-token-md)] hover:scale-105 active:scale-95 transition-all"
                          >
                            {" "}
                            Aceptar{" "}
                          </Button>{" "}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRespond(inv.id, false)}
                            className="rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-black text-[10px] uppercase h-12 px-6"
                          >
                            {" "}
                            Rechazar{" "}
                          </Button>{" "}
                        </div>{" "}
                      </div>{" "}
                    </Card>{" "}
                  </motion.div>
                ))}{" "}
                {/* Solicitudes de Entrada (Admin) */}{" "}
                {gestions.requests_to_approve.map((req) => (
                  <motion.div key={req.id} layout>
                    {" "}
                    <Card className="rounded-[2.5rem] border-2 border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-6 shadow-[var(--shadow-token-lg)] relative overflow-hidden group">
                      {" "}
                      <div className="flex items-center justify-between gap-4 relative z-10">
                        {" "}
                        <div className="flex items-center gap-5">
                          {" "}
                          <div className="h-16 w-16 rounded-[1.25rem] bg-card shadow-[var(--shadow-token-md)] flex items-center justify-center border border-amber-500/10">
                            {" "}
                            <IconUserPlus className="h-8 w-8 text-amber-500" />{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">
                              Solicitud de Acceso
                            </p>{" "}
                            <h4 className="text-xl font-black text-foreground leading-tight">
                              {req.user_fullname}
                            </h4>{" "}
                            <p className="text-xs font-bold text-muted-foreground mt-1">
                              Hacia: {req.finca_name}
                            </p>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex flex-col sm:flex-row gap-2">
                          {" "}
                          <Button
                            size="sm"
                            onClick={() => handleRespond(req.id, true)}
                            className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase h-12 px-6 shadow-[var(--shadow-token-md)] hover:scale-105 active:scale-95 transition-all"
                          >
                            {" "}
                            Aprobar{" "}
                          </Button>{" "}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRespond(req.id, false)}
                            className="rounded-xl text-muted-foreground hover:bg-muted dark:hover:bg-slate-800 font-black text-[10px] uppercase h-12 px-6"
                          >
                            {" "}
                            Ignorar{" "}
                          </Button>{" "}
                        </div>{" "}
                      </div>{" "}
                    </Card>{" "}
                  </motion.div>
                ))}{" "}
              </div>{" "}
            </motion.section>
          )}{" "}
        </AnimatePresence>{" "}
        {/* EXPLORADOR DE FINCAS */}{" "}
        <section className="space-y-10">
          {" "}
          <div className="flex items-center justify-between border-b-2 border-border pb-6">
            {" "}
            <div className="flex items-center gap-4">
              {" "}
              <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-card dark:bg-card flex items-center justify-center">
                {" "}
                <IconBuilding className="h-6 w-6 text-white dark:text-foreground" />{" "}
              </div>{" "}
              <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">
                Predios Públicos
              </h2>{" "}
            </div>{" "}
            <div className="hidden sm:flex gap-4">
              {" "}
              <Badge
                variant="outline"
                className="rounded-[var(--radius-full)] px-4 py-1.5 border-border font-bold text-muted-foreground"
              >
                {" "}
                {filteredFincas.length} Fincas encontradas{" "}
              </Badge>{" "}
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
                  const alreadyRequested =
                    gestions.requests_to_approve.some(
                      (r) => r.finca_id === finca.id,
                    ) ||
                    gestions.invitations_received.some(
                      (r) => r.finca_id === finca.id,
                    );
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
                      <Card className="rounded-[2.5rem] border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-[var(--shadow-token-lg)]">
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
                            <IconBuilding className="h-16 w-16 text-slate-200 dark:text-foreground group-hover:scale-110 transition-transform duration-500" />
                          )}{" "}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />{" "}
                          <Badge className="absolute top-4 right-4 bg-card/90 /90 text-foreground border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-[var(--radius-full)] backdrop-blur-md">
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
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">
                                Población
                              </span>{" "}
                              <div className="flex items-center gap-1.5">
                                {" "}
                                <span className="text-lg font-black text-foreground tabular-nums">
                                  {finca.animal_count || 0}
                                </span>{" "}
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                  Cabezas
                                </span>{" "}
                              </div>{" "}
                            </div>{" "}
                            <Button
                              onClick={() => handleRequestJoin(finca.id)}
                              disabled={
                                requestingId === finca.id || alreadyRequested
                              }
                              className={cn(
                                "rounded-[var(--radius-lg)] h-14 px-8 font-black uppercase text-[10px] tracking-widest gap-3 shadow-[var(--shadow-token-md)] active:scale-95 transition-all",
                                alreadyRequested
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                                  : "bg-card dark:bg-card text-white dark:text-foreground hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white shadow-primary/10",
                              )}
                            >
                              {" "}
                              {requestingId === finca.id ? (
                                <IconLoader2 className="h-4 w-4 animate-spin" />
                              ) : alreadyRequested ? (
                                <IconCircleCheck className="h-4 w-4" />
                              ) : (
                                <IconUserPlus className="h-4 w-4" />
                              )}{" "}
                              {alreadyRequested ? "Gestionado" : "Unirme"}{" "}
                            </Button>{" "}
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
                <IconCircleX className="h-14 w-14 text-slate-200" />{" "}
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
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="rounded-xl border-2 font-black uppercase text-xs h-12 px-8"
              >
                Limpiar búsqueda
              </Button>{" "}
            </motion.div>
          )}{" "}
        </section>{" "}
        {/* PROPIETARIOS CRYSTAL FOOTER */}{" "}
        <section className="relative group">
          {" "}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />{" "}
          <div className="bg-card rounded-[3.5rem] p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-[var(--shadow-token-lg)] relative overflow-hidden border border-white/5">
            {" "}
            <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />{" "}
            <div className="flex items-center gap-8 relative z-10">
              {" "}
              <div className="h-20 w-20 rounded-[2rem] bg-card/10 flex items-center justify-center border border-white/20 backdrop-blur-md shadow-[var(--shadow-token-lg)] group-hover:scale-110 transition-transform duration-500">
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
            <Button className="rounded-[1.5rem] h-20 px-12 bg-card text-foreground hover:bg-muted font-black uppercase text-sm tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-white/20 transition-all active:scale-95 group-hover:translate-x-2">
              {" "}
              Comenzar ahora <IconArrowRight className="ml-3 h-5 w-5" />{" "}
            </Button>{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
    </div>
  );
};
export default JoinFincaPage;
