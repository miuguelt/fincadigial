import React from 'react';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { IconEye, IconEdit, IconTrash, IconScale, IconActivity, IconHistory, IconPlus } from '@/shared/ui/icons';
import { Control } from '@/entities/control/model/types';
import { cn } from '@/shared/ui/cn';

interface ControlCardProps {
  control: Control;
  getHealthStatusColor: (status: string) => string;
  getAnimalName: (animalId: number) => string;
  openDetailModal: (control: Control) => void;
  openEditModal: (control: Control) => void;
  handleDeleteControl: (controlId: number) => void;
}

export const ControlCard: React.FC<ControlCardProps> = ({
  control,
  getHealthStatusColor,
  getAnimalName,
  openDetailModal,
  openEditModal,
  handleDeleteControl,
}) => {
  const status = control.health_status || control.healt_status || 'Sano';
  const isCritical = ['Malo', 'Enfermo', 'Crítico'].includes(status);

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      isCritical && "ring-2 ring-red-300 bg-red-50/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getHealthStatusColor(status)}>
              {status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(control.checkup_date).toLocaleDateString('es-CO')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDetailModal(control)}
              className="h-8 w-8 p-0"
            >
              <IconEye size="sm" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(control)}
              className="h-8 w-8 p-0"
            >
              <IconEdit size="sm" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteControl(control.id!)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <IconTrash size="sm" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Animal:</span>
            <span className="text-sm">{getAnimalName(control.animal_id)}</span>
          </div>

          {(control.weight != null || control.height != null) && (
            <div className="flex items-center gap-4">
              {control.weight != null && (
                <div className="flex items-center gap-2">
                  <IconScale size="sm" className="text-muted-foreground" />
                  <span className="text-sm">{Number(control.weight).toFixed(1)} kg</span>
                </div>
              )}
              {control.height != null && (
                <div className="flex items-center gap-2">
                  <IconActivity size="sm" className="text-muted-foreground" />
                  <span className="text-sm">{Number(control.height).toFixed(1)} m</span>
                </div>
              )}
            </div>
          )}

          {control.description && (
            <div className="space-y-1">
              <span className="text-sm font-medium">Descripción:</span>
              <p className="text-sm text-muted-foreground line-clamp-2">{control.description}</p>
            </div>
          )}

          {/* Quick actions */}
          {isCritical && (
            <div className="flex gap-2 pt-2 border-t border-red-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDetailModal(control)}
                className="h-7 px-2 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <IconHistory size="sm" className="mr-1" />
                Ver historial
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-semibold text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              >
                <IconPlus size="sm" className="mr-1" />
                Registrar tratamiento
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
