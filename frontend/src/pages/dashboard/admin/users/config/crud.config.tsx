import type { CRUDConfig, CRUDFormSection } from '@/shared/types/crud';
import type { UserFormInput } from '../types';
import { columns, type UserRecord } from './columns';

export { columns } from './columns';

export const formSections: CRUDFormSection<UserFormInput>[] = [
  {
    title: 'Información de la Persona',
    gridCols: 2,
    fields: [
      { name: 'identification', label: 'Cédula / Identificación', type: 'text', required: true, placeholder: 'Ej: 123456789' },
      { name: 'fullname', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Juan Pérez' },
      { name: 'email', label: 'Correo electrónico', type: 'text', required: true, placeholder: 'usuario@dominio.com' },
      {
        name: 'role', label: 'Puesto / Cargo', type: 'select', required: true,
        options: [
          { value: 'Administrador', label: 'Administrador' },
          { value: 'Propietario', label: 'Propietario' },
          { value: 'Capataz', label: 'Capataz' },
          { value: 'Instructor', label: 'Instructor' },
          { value: 'Veterinario', label: 'Veterinario' },
          { value: 'Aprendiz', label: 'Aprendiz' },
          { value: 'Operario', label: 'Operario' },
        ],
      },
      {
        name: 'approval_status', label: 'Permiso de Acceso', type: 'select', required: true,
        options: [
          { value: 'Pending', label: '⏳ Por revisar' },
          { value: 'Approved', label: '✅ Permitir' },
          { value: 'Rejected', label: '❌ Negar' },
          { value: 'Suspended', label: '🚫 Suspender' },
        ],
      },
      { name: 'password', label: 'Clave de entrada', type: 'text', placeholder: 'Poner solo si se va a cambiar' },
      { name: 'status', label: 'Está trabajando actualmente', type: 'checkbox' },
    ],
  },
  {
    title: 'Cómo contactarlo',
    gridCols: 2,
    fields: [
      { name: 'phone', label: 'Número de teléfono', type: 'text', required: true, placeholder: 'Ej: 300 123 4567' },
      { name: 'address', label: 'Vereda / Dirección', type: 'text', placeholder: 'Ej: Vereda El Centro' },
    ],
  },
];

export const crudConfig: CRUDConfig<UserRecord, UserFormInput> = {
  title: 'Personas de la Finca',
  entityName: 'Persona',
  columns,
  formSections,
  searchPlaceholder: 'Buscar por nombre o cédula...',
  emptyStateMessage: 'Todavía no hay personas registradas',
  emptyStateDescription: 'Agregue a los trabajadores o aprendices que laboran en su finca.',
  emptyStateIcon: 'IconUsersGroup',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

export const mapResponseToForm = (item: UserRecord): UserFormInput => ({
  identification: item.identification,
  fullname: item.fullname || '',
  first_name: item.first_name || '',
  last_name: item.last_name || '',
  email: item.email || '',
  phone: item.phone || '',
  address: item.address || '',
  role: item.role,
  status: typeof item.status === 'boolean' ? item.status : item.is_active,
  is_active: item.is_active,
  approval_status: item.approval_status,
});

export const validateForm = (formData: UserFormInput): string | null => {
  if (!String(formData.identification || '').trim()) return '⚠️ La cédula es obligatoria.';
  if (!formData.fullname || formData.fullname.trim().length < 3) return '⚠️ El nombre completo es obligatorio.';
  if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return '⚠️ Ingrese un correo válido.';
  if (!formData.phone || formData.phone.trim().length < 7) return '⚠️ El teléfono es obligatorio.';
  return null;
};

export const initialFormData: UserFormInput = {
  identification: '',
  fullname: '',
  email: '',
  role: 'Operario',
  approval_status: 'Pending',
  password: '',
  status: true,
  phone: '',
  address: '',
};
