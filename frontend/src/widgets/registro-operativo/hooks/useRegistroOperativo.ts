import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { financialService } from '@/entities/financial/api/financial.service';
import { controlService } from '@/entities/control/api/control.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { useLivestockSubmit } from './useLivestockSubmit';
import { asList, buildHistoryRecords } from './buildHistoryRecords';
import type { CropFormData, MilkFormData, TransferFormData, DiseaseFormData, TreatmentFormData, HistoryRecord, FinanceFormData, ControlFormData } from '../types';

export const INITIAL_CROP_FORM: CropFormData = {
  crop_plot_id: '', activity_type: 'note', activity_date: getTodayColombia(),
  description: '', input_name: '', quantity: '', unit: '', cost: '', notes: '',
};

export function useRegistroOperativo() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cropActivities, setCropActivities] = useState<CropActivity[]>([]);
  const [plots, setPlots] = useState<{ label: string; value: any }[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [cropsError, setCropsError] = useState(false);

  const [animals, setAnimals] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const [milkForm, setMilkForm] = useState<MilkFormData>({ animalId: '', liters: '', session: 'Mañana', date: getTodayColombia(), notes: '' });
  const [transferForm, setTransferForm] = useState<TransferFormData>({ animalId: '', fieldId: '', date: getTodayColombia() });
  const [diseaseForm, setDiseaseForm] = useState<DiseaseFormData>({ animalId: '', diseaseId: '', status: 'Activo', date: getTodayColombia(), notes: '' });
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormData>({ animalId: '', medicationId: '', dose: '', frequency: 'Dosis única', date: getTodayColombia(), description: '', observations: '' });
  const [financeForm, setFinanceForm] = useState<FinanceFormData>({ transaction_type: 'Gasto', category: 'Alimento', animalId: '', amount: '', date: getTodayColombia(), description: '' });
  const [controlForm, setControlForm] = useState<ControlFormData>({ animalId: '', weight: '', height: '', health_status: 'Bueno', checkup_date: getTodayColombia(), description: '' });

  const { handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit, handleFinanceSubmit, handleControlSubmit } = useLivestockSubmit(milkForm, transferForm, diseaseForm, treatmentForm, financeForm, controlForm);

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
      const acts = asList(actData);
      acts.sort((a: any, b: any) => new Date(b.activity_date || 0).getTime() - new Date(a.activity_date || 0).getTime());
      setCropActivities(acts);
      setPlots(asList(plotData).map((p: any) => ({
        label: `${p.name || 'Parcela'} - ${p.crop_name || 'Sin cultivo'}`, value: p.id,
      })));
      setCropsError(false);
    } catch {
      setCropsError(true);
      showToast('Error cargando labores', 'error');
    }
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
      setAnimals(asList(animalsResp));
      setFields(asList(fieldsResp));
      setDiseases(asList(diseasesResp));
      setMedications(asList(medsResp));
    } catch { showToast('Error al cargar datos del ganado', 'error'); }
    finally { setLoadingMaster(false); }
  }, [showToast]);

  const loadHistoryRecords = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // Todas las fuentes pasan por su servicio: `api.get` crudo devuelve el
      // AxiosResponse completo y las listas quedaban descartadas en silencio.
      const [milkResp, fieldsAssResp, diseasesAssResp, treatmentsResp, financeResp, controlResp] = await Promise.all([
        milkService.getAll({ limit: 100, sort_by: 'date', sort_dir: 'desc' }).catch(() => []),
        animalFieldsService.getAll({ limit: 100, sort_by: 'assignment_date', sort_dir: 'desc' }).catch(() => []),
        animalDiseasesService.getAll({ limit: 100, sort_by: 'diagnosis_date', sort_dir: 'desc' }).catch(() => []),
        treatmentsService.getAll({ limit: 100, sort_by: 'treatment_date', sort_dir: 'desc' }).catch(() => []),
        financialService.getAll({ limit: 100, sort_by: 'date', sort_dir: 'desc' }).catch(() => []),
        controlService.getAll({ limit: 100, sort_by: 'checkup_date', sort_dir: 'desc' }).catch(() => []),
      ]);
      setHistoryRecords(buildHistoryRecords(
        { milk: milkResp, transfers: fieldsAssResp, diseases: diseasesAssResp, treatments: treatmentsResp, finance: financeResp, controls: controlResp },
        { animals, fields, diseases, medications },
      ));
      setHistoryError(false);
    } catch {
      setHistoryError(true);
      showToast('Error al cargar historial', 'error');
    }
    finally { setLoadingHistory(false); }
  }, [animals, fields, diseases, medications, showToast]);

  useEffect(() => { loadCropData(); }, [loadCropData]);
  useEffect(() => { loadMasterData(); }, [loadMasterData]);
  useEffect(() => { if (!loadingMaster) loadHistoryRecords(); }, [loadingMaster, loadHistoryRecords]);

  const animalOptions = useMemo(
    () => [...animals].sort((a, b) => String(a.record ?? '').localeCompare(String(b.record ?? ''), 'es-CO', { numeric: true })),
    [animals],
  );

  const wrap = (fn: (...args: any[]) => Promise<boolean>) => async () =>
    fn(setSavingForm, closeModal, loadHistoryRecords);

  return {
    activeModal, savingForm,
    cropActivities, plots, loadingCrops, cropsError,
    animals: animalOptions, fields, diseases, medications, loadingMaster,
    historyRecords, loadingHistory, historyError,
    milkForm, setMilkForm, transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    financeForm, setFinanceForm, controlForm, setControlForm,
    openModal, closeModal, loadCropData, loadHistoryRecords,
    handleMilkingSubmit: wrap(handleMilkingSubmit),
    handleTransferSubmit: wrap(handleTransferSubmit),
    handleDiseaseSubmit: wrap(handleDiseaseSubmit),
    handleTreatmentSubmit: wrap(handleTreatmentSubmit),
    handleFinanceSubmit: wrap(handleFinanceSubmit),
    handleControlSubmit: wrap(handleControlSubmit),
    INITIAL_CROP_FORM,
  };
}
