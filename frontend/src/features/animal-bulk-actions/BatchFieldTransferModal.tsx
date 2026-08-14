import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  IconSwitchHorizontal,
  IconSearch,
  IconMapPin,
  IconArrowRight,
  IconMeat,
  IconAlertTriangle,
  IconLoader2,
  IconBox,
  IconClipboardCheck,
  IconBolt,
  IconCircleCheck,
  IconMap2,
  IconRotate,
  IconLeaf,
} from '@/shared/ui/icons';
import { useBatchFieldTransfer, getRotationInfo } from './useBatchFieldTransfer';
import type { RotationInfo } from './useBatchFieldTransfer';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/ui/cn';

// ─── Tipos locales ─────────────────────────────────────────────────────────────

interface BatchFieldTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onSuccess: () => void;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

const parseCapacity = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getColorClasses = (color: string) => {
  switch (color) {
    case 'emerald':
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50',
        progress: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        indicatorBar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'hover:border-emerald-500/30',
        glow: 'shadow-[0_4px_12px_rgba(16,185,129,0.08)]',
        bg: 'hover:bg-emerald-500/[0.01]'
      };
    case 'yellow':
      return {
        badge: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50',
        progress: 'bg-gradient-to-r from-yellow-500 to-amber-500',
        indicatorBar: 'bg-yellow-500',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'hover:border-yellow-500/30',
        glow: 'shadow-[0_4px_12px_rgba(234,179,8,0.08)]',
        bg: 'hover:bg-yellow-500/[0.01]'
      };
    case 'orange':
      return {
        badge: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50',
        progress: 'bg-gradient-to-r from-orange-500 to-amber-600',
        indicatorBar: 'bg-orange-500',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'hover:border-orange-500/30',
        glow: 'shadow-[0_4px_12px_rgba(249,115,22,0.08)]',
        bg: 'hover:bg-orange-500/[0.01]'
      };
    case 'red':
    default:
      return {
        badge: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50',
        progress: 'bg-gradient-to-r from-red-500 to-rose-600',
        indicatorBar: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        border: 'hover:border-red-500/30',
        glow: 'shadow-[0_4px_12px_rgba(239,68,68,0.1)]',
        bg: 'hover:bg-red-500/[0.01]'
      };
  }
};

const getRotationBadge = (rotation: RotationInfo) => {
  switch (rotation.status) {
    case 'ready':
      return {
        text: 'Listo para pastoreo',
        icon: <IconRotate className="h-3 w-3" />,
        className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        pulse: false,
      };
    case 'critical':
      return {
        text: rotation.daysRemaining > 0
          ? `Descanso crítico (${rotation.daysRemaining}d restantes)`
          : 'Requiere rotación urgente',
        icon: <IconAlertTriangle className="h-3 w-3" />,
        className: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse',
        pulse: true,
      };
    case 'resting':
      return {
        text: `Descansando (${rotation.daysRemaining}d)`,
        icon: <IconRotate className="h-3 w-3" />,
        className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        pulse: false,
      };
    case 'grazing':
      return {
        text: 'En pastoreo activo',
        icon: <IconLeaf className="h-3 w-3" />,
        className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        pulse: false,
      };
    case 'unknown':
    default:
      return {
        text: 'Sin datos de rotación',
        icon: <IconRotate className="h-3 w-3 opacity-50" />,
        className: 'bg-muted text-muted-foreground border-border',
        pulse: false,
      };
  }
};

// ─── Componente principal ──────────────────────────────────────────────────────

