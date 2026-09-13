import { useEffect, useState } from 'react';
import { Eye, Link2, Loader2 } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { treatmentProtocolsService } from '@/entities/treatment-protocol/api/treatmentProtocols.service';
import { TreatmentDetailModalContent } from '@/widgets/dashboard/treatments/TreatmentDetailModalContent';
import type { TreatmentPayload } from './useDiseaseFollowup';
import type { FollowupTreatment } from './types';
import { EmptyList, InlineForm, PlusButton, SectionCard, inputClass, labelClass } from './DiseaseFollowupUi';

/** Tratamiento del historial de la res que aún puede vincularse a este episodio. */
interface TreatmentHistoryOption {
  id: number;
  animal_id?: number;
  description?: string;
  treatment_date?: string;
  dosis?: string;
  frequency?: string;
  observations?: string | null;
  cost?: number | string | null;
  animal_disease_id?: number | null;
}

/** Protocolo del catálogo (base de conocimiento) sugerido para la enfermedad. */
interface ProtocolSuggestion {
  id: number;
  name?: string;
  description?: string;
  default_dosis?: string;
  default_frequency?: string;
}

function toArray(res: any): any[] {
  if (Array.isArray(res)) return res;
  const data = res?.data ?? res?.items ?? res?.results;
  return Array.isArray(data) ? data : [];
}

function buildHistoryLabel(t: TreatmentHistoryOption): string {
  const desc = t.description || `Tratamiento #${t.id}`;
  const date = t.treatment_date ? ` · ${String(t.treatment_date).slice(0, 10)}` : '';
  const dosis = t.dosis ? ` · ${t.dosis}` : '';
  return `${desc}${date}${dosis}`;
}

