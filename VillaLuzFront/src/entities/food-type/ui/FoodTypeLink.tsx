import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';

export const FoodTypeLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={foodTypesService}
    modalTitle="Detalle del Tipo de Alimento"
    fields={[
      { key: 'id', label: 'Código' },
      { key: 'food_type', label: 'Tipo de Alimento' },
      { key: 'description', label: 'Descripción' },
      {
        key: 'sowing_date',
        label: 'Fecha de Siembra',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
      {
        key: 'harvest_date',
        label: 'Fecha de Cosecha',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
      { key: 'area', label: 'Área' },
      { key: 'handlings', label: 'Manejos' },
      { key: 'gauges', label: 'Mediciones' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);