export const BatchFieldTransferModal: React.FC<BatchFieldTransferModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onSuccess,
}) => {
  const {
    selectedAnimals,
    selectedFieldId,
    setSelectedFieldId,
    transferDate,
    setTransferDate,
    notes,
    setNotes,
    transferring,
    searchQuery,
    setSearchQuery,
    filteredFields,
    selectedField,
    selectedFieldCapacity,
    projectedOccupancy,
    isOverCapacity,
    selectedFieldRotation,
    handleTransfer,
  } = useBatchFieldTransfer(isOpen, selectedAnimalIds, onClose, onSuccess);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullWidth className="!h-[96dvh] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-md flex flex-col transition-all duration-300 select-none">

        {/* ══ 1. ELEGANT HEADER ══════════════════════════════════════════════════════ */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-950 dark:to-slate-900 shadow-md border-none relative z-20 flex flex-row items-center justify-between gap-6 shrink-0">
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0 shadow-sm backdrop-blur-sm">
              <IconSwitchHorizontal className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-3 fit-clamp drop-shadow-sm">
                Relocalización de Ganado
                <Badge className="bg-white/20 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-[var(--radius-full)] border-white/10 shadow-sm">
                  {selectedAnimalIds.length} Lotes
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-white/80 text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-90 drop-shadow-sm">
                Villa Luz • Gestión de Infraestructura
              </DialogDescription>
            </div>
          </div>

          {/* Indicador de estado en línea */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
            <div className="relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[var(--radius-full)] bg-white opacity-75" />
              <span className="relative inline-flex rounded-[var(--radius-full)] h-2 w-2 bg-white" />
            </div>
            <p className="text-[10px] font-bold text-white uppercase tracking-tight">Sistema Online</p>
          </div>
        </DialogHeader>

        {/* ══ 2. ESPACIO DE TRABAJO ══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-muted/10">

          {/* ── SIDEBAR IZQUIERDO: Controles ─────────────────────────────── */}
          <div className="w-full lg:w-[380px] flex flex-col bg-muted/30 border-r border-border shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">

                {/* Resumen de selección */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <IconMeat className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                        Lotes Seleccionados
                      </h4>
                    </div>
                    <Badge className="bg-primary text-primary-foreground border-none text-[10px] font-bold px-2 py-0.5">
                      {selectedAnimalIds.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2">
                    {selectedAnimals.map((animal) => (
                      <div
                        key={animal.id}
                        className="bg-background border border-border p-2.5 rounded-xl flex items-center gap-3 shadow-sm hover:border-primary/40 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <IconMeat size="sm" className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground fit-clamp">
                            {animal.record || `ID-${animal.id}`}
                          </p>
                          <p className="text-[8px] font-bold text-muted-foreground/40 fit-clamp uppercase tracking-widest">
                            Ejemplar
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Formulario — protocolo de operación */}
                <section className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <IconClipboardCheck className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                      Protocolo de Operación
                    </h4>
                  </div>

                  <div className="bg-background p-5 rounded-xl border border-border space-y-4 shadow-sm">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                        Fecha de Traslado
                      </Label>
                      <Input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="h-10 rounded-lg bg-muted/40 border-border text-sm focus:bg-background focus:ring-primary/20 focus:border-primary px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider">
                        Observaciones Técnicas
                      </Label>
                      <Textarea
                        placeholder="Notas sobre el estado del lote..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[100px] rounded-lg bg-muted/40 border-border text-sm resize-none focus:bg-background focus:ring-primary/20 focus:border-primary p-4"
                      />
                    </div>
                  </div>
                </section>

                {/* Tarjeta resumen del destino seleccionado */}
                <section className="space-y-4">
                  <AnimatePresence mode="wait">
                    {selectedField ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'rounded-xl p-5 flex flex-col gap-5 border shadow-sm transition-all duration-300',
                          isOverCapacity
                            ? 'bg-destructive/10 border-destructive/20'
                            : 'bg-primary/10 border-primary/20'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">
                              Destino Seleccionado
                            </p>
                            <h5 className={cn(
                              'text-xl font-bold fit-clamp',
                              isOverCapacity ? 'text-destructive' : 'text-primary'
                            )}>
                              {selectedField.name}
                            </h5>
                          </div>
                          <div className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center border shrink-0 shadow-sm',
                            isOverCapacity
                              ? 'bg-background text-destructive border-destructive/20'
                              : 'bg-background text-primary border-primary/20'
                          )}>
                            {isOverCapacity ? (
                              <IconAlertTriangle size="md" />
                            ) : (
                              <IconMapPin size="md" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-background rounded-xl p-3 border border-border/50 text-center shadow-sm">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider mb-1">
                              Proyectado
                            </p>
                            <p className={cn(
                              'text-2xl font-bold tabular-nums',
                              isOverCapacity ? 'text-destructive' : 'text-primary'
                            )}>
                              {projectedOccupancy}
                            </p>
                          </div>
                          <div className="bg-background rounded-xl p-3 border border-border/50 text-center shadow-sm">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-wider mb-1">
                              Capacidad
                            </p>
                            <p className="text-2xl font-bold tabular-nums text-foreground/60">
                              {selectedFieldCapacity || '∞'}
                            </p>
                          </div>
                        </div>

                        <div className={cn(
                          'flex items-center justify-center py-2 px-4 rounded-lg border font-bold text-[11px] uppercase tracking-wider shadow-sm',
                          isOverCapacity
                            ? 'bg-destructive text-destructive-foreground border-destructive/50'
                            : 'bg-primary/20 border-primary/30 text-primary'
                        )}>
                          {isOverCapacity ? 'Capacidad Excedida' : selectedField.id === -1 ? 'Retirar Animales' : 'Configuración Segura'}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-border bg-background py-10 flex flex-col items-center justify-center text-center px-8 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer shadow-inner">
                        <IconMapPin size="lg" className="text-muted-foreground/20 group-hover:text-primary transition-colors" />
                        <p className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-4 group-hover:text-primary transition-colors">
                          Seleccionar Destino
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Alerta de rotación de potreros */}
                <AnimatePresence>
                  {selectedFieldRotation && selectedFieldRotation.status !== 'ready' && selectedField && selectedField.id !== -1 && (
                    <motion.section
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center border',
                          selectedFieldRotation.status === 'critical'
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                            : selectedFieldRotation.status === 'resting'
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        )}>
                          <IconRotate className="h-4 w-4" />
                        </div>
                        <h4 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground/80">
                          Estado de Rotación
                        </h4>
                      </div>

                      <div className={cn(
                        'rounded-xl p-4 border space-y-3 shadow-sm',
                        selectedFieldRotation.status === 'critical'
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          : selectedFieldRotation.status === 'resting'
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      )}>
                        <div className="flex items-start gap-3">
                          {selectedFieldRotation.status === 'critical' ? (
                            <IconAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
                          ) : (
                            <IconLeaf className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-bold',
                              selectedFieldRotation.status === 'critical'
                                ? 'text-red-700 dark:text-red-400'
                                : selectedFieldRotation.status === 'resting'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-blue-700 dark:text-blue-400'
                            )}>
                              {selectedFieldRotation.status === 'critical'
                                ? 'Potrero requiere rotación urgente'
                                : selectedFieldRotation.status === 'resting'
                                ? 'Potrero en período de descanso'
                                : 'Potrero en pastoreo activo'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {selectedFieldRotation.status === 'critical'
                                ? `Han pasado más de ${selectedFieldRotation.restDays} días desde el último pastoreo. Se recomienda rotar el ganado para evitar sobrepastoreo.`
                                : selectedFieldRotation.status === 'resting'
                                ? `Faltan ${selectedFieldRotation.daysRemaining} días para completar el descanso de ${selectedFieldRotation.restDays} días.`
                                : `El potrero lleva ${selectedFieldRotation.grazingDays - selectedFieldRotation.daysRemaining} días en pastoreo de un máximo de ${selectedFieldRotation.grazingDays} días recomendados.`}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                          <div className="text-center">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider">Último pastoreo</p>
                            <p className="text-xs font-bold text-foreground mt-0.5">
                              {selectedFieldRotation.lastGrazingDate
                                ? new Date(selectedFieldRotation.lastGrazingDate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                                : 'Sin registro'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider">Días restantes</p>
                            <p className={cn(
                              'text-xs font-bold mt-0.5',
                              selectedFieldRotation.status === 'critical'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-foreground'
                            )}>
                              {selectedFieldRotation.daysRemaining > 0
                                ? `${selectedFieldRotation.daysRemaining} días`
                                : 'Listo para pastoreo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

              </div>
            </ScrollArea>
          </div>

          {/* ── PANEL DERECHO: Grilla de potreros ───────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
            {/* Barra de búsqueda */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-6 bg-muted/5">
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-2 w-2 rounded-[var(--radius-full)] bg-primary" />
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Destinos Disponibles
                </h3>
              </div>
              <div className="relative w-full max-w-sm group">
                <Input
                  placeholder="Buscar potrero por nombre o ubicación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl bg-background border-border pl-11 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/40"
                />
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            {/* Grilla de potreros */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {filteredFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-12">
                    {filteredFields.map((field) => {
                      const capacity = parseCapacity(field.capacity);
                      const occupancy = field.animal_count ?? 0;
                      const isSelected = selectedFieldId === field.id;
                      const projected = occupancy + selectedAnimalIds.length;
                      const overCap = capacity !== null && projected > capacity;
                      const occupancyPercent = capacity
                        ? Math.min((occupancy / capacity) * 100, 100)
                        : 0;
                      const projectedPercent = capacity
                        ? Math.min((projected / capacity) * 100, 100)
                        : 0;
                      const currentPercent = capacity ? Math.round((occupancy / capacity) * 100) : 0;

                      // Determinar estado de llenado
                      let statusText = 'Vacío';
                      let statusColor = 'emerald';
                      let remainingText = 'Sin animales';

                      if (capacity === null) {
                        statusText = 'Ilimitado';
                        statusColor = 'emerald';
                        remainingText = 'Ilimitado';
                      } else {
                        const libres = capacity - occupancy;
                        if (occupancy === 0) {
                          statusText = 'Vacío';
                          statusColor = 'emerald';
                          remainingText = `${libres} disponibles`;
                        } else if (currentPercent < 50) {
                          statusText = 'Bajo';
                          statusColor = 'emerald';
                          remainingText = `${libres} libres`;
                        } else if (currentPercent < 80) {
                          statusText = 'Medio';
                          statusColor = 'yellow';
                          remainingText = `${libres} libres`;
                        } else if (currentPercent < 100) {
                          statusText = 'Alto';
                          statusColor = 'orange';
                          remainingText = `${libres} libres`;
                        } else {
                          statusText = 'Lleno';
                          statusColor = 'red';
                          remainingText = 'Sin cupo';
                        }
                      }

                      const colorClasses = getColorClasses(statusColor);

                      const rotation = field.id !== -1 ? getRotationInfo(field) : null;
                      const rotationBadge = rotation ? getRotationBadge(rotation) : null;

                      const textColor = overCap
                        ? 'text-destructive animate-pulse font-black'
                        : projectedPercent >= 80
                        ? 'text-orange-500'
                        : projectedPercent >= 50
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-emerald-600 dark:text-emerald-400';

                      return (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => setSelectedFieldId(field.id)}
                          className={cn(
                            'group relative p-4 pl-6 rounded-xl border transition-all duration-300 flex flex-col gap-3 text-left overflow-hidden',
                            isSelected
                              ? 'bg-primary/[0.03] border-primary shadow-[0_8px_30px_rgb(29,78,216,0.12)] ring-1 ring-primary/30 -translate-y-0.5'
                              : 'bg-background border-border/80 shadow-[0_4px_16px_rgba(0,0,0,0.03),_0_1px_2px_rgba(0,0,0,0.01)] hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06),_0_2px_6px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 active:scale-[0.99]',
                            colorClasses.bg
                          )}
                        >
                          {/* Barra indicadora vertical a la izquierda */}
                          <div className={cn(
                            'absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all duration-300',
                            isSelected ? 'bg-primary' : colorClasses.indicatorBar
                          )} />

                          {/* Icono + check + badge */}
                          <div className="flex items-center justify-between relative z-10 w-full">
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary/50 shadow-sm shadow-primary/20'
                                : 'bg-muted/50 text-muted-foreground border-border/50 group-hover:text-primary group-hover:bg-primary/5'
                            )}>
                              <IconBox size="md" />
                            </div>

                            {/* Badge de ocupación actual */}
                            <span className={cn(
                              'text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                              colorClasses.badge
                            )}>
                              {statusText} {capacity && `${currentPercent}%`}
                            </span>
                          </div>

                          {/* Badge de rotación de potrero */}
                          {rotationBadge && (
                            <div className={cn(
                              'flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border w-fit',
                              rotationBadge.className
                            )}>
                              {rotationBadge.icon}
                              <span>{rotationBadge.text}</span>
                            </div>
                          )}

                          {/* Nombre y ubicación */}
                          <div className="relative z-10 min-w-0">
                            <p className={cn(
                              'text-sm font-black fit-clamp transition-colors leading-none',
                              isSelected ? 'text-primary' : 'text-foreground'
                            )}>
                              {field.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <IconMap2 className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                              <p className="text-[11px] font-semibold text-muted-foreground/60 fit-clamp">
                                {field.ubication || 'Sin ubicación'}
                              </p>
                            </div>
                          </div>

                          {/* Ocupación con números detallados */}
                          <div className="space-y-2.5 relative z-10 mt-1 w-full">
                            <div className="flex items-end justify-between px-0.5">
                              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                Ocupación
                              </p>
                              
                              {/* Indicador de cambio dinámico */}
                              <div className="flex items-center gap-1.5 tabular-nums">
                                {isSelected ? (
                                  <>
                                    <span className="text-xs text-muted-foreground/50 font-bold line-through">
                                      {occupancy}
                                    </span>
                                    <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 animate-pulse">
                                      +{selectedAnimalIds.length}
                                    </span>
                                    <IconArrowRight className="h-3 w-3 text-primary shrink-0" />
                                    <span className={cn('text-base font-black', textColor)}>
                                      {projected}
                                    </span>
                                  </>
                                ) : (
                                  <span className={cn(
                                    'text-base font-extrabold',
                                    occupancy > 0 ? textColor : 'text-foreground/80'
                                  )}>
                                    {occupancy}
                                  </span>
                                )}
                                <span className="text-[11px] text-muted-foreground/30 font-bold">
                                  / {capacity || '∞'}
                                </span>
                              </div>
                            </div>

                            {/* Barra de progreso de doble segmento */}
                            <div className="h-2.5 bg-muted/85 rounded-full overflow-hidden relative shadow-[inset_0_1px_2.5px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                              {isSelected && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${projectedPercent}%` }}
                                  className={cn(
                                    'absolute inset-0 rounded-full opacity-35 animate-pulse',
                                    overCap ? 'bg-red-500' : 'bg-primary'
                                  )}
                                />
                              )}
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercent}%` }}
                                className={cn(
                                  'absolute inset-0 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all duration-700',
                                  occupancy > 0 ? colorClasses.progress : 'bg-muted-foreground/20'
                                )}
                              />
                            </div>
                          </div>

                          {/* Footer de la tarjeta con disponibilidad detallada */}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-0.5 text-[10px] font-bold text-muted-foreground/60 w-full relative z-10">
                            <span className="flex items-center gap-1.5">
                              <span className={cn(
                                'h-2 w-2 rounded-full shadow-sm',
                                occupancy > 0 ? colorClasses.indicatorBar : 'bg-muted-foreground/30'
                              )} />
                              {remainingText}
                            </span>
                            {overCap ? (
                              <span className="text-destructive font-extrabold flex items-center gap-1 animate-pulse bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 text-[9px] uppercase tracking-wider">
                                <IconAlertTriangle className="h-3.5 w-3.5" />
                                Excede Límite
                              </span>
                            ) : (
                              isSelected && (
                                <span className="text-primary font-extrabold flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-[9px] uppercase tracking-wider">
                                  <IconCircleCheck className="h-3 w-3" />
                                  Destino
                                </span>
                              )
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                    <div className="h-16 w-16 rounded-[var(--radius-full)] bg-muted flex items-center justify-center mb-4">
                      <IconSwitchHorizontal size="lg" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest">
                      No se encontraron potreros
                    </p>
                    <p className="text-xs mt-1">Verifique los filtros o el estado de la conexión</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ══ 3. FOOTER ══════════════════════════════════════════════════════ */}
        <DialogFooter className="px-6 py-4 bg-background border-t border-border flex flex-row items-center justify-between shrink-0 z-50">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={transferring}
            className="h-9 px-4 rounded-lg font-medium text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-4">
            {/* Destino seleccionado (desktop) */}
            <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-border">
              <IconArrowRight
                className={cn('h-4 w-4', selectedField ? 'text-primary' : 'text-muted-foreground/20')}
              />
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider leading-none mb-0.5">
                  Destino
                </span>
                <span className={cn(
                  'text-sm font-bold fit-clamp max-w-[150px]',
                  selectedField ? 'text-foreground' : 'text-muted-foreground/20'
                )}>
                  {selectedField ? selectedField.name : 'No seleccionado'}
                </span>
              </div>
            </div>

            {/* Botón principal */}
            <Button
              onClick={handleTransfer}
              disabled={selectedFieldId === null || transferring}
              className={cn(
                'h-9 px-5 rounded-lg font-medium text-sm gap-2 transition-all active:scale-95 shadow-sm',
                selectedField
                  ? selectedField.id === -1 
                      ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                  : 'bg-muted text-muted-foreground/40 border border-border'
              )}
            >
              {transferring ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <IconBolt className="h-4 w-4" />
                  <span>{selectedField?.id === -1 ? 'Confirmar Retiro' : 'Lanzar Traslado'}</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
