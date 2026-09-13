import { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '@/features/reporting/api/analytics.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import type { HealthStatistics } from '@/shared/api/generated/swaggerTypes';

/** Inicio del retiro sanitario (días) y estado de un episodio. */
export interface SanidadEpisodeInfo {
  id: number;
  animal_id: number;
  disease_id: number;
  status: string;
  severity?: string;
  animal_label: string;
  disease_label: string;
  /** Tipos de registros vinculados: Tratamiento, Vacuna, Recomendación profesional. */
  case_types?: string[];
}

export interface SanidadTreatmentStats {
  total: number;
  uniqueAnimals: number;
  activeWithdrawals: number;
  totalCost: number;
  recent30d: number;
}

export interface SanidadStatsData {
  loading: boolean;
  episodes: {
    active: number;
    recovered: number;
    critical: number;
    recoveryRate: number;
    total: number;
    episodeAnalytics: HealthStatistics['disease_episodes'] | null;
  };
  treatments: SanidadTreatmentStats;
  /** Conteo de registros (tratamientos) por episodio: id de caso -> { count, lastDate } */
  treatmentsByEpisode: Map<number, { count: number; lastDate?: string }>;
  /** Historial disponible en la consulta de sanidad para mostrarlo por res. */
  treatmentsByAnimal: Map<number, any[]>;
  /** Episodios indexados: id -> info */
  episodeById: Map<number, SanidadEpisodeInfo>;
  /** Episodios por res: animal_id -> casos (para sugerir el vínculo) */
  episodesByAnimal: Map<number, SanidadEpisodeInfo[]>;
  /** Índices de mapas en la misma estructura que las estadísticas */
  episodeOptions: Array<{ value: number; label: string; animal_id: number; case_types?: string[] }>;
}

const EMPTY_STATS: SanidadStatsData = {
  loading: true,
  episodes: { active: 0, recovered: 0, critical: 0, recoveryRate: 0, total: 0, episodeAnalytics: null },
  treatments: { total: 0, uniqueAnimals: 0, activeWithdrawals: 0, totalCost: 0, recent30d: 0 },
  treatmentsByEpisode: new Map(),
  treatmentsByAnimal: new Map(),
  episodeById: new Map(),
  episodesByAnimal: new Map(),
  episodeOptions: [],
};

/** Abstrae respuestas paginadas o arreglos planos según el servicio. */
function toArray(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.items && Array.isArray(res.items)) return res.items;
  return [];
}

/** Dias restantes retiro + fecha final del retiro sanitario de los tratamientos. */
function computeWithdrawalEnd(item: any): Date | null {
  const days = Number(item.withdrawal_days) || 0;
  const endDateStr = item.withdrawal_end_date;
  if (endDateStr) return new Date(String(endDateStr));
  if (days > 0 && item.treatment_date) {
    const end = new Date(String(item.treatment_date));
    end.setDate(end.getDate() + days);
    return end;
  }
  return null;
}

/**
 * Fuente única de indicadores del módulo Sanidad: episodios de enfermedad
 * (server analytics + listado) y registros de tratamiento. Alimenta el header
 * unificado y los mapas de cruce entre ambas vistas (caso -> registros y
 * tratamiento -> caso).
 */
