import { usersService } from '@/entities/user/api/user.service';
import { chatService } from '@/features/chat/api/chat.service';
import { roleCan } from '@/shared/lib/rbac';

export interface AssignableUser {
  id: number;
  fullname: string;
}

interface CurrentUserLike {
  id?: number;
  fullname?: string;
}

const NAME_FIELDS = ['fullname', 'name', 'username', 'email', 'identification'] as const;

const toName = (u: any, fallbackId: number | string): string => {
  const found = NAME_FIELDS.map((f) => u?.[f]).find(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
  return found ?? `Persona ${fallbackId}`;
};

/**
 * Personas de la finca a las que se puede asignar trabajo.
 *
 * Roles como Instructor y Veterinario manejan tareas y registros sanitarios pero
 * la matriz RBAC les niega `/users`; para ellos la lista sale de los contactos de
 * la finca (`/chat/contacts`), que sí está abierto a cualquier sesión válida.
 * Así se evita el 403 en consola y el selector queda utilizable.
 */
export async function fetchAssignableUsers(
  role: string | null | undefined,
  params: Record<string, any> = {},
  currentUser?: CurrentUserLike | null,
): Promise<AssignableUser[]> {
  if (roleCan(role, 'users', 'read')) {
    const response: any = await usersService.getUsers(params);
    return toAssignables(Array.isArray(response) ? response : response?.data);
  }

  const list = toAssignables(await chatService.getContacts());

  // /chat/contacts excluye a quien consulta: se agrega para poder autoasignarse.
  const selfId = currentUser?.id;
  if (selfId && !list.some((c) => c.id === selfId)) {
    list.unshift({ id: selfId, fullname: currentUser?.fullname || 'Yo' });
  }

  return list;
}

const toAssignables = (list: any): AssignableUser[] =>
  (Array.isArray(list) ? list : []).map((u) => ({ id: u.id, fullname: toName(u, u.id) }));
