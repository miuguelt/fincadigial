import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDColumn } from '@/shared/types/crud';
import { ActiveCell, ApprovalCell, PersonCell } from './cells';

export type UserRecord = UserResponse & { [key: string]: unknown };

export const buildColumns = (resolveAvatar: (user: UserRecord) => string | null | undefined = (user) => typeof user.avatar_url === 'string' ? user.avatar_url : null) => [
  { key: 'fullname', label: 'Persona', render: (value: unknown, item: UserRecord) => PersonCell(value, item, resolveAvatar(item)) },
  { key: 'identification', label: 'Cédula / Código', width: 32 },
  { key: 'email', label: 'Correo Electrónico' },
  { key: 'phone', label: 'Teléfono', render: (value) => value || '-', width: 28 },
  { key: 'approval_status', label: 'Acceso', width: 28, render: ApprovalCell },
  { key: 'status', label: 'En Finca', width: 24, render: ActiveCell },
  { key: 'created_at', label: 'Desde', width: 28, render: (value) => value ? new Date(String(value)).toLocaleDateString('es-CO') : '-' },
] satisfies CRUDColumn<UserRecord>[];

export const columns: CRUDColumn<UserRecord>[] = buildColumns();
