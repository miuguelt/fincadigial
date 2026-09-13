import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import type { RecommendationPayload } from './useDiseaseFollowup';
import type { FollowupRecommendation } from './types';
import { EmptyList, InlineForm, PlusButton, SectionCard, inputClass, labelClass } from './DiseaseFollowupUi';

function RecommendationForm({
  onSubmit,
  onCancel,
  saving,
  defaultStart,
}: {
  onSubmit: (p: RecommendationPayload) => void;
  onCancel: () => void;
  saving: boolean;
  defaultStart: string;
}) {
  const [title, setTitle] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [responsible, setResponsible] = useState('');
  const [start_date, setStartDate] = useState(defaultStart);
  const [estimated_end_date, setEndDate] = useState('');
  const [duration_days, setDuration] = useState('7');
  const [control_interval_days, setInterval] = useState('2');

  const submit = () => {
    if (!title.trim() || !recommendation.trim() || !estimated_end_date) return;
    onSubmit({
      title: title.trim(),
      recommendation: recommendation.trim(),
      responsible: responsible.trim() || undefined,
      start_date,
      estimated_end_date,
      duration_days: Number(duration_days) || 1,
      control_interval_days: Number(control_interval_days) || 1,
    });
  };

  return (
    <InlineForm title="Nueva recomendación veterinaria" saving={saving} onSubmit={submit} onCancel={onCancel}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Título *</label>
          <input placeholder="Ej: Cambio de alimentación durante el tratamiento" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Recomendación *</label>
          <textarea rows={2} placeholder="Instrucciones al cuidador…" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Responsable</label>
          <input placeholder="Ej: Veterinario de la finca" value={responsible} onChange={(e) => setResponsible(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Inicio *</label>
            <input type="date" value={start_date} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fin estimado *</label>
            <input type="date" value={estimated_end_date} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Duración (días)</label>
            <input type="number" min="1" value={duration_days} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Control cada (días)</label>
            <input type="number" min="1" value={control_interval_days} onChange={(e) => setInterval(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </InlineForm>
  );
}

interface RecomendacionesTabProps {
  recommendations: FollowupRecommendation[];
  defaultStart: string;
  saving: boolean;
  showForm: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmit: (p: RecommendationPayload) => void;
}

export function RecomendacionesTab({
  recommendations,
  defaultStart,
  saving,
  showForm,
  onShowForm,
  onCancelForm,
  onSubmit,
}: RecomendacionesTabProps) {
  return (
    <SectionCard
      title={<>Recomendaciones del veterinario ({recommendations.length || 0})</>}
      actions={!showForm && <PlusButton onClick={onShowForm} label="Nueva recomendación" />}
    >
      {showForm && (
        <RecommendationForm
          defaultStart={defaultStart}
          onCancel={onCancelForm}
          onSubmit={onSubmit}
          saving={saving}
        />
      )}
      {recommendations.length === 0 && (
        <EmptyList message="Sin recomendaciones veterinarias para este caso." />
      )}
      {recommendations.map((r) => (
        <div
          key={r.id}
          className="p-2.5 rounded-lg bg-background/70 dark:bg-card/50 border border-border/50 flex items-start gap-2.5"
        >
          <ClipboardList className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold">{r.title}</span>
              <Badge variant="secondary" className="text-[11px] h-4">
                {r.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{r.recommendation}</p>
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
              <span>Del {r.start_date} al {r.estimated_end_date}</span>
              <span>Duración: {r.duration_days} días</span>
              <span>Control cada {r.control_interval_days} días</span>
              {r.responsible && <span>Responsable: {r.responsible}</span>}
            </div>
            {r.controls.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.controls.map((c) => (
                  <span
                    key={c.id}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-bold border',
                      c.completed
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    )}
                  >
                    {c.completed ? '✓ ' : '⏳ '}
                    {(c.control_date || c.scheduled_date).slice(0, 10)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
