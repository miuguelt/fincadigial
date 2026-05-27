import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { api } from '@/shared/api/base-client';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import type { MilkFormData, TransferFormData, DiseaseFormData, TreatmentFormData } from '../types';

export function useLivestockSubmit(
  milkForm: MilkFormData,
  transferForm: TransferFormData,
  diseaseForm: DiseaseFormData,
  treatmentForm: TreatmentFormData,
) {
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleMilkingSubmit = async (
    setSavingForm: (v: boolean) => void,
    closeModal: () => void,
    loadHistoryRecords: () => void,
  ) => {
    if (!milkForm.animalId) { showToast('Selecciona el animal', 'error'); return false; }
    if (!milkForm.liters || Number(milkForm.liters) < 0) { showToast('Ingresa los litros correctamente', 'error'); return false; }
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
    setSavingForm(true);
    const payload = { animal_id: Number(diseaseForm.animalId), disease_id: Number(diseaseForm.diseaseId), diagnosis_date: diseaseForm.date, status: diseaseForm.status, notes: diseaseForm.notes || undefined, instructor_id: 0 };
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
    if (!treatmentForm.animalId || !treatmentForm.medicationId || !treatmentForm.dose) { showToast('Complete todos los campos', 'error'); return false; }
    setSavingForm(true);
    const payload = { animal_id: Number(treatmentForm.animalId), medication_id: Number(treatmentForm.medicationId), dosis: treatmentForm.dose, treatment_date: treatmentForm.date, description: treatmentForm.description, diagnosis: treatmentForm.description };
    try {
      if (!isOnline) { await offlineQueue.enqueue('POST', 'treatments', payload); showToast('Guardado sin señal', 'success'); }
      else { await treatmentsService.createTreatment(payload); showToast('Tratamiento registrado', 'success'); }
      closeModal(); loadHistoryRecords(); return true;
    } catch { showToast('Error al aplicar tratamiento', 'error'); return false; }
    finally { setSavingForm(false); }
  };

  return { handleMilkingSubmit, handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit };
}
