import React, { useState } from "react";
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
import {
  IconLoader2,
  IconMeat,
  IconScale,
  IconBolt,
  IconActivity,
  IconFingerprint,
} from "@/shared/ui/icons";
import { animalsService } from "@/entities/animal/api/animal.service";
import { useToast } from "@/app/providers/ToastContext";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/ui/cn";
import { ScrollArea } from "@/shared/ui/scroll-area";
interface BatchWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onSuccess: () => void;
}
export const BatchWeightModal: React.FC<BatchWeightModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [weight, setWeight] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      showToast("Por favor ingrese un peso válido", "warning");
      return;
    }
    setLoading(true);
    try {
      const response = await animalsService.bulkWeight({
        animal_ids: selectedAnimalIds,
        weight: parseFloat(weight),
        checkup_date: date,
        notes: notes || `Pesaje masivo de ${selectedAnimalIds.length} animales`,
      });
      if (response.success) {
        showToast(
          `Pesaje registrado para ${selectedAnimalIds.length} animales`,
          "success",
        );
        onSuccess();
        onClose();
      } else {
        showToast(response.message || "Error al registrar pesajes", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Error al conectar con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      <DialogContent className="!w-[98vw] !h-auto !max-h-[96dvh] p-0 overflow-hidden bg-background border border-border rounded-[1.5rem] shadow-[var(--shadow-token-lg)] flex flex-col transition-all duration-300 select-none">
        {" "}
        {/* 1. MINIMALIST HEADER */}{" "}
        <DialogHeader className="px-6 py-4 bg-background border-b border-border relative z-20 flex flex-row items-center justify-between gap-6 shrink-0">
          {" "}
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            {" "}
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-sm">
              {" "}
              <IconScale className="h-5 w-5 text-primary" />{" "}
            </div>{" "}
            <div className="min-w-0">
              {" "}
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3 truncate">
                {" "}
                Control de Biomasa{" "}
                <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2.5 py-0.5 rounded-[var(--radius-full)] border-none shadow-sm">
                  {" "}
                  {selectedAnimalIds.length} Sujetos{" "}
                </Badge>{" "}
              </DialogTitle>{" "}
              <DialogDescription className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-70">
                {" "}
                Villa Luz • Registro de Crecimiento & Rendimiento{" "}
              </DialogDescription>{" "}
            </div>{" "}
          </div>{" "}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
            {" "}
            <div className="relative h-2 w-2">
              {" "}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[var(--radius-full)] bg-primary opacity-75"></span>{" "}
              <span className="relative inline-flex rounded-[var(--radius-full)] h-2 w-2 bg-primary"></span>{" "}
            </div>{" "}
            <p className="text-[10px] font-bold text-primary uppercase tracking-tight">
              Métrica en Tiempo Real
            </p>{" "}
          </div>{" "}
        </DialogHeader>{" "}
        {/* 2. OPERATIVE WORKSPACE */}{" "}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-muted/10">
          {" "}
          {/* INPUT AREA (Left - Optimized) */}{" "}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden bg-background">
            {" "}
            <ScrollArea className="flex-1">
              {" "}
              <div className="p-8 space-y-8">
                {" "}
                <div className="space-y-4">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      {" "}
                      <IconScale className="h-4 w-4 text-primary" />{" "}
                    </div>{" "}
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/80">
                      Métrica Gravitacional
                    </h4>{" "}
                  </div>{" "}
                  <div className="relative group">
                    {" "}
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="bg-muted/40 border-border rounded-[var(--radius-lg)] h-32 sm:h-44 pl-10 text-6xl sm:text-8xl font-bold focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground/20 tracking-tighter"
                    />{" "}
                    <div className="absolute right-8 top-1/2 -translate-y-1/2">
                      {" "}
                      <span className="text-4xl font-bold text-primary/40 group-focus-within:text-primary transition-colors uppercase tracking-widest italic">
                        {" "}
                        kg{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {" "}
                  <div className="space-y-2">
                    {" "}
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                      Fecha Operativo
                    </Label>{" "}
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 rounded-xl bg-muted/40 border-border font-bold text-sm text-foreground focus:border-primary focus:bg-background transition-all px-4 shadow-sm"
                    />{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                      Notas de Seguimiento
                    </Label>{" "}
                    <Input
                      placeholder="EJ: CONTROL DE ENGORDE..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-12 rounded-xl bg-muted/40 border-border font-bold text-sm text-foreground placeholder:text-muted-foreground/20 focus:border-primary focus:bg-background transition-all px-4 shadow-sm"
                    />{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
          {/* SIDEBAR (Right - Optimized) */}{" "}
          <div className="w-full lg:w-[380px] flex flex-col bg-muted/30 border-l border-border shrink-0">
            {" "}
            <ScrollArea className="flex-1">
              {" "}
              <div className="p-8 space-y-10">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    {" "}
                    <IconFingerprint className="h-4 w-4 text-primary" />{" "}
                  </div>{" "}
                  <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                    Auditoría Biométrica
                  </h4>{" "}
                </div>{" "}
                <AnimatePresence mode="wait">
                  {" "}
                  {weight ? (
                    <motion.div
                      key={weight}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl p-6 flex flex-col gap-8 bg-primary/10 border border-primary/20 shadow-sm transition-all duration-300 overflow-hidden relative"
                    >
                      {" "}
                      <div className="relative z-10">
                        {" "}
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-2">
                          Impacto Lote
                        </p>{" "}
                        <h5 className="text-5xl font-bold tabular-nums tracking-tighter text-primary">
                          {" "}
                          {weight}
                          <span className="text-lg ml-2 opacity-40 uppercase font-bold tracking-widest not-italic">
                            kg
                          </span>{" "}
                        </h5>{" "}
                      </div>{" "}
                      <div className="bg-background rounded-xl p-5 border border-border/50 shadow-sm relative z-10">
                        {" "}
                        <p className="text-[10px] font-bold uppercase text-muted-foreground/30 tracking-wider mb-2 flex items-center gap-2">
                          {" "}
                          <IconMeat
                            size={12}
                            className="text-primary/40"
                          />{" "}
                          Sujetos Verificados{" "}
                        </p>{" "}
                        <p className="text-3xl font-bold tracking-tighter text-foreground">
                          {selectedAnimalIds.length}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex items-center justify-center py-2 px-4 rounded-lg border border-primary/30 bg-primary/20 text-primary font-bold text-[11px] uppercase tracking-wider shadow-sm relative z-10">
                        {" "}
                        DATOS SINCRONIZADOS{" "}
                      </div>{" "}
                    </motion.div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border bg-background py-16 flex flex-col items-center justify-center text-center px-8 transition-all hover:bg-muted/5 group cursor-pointer shadow-inner">
                      {" "}
                      <IconScale
                        size={48}
                        className="text-muted-foreground/20 group-hover:text-primary transition-colors"
                      />{" "}
                      <p className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-6 group-hover:text-primary transition-colors">
                        INGRESAR MÉTRICA
                      </p>{" "}
                    </div>
                  )}{" "}
                </AnimatePresence>{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
        </div>{" "}
        {/* 3. FOOTER */}{" "}
        <DialogFooter className="px-8 py-5 bg-background border-t border-border flex flex-row items-center justify-between shrink-0 z-50">
          {" "}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-wider text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            {" "}
            Cancelar Proceso{" "}
          </Button>{" "}
          <div className="flex items-center gap-6">
            {" "}
            <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-border">
              {" "}
              <IconActivity
                size={18}
                className={weight ? "text-primary" : "text-muted-foreground/20"}
              />{" "}
              <div className="flex flex-col text-right">
                {" "}
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider leading-none mb-1">
                  Métrica Actual
                </span>{" "}
                <span
                  className={cn(
                    "text-base font-bold uppercase tracking-tight transition-all leading-none truncate max-w-[180px]",
                    weight ? "text-foreground" : "text-muted-foreground/20",
                  )}
                >
                  {" "}
                  {weight ? `${weight} KG` : "Pendiente"}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <Button
              onClick={handleSave}
              disabled={!weight || loading}
              className={cn(
                "h-12 px-10 rounded-xl font-bold uppercase tracking-wider text-[12px] gap-3 transition-all active:scale-95 shadow-md",
                weight
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                  : "bg-muted text-muted-foreground/40 border border-border",
              )}
            >
              {" "}
              {loading ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {" "}
                  <IconBolt size={18} /> <span>Confirmar Pesaje</span>{" "}
                </>
              )}{" "}
            </Button>{" "}
          </div>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
};
