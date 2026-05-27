import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDColumn, CRUDFormSection, CRUDConfig } from '../../../../shared/types/crud';
import { usersService } from '@/entities/user/api/user.service';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Grid, Table, Building2, Mail, Phone, MapPin, User, IdCard } from 'lucide-react';
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
  approval_status?: 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
};

// Columnas completas aprovechando todo el ancho de pantalla
const columns: CRUDColumn<UserResponse & { [k: string]: any }>[] = [
  { key: 'identification', label: 'Identificación', width: 32 },
  { key: 'fullname', label: 'Nombre Completo' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono', render: (v: any) => v || '-', width: 28 },
  { key: 'address', label: 'Dirección', render: (v: any) => v || '-' },
  { key: 'role', label: 'Rol', width: 28 },
  { key: 'approval_status', label: 'Aprobación', width: 28, render: (v: any) => {
    const labels = { 'Pending': '⏳ Pendiente', 'Approved': '✅ Aprobado', 'Rejected': '❌ Rechazado', 'Suspended': '🚫 Suspendido' };
    return labels[v as keyof typeof labels] || v || '-';
  }},
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
      { name: 'approval_status', label: 'Estado de Aprobación', type: 'select', required: true, options: [
        { value: 'Pending', label: '⏳ Pendiente' },
        { value: 'Approved', label: '✅ Aprobado' },
        { value: 'Rejected', label: '❌ Rechazado' },
        { value: 'Suspended', label: '🚫 Suspendido' },
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
  approval_status: item.approval_status,
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
  approval_status: 'Pending',
  password: '',
  status: true,
  phone: '',
  address: '',
};

// Función para renderizar el contenido de las tarjetas de usuario (sin botones de acción)
const renderUserCard = (user: UserResponse & { [k: string]: any }) => {
  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';

  return (
    <div className="relative group p-5 rounded-lg bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-success/40 transition-all duration-300 h-full overflow-hidden flex flex-col">
      {/* Decorative background element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-success/5 rounded-full blur-3xl group-hover:bg-success/10 transition-colors" />
      
      <div className="relative flex flex-col h-full gap-4 z-10">
        {/* Header: Status and Role */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive
              ? "text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-success/10 text-success border border-success/20 font-bold"
              : "text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-muted/20 text-muted-foreground border border-border/50"}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md border-success/20 text-success bg-transparent font-semibold">
            {user.role}
          </Badge>
        </div>
        
        {/* Body: Main Info */}
        <div className="space-y-4 flex-grow">
          {/* Identificación y Nombre */}
          <div className="border-b border-border/30 pb-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              <IdCard className="h-3.5 w-3.5 text-success/70" />
              <span>Identificación</span>
            </div>
            <div className="font-mono text-base font-bold text-foreground tracking-tight" title={String(user.identification ?? '')}>
              {user.identification}
            </div>
            
            <div className="mt-2.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Nombre Completo</div>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5" title={user.fullname || '-'}>
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{user.fullname || '-'}</span>
              </div>
            </div>
          </div>

          {/* Detalles estructurados verticalmente con iconos */}
          <div className="space-y-2 text-xs">
            {/* Email */}
            <div className="flex items-center gap-2.5 bg-muted/25 hover:bg-muted/40 p-2 rounded-lg transition-colors min-w-0" title={user.email || '-'}>
              <Mail className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-none mb-0.5">Email</div>
                <div className="truncate font-medium text-foreground">{user.email || '-'}</div>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-center gap-2.5 bg-muted/25 hover:bg-muted/40 p-2 rounded-lg transition-colors min-w-0" title={user.phone || '-'}>
              <Phone className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-none mb-0.5">Teléfono</div>
                <div className="truncate font-medium text-foreground">{user.phone || '-'}</div>
              </div>
            </div>

            {/* Dirección */}
            <div className="flex items-center gap-2.5 bg-muted/25 hover:bg-muted/40 p-2 rounded-lg transition-colors min-w-0" title={user.address || '-'}>
              <MapPin className="h-4 w-4 text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-none mb-0.5">Dirección</div>
                <div className="truncate font-medium text-foreground">{user.address || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fincas Section */}
        {user.fincas && user.fincas.length > 0 && (
          <div className="pt-3 border-t border-border/50">
             <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
               <Building2 className="h-3 w-3 text-success/70" />
               <span>Fincas Asociadas ({user.fincas.length})</span>
             </div>
             <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                {user.fincas.map((f: any) => (
                  <div 
                    key={f.id} 
                    className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-md px-2 py-0.5 group/finca hover:border-success/40 transition-colors"
                    title={`${f.name} - Rol: ${f.role}`}
                  >
                    <Building2 className="h-3 w-3 text-success group-hover/finca:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-[120px]">{f.name}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Footer: Dates */}
        <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-4 text-[10px] text-muted-foreground font-medium">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Creado</span>
            <span className="text-foreground/70">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Actualizado</span>
            <span className="text-foreground/70">{user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-ES') : '-'}</span>
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
        cardGridClassName: "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3",
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
