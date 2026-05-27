import React, { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToast } from '@/app/providers/ToastContext';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { animalService } from '@/entities/animal/api/animal.service';
import { Baby, Info } from 'lucide-react';

export default function AssistedCalvingForm({ 
  motherId, 
  onComplete 
}: { 
  motherId?: number;
  onComplete?: () => void;
}) {
  const { showToast } = useToast();
  const { animals } = useAnimals({ filters: { sex: 'Hembra' }, limit: 200 });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    animal_id: motherId ? motherId.toString() : '',
    event_date: new Date().toISOString().split('T')[0],
    offspring_record: '',
    sex: 'Hembra',
    birth_weight: '',
    colostrum_intake: false,
    placenta_expelled: false,
    navel_disinfected: false,
    vitality: 'Vigoroso',
    complications: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.animal_id) {
      showToast('Debe seleccionar la madre', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear el evento de parto para la madre
      const eventNotes = `Parto asistido. Complicaciones: ${formData.complications || 'Ninguna'}. ` +
        `Placenta expulsada: ${formData.placenta_expelled ? 'Sí' : 'No'}.`;
      
      const eventRes = await reproductionService.create({
        animal_id: Number(formData.animal_id),
        event_type: 'Parto',
        event_date: formData.event_date,
        notes: eventNotes,
        diagnosis_result: 'Positivo',
      } as any);

      // 2. Si se ingresó ID del ternero, crear el registro de cría
      if (formData.offspring_record) {
        // Encontrar raza de la madre para asignársela a la cría
        const selectedMother = animals?.find((a: any) => Number(a.id) === Number(formData.animal_id));
        const motherBreedId = (selectedMother as any)?.breed_id || (selectedMother as any)?.breeds_id || 1;

        let createdAnimalRes = null;
        try {
          createdAnimalRes = await animalService.create({
            record: formData.offspring_record,
            birth_date: formData.event_date,
            weight: formData.birth_weight ? parseFloat(formData.birth_weight) : 35.0,
            breed_id: motherBreedId,
            gender: formData.sex === 'Macho' ? 'Macho' : 'Hembra',
            status: 'Vivo',
            mother_id: Number(formData.animal_id),
            notes: `Cría nacida del parto del ${formData.event_date}. Vigor: ${formData.vitality}.`,
          } as any);
        } catch (animalErr: any) {
          console.error('Error al crear la ficha del animal:', animalErr);
          showToast('Se registró el parto, pero hubo un error al crear la ficha del ternero en el inventario: ' + (animalErr.message || ''), 'warning');
        }

        await reproductionService.createOffspring({
          birth_event_id: eventRes.id,
          animal_id: createdAnimalRes?.id || undefined,
          sex: formData.sex === 'Macho' ? 'Macho' : 'Hembra',
          alive: true,
          birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : undefined,
          notes: `Vigor: ${formData.vitality}. Calostro: ${formData.colostrum_intake ? 'Sí' : 'No'}. Ombligo curado: ${formData.navel_disinfected ? 'Sí' : 'No'}.`,
        } as any);
      }

      showToast('Planilla de parto guardada con éxito', 'success');
      
      // Reset form
      setFormData({
        animal_id: motherId ? motherId.toString() : '',
        event_date: new Date().toISOString().split('T')[0],
        offspring_record: '',
        sex: 'Hembra',
        birth_weight: '',
        colostrum_intake: false,
        placenta_expelled: false,
        navel_disinfected: false,
        vitality: 'Vigoroso',
        complications: '',
      });
      
      if (onComplete) onComplete();
    } catch (error: any) {
      showToast(error.message || 'Error al guardar el parto', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-transparent">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 sm:p-5 mb-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
          <Baby className="h-6 w-6" />
          Planilla Asistida de Parto
        </h2>
        <p className="text-emerald-600/80 dark:text-emerald-400/80 text-sm mt-1 font-medium">
          Registro detallado post-parto y datos iniciales del ternero
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* --- SECCIÓN MADRE --- */}
          <div className="space-y-5 bg-card/50 p-5 sm:p-6 rounded-lg border border-border shadow-sm">
            <h3 className="font-bold text-foreground/80 border-b border-border/50 pb-3 text-lg flex items-center gap-2">
              Datos de la Madre
            </h3>
            
            <div className="space-y-3">
              <Label htmlFor="mother_id" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vaca (Madre)</Label>
              <Select
                value={formData.animal_id}
                onValueChange={(value) => handleChange('animal_id', value)}
                disabled={!!motherId}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background/50">
                  <SelectValue placeholder="Seleccionar vaca..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[300px]">
                  {animals?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.record} {a.alias ? `- ${a.alias}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="event_date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha de Parto</Label>
              <Input
                id="event_date"
                type="date"
                className="h-11 rounded-xl bg-background/50"
                value={formData.event_date}
                onChange={(e) => handleChange('event_date', e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                <Checkbox 
                  id="placenta" 
                  checked={formData.placenta_expelled}
                  onCheckedChange={(c) => handleChange('placenta_expelled', c)}
                  className="h-5 w-5 rounded-md"
                />
                <span className="font-medium text-sm">Placenta expulsada completamente</span>
              </label>
            </div>

            <div className="space-y-3">
              <Label htmlFor="complications" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Complicaciones en la madre</Label>
              <Input
                id="complications"
                placeholder="Ej: Distocia, retención de placenta..."
                className="h-11 rounded-xl bg-background/50"
                value={formData.complications}
                onChange={(e) => handleChange('complications', e.target.value)}
              />
            </div>
          </div>

          {/* --- SECCIÓN CRÍA --- */}
          <div className="space-y-5 bg-blue-500/5 p-5 sm:p-6 rounded-lg border border-blue-500/20 shadow-sm">
            <h3 className="font-bold text-blue-700 dark:text-blue-400 border-b border-blue-500/20 pb-3 text-lg flex items-center gap-2">
              Datos de la Cría
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="offspring_record" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ID Prov. / Orejera</Label>
                <Input
                  id="offspring_record"
                  placeholder="Opcional"
                  className="h-11 rounded-xl bg-background/50"
                  value={formData.offspring_record}
                  onChange={(e) => handleChange('offspring_record', e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="sex" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sexo</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => handleChange('sex', value)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background/50">
                    <SelectValue placeholder="Sexo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Hembra">Hembra</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="birth_weight" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peso al nacer (kg)</Label>
                <Input
                  id="birth_weight"
                  type="number"
                  step="0.5"
                  placeholder="Ej: 35"
                  className="h-11 rounded-xl bg-background/50"
                  value={formData.birth_weight}
                  onChange={(e) => handleChange('birth_weight', e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="vitality" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vitalidad</Label>
                <Select
                  value={formData.vitality}
                  onValueChange={(value) => handleChange('vitality', value)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background/50">
                    <SelectValue placeholder="Vitalidad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Vigoroso">Vigoroso / Fuerte</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Débil">Débil / Aletargado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-colors">
                <Checkbox 
                  id="colostrum" 
                  checked={formData.colostrum_intake}
                  onCheckedChange={(c) => handleChange('colostrum_intake', c)}
                  className="h-5 w-5 rounded-md"
                />
                <span className="font-medium text-sm">Toma de Calostro Confirmada (1-4h)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-colors">
                <Checkbox 
                  id="navel" 
                  checked={formData.navel_disinfected}
                  onCheckedChange={(c) => handleChange('navel_disinfected', c)}
                  className="h-5 w-5 rounded-md"
                />
                <span className="font-medium text-sm">Ombligo desinfectado (Yodo)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/20 text-sm">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <p className="font-medium leading-relaxed">
            Llenar este formulario activará las alertas post-parto automáticas para la madre (revisión de metritis, hipocalcemia, primer celo) y las vacunas pediátricas de la cría.
          </p>
        </div>

        <div className="flex justify-end pt-2 pb-6">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/20 rounded-xl h-12 px-8 font-bold text-base transition-all">
            {loading ? 'Guardando...' : 'Guardar Registro de Parto'}
          </Button>
        </div>

      </form>
    </div>
  );
}