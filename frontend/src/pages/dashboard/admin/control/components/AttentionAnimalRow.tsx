import { AlertTriangle, ClipboardPlus, Eye, FileText } from 'lucide-react';
import { AnimalLink } from '@/entities/animal/ui';
import {
  ATTENTION_SEVERITY_COPY,
  describeLastCheck,
  type AttentionAnimalView,
} from './attentionAnimals.model';

interface AttentionAnimalRowProps {
  animal: AttentionAnimalView;
  canRecord: boolean;
  onReview: (animalId: number) => void;
}

/** Una fila del panel de atención: quién es, qué tiene y qué hacer. */
export function AttentionAnimalRow({ animal, canRecord, onReview }: AttentionAnimalRowProps) {
  const copy = ATTENTION_SEVERITY_COPY[animal.severity];
  const SeverityIcon = animal.severity === 'alta' ? AlertTriangle : Eye;

  return (
    <li className={`rounded-xl border-2 p-3 sm:p-4 ${copy.cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-lg font-black leading-tight text-foreground">
          {animal.label}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${copy.badgeClass}`}
        >
          <SeverityIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.badge}
        </span>
      </div>

      <p className="mt-1.5 text-sm font-semibold text-foreground/90">
        Estado: {animal.status || 'sin registrar'}
        <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
        <span className="font-medium text-muted-foreground">
          {describeLastCheck(animal.daysSinceCheck)}
        </span>
      </p>

      <p className="mt-0.5 text-xs font-bold text-foreground/70">{copy.hint}</p>

      {animal.description && (
        <p className="mt-2 rounded-lg bg-background/70 p-2.5 text-sm leading-relaxed text-foreground/90">
          {animal.description}
        </p>
      )}

      <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
        {canRecord && (
          <button
            type="button"
            onClick={() => onReview(animal.animalId)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <ClipboardPlus className="h-4 w-4" aria-hidden="true" />
            Registrar revisión
          </button>
        )}
        <AnimalLink id={animal.animalId} label={animal.label}>
          <button
            type="button"
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-border bg-background px-3 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99] ${canRecord ? '' : 'min-[420px]:col-span-2'}`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Ver ficha
          </button>
        </AnimalLink>
      </div>
    </li>
  );
}
