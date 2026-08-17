import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { usersService } from '@/entities/user/api/user.service';
import { UserCredentialBadge } from '@/entities/professional-credential/ui/UserCredentialBadge';
import { UserProfileDetail } from './UserProfileDetail';

export const UserLink: React.FC<{ id: number | string; label: string; role?: string }> = ({
  id,
  label,
  role,
}) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
  <ForeignKeyLink
    id={id}
    label={label}
    service={{ getById: (userId) => usersService.getUserProfileById(userId) }}
    modalTitle={`Perfil del ${role || 'Usuario'}`}
    renderContent={(data) => <UserProfileDetail user={data} roleHint={role} />}
    size="5xl"
    enableFullScreenToggle
  />
  {/* Solo se resuelve para veterinarios: el resto de roles no tiene acreditación. */}
  <UserCredentialBadge userId={id} role={role} hideHelp />
  </span>
);
