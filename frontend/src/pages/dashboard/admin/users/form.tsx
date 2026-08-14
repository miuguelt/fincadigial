import { useEffect } from 'react';
import { useForm, type UseFormSetValue } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { Edit, Plus } from 'lucide-react';
import { usersService } from '@/entities/user/api/user.service';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { UserFormFields } from './components/UserFormFields';
import type { UserFormFields as UserFormValues } from './form.types';

const loadUser = async (id: string, setValue: UseFormSetValue<UserFormValues>) => {
  const user = await usersService.getUserById(Number(id));
  setValue('fullname', user.fullname);
  setValue('identification', user.identification);
  setValue('email', user.email);
  setValue('phone', user.phone ?? '');
  setValue('role', user.role as UserFormValues['role']);
};

const saveUser = (id: string | undefined, data: UserFormValues) => {
  if (id) return usersService.updateUser(Number(id), data);
  const { password, ...rest } = data;
  return usersService.createUser({ ...rest, password: password || '' });
};

const getResponseMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = error.response;
  if (!response || typeof response !== 'object' || !('data' in response)) return undefined;
  const data = response.data;
  if (!data || typeof data !== 'object' || !('message' in data)) return undefined;
  return String(data.message);
};

const getSaveErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : getResponseMessage(error) ?? 'Error al guardar usuario'
);

export default function UserForm() {
  const { id } = useParams<{ id?: string }>();
  const { goTo } = useRoleNavigation();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<UserFormValues>();

  useEffect(() => {
    if (id) void loadUser(id, setValue);
  }, [id, setValue]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      await saveUser(id, data);
      goTo('/admin/users');
    } catch (error: unknown) {
      alert(getSaveErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <UserFormFields register={register} errors={errors} showPassword={!id} />
      <button type="submit" disabled={isSubmitting} className="flex items-center gap-2" aria-label={id ? 'Actualizar usuario' : 'Crear usuario'}>
        {id ? <><Edit className="h-4 w-4" /> Actualizar usuario</> : <><Plus className="h-4 w-4" /> Crear usuario</>}
      </button>
    </form>
  );
}
