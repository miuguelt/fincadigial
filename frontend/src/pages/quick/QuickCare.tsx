import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FlaskConical, HeartPulse, Pill, Scale, Syringe } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalsService } from '@/entities/animal/api/animal.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { treatmentProtocolsService } from '@/entities/treatment-protocol/api/treatmentProtocols.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { controlService } from '@/entities/control/api/control.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';
import {
  QuickFormShell,
  QCard,
  QField,
  QLabel,
  QInput,
  QSelect,
  QChipGroup,
  QSubmitButton,
  QNumberStepper,
} from './QuickFormShell';

const MOTIVES: { label: string; value: string }[] = [
  { label: 'Enfermedad', value: 'disease' },
  { label: 'Tratamiento', value: 'treatment' },
  { label: 'Vacuna', value: 'vaccine' },
  { label: 'Pesaje', value: 'control' },
];

const SEVERITIES: { label: string; value: string }[] = [
  { label: 'Leve', value: 'Leve' },
  { label: 'Moderada', value: 'Moderada' },
  { label: 'Severa', value: 'Severa' },
  { label: 'Crítica', value: 'Crítica' },
];

const HEALTH_OPTIONS: { label: string; value: string }[] = [
  { label: 'Sano', value: 'Sano' },
  { label: 'Bueno', value: 'Bueno' },
  { label: 'Regular', value: 'Regular' },
  { label: 'En Tratamiento', value: 'Malo' },
];

const TREAT_MODES: { label: string; value: string }[] = [
  { label: 'Desde protocolo', value: 'protocol' },
  { label: 'Manual', value: 'manual' },
];

function listOf(res: any): any[] {
  if (Array.isArray(res)) return res;
  const data = res?.data ?? res?.items ?? res?.results;
  return Array.isArray(data) ? data : [];
}