/** Ficha rica de un tratamiento ya registrado, en un modal propio. */
function TreatmentDetailDialog({
  treatment,
  animal,
  onClose,
  zIndex,
}: {
  treatment: FollowupTreatment | null;
  animal?: { id?: number | string; record?: string } | null;
  onClose: () => void;
  zIndex: number;
}) {
  const animalId = animal?.id;
  const treatId = treatment?.id;
  const [full, setFull] = useState<any>(null);
  const [animalTreatments, setAnimalTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!treatId) return;
    let mounted = true;
    setLoading(true);
    setFull(null);
    setAnimalTreatments([]);
    void (async () => {
      try {
        const [detailRes, listRes] = await Promise.all([
          treatmentsService.getTreatmentById(String(treatId)).catch(() => null),
          animalId != null
            ? treatmentsService
                .getTreatments({ animal_id: Number(animalId), page: 1, limit: 200 })
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!mounted) return;
        if (detailRes) setFull(detailRes);
        const items = listRes ? toArray(listRes) : [];
        if (items.length > 0) setAnimalTreatments(items);
      } catch {
        /* sin datos: se muestra el estado vacío */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [treatId, animalId]);

  return (
    <GenericModal
      isOpen={!!treatment}
      onOpenChange={(open) => !open && onClose()}
      title="Detalle del tratamiento"
      subtitle={treatment ? `Tratamiento #${treatment.id} del caso clínico` : undefined}
      size="4xl"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      themeColor="purple"
      className="bg-card text-card-foreground border-border shadow-lg max-h-[92vh] overflow-hidden"
      zIndex={zIndex}
    >
      <div className="max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
        {loading && !full ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando detalle…
          </div>
        ) : full ? (
          <TreatmentDetailModalContent
            treatment={full}
            animal={animal}
            animalTreatments={animalTreatments}
          />
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            No se pudo cargar el detalle de este tratamiento.
          </div>
        )}
      </div>
    </GenericModal>
  );
}

function TreatmentForm({
  onSubmit,
  onLinkExisting,
  onApplyProtocol,
  onCancel,
  saving,
  defaultDate,
  episodeId,
  animalId,
  diseaseId,
  currentIds,
}: {
  onSubmit: (p: TreatmentPayload) => void;
  onLinkExisting?: (t: TreatmentHistoryOption) => void;
  onApplyProtocol?: (protocolId: number | string) => void | Promise<unknown>;
  onCancel: () => void;
  saving: boolean;
  defaultDate: string;
  episodeId?: number | string | null;
  animalId?: number | null;
  diseaseId?: number | string | null;
  currentIds: (number | string)[];
}) {
  const [treatment_date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState('');
  const [dosis, setDosis] = useState('');
  const [frequency, setFrequency] = useState('');
  const [observations, setObservations] = useState('');
  const [cost, setCost] = useState('');
  const [selection, setSelection] = useState<string>('');

  const [candidates, setCandidates] = useState<TreatmentHistoryOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesLoadedFor, setCandidatesLoadedFor] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<ProtocolSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsLoadedFor, setSuggestionsLoadedFor] = useState<string | null>(null);

  const canLinkExisting = typeof onLinkExisting === 'function' && !!animalId;
  const canSuggestProtocols = typeof onApplyProtocol === 'function' && !!diseaseId;

  useEffect(() => {
    if (!canSuggestProtocols) return;
    const key = String(diseaseId);
    if (suggestionsLoadedFor === key) return;
    let mounted = true;
    setLoadingSuggestions(true);
    void (async () => {
      try {
        const res = await treatmentProtocolsService.getProtocols({
          disease_id: Number(diseaseId),
          page: 1,
          limit: 50,
        });
        if (!mounted) return;
        const rows = toArray(res);
        const excluded = new Set(currentIds.map((id) => String(id)));
        setSuggestions(
          (rows as ProtocolSuggestion[]).filter((p) => p?.id != null && !excluded.has(String(p.id))),
        );
      } catch {
        /* sin sugerencias: se deja el registro manual */
      } finally {
        if (mounted) {
          setSuggestionsLoadedFor(key);
          setLoadingSuggestions(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [canSuggestProtocols, diseaseId, suggestionsLoadedFor, currentIds]);

  useEffect(() => {
    if (!canLinkExisting) return;
    const key = String(animalId);
    if (candidatesLoadedFor === key) return;
    let mounted = true;
    setLoadingCandidates(true);
    void (async () => {
      try {
        const res = await treatmentsService.getTreatments({ animal_id: Number(animalId), page: 1, limit: 200 });
        const excluded = new Set(currentIds.map((id) => String(id)));
        const episodeNum = episodeId != null ? Number(episodeId) : null;
        const available = toArray(res).filter((it) => {
          if (it == null || it.id == null) return false;
          if (excluded.has(String(it.id))) return false;
          if (it.animal_disease_id != null && String(it.animal_disease_id).trim() !== '' && Number(it.animal_disease_id) !== episodeNum) return false;
          return true;
        });
        if (!mounted) return;
        setCandidates(available as TreatmentHistoryOption[]);
      } catch {
        /* sin opciones: se mantiene el registro manual */
      } finally {
        if (mounted) {
          setCandidatesLoadedFor(key);
          setLoadingCandidates(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [animalId, canLinkExisting, candidatesLoadedFor, currentIds, episodeId]);

  const selectedCandidate =
    selection !== '' ? candidates.find((c) => String(c.id) === selection) || null : null;

  const submit = () => {
    if (selectedCandidate && onLinkExisting) {
      onLinkExisting(selectedCandidate);
      return;
    }
    if (!description.trim() || !dosis.trim() || !frequency.trim()) return;
    onSubmit({
      treatment_date,
      description: description.trim(),
      dosis: dosis.trim(),
      frequency: frequency.trim(),
      observations: observations || undefined,
      cost: cost ? Number(cost) : null,
    });
  };

  return (
    <InlineForm
      title={
        selectedCandidate
          ? 'Vincular tratamiento ya registrado a este caso'
          : 'Registrar tratamiento para este caso'
      }
      saving={saving}
      onSubmit={submit}
      onCancel={onCancel}
    >
      {canSuggestProtocols && suggestions.length > 0 && (
        <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 p-2.5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            💡 Protocolos sugeridos para esta enfermedad
          </p>
          {suggestions.map((p) => (
            <div
              key={p.id}
              className="rounded-lg bg-background/70 dark:bg-card/60 border border-border/60 p-2 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{p.name || `Protocolo #${p.id}`}</p>
                <p className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                  {p.default_dosis && <span>Dosis: {p.default_dosis}</span>}
                  {p.default_frequency && <span>Frecuencia: {p.default_frequency}</span>}
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                disabled={saving}
                onClick={() => onApplyProtocol?.(p.id)}
                className="h-8 px-3 rounded-lg text-xs font-bold shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Aplicar
              </Button>
            </div>
          ))}
        </div>
      )}
      {canSuggestProtocols && loadingSuggestions && (
        <p className="text-[11px] italic text-muted-foreground flex items-center gap-1.5 ml-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Buscando protocolos recomendados…
        </p>
      )}
      {canLinkExisting && (
        <div className="space-y-1.5">
          <label className={labelClass}>Tratamiento</label>
          <select
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            className={cn(inputClass, 'cursor-pointer')}
          >
            <option value="">+ Registrar tratamiento nuevo…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {buildHistoryLabel(c)}
              </option>
            ))}
          </select>
          {loadingCandidates && (
            <p className="text-[11px] italic text-muted-foreground flex items-center gap-1.5 ml-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando tratamientos de la res…
            </p>
          )}
          {!loadingCandidates && candidates.length === 0 && (
            <p className="text-[11px] italic text-muted-foreground ml-1">
              La res no tiene tratamientos previos sin caso clínico: se registrará uno nuevo.
            </p>
          )}
        </div>
      )}

      {selectedCandidate ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 space-y-1">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            {selectedCandidate.description || `Tratamiento #${selectedCandidate.id}`}
          </p>
          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
            {selectedCandidate.treatment_date && <span>Fecha: {String(selectedCandidate.treatment_date).slice(0, 10)}</span>}
            {selectedCandidate.dosis && <span>Dosis: {selectedCandidate.dosis}</span>}
            {selectedCandidate.frequency && <span>Frecuencia: {selectedCandidate.frequency}</span>}
          </div>
          <p className="text-[11px] italic text-muted-foreground pt-0.5">
            El registro del historial se vinculará a este caso (no se crea uno duplicado).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Fecha *</label>
            <input type="date" value={treatment_date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Tratamiento / descripción *</label>
            <input placeholder="Ej: Antibiótico IM por mastitis" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Dosis *</label>
            <input placeholder="Ej: 5 ml IM" value={dosis} onChange={(e) => setDosis(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Frecuencia *</label>
            <input placeholder="Ej: Diario 3 días" value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Costo (COP)</label>
            <input type="number" min="0" placeholder="Ej: 25000" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>Observaciones</label>
            <textarea rows={2} placeholder="Detalles de la aplicación…" value={observations} onChange={(e) => setObservations(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}
    </InlineForm>
  );
}

interface TratamientosTabProps {
  treatments: FollowupTreatment[];
  defaultDate: string;
  saving: boolean;
  showForm: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmit: (p: TreatmentPayload) => void;
  onLinkExisting?: (t: TreatmentHistoryOption) => void;
  onApplyProtocol?: (protocolId: number | string) => void | Promise<unknown>;
  episodeId?: number | string | null;
  animalId?: number | null;
  diseaseId?: number | string | null;
  animal?: { id?: number | string; record?: string } | null;
  detailZIndex?: number;
}

export function TratamientosTab({
  treatments,
  defaultDate,
  saving,
  showForm,
  onShowForm,
  onCancelForm,
  onSubmit,
  onLinkExisting,
  onApplyProtocol,
  episodeId,
  animalId,
  diseaseId,
  animal,
  detailZIndex = 2400,
}: TratamientosTabProps) {
  const [detailTreatment, setDetailTreatment] = useState<FollowupTreatment | null>(null);

  return (
    <>
      <SectionCard
        title={<>Tratamientos del caso ({treatments.length || 0})</>}
        actions={!showForm && <PlusButton onClick={onShowForm} label="Registrar tratamiento" />}
      >
        {showForm && (
          <TreatmentForm
            defaultDate={defaultDate}
            onCancel={onCancelForm}
            onSubmit={onSubmit}
            onLinkExisting={onLinkExisting}
            onApplyProtocol={onApplyProtocol}
            saving={saving}
            episodeId={episodeId}
            animalId={animalId}
            diseaseId={diseaseId}
            currentIds={treatments.map((t) => t.id)}
          />
        )}
        {treatments.length === 0 && (
          <EmptyList message="Sin tratamientos registrados para este caso." />
        )}
        {treatments.map((t) => (
          <div
            key={t.id}
            className="p-2.5 rounded-lg bg-background/70 dark:bg-card/50 border border-border/50 flex items-start gap-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold">{t.treatment_date}</span>
                <span className="text-xs font-semibold">{t.description}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                {t.dosis && <span>Dosis: {t.dosis}</span>}
                {t.frequency && <span>Frecuencia: {t.frequency}</span>}
                {t.cost != null && <span>Costo: ${t.cost.toLocaleString('es-CO')}</span>}
              </div>
              {t.medications.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {t.medications.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-[11px] font-semibold"
                    >
                      💊 {m.name || 'Medicamento'}
                      {m.quantity != null ? ` × ${m.quantity}` : ''}
                    </span>
                  ))}
                  {t.vaccines.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold"
                    >
                      💉 {v.name || 'Vacuna'}
                    </span>
                  ))}
                </div>
              )}
              {t.observations && (
                <p className="text-[11px] italic text-muted-foreground mt-1 fit-clamp">
                  «{t.observations}»
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailTreatment(t)}
              className="h-6.5 w-6.5 p-0 rounded-md text-muted-foreground hover:text-foreground shrink-0"
              title="Ver ficha completa del tratamiento"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </SectionCard>

      <TreatmentDetailDialog
        treatment={detailTreatment}
        animal={animal}
        onClose={() => setDetailTreatment(null)}
        zIndex={detailZIndex}
      />
    </>
  );
}

export type { TreatmentHistoryOption };