export function useSanidadStats() {
  const [data, setData] = useState<SanidadStatsData>(EMPTY_STATS);
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => {
    setGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [episodeStats, episodesRes, treatmentsRes, diseasesRes, caseOptionsRes] = await Promise.allSettled([
        analyticsService.getHealthStatistics({ months: 12 }),
        animalDiseasesService.getAnimalDiseases({ page: 1, limit: 1000 }),
        treatmentsService.getTreatments({ page: 1, limit: 1000 }),
        diseaseService.getDiseases({ page: 1, limit: 1000 }),
        animalDiseasesService.getCaseOptions(),
      ]);
      if (cancelled) return;

      const episodePayload = episodeStats.status === 'fulfilled' ? (episodeStats.value as any)?.disease_episodes ?? null : null;
      const episodes = episodePayload
        ? {
            active: (episodePayload as any)?.active ?? 0,
            recovered: (episodePayload as any)?.resolved ?? 0,
            critical: (() => {
              const severityCount =
                ((episodePayload as any)?.by_severity?.['Severa'] ?? 0) +
                ((episodePayload as any)?.by_severity?.['Crítica'] ?? 0);
              return severityCount || ((episodePayload as any)?.by_status?.['Crónico'] ?? 0);
            })(),
            recoveryRate: (episodePayload as any)?.recovery_rate ?? 0,
            total: (episodePayload as any)?.total ?? 0,
            episodeAnalytics: episodePayload,
          }
        : EMPTY_STATS.episodes;

      const episodeList = episodesRes.status === 'fulfilled' ? toArray(episodesRes.value) : [];
      const treatmentList = treatmentsRes.status === 'fulfilled' ? toArray(treatmentsRes.value) : [];
      const diseaseList = diseasesRes.status === 'fulfilled' ? toArray(diseasesRes.value) : [];

      const diseaseLabelById = new Map<number, string>();
      diseaseList.forEach((d) => {
        diseaseLabelById.set(Number(d.id), d.disease || d.name || `Enfermedad ${d.id}`);
      });

      const caseOptionsList =
        caseOptionsRes.status === 'fulfilled' ? toArray(caseOptionsRes.value) : [];
      const caseTypesById = new Map<number, string[]>();
      caseOptionsList.forEach((c: any) => {
        const types = c.case_types;
        if (Array.isArray(types) && types.length > 0) {
          caseTypesById.set(Number(c.id), types);
        }
      });

      const episodeById = new Map<number, SanidadEpisodeInfo>();
      const episodesByAnimal = new Map<number, SanidadEpisodeInfo[]>();
      episodeList.forEach((e: any) => {
        const animalLabel = e.animal?.record || e.animal_label || `Res #${e.animal_id}`;
        const diseaseLabel = diseaseLabelById.get(Number(e.disease_id)) || 'Enfermedad';
        const info: SanidadEpisodeInfo = {
          id: Number(e.id),
          animal_id: Number(e.animal_id),
          disease_id: Number(e.disease_id),
          status: e.status || 'Activo',
          severity: e.severity,
          animal_label: animalLabel,
          disease_label: diseaseLabel,
          case_types: caseTypesById.get(Number(e.id)),
        };
        episodeById.set(info.id, info);
        const byAnimal = episodesByAnimal.get(info.animal_id) || [];
        if (!byAnimal.some((c) => c.id === info.id)) {
          byAnimal.push(info);
          episodesByAnimal.set(info.animal_id, byAnimal);
        }
      });

      const episodeOptions = episodeList
        .map((e: any) => {
          const label = episodeById.get(Number(e.id));
          return {
            value: Number(e.id),
            label: label ? `${label.animal_label} · ${label.disease_label} · ${label.status}` : `Caso #${e.id}`,
            animal_id: Number(e.animal_id),
            case_types: label?.case_types,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'es-CO'));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let activeWithdrawals = 0;
      let totalCost = 0;
      let recent30d = 0;
      const uniqueAnimals = new Set<number>();
      const treatmentsByEpisode = new Map<number, { count: number; lastDate?: string }>();
      const treatmentsByAnimal = new Map<number, any[]>();

      treatmentList.forEach((t: any) => {
        const animalId = Number(t.animal_id ?? t.animal?.id);
        if (animalId) {
          const history = treatmentsByAnimal.get(animalId) || [];
          history.push(t);
          treatmentsByAnimal.set(animalId, history);
        }
        const episodeId = Number(t.animal_disease_id ?? t.animal_disease?.id);
        if (episodeId) {
          const entry = treatmentsByEpisode.get(episodeId) || { count: 0 };
          entry.count += 1;
          if (t.treatment_date && (!entry.lastDate || String(t.treatment_date) > entry.lastDate)) {
            entry.lastDate = String(t.treatment_date);
          }
          treatmentsByEpisode.set(episodeId, entry);
        }

        if (t.animal_id) uniqueAnimals.add(Number(t.animal_id));

        const end = computeWithdrawalEnd(t);
        if (end && end.getTime() >= today.getTime()) activeWithdrawals++;

        if (t.treatment_date) {
          const d = new Date(String(t.treatment_date));
          if (d >= thirtyDaysAgo) recent30d++;
        }

        const c = Number(t.cost);
        if (!Number.isNaN(c)) totalCost += c;
      });

      if (!cancelled) {
        setData({
          loading: false,
          episodes,
          treatments: {
            total: treatmentList.length,
            uniqueAnimals: uniqueAnimals.size,
            activeWithdrawals,
            totalCost,
            recent30d,
          },
          treatmentsByEpisode,
          treatmentsByAnimal,
          episodeById,
          episodesByAnimal,
          episodeOptions,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [generation]);

  return { ...data, refresh };
}
