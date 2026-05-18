import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { Control } from '@/entities/control/model/types';
import { ImageManager } from '@/shared/ui/common/ImageManager';

interface ControlDetailModalProps {
  showDetailModal: boolean;
  setShowDetailModal: (show: boolean) => void;
  selectedControl: Control | null;
  selectedAnimal: AnimalResponse | null;
  getAnimalName: (animalId: number) => string;
  getHealthStatusColor: (status: string) => string;
  resetForm: () => void;
}

export const ControlDetailModal: React.FC<ControlDetailModalProps> = ({
  showDetailModal,
  setShowDetailModal,
  selectedControl,
  selectedAnimal,
  getAnimalName,
  getHealthStatusColor,
  resetForm,
}) => {
  return (
    <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle del Control
            {selectedControl && (
              <Badge className={getHealthStatusColor(selectedControl.health_status || selectedControl.healt_status || 'Sano')}>
                {selectedControl.health_status || selectedControl.healt_status || 'Sano'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Información completa del control sanitario
          </DialogDescription>
        </DialogHeader>
        
        {selectedControl && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">ID del Control</label>
                <p className="text-base">{selectedControl.id}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Animal</label>
                <p className="text-base">{getAnimalName(selectedControl.animal_id)}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Fecha de Control</label>
                <p className="text-base">{new Date(selectedControl.checkup_date).toLocaleDateString('es-ES')}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Estado de Salud</label>
                <Badge className={getHealthStatusColor(selectedControl.health_status || selectedControl.healt_status || 'Sano')}>
                  {selectedControl.health_status || selectedControl.healt_status || 'Sano'}
                </Badge>
              </div>
            </div>
            
            {(selectedControl.weight || selectedControl.height) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedControl.weight && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Peso</label>
                    <p className="text-base">{selectedControl.weight} kg</p>
                  </div>
                )}
                
                {selectedControl.height && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Altura</label>
                    <p className="text-base">{selectedControl.height} m</p>
                  </div>
                )}
              </div>
            )}
            
            {selectedControl.description && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="text-base bg-muted/50 p-3 rounded-lg">{selectedControl.description}</p>
              </div>
            )}
            
            {selectedAnimal && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Imágenes del Animal</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedAnimal.record || `Animal #${selectedAnimal.id}`}
                  </Badge>
                </div>
                
                <ImageManager
                  animalId={selectedAnimal.id}
                  title={`Imágenes de ${selectedAnimal.record || `Animal #${selectedAnimal.id}`}`}
                  compact={true}
                  showControls={true}
                />
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => {
            setShowDetailModal(false);
            resetForm();
          }}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