export default function QuickCare() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();
  const submitInFlightRef = useRef(false);

  const handleClose = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('quick');
    setSearchParams(next, { replace: true });
  };

  const [animalId, setAnimalId] = useState('');
  const [motive, setMotive] = useState('disease');
  const [date] = useState(getTodayColombia());
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [animalOptions, setAnimalOptions] = useState<{ value: string; label: string }[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<{ value: string; label: string }[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<{ value: string; label: string }[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);

  const [diseaseId, setDiseaseId] = useState('');
  const [severity, setSeverity] = useState('Moderada');
  const [notes, setNotes] = useState('');
  const [episodeId, setEpisodeId] = useState<string | number | null>(null);
  const [diseaseName, setDiseaseName] = useState('');
  const [appliedProtocols, setAppliedProtocols] = useState<Set<string>>(new Set());

  const [treatMode, setTreatMode] = useState('protocol');
  const [protocolId, setProtocolId] = useState('');
  const [tDescription, setTDescription] = useState('');
  const [tDosis, setTDosis] = useState('');
  const [tFrequency, setTFrequency] = useState('');

  const [vaccineId, setVaccineId] = useState('');
  const [vDosis, setVDosis] = useState('');
  const [vNotes, setVNotes] = useState('');

  const [weight, setWeight] = useState('');
  const [healthStatus, setHealthStatus] = useState('Sano');

  const selectedProtocol = useMemo(
    () => protocols.find((p) => String(p.id) === protocolId) || null,
    [protocols, protocolId],
  );
  const suggestedProtocols = useMemo(
    () => protocols.filter((p) => p.disease_id != null && String(p.disease_id) === String(diseaseId)),
    [protocols, diseaseId],
  );

  useEffect(() => {
    async function loadData(force = false) {
      try {
        const bust = force ? Date.now() : undefined;
        const [animalsResp, diseasesResp, vaccinesResp, protocolsResp] = await Promise.all([
          animalsService.getAnimals({ limit: 200, status: 'Vivo', cache_bust: bust }),
          diseaseService.getDiseases({ limit: 100, cache_bust: bust }),
          vaccinesService.getVaccines({ limit: 500 }),
          treatmentProtocolsService.getProtocols({ limit: 200, cache_bust: bust }).catch(() => ({ data: [] })),
        ]);
        const animals = listOf(animalsResp);
        const diseases = listOf(diseasesResp);
        const vaccines = listOf(vaccinesResp);
        setAnimalOptions(
          animals.map((a: any) => ({
            value: String(a.id),
            label: `${a.record}${a.breed?.name ? ` — ${a.breed.name}` : ''}`,
          })),
        );
        setDiseaseOptions(
          diseases.map((d: any) => ({
            value: String(d.id),
            label: d.disease || d.name || `Enfermedad ${d.id}`,
          })),
        );
        setVaccineOptions(
          vaccines.map((v: any) => ({ value: String(v.id), label: v.name || `Vacuna ${v.id}` })),
        );
        const protos = listOf(protocolsResp);
        setProtocols(protos);
        if (protos.length === 0) setTreatMode('manual');
      } catch (error) {
        console.error('Error cargando catálogos de atención:', error);
        showToast('Error al cargar los datos de la finca', 'error');
      } finally {
        setCargando(false);
      }
    }
    void loadData(true);

    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const resource = String(detail?.resource || detail?.endpoint || '').toLowerCase();
      if (!resource || ['animal', 'disease', 'treatment', 'vaccine'].some((k) => resource.includes(k))) {
        void loadData(true);
      }
    };
    window.addEventListener('crud:refetch', handleRefresh);
    window.addEventListener('server-resource-changed', handleRefresh);
    return () => {
      window.removeEventListener('crud:refetch', handleRefresh);
      window.removeEventListener('server-resource-changed', handleRefresh);
    };
  }, [showToast]);

  const requireAnimal = (): boolean => {
    if (animalId) return true;
    showToast('Primero elige la res a atender', 'error');
    return false;
  };

  const submitDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAnimal()) return;
    if (!diseaseId) {
      showToast('Selecciona la enfermedad o síntoma', 'error');
      return;
    }
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      disease_id: Number(diseaseId),
      diagnosis_date: date,
      status: 'Activo',
      severity,
      notes: notes || undefined,
      instructor_id: user?.id || 0,
    };
    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'animal-diseases', payload);
        showToast('Diagnóstico guardado sin señal. Se sincronizará al volver.', 'success');
        handleClose();
      } else {
        const resp = await animalDiseasesService.createAnimalDisease(payload);
        const episode: any = (resp as any)?.data ?? resp;
        const id = episode?.id ?? episode?.record_id ?? null;
        const label =
          diseaseOptions.find((d) => String(d.value) === String(diseaseId))?.label || 'la enfermedad';
        setEpisodeId(id);
        setDiseaseName(label);
        emitDataRefresh('animal-diseases');
        showToast(
          id
            ? 'Diagnóstico registrado. Puedes aplicar un protocolo sugerido:'
            : 'Diagnóstico registrado exitosamente',
          'success',
        );
      }
    } catch (error) {
      console.error('Error registrando enfermedad:', error);
      showToast('Error al registrar la enfermedad', 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const applyProtocol = async (id: number | string, withEpisode: boolean) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    try {
      await treatmentProtocolsService.applyProtocol(String(id), {
        animal_id: Number(animalId),
        ...(withEpisode && episodeId != null ? { animal_disease_id: Number(episodeId) } : {}),
      });
      setAppliedProtocols((prev) => new Set(prev).add(String(id)));
      emitDataRefresh('treatments');
      showToast('Tratamiento aplicado a la res', 'success');
    } catch (error) {
      console.error('Error aplicando protocolo:', error);
      showToast('No se pudo aplicar el protocolo (revisa la conexión)', 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const submitTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAnimal()) return;
    if (submitInFlightRef.current) return;
    if (treatMode === 'protocol' && !isOnline) {
      showToast('Sin señal debes usar el modo manual; luego se sincroniza.', 'warning');
      return;
    }
    if (treatMode === 'protocol' && !selectedProtocol) {
      showToast('Elige un protocolo del catálogo', 'error');
      return;
    }
    if (treatMode === 'manual' && (!tDescription.trim() || !tDosis.trim() || !tFrequency.trim())) {
      showToast('Completa descripción, dosis y frecuencia', 'error');
      return;
    }

    submitInFlightRef.current = true;
    setLoading(true);
    try {
      if (treatMode === 'protocol') {
        await applyProtocol(selectedProtocol.id, false);
      } else {
        const payload = {
          animal_id: Number(animalId),
          treatment_date: date,
          description: tDescription.trim(),
          dosis: tDosis.trim(),
          frequency: tFrequency.trim(),
          observations: notes.trim() || undefined,
        };
        if (!isOnline) {
          await offlineQueue.enqueue('POST', 'treatments', payload);
          showToast('Tratamiento guardado sin señal. Se sincronizará al volver.', 'success');
        } else {
          await treatmentsService.createTreatment(payload as any);
          emitDataRefresh('treatments');
          showToast('Tratamiento registrado exitosamente', 'success');
        }
      }
      handleClose();
    } catch (error) {
      console.error('Error registrando tratamiento:', error);
      showToast('Error al registrar el tratamiento', 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const submitVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAnimal()) return;
    if (!vaccineId) {
      showToast('Selecciona la vacuna o biológico', 'error');
      return;
    }
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      vaccine_id: Number(vaccineId),
      vaccination_date: date,
      dosis: vDosis.trim() || undefined,
      notes: vNotes.trim() || undefined,
    };
    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'vaccinations', payload);
        showToast('Vacunación guardada sin señal. Se sincronizará al volver.', 'success');
      } else {
        await vaccinationsService.createVaccination(payload as any);
        emitDataRefresh('vaccinations');
        showToast('Vacunación registrada exitosamente', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Error registrando vacunación:', error);
      showToast('Error al registrar la vacunación', 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const submitControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAnimal()) return;
    if (!weight) {
      showToast('Digita el peso de la res', 'error');
      return;
    }
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    const payload = {
      animal_id: Number(animalId),
      checkup_date: date,
      weight: parseInt(weight, 10),
      health_status: healthStatus as any,
    };
    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'control', payload);
        showToast('Control guardado sin señal. Se sincronizará al volver.', 'success');
      } else {
        await controlService.createControl(payload as any);
        emitDataRefresh('control');
        showToast('Control de pesaje registrado', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Error registrando control:', error);
      showToast('Error al registrar el control', 'error');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    if (motive === 'disease') void submitDisease(e);
    else if (motive === 'treatment') void submitTreatment(e);
    else if (motive === 'vaccine') void submitVaccine(e);
    else void submitControl(e);
  };

  const headerIcon =
    motive === 'disease' ? HeartPulse : motive === 'treatment' ? FlaskConical : motive === 'vaccine' ? Syringe : Scale;
  const headerColor =
    motive === 'disease'
      ? 'bg-rose-600'
      : motive === 'treatment'
        ? 'bg-purple-600'
        : motive === 'vaccine'
          ? 'bg-sky-600'
          : 'bg-emerald-600';
  const submitLabel =
    motive === 'disease'
      ? 'Registrar diagnóstico'
      : motive === 'treatment'
        ? treatMode === 'protocol'
          ? 'Aplicar tratamiento'
          : 'Registrar tratamiento'
        : motive === 'vaccine'
          ? 'Registrar vacunación'
          : 'Registrar control';

  return (
    <QuickFormShell titulo="Atender una res" icon={headerIcon} colorHeader={headerColor}>
      <form onSubmit={submit} className="space-y-4">
        <QCard>
          <QField>
            <QLabel htmlFor="animal">1 · ¿Qué res vas a atender?</QLabel>
            <QSelect
              id="animal"
              value={animalId}
              onChange={setAnimalId}
              placeholder={cargando ? 'Cargando reses…' : '— Selecciona la res —'}
              options={animalOptions}
              disabled={cargando || loading}
            />
          </QField>
        </QCard>

        <QCard>
          <QField>
            <QLabel>2 · ¿Qué vas a hacer?</QLabel>
            <QChipGroup value={motive} options={MOTIVES} onChange={setMotive} />
          </QField>
        </QCard>

        {!isOnline && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Sin señal: el registro se guardará en este equipo y se sincronizará al volver la conexión.</span>
          </div>
        )}

        {motive === 'disease' && (
          <>
            <QCard>
              <QField>
                <QLabel htmlFor="disease">Enfermedad o síntoma diagnosticado</QLabel>
                <QSelect
                  id="disease"
                  value={diseaseId}
                  onChange={setDiseaseId}
                  placeholder={cargando ? 'Cargando catálogo…' : '— Selecciona la enfermedad —'}
                  options={diseaseOptions}
                  disabled={cargando || loading}
                />
              </QField>
              <QField>
                <QLabel>Gravedad</QLabel>
                <QChipGroup value={severity} options={SEVERITIES} onChange={setSeverity} />
              </QField>
              <QField>
                <QLabel htmlFor="notes">Observaciones (opcional)</QLabel>
                <QInput
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Ubre caliente, fiebre…"
                  disabled={loading}
                />
              </QField>
            </QCard>

            {episodeId != null && suggestedProtocols.length > 0 && (
              <QCard>
                <QField>
                  <QLabel>Protocolo sugerido para {diseaseName || 'esta enfermedad'}</QLabel>
                  <div className="space-y-2">
                    {suggestedProtocols.map((p) => {
                      const done = appliedProtocols.has(String(p.id));
                      return (
                        <div
                          key={p.id}
                          className="rounded-lg border border-border/60 bg-background/70 p-2.5 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-foreground">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {p.default_dosis ? `Dosis: ${p.default_dosis}` : ''}
                              {p.default_dosis && p.default_frequency ? ' · ' : ''}
                              {p.default_frequency ? `Frec: ${p.default_frequency}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={done || loading}
                            onClick={() => void applyProtocol(p.id, true)}
                            className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-bold text-white transition-all ${
                              done ? 'bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'
                            } disabled:opacity-60`}
                          >
                            {done ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Aplicado
                              </span>
                            ) : (
                              'Aplicar'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] italic text-muted-foreground">
                    El tratamiento quedará ligado al caso para su seguimiento.
                  </p>
                </QField>
              </QCard>
            )}
          </>
        )}

        {motive === 'treatment' && (
          <>
            <QCard>
              <QField>
                <QLabel>Modo de registro</QLabel>
                <QChipGroup value={treatMode} options={TREAT_MODES} onChange={setTreatMode} />
              </QField>
            </QCard>

            {treatMode === 'protocol' && (
              <QCard>
                <QField>
                  <QLabel htmlFor="protocol">Protocolo del botiquín de conocimiento</QLabel>
                  <QSelect
                    id="protocol"
                    value={protocolId}
                    onChange={setProtocolId}
                    placeholder={protocols.length === 0 ? 'No hay protocolos en la finca' : '— Elige el protocolo —'}
                    options={protocols.map((p) => ({
                      value: String(p.id),
                      label: `${p.name}${p.default_dosis ? ` · ${p.default_dosis}` : ''}`,
                    }))}
                    disabled={cargando || loading || protocols.length === 0}
                  />
                </QField>
                {selectedProtocol && (
                  <div className="rounded-lg border border-purple-500/25 bg-purple-500/10 p-2.5 space-y-1">
                    <p className="text-[12px] font-bold text-foreground">{selectedProtocol.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Dosis: {selectedProtocol.default_dosis || 'Según protocolo'} · Frecuencia:{' '}
                      {selectedProtocol.default_frequency || 'Según protocolo'}
                    </p>
                    {Number(selectedProtocol.withdrawal_days) > 0 && (
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        ⚠ Retiro de {selectedProtocol.withdrawal_days} días (leche/carne)
                      </p>
                    )}
                  </div>
                )}
                {protocols.length === 0 && (
                  <p className="text-[11px] italic text-muted-foreground">
                    Tu finca aún no tiene protocolos: usa el modo manual o créalos en el menú de protocolos.
                  </p>
                )}
              </QCard>
            )}

            {treatMode === 'manual' && (
              <QCard>
                <QField>
                  <QLabel htmlFor="td">Qué se aplica</QLabel>
                  <QInput
                    id="td"
                    type="text"
                    value={tDescription}
                    onChange={(e) => setTDescription(e.target.value)}
                    placeholder="Ej: Oxitetraciclina intramamaria"
                    disabled={loading}
                  />
                </QField>
                <QField>
                  <QLabel htmlFor="tdosis">Dosis</QLabel>
                  <QInput
                    id="tdosis"
                    type="text"
                    value={tDosis}
                    onChange={(e) => setTDosis(e.target.value)}
                    placeholder="Ej: 10 ml por cuarto"
                    disabled={loading}
                  />
                </QField>
                <QField>
                  <QLabel htmlFor="tfreq">Frecuencia</QLabel>
                  <QInput
                    id="tfreq"
                    type="text"
                    value={tFrequency}
                    onChange={(e) => setTFrequency(e.target.value)}
                    placeholder="Ej: Cada 12 h por 5 días"
                    disabled={loading}
                  />
                </QField>
              </QCard>
            )}
          </>
        )}

        {motive === 'vaccine' && (
          <QCard>
            <QField>
              <QLabel htmlFor="vaccine">Vacuna o biológico</QLabel>
              <QSelect
                id="vaccine"
                value={vaccineId}
                onChange={setVaccineId}
                placeholder={cargando ? 'Cargando vacunas…' : '— Selecciona la vacuna —'}
                options={vaccineOptions}
                disabled={cargando || loading}
              />
            </QField>
            <QField>
              <QLabel htmlFor="vdosis">Dosis (opcional)</QLabel>
              <QInput
                id="vdosis"
                type="text"
                value={vDosis}
                onChange={(e) => setVDosis(e.target.value)}
                placeholder="Ej: 2 ml SC"
                disabled={loading}
              />
            </QField>
            <QField>
              <QLabel htmlFor="vnotes">Notas (opcional)</QLabel>
              <QInput
                id="vnotes"
                type="text"
                value={vNotes}
                onChange={(e) => setVNotes(e.target.value)}
                placeholder="Lote, observaciones…"
                disabled={loading}
              />
            </QField>
          </QCard>
        )}

        {motive === 'control' && (
          <QCard>
            <QField>
              <QLabel htmlFor="weight">Peso en báscula (kg)</QLabel>
              <QNumberStepper
                id="weight"
                value={weight}
                onChange={setWeight}
                unit="kg"
                min={0}
                max={2000}
                step={1}
                presets={[5, 10, 25, 50]}
                placeholder="0"
                disabled={loading}
              />
            </QField>
            <QField>
              <QLabel>Estado de salud</QLabel>
              <QChipGroup value={healthStatus} options={HEALTH_OPTIONS} onChange={setHealthStatus} />
            </QField>
          </QCard>
        )}

        <QSubmitButton loading={loading} color={headerColor}>
          <span className="inline-flex items-center gap-2">
            {motive === 'disease' ? <HeartPulse className="h-4 w-4" /> : null}
            {motive === 'treatment' ? (treatMode === 'protocol' ? <FlaskConical className="h-4 w-4" /> : <Pill className="h-4 w-4" />) : null}
            {motive === 'vaccine' ? <Syringe className="h-4 w-4" /> : null}
            {motive === 'control' ? <Scale className="h-4 w-4" /> : null}
            {submitLabel}
          </span>
        </QSubmitButton>

        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="w-full rounded-lg py-2 text-center text-[13px] font-semibold text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Cerrar sin guardar
        </button>
      </form>
    </QuickFormShell>
  );
}
