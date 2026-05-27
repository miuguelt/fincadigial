import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { useToast } from '@/app/providers/ToastContext';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { Syringe, ChevronRight, ChevronLeft, Check, Pill } from 'lucide-react';
import { getTodayColombia } from '@/shared/utils/dateUtils';

interface HealthInterventionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const HealthInterventionWizard: React.FC<HealthInterventionWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Options
  const [animals, setAnimals] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);

  // Form State
  const [animalId, setAnimalId] = useState<number | ''>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedVaccines, setSelectedVaccines] = useState<number[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      resetForm();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    try {
      const [anRes, vacRes, medRes] = await Promise.all([
        (animalsService as any).getAnimals?.({ limit: 100 }),
        (vaccinesService as any).getAll?.({ limit: 100 }).catch(() => (vaccinesService as any).getVaccines?.({ limit: 100 })),
        (medicationsService as any).getAll?.({ limit: 100 }).catch(() => (medicationsService as any).getMedications?.({ limit: 100 }))
      ]);

      setAnimals(Array.isArray(anRes) ? anRes : anRes?.data || []);
      setVaccines(Array.isArray(vacRes) ? vacRes : vacRes?.data || []);
      setMedications(Array.isArray(medRes) ? medRes : medRes?.data || []);
    } catch (e) {
      console.error('Error loading options', e);
      showToast('Error cargando datos para el formulario', 'error');
    }
  };

  const resetForm = () => {
    setStep(1);
    setAnimalId('');
    setDiagnosis('');
    setNotes('');
    setSelectedVaccines([]);
    setSelectedMedications([]);
  };

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!animalId || !diagnosis) {
      showToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    setLoading(true);
    try {
      await treatmentsService.createUnifiedTreatment(
        {
          animal_id: Number(animalId),
          description: diagnosis,
          notes,
          treatment_date: getTodayColombia(),
          status: 'Completado'
        },
        selectedVaccines.map(id => ({ vaccine_id: id })),
        selectedMedications.map(id => ({ medication_id: id }))
      );

      showToast('Intervención registrada correctamente', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast('Error al registrar intervención', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVaccine = (id: number) => {
    setSelectedVaccines(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleMedication = (id: number) => {
    setSelectedMedications(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title="Registrar Intervención Sanitaria"
      size="xl"
    >
      <div className="space-y-6 py-4">
        {/* Steps indicator */}
        <div className="flex justify-between items-center mb-6">
          <div className={`flex flex-col items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>1</div>
            <span className="text-xs">Animal</span>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`flex flex-col items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>2</div>
            <span className="text-xs">Diagnóstico</span>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`flex flex-col items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>3</div>
            <span className="text-xs">Insumos</span>
          </div>
        </div>

        {/* Step 1: Animal */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-foreground">¿A qué animal estás atendiendo?</h3>
            <select
              className="w-full h-12 rounded-lg border bg-background px-4 text-base"
              value={animalId}
              onChange={(e) => setAnimalId(Number(e.target.value))}
            >
              <option value="">Selecciona un animal...</option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>{a.record || a.tag || `Animal ${a.id}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 2: Diagnosis */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-foreground">¿Cuál es el motivo o diagnóstico?</h3>
            <div>
              <label className="text-sm font-medium mb-1 block">Diagnóstico *</label>
              <input
                type="text"
                className="w-full h-12 rounded-lg border bg-background px-4 text-base"
                placeholder="Ej: Control general, Mastitis, Fiebre..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Observaciones adicionales</label>
              <textarea
                className="w-full rounded-lg border bg-background p-4 text-base min-h-[100px]"
                placeholder="Detalles sobre el estado del animal..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Supplies */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-medium text-foreground">¿Qué insumos aplicaste? (Opcional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vaccines */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                  <Syringe className="w-5 h-5" />
                  <h4>Vacunas</h4>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {vaccines.map(v => (
                    <label key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedVaccines.includes(v.id) ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-secondary/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedVaccines.includes(v.id)}
                        onChange={() => toggleVaccine(v.id)}
                        className="w-5 h-5 text-primary rounded"
                      />
                      <span className="text-sm font-medium">{v.name || `Vacuna ${v.id}`}</span>
                    </label>
                  ))}
                  {vaccines.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay vacunas disponibles</p>}
                </div>
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium border-b pb-2">
                  <Pill className="w-5 h-5" />
                  <h4>Medicamentos</h4>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {medications.map(m => (
                    <label key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedMedications.includes(m.id) ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-secondary/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedMedications.includes(m.id)}
                        onChange={() => toggleMedication(m.id)}
                        className="w-5 h-5 text-primary rounded"
                      />
                      <span className="text-sm font-medium">{m.name || `Medicamento ${m.id}`}</span>
                    </label>
                  ))}
                  {medications.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay medicamentos disponibles</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? onClose : handlePrev} size="lg">
            {step === 1 ? 'Cancelar' : <><ChevronLeft className="w-4 h-4 mr-2" /> Atrás</>}
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext} disabled={step === 1 && !animalId || step === 2 && !diagnosis} size="lg">
              Siguiente <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} size="lg">
              {loading ? 'Guardando...' : <><Check className="w-4 h-4 mr-2" /> Finalizar</>}
            </Button>
          )}
        </div>
      </div>
    </GenericModal>
  );
};
