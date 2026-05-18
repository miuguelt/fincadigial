import React from 'react';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { IconEye, IconEdit, IconTrash, IconScale, IconActivity } from '@/shared/ui/icons';
import { Control } from '@/entities/control/model/types';

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
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getHealthStatusColor(control.health_status || control.healt_status || 'Sano')}>
              {control.health_status || control.healt_status || 'Sano'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(control.checkup_date).toLocaleDateString('es-ES')}
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
          
          {(control.weight || control.height) && (
            <div className="flex items-center gap-4">
              {control.weight && (
                <div className="flex items-center gap-2">
                  <IconScale size="sm" className="text-muted-foreground" />
                  <span className="text-sm">{control.weight} kg</span>
                </div>
              )}
              {control.height && (
                <div className="flex items-center gap-2">
                  <IconActivity size="sm" className="text-muted-foreground" />
                  <span className="text-sm">{control.height} m</span>
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
        </div>
      </CardContent>
    </Card>
  );
};

