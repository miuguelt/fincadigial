import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { ImageManager } from '@/shared/ui/common/ImageManager';
import { Control } from '@/entities/control/model/types';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { Loader2, Plus, Edit } from 'lucide-react';

interface ControlModalsProps {
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  showDetailModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  selectedControl: Control | null;
  selectedAnimal: AnimalResponse | null;
  formData: Partial<Control>;
  saving: boolean;
  animals: AnimalResponse[];
  getAnimalName: (id: number) => string;
  onInputChange: (field: string, value: any) => void;
  onCreate: () => void;
  onEdit: () => void;
  onReset: () => void;
}

export function ControlModals({
  showCreateModal, setShowCreateModal,
  showEditModal, setShowEditModal,
  showDetailModal, setShowDetailModal,
  selectedControl, selectedAnimal,
  formData, saving, animals, getAnimalName,
  onInputChange, onCreate, onEdit, onReset,
}: ControlModalsProps) {
  const commonForm = (_edit = false) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Animal *</label>
        <Select value={formData.animal_id?.toString()} onValueChange={(v) => onInputChange('animal_id', parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Selecciona un animal" /></SelectTrigger>
          <SelectContent>
            {animals.map((a) => (
              <SelectItem key={a.id} value={a.id.toString()}>{a.record || `Animal #${a.id}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha de Control *</label>
        <Input type="date" value={formData.checkup_date || ''} onChange={(e) => onInputChange('checkup_date', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Peso (kg)</label>
          <Input type="number" step="0.1" value={formData.weight || ''} onChange={(e) => onInputChange('weight', parseFloat(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Altura (m)</label>
          <Input type="number" step="0.01" value={formData.height || ''} onChange={(e) => onInputChange('height', parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Estado de Salud *</label>
        <Select value={formData.health_status} onValueChange={(v) => onInputChange('health_status', v)}>
          <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
          <SelectContent>
            {['Excelente', 'Bueno', 'Sano', 'Regular', 'Malo'].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción</label>
        <Textarea value={formData.description || ''} onChange={(e) => onInputChange('description', e.target.value)} placeholder="Observaciones del control..." rows={3} />
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Control</DialogTitle>
            <DialogDescription>Registra un nuevo control sanitario para un animal</DialogDescription>
          </DialogHeader>
          {commonForm()}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={onCreate} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Plus className="w-4 h-4 mr-2" /> Crear Control</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Control</DialogTitle>
            <DialogDescription>Modifica la información del control sanitario</DialogDescription>
          </DialogHeader>
          {commonForm(true)}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowEditModal(false); onReset(); }}>Cancelar</Button>
            <Button onClick={onEdit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Actualizando...</> : <><Edit className="w-4 h-4 mr-2" /> Actualizar Control</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle del Control
              {selectedControl && (
                <Badge className={getAutoStatusClass(selectedControl.health_status || selectedControl.healt_status || 'Sano')}>
                  {selectedControl.health_status || selectedControl.healt_status || 'Sano'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Información completa del control sanitario</DialogDescription>
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
                  <Badge className={getAutoStatusClass(getStatus(selectedControl))}>{getStatus(selectedControl)}</Badge>
                </div>
              </div>
              {(selectedControl.weight != null || selectedControl.height != null) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedControl.weight != null && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Peso</label>
                      <p className="text-base">{Number(selectedControl.weight).toFixed(1)} kg</p>
                    </div>
                  )}
                  {selectedControl.height != null && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Altura</label>
                      <p className="text-base">{Number(selectedControl.height).toFixed(1)} m</p>
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
                    <Badge variant="secondary" className="text-xs">{selectedAnimal.record || `Animal #${selectedAnimal.id}`}</Badge>
                  </div>
                  <ImageManager animalId={selectedAnimal.id} title={`Imágenes de ${selectedAnimal.record || `Animal #${selectedAnimal.id}`}`} compact showControls />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => { setShowDetailModal(false); onReset(); }}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getStatus(c: Control): string {
  return c.health_status || c.healt_status || 'Sano';
}
