import { useState, useEffect, useCallback, useRef } from 'react';
import { animalFieldsService } from '../api/animalFields.service';
import { AnimalFields } from './fieldTypes';
import type { AnimalFieldResponse, AnimalFieldInput } from '@/shared/api/generated/swaggerTypes';

export const useAnimalFields = () => {
    const [animalFields, setAnimalFields] = useState<AnimalFields[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const hasDataRef = useRef(false);

    const fetchAnimalFields = useCallback(async () => {
      const hasData = hasDataRef.current;
      if (hasData) setRefreshing(true); else setLoading(true);
      try {
        const data = await animalFieldsService.getAnimalFields();
        const normalized: AnimalFields[] = (Array.isArray(data) ? data : []).map(mapAnimalFieldResponseToLocal);
        setAnimalFields(normalized);
        hasDataRef.current = normalized.length > 0;
      } catch (err) {
        setError('Error al cargar los Potreros de animales');
      } finally {
        if (hasData) setRefreshing(false); else setLoading(false);
      }
    }, []);

    const addAnimalFields = async (animalFieldData: AnimalFields) => {
        setLoading(true);
        try {
          const payload: AnimalFieldInput = {
            animal_id: animalFieldData.animal_id,
            field_id: animalFieldData.field_id,
            assignment_date: animalFieldData.assignment_date,
            removal_date: animalFieldData.removal_date,
          };
          const newAnimalField = await animalFieldsService.createAnimalField(payload);
          setAnimalFields((prev) => [...prev, mapAnimalFieldResponseToLocal(newAnimalField)]);
        } catch (err) {
          setError('Error al agregar el campo de animal');
        } finally {
          setLoading(false);
        }
      };

      const editAnimalFields = async (id: number, animalFieldData: AnimalFields) => {
        setLoading(true);
        try {
          const payload: AnimalFieldInput = {
            animal_id: animalFieldData.animal_id,
            field_id: animalFieldData.field_id,
            assignment_date: animalFieldData.assignment_date,
            removal_date: animalFieldData.removal_date,
          };
          const updatedAnimalFieldData = await animalFieldsService.updateAnimalField(id, payload); 
          setAnimalFields((prev) => prev.map((animalField) => animalField.id === id ? mapAnimalFieldResponseToLocal(updatedAnimalFieldData) : animalField));
        } catch (err) {
          setError('Error al actualizar el campo de animal');
        } finally {
          setLoading(false);
        }
      };

      const deleteAnimalFields = async (id: number) => {
        setLoading(true);
        try {
          await animalFieldsService.deleteAnimalField(id);
          setAnimalFields((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
          setError('Error al eliminar el campo de animal');
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchAnimalFields();
      }, [fetchAnimalFields]);

  return { 
    animalFields, 
    data: animalFields, 
    loading, 
    refreshing, 
    error, 
    fetchAnimalFields, 
    refetch: fetchAnimalFields, 
    addAnimalFields, 
    editAnimalFields, 
    deleteAnimalFields, 
    deleteItem: deleteAnimalFields, 
    createItem: addAnimalFields, 
    updateItem: editAnimalFields 
  };
};

function mapAnimalFieldResponseToLocal(r: AnimalFieldResponse): AnimalFields {
  const rawAnimals: any = (r as any).animal; // Swagger types might use animal instead of animals
  const rawFields: any = (r as any).field;

  const animalsRecord = (rawAnimals?.record)
    || ((r as any).animal_record)
    || (rawAnimals?.name)
    || (r.animal_id ? `#${r.animal_id}` : '');

  const animals = rawAnimals ?? (
    ((r as any).animal_record || r.animal_id)
      ? { id: rawAnimals?.id ?? r.animal_id, record: animalsRecord }
      : undefined
  );

  const fieldName = (rawFields?.name)
    || ((r as any).field_name)
    || (r.field_id ? `#${r.field_id}` : '');

  const fields = rawFields ?? (
    ((r as any).field_name || r.field_id)
      ? { id: rawFields?.id ?? r.field_id, name: fieldName }
      : undefined
  );

  const assignment_date = (r as any).assignment_date ?? (r as any).treatment_date ?? '';
  const removal_date = (r as any).removal_date ?? (r as any).end_date ?? '';

  const computeDuration = (start?: string, end?: string): string => {
    if (!start) return '';
    const startDt = new Date(start);
    const endDt = end ? new Date(end) : new Date();
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) return '';
    const diffMs = endDt.getTime() - startDt.getTime();
    if (diffMs < 0) return '';
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${days} días`;
  };

  const duration = (r as any).duration ?? computeDuration(assignment_date, removal_date || undefined);

  return {
    id: r.id,
    animal_id: r.animal_id,
    field_id: r.field_id,
    assignment_date,
    removal_date,
    duration,
    reason: (r as any).reason,
    notes: (r as any).notes,
    is_active: typeof (r as any).is_active === 'boolean' ? (r as any).is_active : !removal_date,
    status: typeof (r as any).status === 'string' ? (r as any).status : (!removal_date ? 'Dentro' : 'Fuera'),
    animal_record: (r as any).animal_record ?? animalsRecord,
    field_name: (r as any).field_name ?? fieldName,
    animals,
    fields,
  };
}

