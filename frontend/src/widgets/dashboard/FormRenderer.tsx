import React from "react";
import { GeneticImprovementForm, AnimalDiseaseForm, AnimalFieldForm, VaccinationForm, TreatmentForm, ControlForm, MilkProductionForm, ReproductionEventForm, AlertForm, TaskForm } from "./modal-forms";
import type { ModalType } from "./AnimalActionsMenu.types";

interface Props {
  type: ModalType;
  formData: any;
  setFormData: (d: any) => void;
  idPrefix: string;
  editingItem: any;
  pendingBulkItems: any[];
  setPendingBulkItems: (items: any[]) => void;
  animal: { id: number };
  setError: (e: string | null) => void;
}

export const FormRenderer: React.FC<Props> = ({ type, formData, setFormData, idPrefix, editingItem, pendingBulkItems, setPendingBulkItems, animal, setError }) => {
  switch (type) {
    case "genetic_improvement": return <GeneticImprovementForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} />;
    case "animal_disease": return <AnimalDiseaseForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} diseaseOptions={[]} userOptions={[]} />;
    case "animal_field": return <AnimalFieldForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} fieldOptions={[]} />;
    case "vaccination": return <VaccinationForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} userOptions={[]} vaccineOptions={[]} />;
    case "treatment": return <TreatmentForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} />;
    case "control": return <ControlForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} editingItem={editingItem} pendingBulkItems={pendingBulkItems} setPendingBulkItems={setPendingBulkItems} animal={animal} setError={setError} />;
    case "milk_production": return <MilkProductionForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} />;
    case "reproduction_event": return <ReproductionEventForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} />;
    case "alert": return <AlertForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} />;
    case "task": return <TaskForm formData={formData} setFormData={setFormData} idPrefix={idPrefix} userOptions={[]} />;
    default: return null;
  }
};
