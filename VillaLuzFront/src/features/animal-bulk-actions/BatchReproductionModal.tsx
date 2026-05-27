import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  IconLoader2,
  IconCircleCheck,
  IconFingerprint,
  IconBolt,
  IconActivity,
  IconMeat,
  IconDna,
  IconHeart,
  IconBabyCarriage,
  IconClipboardList,
} from "@/shared/ui/icons";
import { animalsService } from "@/entities/animal/api/animal.service";
import { useToast } from "@/app/providers/ToastContext";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/ui/cn";

interface Sire {
  id: number;
  record: string;
  name?: string;
}

interface BatchReproductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onSuccess: () => void;
}

type EventType = "Celo" | "Inseminacion" | "Diagnostico" | "Parto";

export const BatchReproductionModal: React.FC<BatchReproductionModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [eventType, setEventType] = useState<EventType>("Celo");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [sires, setSires] = useState<Sire[]>([]);
  const [selectedSireId, setSelectedSireId] = useState<number | null>(null);
  const [technique, setTechnique] = useState<
    "Natural" | "Artificial" | "Transferencia_Embrionaria"
  >("Natural");
  const [diagnosisResult, setDiagnosisResult] = useState<
    "Positivo" | "Negativo" | "Pendiente"
  >("Positivo");
  const [aliveCount, setAliveCount] = useState<number>(1);
  const [deadCount, setDeadCount] = useState<number>(0);
  const [complications, setComplications] = useState<boolean>(false);

  const [loadingSires, setLoadingSires] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSires = useCallback(async () => {
    setLoadingSires(true);
    try {
      // Sires are animals where sex = 'Macho'
      const resp = await animalsService.getAll({ sex: "Macho", limit: 100 });
      if (Array.isArray(resp)) {
        setSires(resp as any);
      }
    } catch (error) {
      showToast("Error al cargar toros reproduc.", "error");
    } finally {
      setLoadingSires(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      setEventType("Celo");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setSelectedSireId(null);
      setTechnique("Natural");
      setDiagnosisResult("Positivo");
      setAliveCount(1);
      setDeadCount(0);
      setComplications(false);
      fetchSires();
    }
  }, [isOpen, fetchSires]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        animal_ids: selectedAnimalIds,
        event_type: eventType,
        event_date: date,
        notes: notes || `Registro reproductivo masivo de ${eventType} para ${selectedAnimalIds.length} animales`,
      };

      if (eventType === "Inseminacion") {
        if (!selectedSireId) {
          showToast("Debe seleccionar un toro / padre", "warning");
          setSaving(false);
          return;
        }
        payload.sire_id = selectedSireId;
        payload.technique = technique;
      } else if (eventType === "Diagnostico") {
        payload.diagnosis_result = diagnosisResult;
      } else if (eventType === "Parto") {
        payload.alive_count = aliveCount;
        payload.dead_count = deadCount;
        payload.complications = complications;
      }

      const response = await animalsService.bulkReproduction(payload);

      if (response.success) {
        showToast(
          `Evento reproductivo '${eventType}' registrado para ${selectedAnimalIds.length} animales`,
          "success",
        );
        onSuccess();
        onClose();
      } else {
        showToast(response.message || "Error al registrar evento reproductivo masivo", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Error al conectar con el servidor", "error");
    } finally {
      setSaving(false);
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "Celo":
        return <IconHeart className="h-5 w-5" />;
      case "Inseminacion":
        return <IconDna className="h-5 w-5" />;
      case "Diagnostico":
        return <IconActivity className="h-5 w-5" />;
      case "Parto":
        return <IconBabyCarriage className="h-5 w-5" />;
    }
  };

  const eventTypes: { type: EventType; label: string; desc: string; color: string; border: string; glow: string }[] = [
    {
      type: "Celo",
      label: "Celo",
      desc: "Registro de celo detectado para control de ciclo.",
      color: "text-pink-500",
      border: "border-pink-500/30",
      glow: "bg-pink-500/20",
    },
    {
      type: "Inseminacion",
      label: "Servicio / Inseminación",
      desc: "Monta natural, inseminación artificial o transferencia embrionaria.",
      color: "text-indigo-500",
      border: "border-indigo-500/30",
      glow: "bg-indigo-500/20",
    },
    {
      type: "Diagnostico",
      label: "Diagnóstico de Preñez",
      desc: "Chequeo ginecológico y resultado de preñez (Positivo/Negativo).",
      color: "text-teal-500",
      border: "border-teal-500/30",
      glow: "bg-teal-500/20",
    },
    {
      type: "Parto",
      label: "Parto",
      desc: "Registro de nacimiento de crías vivas/muertas y lactancia.",
      color: "text-emerald-500",
      border: "border-emerald-500/30",
      glow: "bg-emerald-500/20",
    },
  ];

  const selectedEventInfo = eventTypes.find((e) => e.type === eventType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullWidth className="!h-[96dvh] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-md flex flex-col transition-all duration-300 select-none">
        {/* 1. HEADER */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 dark:from-purple-900 dark:via-indigo-950 dark:to-slate-900 shadow-md border-none relative z-20 flex flex-row items-center justify-between gap-6 shrink-0">
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0 shadow-sm backdrop-blur-sm">
              <IconDna className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-3 truncate drop-shadow-sm">
                Gestión Reproductiva Masiva
                <Badge className="bg-white/20 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-[var(--radius-full)] border-white/10 shadow-sm">
                  {selectedAnimalIds.length} Sujetos
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-white/80 text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-90 drop-shadow-sm">
                Villa Luz • Registro Colectivo de Eventos Reproductivos
              </DialogDescription>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
            <div className="relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[var(--radius-full)] bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-[var(--radius-full)] h-2 w-2 bg-white"></span>
            </div>
            <p className="text-[10px] font-bold text-white uppercase tracking-tight">
              Sincronización en Caliente
            </p>
          </div>
        </DialogHeader>

        {/* 2. OPERATIVE WORKSPACE */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-muted/10">
          {/* LEFT: EVENT TYPES SELECTION */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden bg-background">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
              <div className="h-2 w-2 rounded-[var(--radius-full)] bg-primary" />
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                Seleccione el Evento a Registrar
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                  {eventTypes.map((item) => {
                    const isSelected = eventType === item.type;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setEventType(item.type)}
                        className={cn(
                          "group relative p-5 rounded-xl border transition-all duration-200 flex flex-col gap-4 text-left h-40 justify-between",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/10"
                            : "bg-background border-border hover:border-border/80 hover:shadow-sm",
                        )}
                      >
                        <div className="flex items-center justify-between relative z-10 w-full">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary/50"
                                : "bg-muted/50 text-muted-foreground border-border/50 group-hover:text-foreground group-hover:bg-muted",
                            )}
                          >
                            {getEventIcon(item.type)}
                          </div>
                          {isSelected && (
                            <div className="h-5 w-5 rounded-[var(--radius-full)] bg-primary flex items-center justify-center shadow-sm">
                              <IconCircleCheck className="text-primary-foreground h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="relative z-10 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-bold truncate transition-colors",
                              isSelected ? "text-primary animate-pulse" : "text-foreground",
                            )}
                          >
                            {item.label}
                          </p>
                          <p className="text-[11px] font-medium text-muted-foreground/75 mt-1 leading-relaxed line-clamp-2">
                            {item.desc}
                          </p>
                        </div>
                        <div className="h-1 bg-muted rounded-[var(--radius-full)] overflow-hidden w-full">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: isSelected ? "100%" : "15%" }}
                            className={cn(
                              "h-full transition-all duration-700",
                              isSelected
                                ? "bg-primary"
                                : "bg-muted-foreground/20",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: CONTROL SIDEBAR */}
          <div className="w-full lg:w-[400px] flex flex-col bg-muted/30 border-l border-border shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* SELECTION SUMMARY */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <IconFingerprint className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                        Sujetos Destinatarios
                      </h4>
                    </div>
                    <Badge className="bg-muted text-muted-foreground border-none text-[10px] font-bold px-2 py-0.5">
                      {selectedAnimalIds.length}
                    </Badge>
                  </div>
                  <div className="bg-background border border-border p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <IconMeat size="sm" className="text-primary" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        Hembras Aptas Sincronizadas
                      </span>
                    </div>
                  </div>
                </section>

                {/* FORM FIELDS */}
                <section className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <IconClipboardList className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                      Parámetros del Registro
                    </h4>
                  </div>
                  <div className="bg-background p-5 rounded-xl border border-border space-y-4 shadow-sm">
                    {/* General: Date */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                        Fecha del Evento
                      </Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold"
                      />
                    </div>

                    {/* Dynamic Fields: Inseminacion */}
                    {eventType === "Inseminacion" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                            Técnica de Servicio
                          </Label>
                          <select
                            value={technique}
                            onChange={(e) =>
                              setTechnique(
                                e.target.value as
                                  | "Natural"
                                  | "Artificial"
                                  | "Transferencia_Embrionaria",
                              )
                            }
                            className="w-full h-10 rounded-lg bg-muted/40 border border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold text-foreground outline-none"
                          >
                            <option value="Natural">Monta Natural</option>
                            <option value="Artificial">Inseminación Artificial</option>
                            <option value="Transferencia_Embrionaria">
                              Transferencia de Embrión
                            </option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                            Toro / Padre
                          </Label>
                          {loadingSires ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <IconLoader2 className="animate-spin h-4 w-4" />
                              Cargando toros disponibles...
                            </div>
                          ) : (
                            <select
                              value={selectedSireId || ""}
                              onChange={(e) =>
                                setSelectedSireId(Number(e.target.value) || null)
                              }
                              className="w-full h-10 rounded-lg bg-muted/40 border border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold text-foreground outline-none"
                            >
                              <option value="">Seleccione un Toro...</option>
                              {sires.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.record} {s.name ? `- ${s.name}` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </>
                    )}

                    {/* Dynamic Fields: Diagnostico */}
                    {eventType === "Diagnostico" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                          Resultado de Preñez
                        </Label>
                        <select
                          value={diagnosisResult}
                          onChange={(e) =>
                            setDiagnosisResult(
                              e.target.value as
                                | "Positivo"
                                | "Negativo"
                                | "Pendiente",
                            )
                          }
                          className="w-full h-10 rounded-lg bg-muted/40 border border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold text-foreground outline-none"
                        >
                          <option value="Positivo">Positivo (Preñada)</option>
                          <option value="Negativo">Negativo (Vacía)</option>
                          <option value="Pendiente">Pendiente (Rechequeo)</option>
                        </select>
                      </div>
                    )}

                    {/* Dynamic Fields: Parto */}
                    {eventType === "Parto" && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                              Crías Vivas
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={aliveCount}
                              onChange={(e) => setAliveCount(Math.max(0, parseInt(e.target.value) || 0))}
                              className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold text-center"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                              Crías Muertas
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={deadCount}
                              onChange={(e) => setDeadCount(Math.max(0, parseInt(e.target.value) || 0))}
                              className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3 font-semibold text-center"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <input
                            type="checkbox"
                            id="complications-checkbox"
                            checked={complications}
                            onChange={(e) => setComplications(e.target.checked)}
                            className="h-4 w-4 rounded border-border bg-muted/40 text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor="complications-checkbox"
                            className="text-[11px] font-semibold uppercase text-muted-foreground/80 tracking-wide cursor-pointer select-none"
                          >
                            Hubo Complicaciones
                          </label>
                        </div>
                      </>
                    )}

                    {/* General: Notes */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                        Notas y Observaciones
                      </Label>
                      <Textarea
                        placeholder="EJ. SIN NOVEDAD, CONDICIÓN CORPORAL 3.5..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[80px] rounded-lg bg-muted/40 border-border p-4 text-sm resize-none focus:bg-background focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* VISUAL REPORT PREVIEW */}
                <section className="space-y-4">
                  <AnimatePresence mode="wait">
                    {selectedEventInfo && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "rounded-xl p-6 bg-primary/10 border flex flex-col gap-4 shadow-sm transition-all duration-300 overflow-hidden relative",
                          selectedEventInfo.border,
                        )}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">
                              Evento Activo
                            </p>
                            <h5 className={cn("text-xl font-bold truncate", selectedEventInfo.color)}>
                              {selectedEventInfo.label}
                            </h5>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-background text-primary border border-border flex items-center justify-center shrink-0 shadow-sm">
                            {getEventIcon(eventType)}
                          </div>
                        </div>
                        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 relative z-10 text-[10px] font-medium leading-relaxed text-muted-foreground/80 uppercase tracking-wider">
                          Este evento modificará el estado reproductivo y de lactancia de los animales seleccionados directamente en la base de datos.
                        </div>
                        <div className="flex items-center justify-center py-2 px-4 rounded-lg border border-primary/30 bg-primary/20 text-primary font-bold text-[11px] uppercase tracking-wider shadow-sm relative z-10">
                          Sincronización Inmediata
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 3. FOOTER */}
        <DialogFooter className="px-8 py-5 bg-background border-t border-border flex flex-row items-center justify-between shrink-0 z-50">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-wider text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            Cancelar
          </Button>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-border">
              <IconActivity
                size="md"
                className="text-primary"
              />
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider leading-none mb-1">
                  Evento
                </span>
                <span className="text-base font-bold uppercase tracking-tight leading-none text-foreground">
                  {eventType}
                </span>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "h-12 px-10 rounded-xl font-bold uppercase tracking-wider text-[12px] gap-3 transition-all active:scale-95 shadow-md",
                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20",
              )}
            >
              {saving ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <IconBolt size="md" /> <span>Confirmar Evento</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
