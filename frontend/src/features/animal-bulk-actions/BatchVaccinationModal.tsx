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
  IconSearch,
  IconSyringe,
  IconActivity,
  IconFingerprint,
  IconBolt,
  IconStethoscope,
  IconMeat,
} from "@/shared/ui/icons";
import { animalsService } from "@/entities/animal/api/animal.service";
import { vaccinesService } from "@/entities/vaccine/api/vaccines.service";
import { useToast } from "@/app/providers/ToastContext";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/ui/cn";
interface Vaccine {
  id: number;
  name: string;
  type?: string;
  description?: string;
}
interface BatchVaccinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onSuccess: () => void;
}
export const BatchVaccinationModal: React.FC<BatchVaccinationModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [selectedVaccineId, setSelectedVaccineId] = useState<number | null>(
    null,
  );
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dosis, setDosis] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fetchVaccines = useCallback(async () => {
    try {
      const resp = await vaccinesService.getPaginated({ limit: 100 });
      if (resp && resp.data) {
        setVaccines(resp.data as any);
      } else if (Array.isArray(resp)) {
        setVaccines(resp as any);
      }
    } catch (error) {
      showToast("Error al cargar vacunas", "error");
    }
  }, [showToast]);
  useEffect(() => {
    if (isOpen) {
      setSelectedVaccineId(null);
      setDosis("");
      setBatchNumber("");
      setNextDueDate("");
      setNotes("");
      setSearchQuery("");
      fetchVaccines();
    }
  }, [isOpen, fetchVaccines]);
  const filteredVaccines = vaccines.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const selectedVaccine = vaccines.find((v) => v.id === selectedVaccineId);
  const handleSave = async () => {
    if (!selectedVaccineId) {
      showToast("Por favor selecciona una vacuna", "warning");
      return;
    }
    setSaving(true);
    try {
      const response = await animalsService.bulkVaccinate({
        animal_ids: selectedAnimalIds,
        vaccine_id: selectedVaccineId,
        vaccination_date: date,
        dosis,
        batch_number: batchNumber,
        next_due_date: nextDueDate || undefined,
        notes:
          notes || `Vacunación masiva de ${selectedAnimalIds.length} animales`,
      });
      if (response.success) {
        showToast(
          `Vacunación registrada para ${selectedAnimalIds.length} animales`,
          "success",
        );
        onSuccess();
        onClose();
      } else {
        showToast(
          response.message || "Error al registrar vacunaciones",
          "error",
        );
      }
    } catch (error: any) {
      showToast(error.message || "Error al conectar con el servidor", "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      <DialogContent fullWidth className="!h-[96dvh] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-md flex flex-col transition-all duration-300 select-none">
        {" "}
        {/* 1. ELEGANT HEADER */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-950 dark:to-slate-900 shadow-md border-none relative z-20 flex flex-row items-center justify-between gap-6 shrink-0">
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0 shadow-sm backdrop-blur-sm">
              <IconSyringe className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              {" "}
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-3 fit-clamp drop-shadow-sm">
                Inmunización Colectiva
                <Badge className="bg-white/20 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-[var(--radius-full)] border-white/10 shadow-sm">
                  {selectedAnimalIds.length} Sujetos
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-white/80 text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-90 drop-shadow-sm">
                Villa Luz • Gestión Sanitaria & Bioseguridad
              </DialogDescription>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
            <div className="relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[var(--radius-full)] bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-[var(--radius-full)] h-2 w-2 bg-white"></span>
            </div>
            <p className="text-[10px] font-bold text-white uppercase tracking-tight">
              Clínica Verificada
            </p>
          </div>
        </DialogHeader>
        {/* 2. OPERATIVE WORKSPACE */}{" "}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-muted/10">
          {" "}
          {/* LEFT: SELECTION GRID */}{" "}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden bg-background">
            {" "}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-6">
              {" "}
              <div className="flex items-center gap-3 shrink-0">
                {" "}
                <div className="h-2 w-2 rounded-[var(--radius-full)] bg-primary" />{" "}
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Repositorio Biológico
                </h3>{" "}
              </div>{" "}
              <div className="relative w-full max-w-sm group">
                {" "}
                <Input
                  placeholder="Buscar biológico por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl bg-muted/40 border-border pl-11 text-sm focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
                />{" "}
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />{" "}
              </div>{" "}
            </div>{" "}
            <ScrollArea className="flex-1">
              {" "}
              <div className="p-6">
                {" "}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 pb-12">
                  {" "}
                  {filteredVaccines.map((v) => {
                    const isSelected = selectedVaccineId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVaccineId(v.id)}
                        className={cn(
                          "group relative p-4 rounded-xl border transition-all duration-200 flex flex-col gap-4 text-left",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/10"
                            : "bg-background border-border hover:border-border/80 hover:shadow-sm",
                        )}
                      >
                        {" "}
                        <div className="flex items-center justify-between relative z-10">
                          {" "}
                          <div
                            className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary/50"
                                : "bg-muted/50 text-muted-foreground border-border/50 group-hover:text-foreground group-hover:bg-muted",
                            )}
                          >
                            {" "}
                            <IconSyringe size="md" />{" "}
                          </div>{" "}
                          {isSelected && (
                            <div className="h-5 w-5 rounded-[var(--radius-full)] bg-primary flex items-center justify-center shadow-sm">
                              {" "}
                              <IconCircleCheck className="text-primary-foreground h-3 w-3" />{" "}
                            </div>
                          )}{" "}
                        </div>{" "}
                        <div className="relative z-10 min-w-0">
                          {" "}
                          <p
                            className={cn(
                              "text-sm font-bold fit-clamp transition-colors",
                              isSelected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {v.name}
                          </p>{" "}
                          <p className="text-[10px] font-medium text-muted-foreground/60 uppercase fit-clamp tracking-widest mt-1">
                            {" "}
                            {v.type || "Biológico Clínico"}{" "}
                          </p>{" "}
                        </div>{" "}
                        <div className="h-1 bg-muted rounded-[var(--radius-full)] overflow-hidden mt-1">
                          {" "}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: isSelected ? "100%" : "20%" }}
                            className={cn(
                              "h-full transition-all duration-700",
                              isSelected
                                ? "bg-primary"
                                : "bg-muted-foreground/20",
                            )}
                          />{" "}
                        </div>{" "}
                      </button>
                    );
                  })}{" "}
                </div>{" "}
              </div>{" "}
            </ScrollArea>{" "}
          </div>{" "}
          {/* RIGHT: CONTROL SIDEBAR */}{" "}
          <div className="w-full lg:w-[380px] flex flex-col bg-muted/30 border-l border-border shrink-0">
            {" "}
            <ScrollArea className="flex-1">
              {" "}
              <div className="p-6 space-y-8">
                {" "}
                {/* SELECTION SUMMARY */}{" "}
                <section className="space-y-4">
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <div className="flex items-center gap-3">
                      {" "}
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        {" "}
                        <IconFingerprint className="h-4 w-4 text-primary" />{" "}
                      </div>{" "}
                      <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                        Auditores Bio-Métricos
                      </h4>{" "}
                    </div>{" "}
                    <Badge className="bg-muted text-muted-foreground border-none text-[10px] font-bold px-2 py-0.5">
                      {selectedAnimalIds.length}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="bg-background border border-border p-3 rounded-xl flex items-center justify-between shadow-sm hover:border-primary/40 transition-colors">
                    {" "}
                    <div className="flex items-center gap-3">
                      {" "}
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        {" "}
                        <IconMeat size="sm" className="text-primary" />{" "}
                      </div>{" "}
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        Identidad Verificada
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </section>{" "}
                {/* FORM FIELDS (Max Readability) */}{" "}
                <section className="space-y-5">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      {" "}
                      <IconStethoscope className="h-4 w-4 text-primary" />{" "}
                    </div>{" "}
                    <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                      Parámetros Clínicos
                    </h4>{" "}
                  </div>{" "}
                  <div className="bg-background p-5 rounded-xl border border-border space-y-4 shadow-sm">
                    {" "}
                    <div className="grid grid-cols-2 gap-4">
                      {" "}
                      <div className="space-y-2">
                        {" "}
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                          Aplicación
                        </Label>{" "}
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3"
                        />{" "}
                      </div>{" "}
                      <div className="space-y-2">
                        {" "}
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                          Refuerzo
                        </Label>{" "}
                        <Input
                          type="date"
                          value={nextDueDate}
                          onChange={(e) => setNextDueDate(e.target.value)}
                          className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3"
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-2 gap-4">
                      {" "}
                      <div className="space-y-2">
                        {" "}
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                          Dosis (ML/CC)
                        </Label>{" "}
                        <Input
                          placeholder="0.00"
                          value={dosis}
                          onChange={(e) => setDosis(e.target.value)}
                          className="h-10 rounded-lg bg-muted/40 border-border text-sm text-center focus:border-primary"
                        />{" "}
                      </div>{" "}
                      <div className="space-y-2">
                        {" "}
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                          Lote No.
                        </Label>{" "}
                        <Input
                          placeholder="BATCH-ID..."
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          className="h-10 rounded-lg bg-muted/40 border-border text-sm text-center focus:border-primary"
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                        Dictamen Clínico
                      </Label>{" "}
                      <Textarea
                        placeholder="INGRESAR OBSERVACIONES MÉDICAS..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[80px] rounded-lg bg-muted/40 border-border p-4 text-sm resize-none focus:bg-background focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                </section>{" "}
                {/* SUMMARY CARDS */}{" "}
                <section className="space-y-4">
                  {" "}
                  <AnimatePresence mode="wait">
                    {" "}
                    {selectedVaccine ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl p-6 bg-primary/10 border border-primary/20 flex flex-col gap-5 shadow-sm transition-all duration-300 overflow-hidden relative"
                      >
                        {" "}
                        <div className="flex items-center justify-between relative z-10">
                          {" "}
                          <div className="min-w-0">
                            {" "}
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">
                              Biológico Activo
                            </p>{" "}
                            <h5 className="text-xl font-bold fit-clamp text-primary">
                              {selectedVaccine.name}
                            </h5>{" "}
                          </div>{" "}
                          <div className="h-12 w-12 rounded-xl bg-background text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                            {" "}
                            <IconSyringe size="lg" />{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 relative z-10">
                          {" "}
                          <p className="text-[10px] font-medium leading-relaxed text-muted-foreground/80 uppercase tracking-wider">
                            {" "}
                            {selectedVaccine.description ||
                              "ESTE PRODUCTO REQUIERE MANEJO DE CADENA DE FRÍO Y ADMINISTRACIÓN POR PERSONAL CALIFICADO."}{" "}
                          </p>{" "}
                        </div>{" "}
                        <div className="flex items-center justify-center py-2 px-4 rounded-lg border border-primary/30 bg-primary/20 text-primary font-bold text-[11px] uppercase tracking-wider shadow-sm relative z-10">
                          {" "}
                          PROTOCOLIZADO PARA APLICACIÓN{" "}
                        </div>{" "}
                      </motion.div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-border bg-background py-10 flex flex-col items-center justify-center text-center px-8 transition-all hover:bg-muted/5 group cursor-pointer shadow-inner">
                        {" "}
                        <IconSyringe
                          size="lg"
                          className="text-muted-foreground/20 group-hover:text-primary transition-colors"
                        />{" "}
                        <p className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-4 group-hover:text-primary transition-colors">
                          VINCULAR BIOLÓGICO
                        </p>{" "}
                      </div>
                    )}{" "}
                  </AnimatePresence>{" "}
                </section>{" "}
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
            disabled={saving}
            className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-wider text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            {" "}
            Anular Operación{" "}
          </Button>{" "}
          <div className="flex items-center gap-6">
            {" "}
            <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-border">
              {" "}
              <IconActivity
                size="md"
                className={
                  selectedVaccine ? "text-primary" : "text-muted-foreground/20"
                }
              />{" "}
              <div className="flex flex-col text-right">
                {" "}
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider leading-none mb-1">
                  Biológico
                </span>{" "}
                <span
                  className={cn(
                    "text-base font-bold uppercase tracking-tight transition-all leading-none fit-clamp max-w-[180px]",
                    selectedVaccine
                      ? "text-foreground"
                      : "text-muted-foreground/20",
                  )}
                >
                  {" "}
                  {selectedVaccine ? selectedVaccine.name : "En Espera"}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <Button
              onClick={handleSave}
              disabled={!selectedVaccineId || saving}
              className={cn(
                "h-12 px-10 rounded-xl font-bold uppercase tracking-wider text-[12px] gap-3 transition-all active:scale-95 shadow-md",
                selectedVaccineId
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                  : "bg-muted text-muted-foreground/40 border border-border",
              )}
            >
              {" "}
              {saving ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {" "}
                  <IconBolt size="md" /> <span>Registrar Aplicación</span>{" "}
                </>
              )}{" "}
            </Button>{" "}
          </div>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
};
