import React from 'react';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDColumn, CRUDFormSection, CRUDConfig } from '../../../../shared/types/crud';
import { usersService } from '@/entities/user/api/user.service';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Grid, Table } from 'lucide-react';
import { UserActionsMenu } from '@/widgets/dashboard/UserActionsMenu';

// Defino un input de formulario flexible para evitar forzar password en edición
type UserFormInput = {
  identification: number | string;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'Administrador' | 'Propietario' | 'Capataz' | 'Instructor' | 'Veterinario' | 'Aprendiz' | 'Operario';
  password?: string;
  status?: boolean;
  is_active?: boolean;
};

// Columnas completas aprovechando todo el ancho de pantalla
const columns: CRUDColumn<UserResponse & { [k: string]: any }>[] = [
  { key: 'identification', label: 'Identificación', width: 32 },
  { key: 'fullname', label: 'Nombre Completo' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono', render: (v: any) => v || '-', width: 28 },
  { key: 'address', label: 'Dirección', render: (v: any) => v || '-' },
  { key: 'role', label: 'Rol', width: 28 },
  { key: 'status', label: 'Estado', width: 24, render: (v: any) => (typeof v === 'boolean' ? (v ? 'Activo' : 'Inactivo') : (v === 1 ? 'Activo' : 'Inactivo')) },
  { key: 'created_at', label: 'Creado', width: 28, render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  { key: 'updated_at', label: 'Actualizado', width: 28, render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<UserFormInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'identification', label: 'Identificación', type: 'text', required: true, placeholder: 'Ej: 123456789' },
      { name: 'fullname', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Juan Pérez' },
      { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'usuario@dominio.com' },
      { name: 'role', label: 'Rol', type: 'select', required: true, options: [
        { value: 'Administrador', label: 'Administrador' },
        { value: 'Propietario', label: 'Propietario' },
        { value: 'Capataz', label: 'Capataz' },
        { value: 'Instructor', label: 'Instructor' },
        { value: 'Veterinario', label: 'Veterinario' },
        { value: 'Aprendiz', label: 'Aprendiz' },
        { value: 'Operario', label: 'Operario' },
      ] },
      { name: 'password', label: 'Contraseña', type: 'text', placeholder: 'Requerida al crear' },
      { name: 'status', label: 'Activo', type: 'checkbox' },
    ],
  },
  {
    title: 'Información de Contacto',
    gridCols: 2,
    fields: [
      { name: 'phone', label: 'Teléfono', type: 'text', required: true, placeholder: 'Ej: +57 300...' },
      { name: 'address', label: 'Dirección', type: 'text', placeholder: 'Dirección del usuario' },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<UserResponse & { [k: string]: any }, UserFormInput> = {
  title: 'Usuarios',
  entityName: 'Usuario',
  columns,
  formSections,
  searchPlaceholder: 'Buscar usuarios...',
  emptyStateMessage: 'No hay usuarios',
  emptyStateDescription: 'Crea el primero para comenzar',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: UserResponse & { [k: string]: any }): UserFormInput => ({
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
});

// Validación mejorada con advertencias y recomendaciones
const validateForm = (formData: UserFormInput): string | null => {
  // Validar identificación
  if (!String(formData.identification || '').trim()) {
    return '⚠️ La identificación es obligatoria. Ejemplo: 123456789';
  }

  const idStr = String(formData.identification).trim();
  if (!/^\d{4,15}$/.test(idStr)) {
    return '⚠️ La identificación debe contener entre 4 y 15 dígitos numéricos.';
  }

  // Validar nombre completo
  if (!formData.fullname || !formData.fullname.trim()) {
    return '⚠️ El nombre completo es obligatorio.';
  }

  if (formData.fullname.trim().length < 3) {
    return '⚠️ El nombre completo debe tener al menos 3 caracteres.';
  }

  // Validar email
  if (!formData.email || !formData.email.trim()) {
    return '⚠️ El email es obligatorio para notificaciones del sistema.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    return '⚠️ Ingrese un email válido. Ejemplo: usuario@dominio.com';
  }

  // Validar rol
  if (!formData.role) {
    return '⚠️ Debe seleccionar un rol adecuado para el usuario en la finca.';
  }

  // Validar contraseña (solo para creación)
  // Nota: En edición, el campo password puede estar vacío
  if (formData.password !== undefined && formData.password !== '') {
    if (formData.password.length < 4) {
      return '⚠️ La contraseña debe tener al menos 4 caracteres por seguridad.';
    }

    if (formData.password.length > 100) {
      return '⚠️ La contraseña es demasiado larga (máximo 100 caracteres).';
    }

    // Recomendación de seguridad
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    const strengthCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;

    if (strengthCount < 2) {
      return '💡 Recomendación: Use una contraseña más segura que incluya mayúsculas, minúsculas, números y símbolos.';
    }
  }

  // Validar teléfono (OBLIGATORIO)
  if (!formData.phone || !formData.phone.trim()) {
    return '⚠️ El teléfono es obligatorio para contactar al usuario.';
  }

  const phoneClean = formData.phone.replace(/[\s()-]/g, '');
  if (phoneClean.length < 7) {
    return '⚠️ El número de teléfono parece incompleto. Debe tener al menos 7 dígitos.';
  }

  return null;
};

// Datos iniciales
const initialFormData: UserFormInput = {
  identification: '',
  fullname: '',
  email: '',
  role: 'Aprendiz',
  password: '',
  status: true,
  phone: '',
  address: '',
};

// Función para renderizar el contenido de las tarjetas de usuario (sin botones de acción)
const renderUserCard = (user: UserResponse & { [k: string]: any }) => {
  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';

  return (
    <div className="relative group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-card to-card/95 border border-border/60 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      
      <div className="relative flex flex-col h-full gap-4">
        {/* Header: Status and Role */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive
              ? "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-600 border border-slate-500/20"}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg border-primary/20 text-primary bg-primary/5">{user.role}</Badge>
        </div>
        
        {/* Body: Main Info */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Identificación</div>
            <div className="font-mono text-base font-bold text-text-primary tracking-tight" title={String(user.identification ?? '')}>{user.identification}</div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Nombre</div>
              <div className="truncate font-bold text-sm text-text-primary" title={user.fullname || '-'}>{user.fullname || '-'}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Email</div>
              <div className="truncate font-medium text-xs text-text-secondary" title={user.email || '-'}>{user.email || '-'}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Teléfono</div>
              <div className="truncate font-medium text-xs text-text-secondary" title={user.phone || '-'}>{user.phone || '-'}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Dirección</div>
              <div className="truncate font-medium text-xs text-text-secondary" title={user.address || '-'}>{user.address || '-'}</div>
            </div>
          </div>
        </div>

        {/* Footer: Dates */}
        <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] text-text-muted font-medium">
          <div className="flex flex-col">
            <span>Creado</span>
            <span className="text-text-secondary">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span>Actualizado</span>
            <span className="text-text-secondary">{user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-ES') : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Página principal con estado para toggle de vista
const AdminUsersPageWrapper = () => {
  const [viewMode, setViewMode] = useGlobalViewMode();

  // Acciones personalizadas para la tabla usando UserActionsMenu
  const customActions = (item: UserResponse & { [k: string]: any }) => (
    <UserActionsMenu user={item} />
  );

  // Toolbar personalizado con toggle de vista
  const customToolbar = (
    <div className="flex items-center gap-2">
      <Button
        variant={viewMode === 'table' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewMode('table')}
      >
        <Table className="w-4 h-4 mr-1" />
        Tabla
      </Button>
      <Button
        variant={viewMode === 'cards' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewMode('cards')}
      >
        <Grid className="w-4 h-4 mr-1" />
        Tarjetas
      </Button>
    </div>
  );

  return (
    <AdminCRUDPage
      config={{
        ...crudConfig,
        customActions,
        customToolbar,
        viewMode,
        renderCard: renderUserCard,
      }}
      service={usersService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      realtime={true}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
};

// Página principal exportada
const AdminUsersPage = () => <AdminUsersPageWrapper />;

export default AdminUsersPage;
