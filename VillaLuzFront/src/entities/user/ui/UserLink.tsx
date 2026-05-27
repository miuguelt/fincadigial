import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { usersService } from '@/entities/user/api/user.service';

export const UserLink: React.FC<{ id: number | string; label: string; role?: string }> = ({
  id,
  label,
  role,
}) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={usersService}
    modalTitle={`Detalle del ${role || 'Usuario'}`}
    fields={[
      { key: 'id', label: 'Código' },
      { key: 'identification', label: 'Identificación' },
      { key: 'fullname', label: 'Nombre Completo' },
      { key: 'first_name', label: 'Nombre' },
      { key: 'last_name', label: 'Apellido' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address', label: 'Dirección' },
      { key: 'role', label: 'Rol' },
      { key: 'status', label: 'Estado', render: (value) => (value ? 'Activo' : 'Inactivo') },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);
