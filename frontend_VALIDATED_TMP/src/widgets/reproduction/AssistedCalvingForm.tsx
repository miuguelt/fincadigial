import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToast } from '@/app/providers/ToastContext';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { Baby, Info, Activity } from 'lucide-react';

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
    animal_id: motherId || '',
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
        await reproductionService.createOffspring({
          event_id: eventRes.id,
          sex: formData.sex,
          birth_weight: formData.birth_weight ? parseFloat(formData.birth_weight) : undefined,
          status: 'Vivo',
          is_alive: true,
          notes: `Vigor: ${formData.vitality}. Calostro: ${formData.colostrum_intake ? 'Sí' : 'No'}. Ombligo curado: ${formData.navel_disinfected ? 'Sí' : 'No'}.`,
        } as any);
      }

      showToast('Planilla de parto guardada con éxito', 'success');
      
      // Reset form
      setFormData({
        animal_id: motherId || '',
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
    <Card className="shadow-md border-primary/20">
      <CardHeader className="bg-primary/5 pb-4 border-b">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Baby className="h-5 w-5" />
          Planilla Asistida de Parto
        </CardTitle>
        <CardDescription>
          Registro detallado post-parto y datos iniciales del ternero
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* --- SECCIÓN MADRE --- */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Datos de la Madre</h3>
              
              <div className="space-y-2">
                <Label htmlFor="mother_id">Vaca (Madre)</Label>
                <select
                  id="mother_id"
                  className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                  value={formData.animal_id}
                  onChange={(e) => handleChange('animal_id', e.target.value)}
                  required
                  disabled={!!motherId}
                >
                  <option value="">Seleccionar vaca...</option>
                  {animals?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.record} {a.alias ? `- ${a.alias}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_date">Fecha de Parto</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleChange('event_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="placenta" 
                    checked={formData.placenta_expelled}
                    onCheckedChange={(c) => handleChange('placenta_expelled', c)}
                  />
                  <Label htmlFor="placenta" className="cursor-pointer">Placenta expulsada completamente</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complications">Complicaciones en la madre</Label>
                <Input
                  id="complications"
                  placeholder="Ej: Distocia, retención de placenta..."
                  value={formData.complications}
                  onChange={(e) => handleChange('complications', e.target.value)}
                />
              </div>
            </div>

            {/* --- SECCIÓN CRÍA --- */}
            <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2">Datos de la Cría</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offspring_record">ID Provisional / Orejera</Label>
                  <Input
                    id="offspring_record"
                    placeholder="Opcional"
                    value={formData.offspring_record}
                    onChange={(e) => handleChange('offspring_record', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo</Label>
                  <select
                    id="sex"
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={formData.sex}
                    onChange={(e) => handleChange('sex', e.target.value)}
                  >
                    <option value="Hembra">Hembra</option>
                    <option value="Macho">Macho</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_weight">Peso al nacer (kg)</Label>
                  <Input
                    id="birth_weight"
                    type="number"
                    step="0.5"
                    placeholder="Ej: 35"
                    value={formData.birth_weight}
                    onChange={(e) => handleChange('birth_weight', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vitality">Vitalidad</Label>
                  <select
                    id="vitality"
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={formData.vitality}
                    onChange={(e) => handleChange('vitality', e.target.value)}
                  >
                    <option value="Vigoroso">Vigoroso / Fuerte</option>
                    <option value="Normal">Normal</option>
                    <option value="Débil">Débil / Aletargado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="colostrum" 
                    checked={formData.colostrum_intake}
                    onCheckedChange={(c) => handleChange('colostrum_intake', c)}
                  />
                  <Label htmlFor="colostrum" className="cursor-pointer">Toma de Calostro Confirmada (1-4h)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="navel" 
                    checked={formData.navel_disinfected}
                    onCheckedChange={(c) => handleChange('navel_disinfected', c)}
                  />
                  <Label htmlFor="navel" className="cursor-pointer">Ombligo desinfectado (Yodo)</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-600" />
            <p>
              Llenar este formulario activará las alertas post-parto automáticas para la madre (revisión de metritis, hipocalcemia, primer celo) y las vacunas pediátricas de la cría.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white min-w-[200px]">
              {loading ? 'Guardando...' : 'Guardar Registro de Parto'}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}