import { Scale } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import type { FollowupControlEntry } from './types';
import { EmptyList, SectionCard } from './DiseaseFollowupUi';

export function ControlesTab({ controls }: { controls: FollowupControlEntry[] }) {
  return (
    <SectionCard title={<>Controles veterinarios del caso ({controls.length || 0})</>}>
      {controls.length === 0 && (
        <EmptyList message="Sin controles vinculados. Los controles también se registran en la pestaña Crecimiento del animal." />
      )}
      {controls.map((c) => (
        <div
          key={c.id}
          className="p-2.5 rounded-lg bg-background/70 dark:bg-card/50 border border-border/50 flex items-start gap-2.5"
        >
          <Scale className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold">{c.checkup_date}</span>
              <Badge variant="secondary" className="text-[11px] h-4">
                {c.health_status || '—'}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
              {c.weight != null && <span>Peso: {c.weight} kg</span>}
              {c.height != null && <span>Alzada: {c.height} cm</span>}
            </div>
            {c.description && (
              <p className="text-[11px] italic text-muted-foreground mt-1 fit-clamp">«{c.description}»</p>
            )}
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
