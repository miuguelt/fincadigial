import { useState } from 'react';
import { cn } from '@/shared/ui/cn';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { ProgressPayload } from './useDiseaseFollowup';
import type { FollowupProgressEntry } from './types';
import { InlineForm, inputClass, labelClass } from './DiseaseFollowupUi';

export function ProgressForm({
  onSubmit,
  onCancel,
  saving,
  defaultStatus,
  initial,
  title = 'Nuevo avance clínico',
}: {
  onSubmit: (p: ProgressPayload) => void;
  onCancel: () => void;
  saving: boolean;
  defaultStatus: string;
  initial?: FollowupProgressEntry | null;
  title?: string;
}) {
  const [progress_date, setProgressDate] = useState(initial?.progress_date || getTodayColombia());
  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : '');
  const [temperature, setTemperature] = useState(
    initial?.temperature != null ? String(initial.temperature) : ''
  );
  const [status, setStatus] = useState(initial?.status || defaultStatus);
  const [observation, setObservation] = useState(initial?.observation || '');

  const submit = () => {
    onSubmit({
      progress_date,
      weight: weight ? Number(weight) : null,
      temperature: temperature ? Number(temperature) : null,
      status,
      observation: observation || undefined,
    });
  };

  return (
    <InlineForm title={title} saving={saving} onSubmit={submit} onCancel={onCancel}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className={labelClass}>Fecha *</label>
          <input type="date" value={progress_date} onChange={(e) => setProgressDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Peso (kg)</label>
          <input type="number" step="0.1" min="1" placeholder="Ej: 315" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Temperatura °C</label>
          <input type="number" step="0.1" min="1" placeholder="Ej: 39.5" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputClass, 'cursor-pointer')}>
            {['Activo', 'En tratamiento', 'Observación', 'Crónico', 'Recuperado', 'Tratado'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Observaciones</label>
        <textarea
          rows={2}
          placeholder="Síntomas, apetito, comportamiento…"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          className={inputClass}
        />
      </div>
    </InlineForm>
  );
}
