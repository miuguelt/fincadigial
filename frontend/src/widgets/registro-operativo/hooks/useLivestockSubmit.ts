import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { api } from '@/shared/api/base-client';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { MilkFormData, TransferFormData, DiseaseFormData, TreatmentFormData, FinanceFormData, ControlFormData } from '../types';

/** Un registro con fecha futura entra al historial y desordena los resúmenes. */
const isFutureDate = (date?: string) => Boolean(date) && String(date) > getTodayColombia();

export function useLivestockSubmit(
  milkForm: MilkFormData,
  transferForm: TransferFormData,
  diseaseForm: DiseaseFormData,
  treatmentForm: TreatmentFormData,
  financeForm: FinanceFormData,
  controlForm: ControlFormData,
) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  const handleMilkingSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!milkForm.animalId) { showToast('Selecciona el animal', 'error'); return false; }
    if (milkForm.liters === '' || Number.isNaN(Number(milkForm.liters)) || Number(milkForm.liters) < 0) {
      showToast('Ingresa los litros correctamente', 'error'); return false;
    }
    if (isFutureDate(milkForm.date)) { showToast('La fecha del ordeño no puede ser futura', 'error'); return false; }
    setSavingForm(true);
    const sessionMapped = milkForm.session === 'Mañana' ? 'AM' : milkForm.session === 'Tarde' ? 'PM' : 'Extra';
    const payload = { animal_id: Number(milkForm.animalId), date: milkForm.date, liters: Number(milkForm.liters), milking_session: sessionMapped, notes: milkForm.notes || undefined };
    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'milk-production', payload); showToast('Guardado sin señal', 'success'); }
      else { await api.post('/milk-production', payload); showToast('Ordeño registrado', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al registrar ordeño', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  const handleTransferSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!transferForm.animalId || !transferForm.fieldId) { showToast('Seleccione animal y potrero', 'error'); return false; }
    if (isFutureDate(transferForm.date)) { showToast('La fecha del traslado no puede ser futura', 'error'); return false; }
    setSavingForm(true);
    const payload = { animal_id: Number(transferForm.animalId), field_id: Number(transferForm.fieldId), assignment_date: transferForm.date };
    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'animal-fields', payload); showToast('Guardado sin señal', 'success'); }
      else { await animalFieldsService.createAnimalField(payload); showToast('Traslado registrado', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al registrar traslado', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  const handleDiseaseSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!diseaseForm.animalId || !diseaseForm.diseaseId) { showToast('Seleccione animal y diagnóstico', 'error'); return false; }
    if (isFutureDate(diseaseForm.date)) { showToast('La fecha del diagnóstico no puede ser futura', 'error'); return false; }
    // `instructor_id` es una llave foránea obligatoria a user.id: enviar 0
    // rompe la restricción y el diagnóstico nunca se guarda.
    if (!user?.id) { showToast('No se pudo identificar su usuario. Vuelva a iniciar sesión.', 'error'); return false; }
    setSavingForm(true);
    const payload = { animal_id: Number(diseaseForm.animalId), disease_id: Number(diseaseForm.diseaseId), diagnosis_date: diseaseForm.date, status: diseaseForm.status, notes: diseaseForm.notes || undefined, instructor_id: Number(user.id) };
    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'animal-diseases', payload); showToast('Guardado sin señal', 'success'); }
      else { await animalDiseasesService.createAnimalDisease(payload); showToast('Diagnóstico registrado', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al reportar enfermedad', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  const handleTreatmentSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!treatmentForm.animalId || !treatmentForm.medicationId || !treatmentForm.dose) { showToast('Complete animal, medicamento y dosis', 'error'); return false; }
    if (!treatmentForm.frequency) { showToast('Indique cada cuánto se aplica', 'error'); return false; }
    if (isFutureDate(treatmentForm.date)) { showToast('La fecha del tratamiento no puede ser futura', 'error'); return false; }
    setSavingForm(true);
    const description = treatmentForm.description?.trim() || 'Tratamiento registrado desde el campo';
    // `frequency` es obligatorio en el modelo Treatments; sin él la petición
    // se rechaza en validación. `medication_id` no es columna de treatments:
    // el vínculo va aparte en treatment-medications.
    const payload = {
      animal_id: Number(treatmentForm.animalId),
      dosis: treatmentForm.dose,
      treatment_date: treatmentForm.date,
      frequency: treatmentForm.frequency,
      description,
      diagnosis: description,
      observations: treatmentForm.observations || undefined,
    };
    const medicationId = Number(treatmentForm.medicationId);
    try {
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'treatments', payload);
        showToast('Guardado sin señal. Vincule el medicamento al recuperar cobertura.', 'success');
        closeModal(); loadHistoryRecords(); return true;
      }

      const created: any = await treatmentsService.createTreatment(payload as any);
      const treatmentId = Number(created?.id);
      if (!treatmentId) {
        showToast('Tratamiento guardado, pero no se pudo vincular el medicamento', 'error');
        closeModal(); loadHistoryRecords(); return true;
      }
      try {
        await treatmentMedicationService.createTreatmentMedication({ treatment_id: treatmentId, medication_id: medicationId } as any);
        showToast('Tratamiento registrado', 'success');
      } catch {
        showToast('Tratamiento guardado, pero falló el vínculo con el medicamento', 'error');
      }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al aplicar tratamiento', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  const handleFinanceSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!financeForm.amount || Number(financeForm.amount) <= 0) { showToast('Ingrese un monto mayor que cero', 'error'); return false; }
    if (!financeForm.category) { showToast('Seleccione la categoría', 'error'); return false; }
    if (isFutureDate(financeForm.date)) { showToast('La fecha del movimiento no puede ser futura', 'error'); return false; }
    setSavingForm(true);
    const payload: any = {
      transaction_type: financeForm.transaction_type,
      category: financeForm.category,
      amount: Number(financeForm.amount),
      date: financeForm.date,
      description: financeForm.description || undefined,
    };
    if (financeForm.animalId) {
      payload.animal_id = Number(financeForm.animalId);
    }

    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'financial/transactions', payload); showToast('Guardado sin señal', 'success'); }
      else { await api.post('/financial/transactions', payload); showToast('Transacción registrada', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al registrar transacción', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  const handleControlSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!controlForm.animalId) { showToast('Seleccione el animal', 'error'); return false; }
    if (!controlForm.health_status) { showToast('Seleccione estado de salud', 'error'); return false; }
    if (isFutureDate(controlForm.checkup_date)) { showToast('La fecha del control no puede ser futura', 'error'); return false; }

    setSavingForm(true);
    const payload: any = {
      animal_id: Number(controlForm.animalId),
      checkup_date: controlForm.checkup_date,
      health_status: controlForm.health_status,
      description: controlForm.description || undefined
    };

    if (controlForm.weight) payload.weight = Number(controlForm.weight);
    if (controlForm.height) payload.height = Number(controlForm.height);

    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'control', payload); showToast('Guardado sin señal', 'success'); }
      else { await api.post('/control', payload); showToast('Control registrado', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al registrar control', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  return { handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit, handleFinanceSubmit, handleControlSubmit };
}
