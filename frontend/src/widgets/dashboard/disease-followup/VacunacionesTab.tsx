import React, { useState } from 'react';
import { Syringe } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import type { VaccinationPayload } from './useDiseaseFollowup';
import type { FollowupVaccination } from './types';
import { EmptyList, InlineForm, PlusButton, SectionCard, inputClass, labelClass } from './DiseaseFollowupUi';

function VaccinationForm({
  onSubmit,
  onCancel,
  saving,
  defaultDate,
}: {
  onSubmit: (p: VaccinationPayload) => void;
  onCancel: () => void;
  saving: boolean;
  defaultDate: string;
}) {
  const [vaccination_date, setDate] = useState(defaultDate);
  const [vaccine_id, setVaccineId] = useState<number | ''>('');
  const [dosis, setDosis] = useState('');
  const [notes, setNotes] = useState('');
  const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  React.useEffect(() => {
    if (!optionsLoaded) {
      void (async () => {
        try {
          const { vaccinesService } = await import('@/entities/vaccine/api/vaccines.service');
          const res = await vaccinesService.getVaccines({ page: 1, limit: 500 });
          const items = (res as any)?.data || res || [];
          setVaccineOptions(
            (Array.isArray(items) ? items : []).map((v: any) => ({ value: Number(v.id), label: v.name || `Vacuna #${v.id}` }))
          );
        } catch {
          /* silencioso: el operador puede teclear vacuna inexistente solo si hay opciones vacías */
        } finally {
          setOptionsLoaded(true);
        }
      })();
    }
  }, [optionsLoaded]);

  const submit = () => {
    if (!vaccine_id) return;
    onSubmit({ vaccination_date, vaccine_id: Number(vaccine_id), dosis: dosis || undefined, notes: notes || undefined });
  };

  return (
    <InlineForm title="Registrar vacunación vinculada al caso" saving={saving} onSubmit={submit} onCancel={onCancel}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Vacuna *</label>
          <select value={vaccine_id} onChange={(e) => setVaccineId(Number(e.target.value))} className={cn(inputClass, 'cursor-pointer')}>
            <option value="">Seleccionar vacuna</option>
            {vaccineOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha *</label>
          <input type="date" value={vaccination_date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Dosis</label>
          <input placeholder="Ej: 2 ml SC" value={dosis} onChange={(e) => setDosis(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>Notas</label>
          <textarea rows={2} placeholder="Lote, motor de la aplicación…" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
      </div>
    </InlineForm>
  );
}

interface VacunacionesTabProps {
  vaccinations: FollowupVaccination[];
  defaultDate: string;
  saving: boolean;
  showForm: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmit: (p: VaccinationPayload) => void;
}

export function VacunacionesTab({
  vaccinations,
  defaultDate,
  saving,
  showForm,
  onShowForm,
  onCancelForm,
  onSubmit,
}: VacunacionesTabProps) {
  return (
    <SectionCard
      title={<>Vacunas del caso ({vaccinations.length || 0})</>}
      actions={!showForm && <PlusButton onClick={onShowForm} label="Registrar vacuna" />}
    >
      {showForm && (
        <VaccinationForm
          defaultDate={defaultDate}
          onCancel={onCancelForm}
          onSubmit={onSubmit}
          saving={saving}
        />
      )}
      {vaccinations.length === 0 && (
        <EmptyList message="Sin vacunaciones vinculadas a este caso." />
      )}
      {vaccinations.map((v) => (
        <div
          key={v.id}
          className="p-2.5 rounded-lg bg-background/70 dark:bg-card/50 border border-border/50 flex items-start gap-2.5"
        >
          <Syringe className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold">{v.vaccination_date}</span>
              <span className="text-xs font-semibold">
                {v.vaccine_name || `Vacuna #${v.vaccine_id}`}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
              {v.dosis && <span>Dosis: {v.dosis}</span>}
              {v.batch_number && <span>Lote: {v.batch_number}</span>}
            </div>
            {v.notes && (
              <p className="text-[11px] italic text-muted-foreground mt-1 fit-clamp">«{v.notes}»</p>
            )}
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
