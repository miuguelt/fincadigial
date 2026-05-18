import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/shared/ui/icons';
import { animalFieldsService } from '@/entities/animal/api/animalFields.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { cn } from '@/shared/ui/cn';

// ─── Tipos locales ─────────────────────────────────────────────────────────────

interface Field {
  id: number;
  name: string;
  ubication: string;
  state: string;
  capacity: string;
  animal_count: number;
}

interface BatchFieldTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAnimalIds: number[];
  onSuccess: () => void;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

const getToday = () => new Date().toISOString().split('T')[0];

/** Extrae el array de items de cualquier forma de respuesta de la API */
const getItemsFromResponse = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (Array.isArray(response?.data)) return response.data as T[];
  if (Array.isArray(response?.items)) return response.items as T[];
  if (Array.isArray(response?.results)) return response.results as T[];
  return [];
};

const parseCapacity = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

// ─── Componente principal ──────────────────────────────────────────────────────

export const BatchFieldTransferModal: React.FC<BatchFieldTransferModalProps> = ({
  isOpen,
  onClose,
  selectedAnimalIds,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<any[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState(getToday());
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const fetchFields = useCallback(async () => {
    try {
      const resp = await fieldService.getFields({ limit: 100 });
      setFields(getItemsFromResponse<Field>(resp));
    } catch {
      showToast('Error al cargar potreros', 'error');
    }
  }, [showToast]);

  const fetchSelectedAnimals = useCallback(async () => {
    if (selectedAnimalIds.length === 0) return;
    try {
      const resp = await animalsService.getAnimals({
        ids: selectedAnimalIds.join(','),
        limit: selectedAnimalIds.length,
      });
      setSelectedAnimals(resp);
    } catch (error) {
      console.error('Error fetching animals:', error);
    }
  }, [selectedAnimalIds]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFieldId(null);
      setTransferDate(getToday());
      setNotes('');
      setSearchQuery('');
      fetchFields();
      fetchSelectedAnimals();
    }
  }, [isOpen, fetchFields, fetchSelectedAnimals]);

  // ── Cálculos derivados ──────────────────────────────────────────────────────

  const filteredFields = fields.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.ubication?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedField = fields.find((field) => field.id === selectedFieldId) || null;
  const selectedFieldCapacity = selectedField ? parseCapacity(selectedField.capacity) : null;
  const projectedOccupancy = (selectedField?.animal_count ?? 0) + selectedAnimalIds.length;
  const isOverCapacity =
    selectedFieldCapacity !== null && projectedOccupancy > selectedFieldCapacity;

  // ── Traslado ────────────────────────────────────────────────────────────────

  const handleTransfer = async () => {
    if (!selectedFieldId) return;
    setTransferring(true);
    try {
      const response = await animalFieldsService.bulkTransfer({
        animal_ids: selectedAnimalIds,
        field_id: selectedFieldId,
        date: transferDate,
        notes: notes || `Traslado masivo de ${selectedAnimalIds.length} animales`,
      });

      if (response.success) {
        showToast(
          `Operación exitosa: ${selectedAnimalIds.length} animales trasladados`,
          'success'
        );
        onSuccess();
        onClose();
      } else {
        showToast(response.message || 'Error en el traslado', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Error de conexión', 'error');
    } finally {
      setTransferring(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[98vw] !h-[96dvh] p-0 overflow-hidden bg-background border border-border rounded-[1.5rem] shadow-[var(--shadow-token-lg)] flex flex-col transition-all duration-300 select-none">

        {/* ══ 1. HEADER ══════════════════════════════════════════════════════ */}
        <DialogHeader className="px-6 py-4 bg-background border-b border-border relative z-20 flex flex-row items-center justify-between gap-6 shrink-0">
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-sm">
              <IconSwitchHorizontal className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3 truncate">
                Relocalización de Ganado
                <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2.5 py-0.5 rounded-[var(--radius-full)] border-none shadow-sm">
                  {selectedAnimalIds.length} Lotes
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-70">
                Villa Luz • Gestión de Infraestructura
              </DialogDescription>
            </div>
          </div>

          {/* Indicador de estado en línea */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
            <div className="relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-[var(--radius-full)] bg-primary opacity-75" />
              <span className="relative inline-flex rounded-[var(--radius-full)] h-2 w-2 bg-primary" />
            </div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Sistema Online</p>
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
                          <IconMeat size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate">
                            {animal.record || `ID-${animal.id}`}
                          </p>
                          <p className="text-[8px] font-bold text-muted-foreground/40 truncate uppercase tracking-widest">
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
                              'text-xl font-bold truncate',
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
                              <IconAlertTriangle size={20} />
                            ) : (
                              <IconMapPin size={20} />
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
                          {isOverCapacity ? 'Capacidad Excedida' : 'Configuración Segura'}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-border bg-background py-10 flex flex-col items-center justify-center text-center px-8 hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer shadow-inner">
                        <IconMapPin size={32} className="text-muted-foreground/20 group-hover:text-primary transition-colors" />
                        <p className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-4 group-hover:text-primary transition-colors">
                          Seleccionar Destino
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </section>

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

                      return (
                        <button
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          className={cn(
                            'group relative p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 text-left',
                            isSelected
                              ? 'bg-primary/10 border-primary shadow-md ring-1 ring-primary/10'
                              : 'bg-background border-border hover:border-primary/20 hover:shadow-sm'
                          )}
                        >
                          {/* Icono + check */}
                          <div className="flex items-center justify-between relative z-10">
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border transition-all',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary/50'
                                : 'bg-muted/50 text-muted-foreground border-border/50 group-hover:text-primary group-hover:bg-primary/5'
                            )}>
                              <IconBox size={18} />
                            </div>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-[var(--radius-full)] bg-primary flex items-center justify-center shadow-sm">
                                <IconCircleCheck className="text-primary-foreground h-3 w-3" />
                              </div>
                            )}
                          </div>

                          {/* Nombre y ubicación */}
                          <div className="relative z-10 min-w-0">
                            <p className={cn(
                              'text-sm font-bold truncate transition-colors',
                              isSelected ? 'text-primary' : 'text-foreground'
                            )}>
                              {field.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <IconMap2 size={12} className="text-muted-foreground/40" />
                              <p className="text-[11px] font-medium text-muted-foreground/60 truncate">
                                {field.ubication || 'Sin ubicación'}
                              </p>
                            </div>
                          </div>

                          {/* Barra de ocupación */}
                          <div className="space-y-2 relative z-10 mt-1">
                            <div className="flex items-end justify-between px-0.5">
                              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                                Ocupación
                              </p>
                              <div className="flex items-baseline gap-1 tabular-nums">
                                <span className={cn(
                                  'text-base font-bold',
                                  overCap
                                    ? 'text-destructive'
                                    : isSelected
                                    ? 'text-primary'
                                    : 'text-foreground'
                                )}>
                                  {isSelected ? projected : occupancy}
                                </span>
                                <span className="text-[11px] text-muted-foreground/30 font-medium">
                                  / {capacity || '∞'}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-[var(--radius-full)] overflow-hidden relative">
                              {isSelected && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${projectedPercent}%` }}
                                  className={cn(
                                    'absolute inset-0 rounded-[var(--radius-full)] opacity-20',
                                    overCap ? 'bg-destructive' : 'bg-primary'
                                  )}
                                />
                              )}
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercent}%` }}
                                className={cn(
                                  'absolute inset-0 rounded-[var(--radius-full)] transition-all duration-700',
                                  isSelected ? 'bg-primary' : 'bg-muted-foreground/30'
                                )}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                    <div className="h-16 w-16 rounded-[var(--radius-full)] bg-muted flex items-center justify-center mb-4">
                      <IconSwitchHorizontal size={32} />
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
        <DialogFooter className="px-8 py-5 bg-background border-t border-border flex flex-row items-center justify-between shrink-0 z-50">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={transferring}
            className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-wider text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            Cancelar Proceso
          </Button>

          <div className="flex items-center gap-6">
            {/* Destino seleccionado (desktop) */}
            <div className="hidden lg:flex items-center gap-3 pr-6 border-r border-border">
              <IconArrowRight
                size={18}
                className={selectedField ? 'text-primary' : 'text-muted-foreground/20'}
              />
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider leading-none mb-1">
                  Destino
                </span>
                <span className={cn(
                  'text-base font-bold uppercase tracking-tight transition-all leading-none truncate max-w-[180px]',
                  selectedField ? 'text-foreground' : 'text-muted-foreground/20'
                )}>
                  {selectedField ? selectedField.name : 'No seleccionado'}
                </span>
              </div>
            </div>

            {/* Botón principal */}
            <Button
              onClick={handleTransfer}
              disabled={!selectedFieldId || transferring}
              className={cn(
                'h-12 px-10 rounded-xl font-bold uppercase tracking-wider text-[12px] gap-3 transition-all active:scale-95 shadow-md',
                selectedField
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                  : 'bg-muted text-muted-foreground/40 border border-border'
              )}
            >
              {transferring ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <IconBolt size={18} />
                  <span>Lanzar Traslado</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
