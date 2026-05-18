import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { fieldService } from '@/entities/field/api/field.service';

export const FieldLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={fieldService}
    modalTitle="Detalle del Potrero"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'location', label: 'Ubicación' },
      { key: 'area', label: 'Área' },
      { key: 'capacity', label: 'Capacidad' },
      { key: 'state', label: 'Estado' },
      { key: 'animal_count', label: 'Cantidad de Animales' },
      { key: 'management', label: 'Manejo' },
      { key: 'measurements', label: 'Mediciones' },
      { key: 'food_type_id', label: 'ID de Tipo de Alimento' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);
