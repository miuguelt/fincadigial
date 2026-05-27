import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import { IconLoader2, IconEdit } from '@/shared/ui/icons';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { Control } from '@/entities/control/model/types';

interface EditControlModalProps {
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  formData: Partial<Control>;
  handleInputChange: (field: string, value: any) => void;
  animals: AnimalResponse[];
  handleEditControl: () => void;
  saving: boolean;
  resetForm: () => void;
}

export const EditControlModal: React.FC<EditControlModalProps> = ({
  showEditModal,
  setShowEditModal,
  formData,
  handleInputChange,
  animals,
  handleEditControl,
  saving,
  resetForm,
}) => {
  return (
    <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Control</DialogTitle>
          <DialogDescription>
            Modifica la información del control sanitario
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Animal *</label>
            <Select value={formData.animal_id?.toString()} onValueChange={(value) => handleInputChange('animal_id', parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un animal" />
              </SelectTrigger>
              <SelectContent>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id.toString()}>
                    {animal.record || `Animal #${animal.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de Control *</label>
            <Input
              type="date"
              value={formData.checkup_date || ''}
              onChange={(e) => handleInputChange('checkup_date', e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Peso (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Altura (m)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado de Salud *</label>
            <Select value={formData.health_status} onValueChange={(value) => handleInputChange('health_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excelente">Excelente</SelectItem>
                <SelectItem value="Bueno">Bueno</SelectItem>
                <SelectItem value="Sano">Sano</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Malo">Malo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Observaciones del control..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => {
            setShowEditModal(false);
            resetForm();
          }}>
            Cancelar
          </Button>
          <Button onClick={handleEditControl} disabled={saving}>
            {saving ? (
              <>
                <IconLoader2 size="sm" className="mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <IconEdit size="sm" className="mr-2" />
                Actualizar Control
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

