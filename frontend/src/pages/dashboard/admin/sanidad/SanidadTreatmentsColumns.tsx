import { AlertTriangle, FileHeart } from 'lucide-react';
import { CRUDColumn } from '@/shared/types/crud';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { AnimalLink } from '@/entities/animal/ui';
import { UserLink } from '@/entities/user/ui';
import { cn } from '@/shared/ui/cn';
import type { SanidadStatsData } from './useSanidadStats';
import { CASE_STATUS_DOT, timeAgo, TreatmentRow } from './sanidadTreatmentsConfig';

const ACTIVE_CASE_STATUSES = new Set([
  'Activo',
  'En tratamiento',
  'En Tratamiento',
  'Observación',
  'Crónico',
]);

/** Columna «Caso»: episodio clínico al que pertenece el registro (si existe). */
export function renderCaseCell(
  stats: SanidadStatsData,
  onOpenCase: (caseId: number) => void
) {
  return (_v: any, item: TreatmentRow) => {
    const episodeId = Number(item.animal_disease_id ?? (item as any).animal_disease?.id);
    if (!episodeId) {
      // No confundimos una coincidencia por animal con una relación guardada:
      // sirve como atajo para revisar el caso, pero deja claro que el
      // tratamiento todavía no está vinculado.
      const activeCases = (stats.episodesByAnimal.get(Number(item.animal_id)) || []).filter(
        (c) => ACTIVE_CASE_STATUSES.has(c.status)
      );
      if (activeCases.length > 0) {
        const first = activeCases[0];
        return (
          <button
            type="button"
            onClick={() => onOpenCase(first.id)}
            title={`Este tratamiento no está vinculado. La res tiene ${activeCases.length === 1 ? 'un caso clínico activo' : `${activeCases.length} casos clínicos activos`}: ${first.disease_label}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25 text-[11px] font-bold hover:bg-red-500/20 transition-all"
          >
            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
            <span className="max-w-[110px] fit-clamp">
              {activeCases.length > 1 ? `${activeCases.length} casos activos · sin vincular` : 'Revisar caso · sin vincular'}
            </span>
          </button>
        );
      }
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    const info = stats.episodeById.get(episodeId);
    if (!info) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/10 text-muted-foreground border border-border/20 text-[11px] font-bold">
          <FileHeart className="h-3 w-3" /> Caso #{episodeId}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onOpenCase(episodeId)}
        title={`Ver seguimiento del caso #${episodeId}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-[11px] font-bold hover:bg-purple-500/20 transition-all"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', CASE_STATUS_DOT[info.status] || 'bg-muted-foreground')} />
        <span className="max-w-[110px] fit-clamp">{info.disease_label}</span>
      </button>
    );
  };
}

export interface TreatmentsColumnsInput {
  animalMap: Map<number, string>;
  animalsMap: Map<number, any>;
  userMap: Map<number, string>;
  openAssociations: (item: TreatmentRow) => void;
  stats: SanidadStatsData;
  onOpenCase: (caseId: number) => void;
}

/** Columnas de la tabla de tratamientos con vínculo al caso clínico. */
export function buildTreatmentsColumns({
  animalMap,
  animalsMap,
  userMap,
  openAssociations,
  stats,
  onOpenCase,
}: TreatmentsColumnsInput): CRUDColumn<TreatmentRow>[] {
  return [
    {
      key: 'action' as any,
      label: '',
      sortable: false,
      render: (_v, item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            openAssociations(item);
          }}
          title="Ver insumos"
        >
          <span className="flex items-center gap-1">💉 Ver insumos</span>
        </Button>
      ),
    },
    {
      key: 'animal_id' as any,
      label: 'Animal',
      sortable: true,
      render: (value: any) => {
        if (!value) return '-';
        const id = Number(value);
        const animal = animalsMap.get(id);
        const label = animal?.record || animal?.tag || animalMap.get(id) || `Animal ${id}`;
        const subinfo = [animal?.breed_name || animal?.breed, animal?.sex || animal?.gender].filter(Boolean).join(' · ');

        return (
          <div className="flex flex-col min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 w-fit">
              <span>🐄</span> <AnimalLink id={id} label={label} />
            </span>
            {subinfo && (
              <span className="text-[11px] text-muted-foreground mt-0.5 fit-clamp max-w-[140px]">{subinfo}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'treatment_date' as any,
      label: 'Fecha',
      sortable: true,
      render: (v) => {
        if (!v) return '-';
        const dateStr = String(v);
        const d = new Date(dateStr);
        const formatted = Number.isNaN(d.getTime())
          ? dateStr
          : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-xs">{formatted}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(dateStr)}</span>
          </div>
        );
      },
    },
    {
      key: 'diagnosis' as any,
      label: 'Diagnóstico',
      sortable: true,
      render: (_v, item) => {
        const diag = item.diagnosis || item.description || '-';
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs shrink-0">🩺</span>
            <span className="font-bold text-foreground text-xs sm:text-sm fit-clamp max-w-[220px]" title={diag}>
              {diag}
            </span>
          </div>
        );
      },
    },
    {
      key: 'animal_disease_id' as any,
      label: 'Caso',
      sortable: false,
      render: renderCaseCell(stats, onOpenCase),
    },
    {
      key: 'dosis' as any,
      label: 'Posología',
      render: (_v, item) => {
        const dose = item.dosis ?? item.dose ?? '';
        const freq = item.frequency ?? item.frecuencia ?? '';
        if (!dose && !freq) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col text-xs min-w-0">
            {dose && <span className="font-semibold text-foreground fit-clamp max-w-[130px]">{dose}</span>}
            {freq && <span className="text-[11px] text-muted-foreground fit-clamp max-w-[130px]">{freq}</span>}
          </div>
        );
      },
    },
    {
      key: 'withdrawal_days' as any,
      label: 'Período de retiro',
      sortable: true,
      render: (_v, item) => {
        const days = Number(item.withdrawal_days) || 0;
        const endDateStr = item.withdrawal_end_date;
        if (days <= 0 && !endDateStr) {
          return <span className="text-[11px] text-muted-foreground font-medium">Sin retiro</span>;
        }

        let endDate: Date;
        if (endDateStr) {
          endDate = new Date(String(endDateStr));
        } else if (item.treatment_date) {
          endDate = new Date(String(item.treatment_date));
          endDate.setDate(endDate.getDate() + days);
        } else {
          return <span className="text-[11px] text-muted-foreground font-medium">Sin retiro</span>;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isActive = diff >= 0;

        if (isActive) {
          return (
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1 w-fit animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{diff}d restantes</span>
            </Badge>
          );
        }

        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1 w-fit">
            <span>✅</span>
            <span>Cumplido</span>
          </Badge>
        );
      },
    },
    {
      key: 'cost' as any,
      label: 'Costo (COP)',
      sortable: true,
      render: (v) => {
        if (v === undefined || v === null || v === '' || Number(v) <= 0) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        return (
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v))}
          </span>
        );
      },
    },
    {
      key: 'performed_by' as any,
      label: 'Responsable',
      render: (v, item) => {
        const id = Number(v || item.veterinarian);
        if (!id) return <span className="text-muted-foreground text-xs">-</span>;
        const name = userMap.get(id) || `Usuario #${id}`;
        return <UserLink id={id} label={name} />;
      },
    },
  ];
}
