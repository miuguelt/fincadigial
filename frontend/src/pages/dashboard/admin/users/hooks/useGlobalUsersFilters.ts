import { useCallback, useMemo, useState } from 'react';
import { isUserActive } from '../utils/user.utils';
import type { UserWithProfile } from '../types';

export const ROLES_FILTER_OPTIONS = [
  'Todos los Roles',
  'Administrador',
  'Propietario',
  'Veterinario',
  'Capataz',
  'Operario',
  'Instructor',
  'Aprendiz',
];

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los Estados' },
  { value: 'active', label: 'Solo Activos' },
  { value: 'inactive', label: 'Solo Inactivos' },
  { value: 'with_finca', label: 'Con Finca Asignada' },
  { value: 'without_finca', label: 'Sin Finca Asignada' },
  { value: 'multi_finca', label: 'Multi-Finca (>1)' },
];

const DEFAULT_ROLE = ROLES_FILTER_OPTIONS[0];
const DEFAULT_STATUS = 'all';

const matchesSearchTerm = (user: UserWithProfile, term: string) => {
  if (!term.trim()) return true;
  const needle = term.toLowerCase();

  return (
    user.fullname?.toLowerCase().includes(needle) ||
    user.email?.toLowerCase().includes(needle) ||
    String(user.identification || '').includes(term) ||
    user.fincas?.some((f: any) => (f.name || f.finca_name || '').toLowerCase().includes(needle))
  );
};

const matchesStatusFilter = (user: UserWithProfile, status: string) => {
  const userFincas = Array.isArray(user.fincas) ? user.fincas : [];

  switch (status) {
    case 'active':         return isUserActive(user);
    case 'inactive':       return !isUserActive(user);
    case 'with_finca':     return userFincas.length > 0 || Boolean(user.finca_id);
    case 'without_finca':  return userFincas.length === 0 && !user.finca_id;
    case 'multi_finca':    return userFincas.length > 1;
    default:               return true;
  }
};

/** Búsqueda libre, rol y estado sobre el directorio ya cargado. */
export const useGlobalUsersFilters = (users: UserWithProfile[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState(DEFAULT_ROLE);
  const [selectedStatus, setSelectedStatus] = useState(DEFAULT_STATUS);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          matchesSearchTerm(u, searchTerm) &&
          (selectedRole === DEFAULT_ROLE || u.role?.toLowerCase() === selectedRole.toLowerCase()) &&
          matchesStatusFilter(u, selectedStatus)
      ),
    [users, searchTerm, selectedRole, selectedStatus]
  );

  const hasActiveFilters =
    Boolean(searchTerm) || selectedRole !== DEFAULT_ROLE || selectedStatus !== DEFAULT_STATUS;

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedRole(DEFAULT_ROLE);
    setSelectedStatus(DEFAULT_STATUS);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    filteredUsers,
    hasActiveFilters,
    resetFilters,
  };
};
