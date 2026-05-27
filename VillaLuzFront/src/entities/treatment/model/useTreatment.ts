
import { useResource } from '@/shared/hooks/useResource';
import { Treatment } from '@/entities/treatment/model/types';
import type { TreatmentResponse } from '@/shared/api/generated/swaggerTypes';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';

import type { Dispatch, SetStateAction } from 'react';

const mapTreatmentResponseToLocal = (r: Partial<TreatmentResponse> & { [key: string]: any }): Treatment => ({
  id: r.id ?? 0,
  treatment_date: (r as any).treatment_date ?? (r as any).treatment_date ?? (r as any).date ?? '',
  end_date: (r as any).end_date ?? '',
  description: (r as any).description ?? (r as any).diagnosis ?? '',
  frequency: (r as any).frequency ?? '',
  observations: (r as any).observations ?? '',
  dosis: (r as any).dosis ?? '',
  animal_id: (r as any).animal_id ?? 0,
  animals: (r as any).animals ?? ((r as any).animal_id != null ? ({ id: (r as any).animal_id } as any) : undefined),
  vaccines_treatments: (r as any).vaccines_treatments,
  medication_treatments: (r as any).medication_treatments,
});

export interface UseTreatmentResult {
  treatments: Treatment[];
  data: Treatment[];
  loading: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Treatment[]>;
  createItem: (payload: Partial<Treatment>) => Promise<Treatment | null>;
  updateItem: (id: number | string, payload: Partial<Treatment>) => Promise<Treatment | null>;
  addTreatment: (payload: Partial<Treatment>) => Promise<Treatment | null>;
  editTreatment: (id: number | string, payload: Partial<Treatment>) => Promise<Treatment | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Treatment[]>>;
  meta?: any;
  setPage?: (p: number) => void;
  setLimit?: (l: number) => void;
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
}

export function useTreatment(): UseTreatmentResult {
  const resource = useResource<TreatmentResponse, any>(treatmentsService as any, {
    autoFetch: true,
    initialParams: { page: 1, limit: 10 },
    map: ((items: any[]) => (items as TreatmentResponse[]).map(mapTreatmentResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Treatment[];

  const addTreatment = async (payload: Partial<Treatment>): Promise<Treatment | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapTreatmentResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editTreatment = async (id: number | string, payload: Partial<Treatment>): Promise<Treatment | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapTreatmentResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  const createItem = addTreatment;
  const updateItem = editTreatment;

  return {
    treatments: mapped,
    data: mapped,
    loading: (resource as any).loading,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Treatment[]>,
    createItem,
    updateItem,
    addTreatment,
    editTreatment,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Treatment[]>>,
    meta: (resource as any).meta,
    setPage: (resource as any).setPage,
    setLimit: (resource as any).setLimit,
    setSearch: (resource as any).setSearch,
    setFields: (resource as any).setFields,
  };
}

