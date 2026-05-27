import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';
import { campesinoServices, CropActivity } from '@/entities/campesino';
import { cropPlotsService } from '@/entities/campesino/api/campesino.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { milkService } from '@/entities/milk/api/milk.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { useLivestockSubmit } from './useLivestockSubmit';
import type { CropFormData, MilkFormData, TransferFormData, DiseaseFormData, TreatmentFormData, HistoryRecord } from '../types';

export const INITIAL_CROP_FORM: CropFormData = {
  crop_plot_id: '', activity_type: 'note', activity_date: new Date().toISOString().split('T')[0],
  description: '', input_name: '', quantity: '', unit: '', cost: '', notes: '',
};

export function useRegistroOperativo() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cropActivities, setCropActivities] = useState<CropActivity[]>([]);
  const [plots, setPlots] = useState<{ label: string; value: any }[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  const [animals, setAnimals] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const [milkForm, setMilkForm] = useState<MilkFormData>({ animalId: '', liters: '', session: 'Mañana', date: getTodayColombia(), notes: '' });
  const [transferForm, setTransferForm] = useState<TransferFormData>({ animalId: '', fieldId: '', date: getTodayColombia() });
  const [diseaseForm, setDiseaseForm] = useState<DiseaseFormData>({ animalId: '', diseaseId: '', status: 'Activo', date: getTodayColombia(), notes: '' });
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormData>({ animalId: '', medicationId: '', dose: '', date: getTodayColombia(), description: 'Tratamiento rápido' });

  const { handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit } = useLivestockSubmit(milkForm, transferForm, diseaseForm, treatmentForm);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam) setActiveModal(modalParam);
  }, [searchParams]);

  const openModal = (type: string) => {
    setActiveModal(type);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', type);
    setSearchParams(newParams);
  };

  const closeModal = () => {
    setActiveModal(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams);
  };

  const loadCropData = useCallback(async () => {
    setLoadingCrops(true);
    try {
      const [actData, plotData] = await Promise.all([
        campesinoServices.cropActivities.getAll({ limit: 200 }),
        cropPlotsService.getAll({ limit: 100 }).catch(() => []),
      ]);
      const acts = Array.isArray(actData) ? actData : (actData as any)?.data ?? [];
      acts.sort((a: any, b: any) => new Date(b.activity_date || 0).getTime() - new Date(a.activity_date || 0).getTime());
      setCropActivities(acts);
      setPlots((plotData as any[]).map((p: any) => ({
        label: `${p.name || 'Parcela'} - ${p.crop_name || 'Sin cultivo'}`, value: p.id,
      })));
    } catch { showToast('Error cargando labores', 'error'); }
    finally { setLoadingCrops(false); }
  }, [showToast]);

  const loadMasterData = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const [animalsResp, fieldsResp, diseasesResp, medsResp] = await Promise.all([
        animalsService.getAnimals({ limit: 300, status: 'Vivo' }),
        fieldService.getFields({ limit: 100 }),
        diseaseService.getDiseases({ limit: 100 }),
        medicationsService.getMedications({ limit: 100 })
      ]);
      setAnimals(Array.isArray(animalsResp) ? animalsResp : (animalsResp as any)?.data || []);
      setFields(Array.isArray(fieldsResp) ? fieldsResp : (fieldsResp as any)?.data || []);
      setDiseases(Array.isArray(diseasesResp) ? diseasesResp : (diseasesResp as any)?.data || []);
      setMedications(Array.isArray(medsResp) ? medsResp : (medsResp as any)?.data || []);
    } catch { showToast('Error al cargar datos del hato', 'error'); }
    finally { setLoadingMaster(false); }
  }, [showToast]);

  const loadHistoryRecords = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [milkResp, fieldsAssResp, diseasesAssResp, treatmentsResp] = await Promise.all([
        milkService.getAll({ limit: 100, sort_by: 'date', order: 'desc' }),
        animalFieldsService.getAll({ limit: 100, sort_by: 'assignment_date', order: 'desc' }),
        animalDiseasesService.getAll({ limit: 100, sort_by: 'diagnosis_date', order: 'desc' }),
        treatmentsService.getAll({ limit: 100, sort_by: 'treatment_date', order: 'desc' })
      ]);
      const unified: HistoryRecord[] = [];
      const animalMap = new Map(animals.map(a => [a.id, a]));
      const fieldMap = new Map(fields.map(f => [f.id, f]));
      const diseaseMap = new Map(diseases.map(d => [d.id, d]));
      const medMap = new Map(medications.map(m => [m.id, m]));
      const getAnimalName = (id: number) => {
        const a = animalMap.get(id);
        return a ? `${a.record} - ${a.breed?.name || 'Sin Raza'}` : `Animal ${id}`;
      };
      if (Array.isArray(milkResp)) {
        milkResp.forEach((m: any) => {
          const shift = m.milking_session === 'AM' ? 'Mañana' : m.milking_session === 'PM' ? 'Tarde' : 'Total';
          unified.push({ id: `milking-${m.id}`, type: 'milking', date: m.date, animalId: m.animal_id, animalLabel: getAnimalName(m.animal_id), details: `${m.liters} Litros (${shift})`, notes: m.notes, raw: m });
        });
      }
      if (Array.isArray(fieldsAssResp)) {
        fieldsAssResp.forEach((tf: any) => {
          const f = fieldMap.get(tf.field_id);
          unified.push({ id: `transfer-${tf.id}`, type: 'transfer', date: tf.assignment_date, animalId: tf.animal_id, animalLabel: getAnimalName(tf.animal_id), entityId: tf.field_id, entityLabel: f?.name || `Campo ${tf.field_id}`, details: `Trasladado a Potrero: ${f?.name || 'N/A'}`, notes: tf.notes, raw: tf });
        });
      }
      if (Array.isArray(diseasesAssResp)) {
        diseasesAssResp.forEach((da: any) => {
          const d = diseaseMap.get(da.disease_id);
          unified.push({ id: `disease-${da.id}`, type: 'disease', date: da.diagnosis_date, animalId: da.animal_id, animalLabel: getAnimalName(da.animal_id), entityId: da.disease_id, entityLabel: d?.name || `Enfermedad ${da.disease_id}`, details: `Enfermedad: ${d?.name || 'N/A'} (${da.status || 'Activo'})`, notes: da.notes, raw: da });
        });
      }
      if (Array.isArray(treatmentsResp)) {
        treatmentsResp.forEach((t: any) => {
          const med = medMap.get(t.medication_id);
          unified.push({ id: `treatment-${t.id}`, type: 'treatment', date: t.treatment_date, animalId: t.animal_id, animalLabel: getAnimalName(t.animal_id), entityId: t.medication_id, entityLabel: med?.name || `Medicamento ${t.medication_id}`, details: `Tratamiento: ${med?.name || 'N/A'} (${t.dosis || t.dose || 'Sin dosis'})`, notes: t.notes || t.description, raw: t });
        });
      }
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoryRecords(unified);
    } catch { showToast('Error al cargar historial', 'error'); }
    finally { setLoadingHistory(false); }
  }, [animals, fields, diseases, medications, showToast]);

  useEffect(() => { loadCropData(); }, [loadCropData]);
  useEffect(() => { loadMasterData(); }, [loadMasterData]);
  useEffect(() => { if (!loadingMaster) loadHistoryRecords(); }, [loadingMaster, loadHistoryRecords]);

  const wrap = (fn: (...args: any[]) => Promise<boolean>) => async () =>
    fn(setSavingForm, closeModal, loadHistoryRecords);

  return {
    activeModal, savingForm,
    cropActivities, plots, loadingCrops,
    animals, fields, diseases, medications, loadingMaster,
    historyRecords, loadingHistory,
    milkForm, setMilkForm, transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    openModal, closeModal, loadCropData, loadHistoryRecords,
    handleMilkingSubmit: wrap(handleMilkingSubmit),
    handleTransferSubmit: wrap(handleTransferSubmit),
    handleDiseaseSubmit: wrap(handleDiseaseSubmit),
    handleTreatmentSubmit: wrap(handleTreatmentSubmit),
    INITIAL_CROP_FORM,
  };
}
