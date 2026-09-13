import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastContext';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalDiseaseProgressService } from '@/entities/animal-disease-progress/api/animalDiseaseProgress.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { treatmentProtocolsService } from '@/entities/treatment-protocol/api/treatmentProtocols.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { treatmentRecommendationsService } from '@/entities/treatment-recommendation/api/treatmentRecommendations.service';
import type { DiseaseFollowupData } from './types';

export interface ProgressPayload {
  progress_date: string;
  weight?: number | null;
  temperature?: number | null;
  status?: string;
  observation?: string;
  performed_by?: number | null;
}

export interface TreatmentPayload {
  treatment_date: string;
  description: string;
  frequency: string;
  dosis: string;
  observations?: string;
  cost?: number | string | null;
}

export interface VaccinationPayload {
  vaccination_date: string;
  vaccine_id: number;
  dosis?: string;
  notes?: string;
}

export interface RecommendationPayload {
  title: string;
  recommendation: string;
  responsible?: string;
  start_date: string;
  estimated_end_date: string;
  duration_days: number;
  control_interval_days: number;
}

export function useDiseaseFollowup(episodeId?: number | string | null) {
  const { showToast } = useToast();
  const [data, setData] = useState<DiseaseFollowupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!episodeId) return;
      setLoading(true);
      try {
        const payload = await animalDiseasesService.getFollowup(episodeId, force);
        const followup = payload?.data || payload;
        setData(followup || null);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar el seguimiento');
      } finally {
        setLoading(false);
      }
    },
    [episodeId]
  );

  useEffect(() => {
    if (episodeId) void refresh();
  }, [episodeId, refresh]);

  const safeError = useCallback(
    (e: any) => {
      const message =
        e?.response?.data?.message || e?.response?.data?.detail || e?.message;
      showToast(`⚠️ ${message || 'No se pudo guardar'}`, 'error');
    },
    [showToast]
  );

  const addProgress = useCallback(
    async (payload: ProgressPayload): Promise<boolean> => {
      if (!episodeId) return false;
      setSaving(true);
      try {
        await animalDiseaseProgressService.createProgress({
          animal_disease_id: Number(episodeId),
          ...payload,
        } as any);
        await animalDiseaseProgressService.clearCache();
        await refresh(true);
        showToast('Avance registrado correctamente', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const updateProgress = useCallback(
    async (progressId: number | string, payload: ProgressPayload): Promise<boolean> => {
      if (!episodeId) return false;
      setSaving(true);
      try {
        await animalDiseaseProgressService.updateProgress(String(progressId), payload as any);
        await animalDiseaseProgressService.clearCache();
        await refresh(true);
        showToast('Avance actualizado correctamente', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const deleteProgress = useCallback(
    async (progressId: number | string): Promise<boolean> => {
      if (!episodeId) return false;
      setSaving(true);
      try {
        await animalDiseaseProgressService.deleteProgress(String(progressId));
        await animalDiseaseProgressService.clearCache();
        await refresh(true);
        showToast('Avance eliminado', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const linkTreatment = useCallback(
    async (animalId: number | undefined, payload: TreatmentPayload): Promise<boolean> => {
      if (!episodeId || !animalId) return false;
      setSaving(true);
      try {
        await treatmentsService.createTreatment({
          animal_id: animalId,
          animal_disease_id: Number(episodeId),
          ...payload,
        } as any);
        await treatmentsService.clearCache();
        await refresh(true);
        showToast('Tratamiento vinculado al caso', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const linkExistingTreatment = useCallback(
    async (treatment: any): Promise<boolean> => {
      if (!episodeId || !treatment?.id) return false;
      setSaving(true);
      try {
        await treatmentsService.updateTreatment(String(treatment.id), {
          animal_id: treatment.animal_id,
          animal_disease_id: Number(episodeId),
          description: treatment.description,
          treatment_date: treatment.treatment_date,
          dosis: treatment.dosis,
          frequency: treatment.frequency,
          observations: treatment.observations ?? undefined,
          cost: treatment.cost ?? null,
        } as any);
        await treatmentsService.clearCache();
        await refresh(true);
        showToast('Tratamiento vinculado al caso', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const linkVaccination = useCallback(
    async (animalId: number | undefined, payload: VaccinationPayload): Promise<boolean> => {
      if (!episodeId || !animalId) return false;
      setSaving(true);
      try {
        await vaccinationsService.createVaccination({
          animal_id: animalId,
          animal_disease_id: Number(episodeId),
          ...payload,
        } as any);
        await vaccinationsService.clearCache();
        await refresh(true);
        showToast('Vacunación vinculada al caso', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const linkRecommendation = useCallback(
    async (animalId: number | undefined, payload: RecommendationPayload): Promise<boolean> => {
      if (!episodeId || !animalId) return false;
      setSaving(true);
      try {
        await treatmentRecommendationsService.createRecommendation({
          animal_id: animalId,
          animal_disease_id: Number(episodeId),
          status: 'en_curso',
          ...payload,
        } as any);
        await treatmentRecommendationsService.clearCache();
        await refresh(true);
        showToast('Recomendación vinculada al caso', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const closeCase = useCallback(
    async (status: string, recoveryDate: string): Promise<boolean> => {
      if (!episodeId) return false;
      setSaving(true);
      try {
        await animalDiseasesService.closeEpisode(episodeId, {
          status,
          recovery_date: recoveryDate,
        });
        await refresh(true);
        showToast('Caso cerrado: la res está marcada como recuperada', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, refresh, safeError, showToast]
  );

  const episode = useMemo(() => data?.episode ?? null, [data]);

  const applyProtocolToCase = useCallback(
    async (protocolId: number | string): Promise<boolean> => {
      if (!episodeId || !episode?.animal_id) return false;
      setSaving(true);
      try {
        await treatmentProtocolsService.applyProtocol(String(protocolId), {
          animal_id: episode.animal_id,
          animal_disease_id: Number(episodeId),
        } as any);
        await treatmentsService.clearCache();
        await refresh(true);
        showToast('Protocolo aplicado y vinculado al caso', 'success');
        return true;
      } catch (e: any) {
        safeError(e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [episodeId, episode, refresh, safeError, showToast]
  );

  return { data, episode, loading, saving, error, refresh, addProgress, updateProgress, deleteProgress, linkTreatment, linkExistingTreatment, applyProtocolToCase, linkVaccination, linkRecommendation, closeCase };
}
