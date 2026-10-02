import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Boxes,
  ExternalLink,
  PackagePlus,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { inventoryService } from '@/entities/inventory/api/inventory.service';
import type { InventoryLotResponse, MedicationResponse } from '@/shared/api/generated/swaggerTypes';

interface MedicationDetailContentProps {
  medication: MedicationResponse & { [key: string]: any };
  routeLabel?: string;
  onNavigateToItem?: (item: any) => void;
}

export function MedicationDetailContent({
  medication,
  routeLabel,
}: MedicationDetailContentProps) {
  const navigate = useNavigate();
  const [lots, setLots] = useState<InventoryLotResponse[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!medication?.id) return;

    setLoadingLots(true);
    setLoadError(false);

    inventoryService
      .getLots({ medication_id: medication.id })
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
        setLots(list);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[MedicationDetailContent] Error al consultar existencias:', err);
        setLoadError(true);
      })
      .finally(() => {
        if (isMounted) setLoadingLots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [medication?.id]);

  // Cálculo de stock total agrupado por unidad
  const stockSummary = useMemo(() => {
    if (!lots.length) return null;

    const totalsByUnit: Record<string, number> = {};
    lots.forEach((lot) => {
      const unit = (lot.unit || 'unidades').toLowerCase();
      const qty = Number(lot.current_quantity ?? lot.quantity ?? 0);
      totalsByUnit[unit] = (totalsByUnit[unit] || 0) + (isNaN(qty) ? 0 : qty);
    });

    const entries = Object.entries(totalsByUnit);
    return entries.map(([unit, total]) => ({
      unit,
      total: Number(total.toFixed(2)),
    }));
  }, [lots]);

  const nearestExpiryLot = useMemo(() => {
    if (!lots.length) return null;
    const sorted = [...lots].sort((a, b) => {
      const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
      const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
      return dateA - dateB;
    });
    return sorted[0];
  }, [lots]);

  const handleGoToInventory = () => {
    navigate(`/admin/inventory?search=${encodeURIComponent(medication.name || '')}`);
  };

  const handleCreateLot = () => {
    navigate('/admin/inventory?create=1');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-CO');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 text-foreground">
      {/* 1. Banner pedagógico de catálogo de referencia */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 text-xs sm:text-sm text-foreground/90 backdrop-blur-sm flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="font-bold text-foreground">
            Ficha de Catálogo (Vademécum de Referencia)
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Este registro contiene las especificaciones y dosis autorizadas para formular en la finca.
            Las cantidades reales disponibles se consultan en el módulo de inventario.
          </p>
        </div>
      </div>

      {/* 2. Tarjeta destacada de Existencias en Finca */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Existencias en tu Finca (Stock Físico)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Cantidad disponible en bodega y botiquín
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToInventory}
              className="h-8 text-xs font-bold gap-1.5 border-border/60 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en Inventario</span>
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLot}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ingresar Stock</span>
            </Button>
          </div>
        </div>

        {loadingLots ? (
          <div className="py-4 text-center space-y-2">
            <div className="h-5 w-5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Consultando existencias de la finca...</p>
          </div>
        ) : loadError ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>No fue posible cargar el saldo en tiempo real. Puedes consultarlo directamente en el Inventario.</span>
          </div>
        ) : lots.length > 0 && stockSummary ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              {stockSummary.map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {item.total}
                  </span>
                  <span className="text-sm font-bold text-foreground uppercase tracking-wide">
                    {item.unit}
                  </span>
                </div>
              ))}
              <Badge variant="outline" className="ml-auto text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {lots.length} {lots.length === 1 ? 'lote registrado' : 'lotes registrados'}
              </Badge>
            </div>

            {nearestExpiryLot?.expiry_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>Próximo vencimiento:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(nearestExpiryLot.expiry_date)}
                </span>
                {nearestExpiryLot.lot_number && (
                  <span className="text-muted-foreground/80">
                    (Lote {nearestExpiryLot.lot_number})
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground font-semibold">
              <Info className="w-4 h-4 text-muted-foreground/70" />
              <span>Sin existencias físicas registradas en la finca (0 unidades)</span>
            </div>
            <p className="text-muted-foreground/80 leading-relaxed pl-6">
              Este medicamento está habilitado en tu catálogo. Para aplicarlo a tus animales, registra la compra o ingreso del lote físico en tu inventario.
            </p>
          </div>
        )}
      </div>

      {/* 3. Información Técnica y de Catálogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Bloque Farmacológico */}
        <div className="rounded-xl border border-border/60 bg-muted/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Pill className="w-3.5 h-3.5 text-primary" />
            <span>Datos Farmacológicos</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Identificador</span>
              <p className="font-mono font-bold text-sm">#{medication.id}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">En Catálogo</span>
              <p className="font-bold">
                {medication.availability ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Habilitado</span>
                ) : (
                  <span className="text-muted-foreground">Inactivo</span>
                )}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1 col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Dosis Sugerida</span>
              <p className="font-semibold text-foreground">{medication.dosis || 'No especificada'}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1 col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Vía de Administración</span>
              <p className="font-semibold text-foreground">
                {routeLabel || (medication as any).route_administration_name || 'No especificada'}
              </p>
            </div>
          </div>
        </div>

        {/* Bloque Indicaciones y Advertencias */}
        <div className="rounded-xl border border-border/60 bg-muted/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Indicaciones y Retiro</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Indicaciones</span>
              <p className="text-foreground leading-relaxed">
                {medication.indications || 'Sin indicaciones clínicas especificadas.'}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Contraindicaciones / Retiro</span>
              <p className="text-foreground leading-relaxed">
                {medication.contraindications || 'Sin contraindicaciones registradas.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Descripción general */}
      {medication.description && (
        <div className="rounded-xl border border-border/60 bg-muted/5 p-3.5 text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Descripción General</span>
          <p className="text-foreground leading-relaxed italic">
            {medication.description}
          </p>
        </div>
      )}

      {/* 5. Auditoría del sistema */}
      <div className="rounded-xl border border-border/40 bg-muted/10 p-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Registrado en catálogo: {formatDate(medication.created_at)}</span>
        </div>
        {medication.updated_at && (
          <span>Actualizado: {formatDate(medication.updated_at)}</span>
        )}
      </div>
    </div>
  );
}

export default MedicationDetailContent;
