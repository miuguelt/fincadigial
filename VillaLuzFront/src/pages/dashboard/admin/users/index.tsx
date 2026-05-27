import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDColumn, CRUDFormSection, CRUDConfig } from '../../../../shared/types/crud';
import { usersService } from '@/entities/user/api/user.service';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Grid, Table, Building2, Mail, Phone, User as UserIcon, IdCard } from 'lucide-react';
import { UserActionsMenu } from '@/widgets/dashboard/UserActionsMenu';
import { UserAvatarUpload } from '@/widgets/dashboard/users/UserAvatarUpload';

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
  { 
    key: 'fullname', 
    label: 'Persona',
    render: (v, item) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm border border-primary/20">
           {item.avatar_url ? (
             <img src={item.avatar_url} alt={v} className="w-full h-full object-cover" />
           ) : (
             v?.[0] || <UserIcon size={14} />
           )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-foreground truncate">{v}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.role}</span>
        </div>
      </div>
    )
  },
  { key: 'identification', label: 'Cédula / Código', width: 32 },
  { key: 'email', label: 'Correo Electrónico' },
  { key: 'phone', label: 'Teléfono', render: (v: any) => v || '-', width: 28 },
  { key: 'approval_status', label: 'Acceso', width: 28, render: (v: any) => {
    const statusMap = { 
        'Pending': { label: 'Esperando', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }, 
        'Approved': { label: 'Permitido', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }, 
        'Rejected': { label: 'Negado', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }, 
        'Suspended': { label: 'Suspendido', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' } 
    };
    const s = statusMap[v as keyof typeof statusMap] || { label: v, color: '' };
    return (
      <Badge variant="outline" className={cn("text-[10px] font-black uppercase py-0.5", s.color)}>
        {s.label}
      </Badge>
    );
  }},
  { key: 'status', label: 'En Finca', width: 24, render: (v: any) => (
    <div className="flex items-center gap-1.5">
       <div className={cn("h-1.5 w-1.5 rounded-full", v ? "bg-success animate-pulse" : "bg-muted")} />
       <span className="text-xs font-medium">{v ? 'Activo' : 'Inactivo'}</span>
    </div>
  )},
  { key: 'created_at', label: 'Desde', width: 28, render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<UserFormInput>[] = [
  {
    title: 'Información de la Persona',
    gridCols: 2,
    fields: [
      { name: 'identification', label: 'Cédula / Identificación', type: 'text', required: true, placeholder: 'Ej: 123456789' },
      { name: 'fullname', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Juan Pérez' },
      { name: 'email', label: 'Correo electrónico', type: 'text', required: true, placeholder: 'usuario@dominio.com' },
      { name: 'role', label: 'Puesto / Cargo', type: 'select', required: true, options: [
        { value: 'Administrador', label: 'Administrador' },
        { value: 'Propietario', label: 'Propietario' },
        { value: 'Capataz', label: 'Capataz' },
        { value: 'Instructor', label: 'Instructor' },
        { value: 'Veterinario', label: 'Veterinario' },
        { value: 'Aprendiz', label: 'Aprendiz' },
        { value: 'Operario', label: 'Operario' },
      ] },
      { name: 'approval_status', label: 'Permiso de Acceso', type: 'select', required: true, options: [
        { value: 'Pending', label: '⏳ Por revisar' },
        { value: 'Approved', label: '✅ Permitir' },
        { value: 'Rejected', label: '❌ Negar' },
        { value: 'Suspended', label: '🚫 Suspender' },
      ] },
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

// Configuración CRUD
const crudConfig: CRUDConfig<UserResponse & { [k: string]: any }, UserFormInput> = {
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

// Validación mejorada
const validateForm = (formData: UserFormInput): string | null => {
  if (!String(formData.identification || '').trim()) return '⚠️ La cédula es obligatoria.';
  if (!formData.fullname || formData.fullname.trim().length < 3) return '⚠️ El nombre completo es obligatorio.';
  if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return '⚠️ Ingrese un correo válido.';
  if (!formData.phone || formData.phone.trim().length < 7) return '⚠️ El teléfono es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: UserFormInput = {
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

// Función para renderizar el contenido de las tarjetas de usuario
const renderUserCard = (user: UserResponse & { [k: string]: any }) => {
  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';

  return (
    <div className="relative group p-5 rounded-[2rem] bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 h-full overflow-hidden flex flex-col">
      <div className="relative flex flex-col h-full gap-5 z-10">
        {/* Header: Avatar and Identity */}
        <div className="flex items-start gap-4">
           <div className="shrink-0 scale-90 -ml-2">
              <UserAvatarUpload 
                userId={user.id!} 
                currentAvatarUrl={user.avatar_url} 
                firstName={user.fullname?.split(' ')[0]}
                lastName={user.fullname?.split(' ')[1]}
                size="md"
              />
           </div>
           <div className="flex-1 min-w-0 pt-2">
             <h3 className="font-black text-lg text-foreground tracking-tighter leading-tight truncate">
               {user.fullname}
             </h3>
             <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-2 border-primary/20 text-primary bg-primary/5">
                  {user.role}
                </Badge>
                <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase",
                    isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                )}>
                    <div className={cn("h-1 w-1 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                    {isActive ? 'En Finca' : 'Fuera'}
                </div>
             </div>
           </div>
        </div>
        
        {/* Body: Contact Grid */}
        <div className="grid grid-cols-1 gap-3 flex-grow">
          {/* Cédula */}
          <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent hover:border-border/60 transition-colors">
            <IdCard className="h-4 w-4 text-primary shrink-0 opacity-70" />
            <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Cédula / Código</p>
                <p className="text-xs font-mono font-bold text-foreground truncate">{user.identification}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent hover:border-border/60 transition-colors">
            <Mail className="h-4 w-4 text-primary shrink-0 opacity-70" />
            <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Correo Electrónico</p>
                <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent hover:border-border/60 transition-colors">
            <Phone className="h-4 w-4 text-primary shrink-0 opacity-70" />
            <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Teléfono</p>
                <p className="text-xs font-bold text-foreground truncate">{user.phone || '-'}</p>
            </div>
          </div>
        </div>

        {/* Footer: Stats & Dates */}
        <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-4 text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
          <div className="flex flex-col">
            <span className="opacity-50">Vinculado desde</span>
            <span className="text-foreground/60">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}</span>
          </div>
          {user.fincas && user.fincas.length > 0 && (
             <div className="flex -space-x-2 overflow-hidden py-1" title={`${user.fincas.length} fincas asociadas`}>
                {user.fincas.slice(0, 3).map((f: any) => (
                    <div key={f.id} className="inline-block h-6 w-6 rounded-lg ring-2 ring-card bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px]">
                        {f.name?.[0]}
                    </div>
                ))}
                {user.fincas.length > 3 && (
                    <div className="inline-block h-6 w-6 rounded-lg ring-2 ring-card bg-muted border border-border flex items-center justify-center text-muted-foreground font-black text-[8px]">
                        +{user.fincas.length - 3}
                    </div>
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { cn } from '@/shared/ui/cn';

// Página principal
const AdminUsersPageWrapper = () => {
  const [viewMode, setViewMode] = useGlobalViewMode();

  const customActions = (item: UserResponse & { [k: string]: any }) => (
    <UserActionsMenu user={item} />
  );

  const customToolbar = (
    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/40">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode('table')}
        className={cn("rounded-lg h-8 w-8 p-0", viewMode === 'table' && "bg-background shadow-sm text-primary")}
      >
        <Table className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode('cards')}
        className={cn("rounded-lg h-8 w-8 p-0", viewMode === 'cards' && "bg-background shadow-sm text-primary")}
      >
        <Grid className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderCustomDetail = (item: UserResponse & { [k: string]: any }) => (
      <div className="p-2 space-y-6">
          <div className="flex flex-col items-center gap-4 py-4">
              <UserAvatarUpload 
                userId={item.id!} 
                currentAvatarUrl={item.avatar_url} 
                firstName={item.fullname?.split(' ')[0]}
                lastName={item.fullname?.split(' ')[1]}
                size="xl"
              />
              <div className="text-center">
                  <h2 className="text-2xl font-black tracking-tight">{item.fullname}</h2>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">{item.role}</p>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/20 p-4 rounded-[2rem] border border-border/40">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <IdCard size={14} /> Información Personal
                  </h4>
                  <div className="space-y-4">
                      <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Cédula / Identificación</p>
                          <p className="text-sm font-mono font-bold">{item.identification}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Correo Electrónico</p>
                          <p className="text-sm font-semibold">{item.email}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Teléfono de Contacto</p>
                          <p className="text-sm font-bold">{item.phone || 'No registrado'}</p>
                      </div>
                  </div>
              </div>
              <div className="bg-muted/20 p-4 rounded-[2rem] border border-border/40">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <Building2 size={14} /> Fincas y Permisos
                  </h4>
                  <div className="space-y-4">
                      <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Estado de Acceso</p>
                          <Badge className="mt-1">{item.approval_status}</Badge>
                      </div>
                      <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Fincas Vinculadas</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                              {item.fincas?.map((f: any) => (
                                  <Badge key={f.id} variant="secondary">{f.name}</Badge>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
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
        cardGridClassName: "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6",
      }}
      customDetailContent={renderCustomDetail}
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

const AdminUsersPage = () => <AdminUsersPageWrapper />;

export default AdminUsersPage;
