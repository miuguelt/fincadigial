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
import { inventoryService } from '@/entities/inventory/api/inventory.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { clearServiceCaches } from '@/shared/api/service-registry';
import { useLivestockSubmit } from './useLivestockSubmit';
import { asList, buildHistoryRecords } from './buildHistoryRecords';
import type { CropFormData, MilkFormData, TransferFormData, DiseaseFormData, TreatmentFormData, HistoryRecord, FinanceFormData, ControlFormData } from '../types';

export const INITIAL_CROP_FORM: CropFormData = {
  crop_plot_id: '', activity_type: 'note', activity_date: getTodayColombia(),
  description: '', input_name: '', quantity: '', unit: '', cost: '', notes: '',
};

const MILK_INITIAL: MilkFormData = { animalId: '', liters: '', session: 'Mañana', date: getTodayColombia(), notes: '' };
const TRANSFER_INITIAL: TransferFormData = { animalId: '', fieldId: '', date: getTodayColombia() };
const DISEASE_INITIAL: DiseaseFormData = { animalId: '', diseaseId: '', status: 'Activo', date: getTodayColombia(), notes: '' };
const TREATMENT_INITIAL: TreatmentFormData = { animalId: '', medicationId: '', dose: '', frequency: 'Dosis única', date: getTodayColombia(), description: '', observations: '', lotId: '', inventoryQuantity: '' };
const CONTROL_INITIAL: ControlFormData = { animalId: '', weight: '', height: '', health_status: 'Bueno', checkup_date: getTodayColombia(), description: '' };

/** Añade `cache_bust` cuando el refresco es manual: sin él la caché de 5
 *  minutos responde los mismos datos y «Actualizar datos» no actualiza nada. */
