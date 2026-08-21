import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import type { RiskEntry, RiskListKey } from '@/entities/reproduction/model/herdKpis.types';

/**
 * Listas de atención reproductiva: sobre qué animal actuar hoy.
 *
 * Cada fila nombra al animal y el dato que justifica la acción, para que el
 * operario no tenga que interpretar un indicador agregado.
 */

interface AttentionListsProps {
  risk: Record<RiskListKey, RiskEntry[]>;
}

interface ListDefinition {
  key: RiskListKey;
  title: string;
  description: string;
  tone: 'danger' | 'warning' | 'info';
  detail: (entry: RiskEntry) => string;
}

const LISTS: ListDefinition[] = [
  {
    key: 'overdue_births',
    title: 'Partos vencidos',
    description: 'Pasaron la fecha probable de parto',
    tone: 'danger',
    detail: (e) => `${e.days_overdue} días vencido · esperado ${formatDateColombia(e.expected_birth_date ?? '')}`,
  },
  {
    key: 'due_for_dry_off',
    title: 'Secado pendiente',
    description: 'Lactando cuando ya deberían estar secas',
    tone: 'danger',
    detail: (e) => `${e.days_late} días de atraso · parto ${formatDateColombia(e.expected_birth_date ?? '')}`,
  },
  {
    key: 'upcoming_births',
    title: 'Partos próximos',
    description: 'Trasladar a maternidad y vigilar',
    tone: 'info',
    detail: (e) => `Faltan ${e.days_to_birth} días · ${formatDateColombia(e.expected_birth_date ?? '')}`,
  },
  {
    key: 'open_over_limit',
    title: 'Días abiertos excedidos',
    description: 'Paridas sin lograr preñez a tiempo',
    tone: 'warning',
    detail: (e) => `${e.days_open} días abiertos · ${e.services_since_calving} servicios`,
  },
  {
    key: 'repeat_breeders',
    title: 'Repetidoras',
    description: 'Servicios acumulados sin preñez',
    tone: 'warning',
    detail: (e) => `${e.failed_services} servicios fallidos · último ${formatDateColombia(e.last_service_date ?? '')}`,
  },
  {
    key: 'unconfirmed_services',
    title: 'Servicios sin diagnóstico',
    description: 'Pasó la ventana de palpación',
    tone: 'warning',
    detail: (e) => `${e.days_since_service} días desde el servicio · ${e.technique ?? 'técnica sin registrar'}`,
  },
  {
    key: 'heifers_without_service',
    title: 'Novillas sin servicio',
    description: 'En edad de primer servicio',
    tone: 'info',
    detail: (e) => `${e.age_months} meses de edad`,
  },
];

const TONE_BADGE: Record<ListDefinition['tone'], string> = {
  danger: 'bg-red-600 text-white',
  warning: 'bg-amber-400 text-slate-950',
  info: 'bg-sky-600 text-white',
};

export const AttentionLists: React.FC<AttentionListsProps> = ({ risk }) => {
  const populated = LISTS.filter((list) => (risk?.[list.key]?.length ?? 0) > 0);

  if (populated.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Listas de atención</CardTitle>
          <CardDescription>Todavía no hay animales que requieran acción reproductiva.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Registre celos, servicios y diagnósticos para que el sistema pueda señalar
          vacas repetidoras, partos vencidos y secados pendientes.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
      {populated.map((list) => {
        const entries = risk[list.key];
        return (
          <Card key={list.key} className="min-w-0">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <CardTitle className="text-sm min-w-0 fit-clamp">{list.title}</CardTitle>
                  <CardDescription className="text-[11px]">{list.description}</CardDescription>
                </div>
                <Badge className={`${TONE_BADGE[list.tone]} shrink-0 font-black`}>{entries.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {entries.slice(0, 6).map((entry) => (
                <div
                  key={`${list.key}-${entry.animal_id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg bg-muted/30 px-3 py-2 min-w-0"
                >
                  <span className="text-sm font-bold text-primary min-w-0 fit-clamp">{entry.record}</span>
                  <span className="text-[11px] text-muted-foreground min-w-0">{list.detail(entry)}</span>
                </div>
              ))}
              {entries.length > 6 ? (
                <p className="text-[11px] text-muted-foreground">
                  y {entries.length - 6} más
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttentionLists;
