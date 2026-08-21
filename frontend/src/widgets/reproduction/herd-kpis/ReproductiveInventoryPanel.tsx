import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import type { ReproductiveInventory } from '@/entities/reproduction/model/herdKpis.types';

/**
 * Composición reproductiva del hato: en qué estado está cada hembra hoy.
 *
 * Responde la pregunta operativa de la finca —cuántas están preñadas, cuántas
 * esperan diagnóstico y cuántas están vacías— antes de mirar cualquier tasa.
 */

interface ReproductiveInventoryPanelProps {
  inventory: ReproductiveInventory;
}

const SEGMENTS: Array<{
  key: keyof ReproductiveInventory;
  label: string;
  hint: string;
  dot: string;
}> = [
  { key: 'pregnant', label: 'Preñadas', hint: 'Preñez confirmada por diagnóstico', dot: 'bg-emerald-500' },
  { key: 'served_pending', label: 'Servidas', hint: 'Con servicio, sin diagnóstico aún', dot: 'bg-sky-500' },
  { key: 'open', label: 'Vacías', hint: 'Paridas y sin preñez vigente', dot: 'bg-amber-500' },
  { key: 'heifers', label: 'Novillas', hint: 'Sin parto ni servicio registrado', dot: 'bg-violet-500' },
  { key: 'lactating', label: 'En lactancia', hint: 'Con ciclo de lactancia abierto', dot: 'bg-blue-500' },
];

export const ReproductiveInventoryPanel: React.FC<ReproductiveInventoryPanelProps> = ({ inventory }) => {
  const total = inventory.total_females || 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Composición del hato</CardTitle>
        <CardDescription>
          {total.toLocaleString('es-CO')} hembras vivas · {inventory.breeding_females.toLocaleString('es-CO')} en edad reproductiva
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          {SEGMENTS.map((segment) => {
            const value = Number(inventory[segment.key] ?? 0);
            const share = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div
                key={segment.key}
                className="rounded-xl border border-border/60 bg-muted/20 p-3 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${segment.dot}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-0 fit-clamp">
                    {segment.label}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black leading-none">{value.toLocaleString('es-CO')}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{share}%</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{segment.hint}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReproductiveInventoryPanel;