const withBust = (params: Record<string, any>, bust?: number): Record<string, any> =>
  bust ? { ...params, cache_bust: bust } : params;

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
  const [inventoryLots, setInventoryLots] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [withdrawalAnimals, setWithdrawalAnimals] = useState<Record<number | string, { endDate: string; description?: string }>>({});

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const [milkForm, setMilkForm] = useState<MilkFormData>(MILK_INITIAL);
  const [transferForm, setTransferForm] = useState<TransferFormData>(TRANSFER_INITIAL);
  const [diseaseForm, setDiseaseForm] = useState<DiseaseFormData>(DISEASE_INITIAL);
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormData>(TREATMENT_INITIAL);
  const [financeForm, setFinanceForm] = useState<FinanceFormData>({ transaction_type: 'Gasto', category: 'Alimento', animalId: '', amount: '', date: getTodayColombia(), description: '' });
  const [controlForm, setControlForm] = useState<ControlFormData>(CONTROL_INITIAL);

  const { handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit, handleFinanceSubmit, handleControlSubmit } = useLivestockSubmit(milkForm, transferForm, diseaseForm, treatmentForm, financeForm, controlForm);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam) setActiveModal(modalParam);
  }, [searchParams]);

  /**
   * Cada modal ganadero es una sesión nueva: al abrir se descarta lo que el
   * campesino dejó a medias en la vez anterior (fecha vieja, animal elegido,
   * notas) para que no se envíe por error. Finanzas conserva el último tipo y
   * categoría porque suelen anotarse de corrido.
   */
  const resetLivestockForms = () => {
    setMilkForm(MILK_INITIAL);
    setTransferForm(TRANSFER_INITIAL);
    setDiseaseForm(DISEASE_INITIAL);
    setTreatmentForm(TREATMENT_INITIAL);
    setControlForm(CONTROL_INITIAL);
    setFinanceForm(f => ({ ...f, animalId: '', amount: '', date: getTodayColombia(), description: '' }));
  };

  const openModal = (type: string) => {
    setActiveModal(type);
    resetLivestockForms();
    void loadMasterData({ force: true });
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', type);
    // `replace` evita que Back/Forward del navegador vuelva a abrir modales.
    setSearchParams(newParams, { replace: true });
  };

  const closeModal = () => {
    setActiveModal(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  };

  const loadCropData = useCallback(async (opts?: { force?: boolean }) => {
    setLoadingCrops(true);
    const bust = opts?.force ? Date.now() : undefined;
    try {
      const [actData, plotData] = await Promise.all([
        campesinoServices.cropActivities.getAll(withBust({ limit: 200 }, bust)),
        cropPlotsService.getAll(withBust({ limit: 100 }, bust)).catch(() => []),
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

  const loadMasterData = useCallback(async (opts?: { force?: boolean }) => {
    setLoadingMaster(true);
    const bust = opts?.force ? Date.now() : undefined;
    if (opts?.force) {
      await clearServiceCaches('animals', 'fields', 'diseases', 'medications', 'inventory');
    }
    try {
      // Cada fuente con fallback propio: que falle el inventario no debe
      // descartar animales, potreros, diagnósticos ni medicamentos ya resueltos.
      const [animalsResp, fieldsResp, diseasesResp, medsResp, inventoryResp] = await Promise.all([
        animalsService.getAnimals(withBust({ limit: 300, status: 'Vivo' }, bust)).catch(() => []),
        fieldService.getFields(withBust({ limit: 100 }, bust)).catch(() => []),
        diseaseService.getDiseases(withBust({ limit: 100 }, bust)).catch(() => []),
        medicationsService.getMedications(withBust({ limit: 100 }, bust)).catch(() => []),
        inventoryService.getLots(withBust({ limit: 300 }, bust)).catch(() => [])
      ]);
      setAnimals(asList(animalsResp));
      setFields(asList(fieldsResp));
      setDiseases(asList(diseasesResp));
      setMedications(asList(medsResp));
      // Los lotes se filtran en el formulario por el medicamento seleccionado.
      setInventoryLots(asList(inventoryResp));
    } catch { showToast('Error al cargar datos del ganado', 'error'); }
    finally { setLoadingMaster(false); }
  }, [showToast]);

  const loadHistoryRecords = useCallback(async (opts?: { force?: boolean }) => {
    setLoadingHistory(true);
    const bust = opts?.force ? Date.now() : undefined;
    try {
      // Todas las fuentes pasan por su servicio: `api.get` crudo devuelve el
      // AxiosResponse completo y las listas quedaban descartadas en silencio.
      const [milkResp, fieldsAssResp, diseasesAssResp, treatmentsResp, financeResp, controlResp] = await Promise.all([
        milkService.getAll(withBust({ limit: 100, sort_by: 'date', sort_dir: 'desc' }, bust)).catch(() => []),
        animalFieldsService.getAll(withBust({ limit: 100, sort_by: 'assignment_date', sort_dir: 'desc' }, bust)).catch(() => []),
        animalDiseasesService.getAll(withBust({ limit: 100, sort_by: 'diagnosis_date', sort_dir: 'desc' }, bust)).catch(() => []),
        treatmentsService.getAll(withBust({ limit: 100, sort_by: 'treatment_date', sort_dir: 'desc' }, bust)).catch(() => []),
        financialService.getAll(withBust({ limit: 100, sort_by: 'date', sort_dir: 'desc' }, bust)).catch(() => []),
        controlService.getAll(withBust({ limit: 100, sort_by: 'checkup_date', sort_dir: 'desc' }, bust)).catch(() => []),
      ]);
      const treatmentsList = asList(treatmentsResp);
      // Comparación por cadena de fecha en Colombia (nunca `new Date(YYYY-MM-DD)`,
      // que se interpreta como medianoche UTC y apaga la alerta el día final del
      // retiro en la zona -05:00).
      const todayCol = getTodayColombia();
      const wMap: Record<number | string, { endDate: string; description?: string }> = {};
      treatmentsList.forEach((t: any) => {
        if (t.animal_id && t.withdrawal_end_date) {
          const endDay = String(t.withdrawal_end_date).slice(0, 10);
          if (endDay >= todayCol) {
            wMap[t.animal_id] = {
              endDate: endDay,
              description: t.description || t.diagnosis || 'Tratamiento',
            };
          }
        }
      });
      setWithdrawalAnimals(wMap);

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

  // Escuchar eventos globales de sincronización y cambios en entidades ganaderas
  useEffect(() => {
    const handleDataRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const resource = String(detail?.resource || detail?.endpoint || '').toLowerCase();
      if (
        !resource ||
        resource.includes('animal') ||
        resource.includes('field') ||
        resource.includes('disease') ||
        resource.includes('medication') ||
        resource.includes('inventory')
      ) {
        void loadMasterData({ force: true });
      }
      void loadHistoryRecords({ force: true });
    };
    window.addEventListener('crud:refetch', handleDataRefresh);
    window.addEventListener('server-resource-changed', handleDataRefresh);
    window.addEventListener('animal-fields:updated', handleDataRefresh);
    return () => {
      window.removeEventListener('crud:refetch', handleDataRefresh);
      window.removeEventListener('server-resource-changed', handleDataRefresh);
      window.removeEventListener('animal-fields:updated', handleDataRefresh);
    };
  }, [loadMasterData, loadHistoryRecords]);

  const animalOptions = useMemo(
    () => [...animals].sort((a, b) => String(a.record ?? '').localeCompare(String(b.record ?? ''), 'es-CO', { numeric: true })),
    [animals],
  );

  const wrap = (fn: (...args: any[]) => Promise<boolean>) => async () =>
    fn(setSavingForm, closeModal, loadHistoryRecords);

  return {
    activeModal, savingForm,
    cropActivities, plots, loadingCrops, cropsError,
    animals: animalOptions, fields, diseases, medications, inventoryLots, loadingMaster,
    historyRecords, loadingHistory, historyError, withdrawalAnimals,
    milkForm, setMilkForm, transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    financeForm, setFinanceForm, controlForm, setControlForm,
    openModal, closeModal, loadCropData, loadMasterData, loadHistoryRecords,
    handleMilkingSubmit: wrap(handleMilkingSubmit),
    handleTransferSubmit: wrap(handleTransferSubmit),
    handleDiseaseSubmit: wrap(handleDiseaseSubmit),
    handleTreatmentSubmit: wrap(handleTreatmentSubmit),
    handleFinanceSubmit: wrap(handleFinanceSubmit),
    handleControlSubmit: wrap(handleControlSubmit),
    INITIAL_CROP_FORM,
  };
}
