import { AlertTriangle, Clock, Eye, FileText, Stethoscope } from 'lucide-react';
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
    <li className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 ${copy.cardClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <p className="text-base sm:text-lg font-black tracking-tight text-foreground">
            {animal.label}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${copy.badgeClass}`}
        >
          <SeverityIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.badge}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground">
          Estado: <strong className="ml-1 text-foreground">{animal.status || 'sin registrar'}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{describeLastCheck(animal.daysSinceCheck)}</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground/80">
          • {copy.hint}
        </span>
      </div>

      {animal.description && (
        <div className="mt-3 rounded-xl border border-border/60 bg-background/80 p-3 text-sm leading-relaxed text-foreground shadow-inner">
          <p className="font-medium">{animal.description}</p>
        </div>
      )}

      <div className="mt-4 grid gap-2.5 min-[420px]:grid-cols-2">
        {canRecord && (
          <button
            type="button"
            onClick={() => onReview(animal.animalId)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            Registrar revisión
          </button>
        )}
        <AnimalLink id={animal.animalId} label={animal.label}>
          <button
            type="button"
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${canRecord ? '' : 'min-[420px]:col-span-2'}`}
          >
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Ver ficha
          </button>
        </AnimalLink>
      </div>
    </li>
  );
}
