import { useCallback, useEffect, useState } from 'react';
import { usersService } from '@/entities/user/api/user.service';
import { useToast } from '@/shared/hooks/use-toast';
import type { UserWithProfile } from '../types';

/**
 * Carga el directorio global de usuarios.
 *
 * Expone `setUsers` porque el panel de detalle actualiza el avatar en sitio y
 * volver a pedir la lista completa por un cambio de imagen es desproporcionado.
 */
export const useGlobalUsers = () => {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersService.getGlobalUsers();
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.users)
        ? (response as any).users
        : [];
      setUsers(rawList as UserWithProfile[]);
    } catch (error) {
      console.error('Error fetching global users:', error);
      toast({
        title: 'Error de Acceso',
        description: 'No tienes permisos para ver la vista global de usuarios o el servidor no respondió.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users, setUsers, loading, refresh };
};
