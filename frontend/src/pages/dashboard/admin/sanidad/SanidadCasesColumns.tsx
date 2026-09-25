import { CRUDColumn } from '@/shared/types/crud';
import { AnimalLink } from '@/entities/animal/ui';
import { DiseaseLink } from '@/entities/disease/ui';
import { UserLink } from '@/entities/user/ui';
import { cn } from '@/shared/ui/cn';
import type { CaseRow } from './sanidadCasesConfig';

function statusBadge(v: unknown) {
  if (!v || v === 'null' || v === 'undefined') return null;
  const str = String(v).trim();
  if (!str) return null;

  let themeClass = '';
  let dotClass = '';
  let emoji = '';

  if (str === 'Activo' || str === 'Crónico') {
    themeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15';
    dotClass = 'bg-rose-500 animate-pulse';
    emoji = str === 'Crónico' ? '⚠️' : '🚨';
  } else if (str === 'En tratamiento' || str === 'En Tratamiento') {
    themeClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/15';
    dotClass = 'bg-sky-500';
    emoji = '💊';
  } else if (str === 'Observación') {
    themeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15';
    dotClass = 'bg-amber-500';
    emoji = '👁️';
  } else if (str === 'Recuperado' || str === 'Tratado' || str === 'Curado' || str === 'Resuelto' || str === 'Cerrado') {
    themeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15';
    dotClass = 'bg-emerald-500';
    emoji = str === 'Resuelto' ? '🏁' : '✅';
  } else {
    themeClass = 'bg-muted/10 text-muted-foreground border-border/20 hover:bg-muted/15';
    dotClass = 'bg-muted-foreground';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 border backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] ${themeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="text-[11px]">{emoji}</span>
      <span>{str}</span>
    </span>
  );
}

function severityBadge(v: unknown) {
  if (!v || v === 'null' || v === 'undefined') return '-';
  const str = String(v).trim();
  if (!str) return '-';

  const palette: Record<string, string> = {
    Leve: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    Moderada: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    Severa: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    Crítica: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${palette[str] || 'bg-muted/10 text-muted-foreground border-border/30'}`}>
      {str}
    </span>
  );
}

export interface CasesColumnsInput {
  animalMap: Map<number | string, string>;
  diseaseMap: Map<number | string, string>;
  instructorMap: Map<number | string, string>;
  focusCaseId: number | null;
}

/** Columnas de la tabla de casos clínicos, con vínculo a registros por caso. */
export function buildCasesColumns({
  animalMap,
  diseaseMap,
  instructorMap,
  focusCaseId,
}: CasesColumnsInput): CRUDColumn<CaseRow>[] {
  return [
    {
      key: 'id',
      label: 'Código',
      render: (v) => (
        <span className={cn('font-mono text-xs font-bold px-1.5 py-0.5 rounded-md', focusCaseId === Number(v) ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40' : 'bg-muted/40 text-muted-foreground')}>
          {v ?? '-'}
        </span>
      ),
    },
    {
      key: 'animal_id',
      label: 'Res',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      },
    },
    {
      key: 'disease_id',
      label: 'Enfermedad',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = diseaseMap.get(id) || `Enfermedad ${id}`;
        return <DiseaseLink id={id} label={label} />;
      },
    },
    {
      key: 'instructor_id',
      label: 'Encargado',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = instructorMap.get(id) || `Encargado ${id}`;
        return <UserLink id={id} label={label} role="Instructor" />;
      },
    },
    {
      key: 'diagnosis_date',
      label: 'Fecha detección',
      render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-'),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (v) => statusBadge(v),
    },
    {
      key: 'severity',
      label: 'Gravedad',
      render: (v) => severityBadge(v),
    },
  ];
}
