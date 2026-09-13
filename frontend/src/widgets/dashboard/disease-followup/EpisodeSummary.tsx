import { CheckCircle2, Eye, Stethoscope } from 'lucide-react';
import { AnimalLink } from '@/entities/animal/ui/AnimalLink';
import { cn } from '@/shared/ui/cn';
import type { DiseaseFollowupData } from './types';
import { statusBadge } from './DiseaseFollowupUi';

function severityBadge(severity?: string | null) {
  if (!severity) return null;
  const colors: Record<string, string> = {
    Leve: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    Moderada: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    Severa: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    Crítica: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
        colors[severity] || 'bg-muted/40 text-muted-foreground border-border/40'
      )}
    >
      {severity}
    </span>
  );
}

export function EpisodeSummary({
  episode,
  followup,
  enableAnimalLink = true,
}: {
  episode: DiseaseFollowupData['episode'];
  followup: DiseaseFollowupData | null;
  enableAnimalLink?: boolean;
}) {
  const diseaseName = episode.disease?.name || `Enfermedad #${episode.disease_id}`;
  const animalRecord = episode.animal?.record || `Res #${episode.animal_id}`;

  let days: number | null = null;
  const start = episode.diagnosis_date ? new Date(episode.diagnosis_date).getTime() : null;
  const end = episode.recovery_date ? new Date(episode.recovery_date).getTime() : Date.now();
  if (start) {
    days = Math.max(0, Math.round((end - start) / 86_400_000));
  }

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background/40 to-background/10 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-black tracking-tight">{diseaseName}</span>
        {statusBadge(episode.status)}
        {severityBadge(episode.severity)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground font-medium">
        <span className="inline-flex items-center gap-1">
          {enableAnimalLink && episode.animal?.id ? (
            <AnimalLink id={episode.animal.id} label={animalRecord}>
              <span
                title="Abrir ficha completa del animal"
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary dark:text-primary-foreground hover:bg-primary/20 hover:border-primary/50 font-semibold transition-all duration-200"
              >
                <Stethoscope className="h-3 w-3" />
                {animalRecord}
                <Eye className="h-3 w-3 opacity-70" />
              </span>
            </AnimalLink>
          ) : (
            <>
              <Stethoscope className="h-3 w-3" />
              {animalRecord}
            </>
          )}
        </span>
        <span>Diagnóstico: {episode.diagnosis_date || '—'}</span>
        {episode.recovery_date && (
          <span className="text-emerald-600 dark:text-emerald-400">
            Alta: {episode.recovery_date}
          </span>
        )}
        <span>Duración: {days !== null ? `${days} días` : '—'}</span>
        {episode.notes && <span className="italic fit-clamp">«{episode.notes}»</span>}
      </div>
      {followup && followup.closed.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {followup.closed.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold"
            >
              <CheckCircle2 className="h-3 w-3" />
              {c.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
