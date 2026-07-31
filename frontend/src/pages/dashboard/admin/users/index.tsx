import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDColumn, CRUDFormSection, CRUDConfig } from '../../../../shared/types/crud';
import { usersService } from '@/entities/user/api/user.service';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Grid, Table, Mail, MessageCircle, MessageSquare, Phone, User as UserIcon, IdCard } from 'lucide-react';
import { UserActionsMenu } from '@/widgets/dashboard/UserActionsMenu';
import { UserAvatarUpload } from '@/widgets/dashboard/users/UserAvatarUpload';
import { useAuth } from '@/features/auth/model/useAuth';
import { useChatContacts } from '@/features/chat/hooks/useChatContacts';
import { QuickChatPanel, type QuickChatContact } from '@/features/chat/components/QuickChatPanel';
import { ImageLightbox, type LightboxImage } from '@/shared/ui/common/ImageLightbox';
import { cn } from '@/shared/ui/cn';
import { UsersBentoHeader } from './components/UsersBentoHeader';
import { UserDetailPanel } from './components/UserDetailPanel';
import { canMessageUser, getUserFincas } from './utils/user.utils';
import type { UserWithProfile } from './types';

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
const buildColumns = (
  resolveAvatar: (user: UserResponse & { [k: string]: any }) => string | null | undefined,
): CRUDColumn<UserResponse & { [k: string]: any }>[] => [
  {
    key: 'fullname',
    label: 'Persona',
    render: (v, item) => {
      const avatarUrl = resolveAvatar(item);
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm border border-primary/20">
            {avatarUrl ? (
              <img src={avatarUrl} alt={v} className="w-full h-full object-cover" />
            ) : (
              v?.[0] || <UserIcon size={14} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground truncate">{v}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.role}</span>
          </div>
        </div>
      );
    }
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
const crudConfig: Omit<CRUDConfig<UserResponse & { [k: string]: any }, UserFormInput>, 'columns'> = {
  title: 'Personas de la Finca',
  entityName: 'Persona',
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

// Página principal
const AdminUsersPageWrapper = () => {
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [items, setItems] = useState<UserWithProfile[]>([]);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const { contactIds: chatContactIds } = useChatContacts();
  const [chatContact, setChatContact] = useState<QuickChatContact | null>(null);
  const [previewImage, setPreviewImage] = useState<LightboxImage | null>(null);
  // Avatares confirmados por el backend en esta sesión: la lista sólo se
  // recarga por realtime/refetch, así que la tarjeta se actualizaría tarde.
  const [avatarOverrides, setAvatarOverrides] = useState<Record<number, string | null>>({});

  const resolveAvatar = useCallback(
    (user: UserResponse & { [k: string]: any }) => {
      const override = avatarOverrides[Number(user.id)];
      return override !== undefined ? override : user.avatar_url;
    },
    [avatarOverrides],
  );

  const handleAvatarUpdated = useCallback((userId: number, avatarUrl: string | null) => {
    setAvatarOverrides((prev) => ({ ...prev, [userId]: avatarUrl }));
  }, []);

  // Fincas donde el usuario autenticado puede subir/borrar fotos: el backend
  // exige membresía activa en la finca destino.
  const manageableFincaIds = useMemo(() => {
    const ids = new Set<number>();
    const active = Number(
      (currentUser as any)?.finca_id ??
        (currentUser as any)?.active_finca_id ??
        (currentUser as any)?.current_finca_id,
    );
    if (Number.isFinite(active) && active > 0) ids.add(active);
    for (const finca of getUserFincas((currentUser ?? {}) as UserWithProfile)) {
      const id = Number(finca.finca_id ?? finca.id);
      if (Number.isFinite(id) && id > 0 && finca.is_active !== false) ids.add(id);
    }
    return ids;
  }, [currentUser]);

  const openChatWith = useCallback(
    (user: UserResponse & { [k: string]: any }) => {
      setChatContact({
        id: Number(user.id),
        fullname: user.fullname || `Usuario ${user.id}`,
        role: user.role,
        avatarUrl: resolveAvatar(user),
      });
    },
    [resolveAvatar],
  );

  const columns = useMemo(() => buildColumns(resolveAvatar), [resolveAvatar]);

  const customActions = (item: UserResponse & { [k: string]: any }) => (
    <div className="flex items-center gap-1">
      {canMessageUser(item as UserWithProfile, currentUser, chatContactIds) && (
        <button
          type="button"
          title={`Escribir a ${item.fullname}`}
          aria-label={`Escribir a ${item.fullname}`}
          onClick={(e) => {
            e.stopPropagation();
            openChatWith(item);
          }}
          className="icon-btn p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}
      <UserActionsMenu user={item} />
    </div>
  );

  const customToolbar = (
    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/40">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/chat')}
        className="h-8 gap-1.5 rounded-lg px-2.5"
        title="Abrir chat"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Chat</span>
      </Button>
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

  // Tarjeta de usuario: clic en tarjeta abre perfil, chat en botón superior y sin elementos sobrantes.
  const renderUserCard = (
    user: UserResponse & { [k: string]: any },
    openDetail?: (item: UserResponse & { [k: string]: any }) => void,
  ) => {
    const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';
    const canChat = canMessageUser(user as UserWithProfile, currentUser, chatContactIds);
    const avatarUrl = resolveAvatar(user);

    return (
      <div
        onClick={() => openDetail?.(user)}
        className="relative group p-5 rounded-[2rem] bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 h-full overflow-hidden flex flex-col cursor-pointer"
      >
        <div className="relative flex flex-col h-full gap-4 z-10">
          {/* Header: Avatar, Identity and Chat button */}
          <div className="flex items-start justify-between gap-3">
             <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 scale-90 -ml-1" onClick={(e) => e.stopPropagation()}>
                   <UserAvatarUpload
                     userId={user.id!}
                     currentAvatarUrl={avatarUrl}
                     firstName={user.fullname?.split(' ')[0]}
                     lastName={user.fullname?.split(' ')[1]}
                     size="md"
                     onUpdate={(url) => handleAvatarUpdated(Number(user.id), url)}
                   />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base text-foreground tracking-tight leading-snug truncate group-hover:text-primary transition-colors">
                    {user.fullname}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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

             {canChat && (
               <button
                 type="button"
                 title={`Abrir chat con ${user.fullname}`}
                 aria-label={`Abrir chat con ${user.fullname}`}
                 onClick={(e) => {
                   e.stopPropagation();
                   openChatWith(user);
                 }}
                 className="shrink-0 rounded-2xl border border-primary/20 bg-primary/5 p-2.5 text-primary transition-all duration-200 hover:bg-primary/15 hover:scale-105 active:scale-95 shadow-sm"
               >
                 <MessageSquare className="h-4 w-4" />
               </button>
             )}
          </div>

          {/* Body: Contact Grid */}
          <div className="grid grid-cols-1 gap-2.5 flex-grow my-1">
            {/* Cédula */}
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent group-hover:border-border/40 transition-colors">
              <IdCard className="h-4 w-4 text-primary shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Cédula / Código</p>
                  <p className="text-xs font-mono font-bold text-foreground truncate">{user.identification}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent group-hover:border-border/40 transition-colors">
              <Mail className="h-4 w-4 text-primary shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Correo Electrónico</p>
                  <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent group-hover:border-border/40 transition-colors">
              <Phone className="h-4 w-4 text-primary shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Teléfono</p>
                  <p className="text-xs font-bold text-foreground truncate">{user.phone || '-'}</p>
              </div>
            </div>
          </div>

          {/* Footer: Stats & Dates */}
          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between gap-4 text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
            <div className="flex flex-col">
              <span className="opacity-50">Vinculado desde</span>
              <span className="text-foreground/60">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '-'}</span>
            </div>
            {user.fincas && user.fincas.length > 0 && (
               <div className="flex -space-x-2 overflow-hidden py-1" title={`${user.fincas.length} fincas asociadas`}>
                  {user.fincas.slice(0, 3).map((f: any) => (
                      <div key={f.id} className="inline-block h-6 w-6 rounded-lg ring-2 ring-card bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px]">
                          {f.name?.[0] || f.finca_name?.[0]}
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

  const renderCustomDetail = (item: UserResponse & { [k: string]: any }) => (
    <UserDetailPanel
      item={{ ...(item as UserWithProfile), avatar_url: resolveAvatar(item) }}
      currentUser={currentUser}
      navigate={navigate}
      onPreviewImage={(url, title) => setPreviewImage({ url, title })}
      onStartChat={openChatWith}
      chatContactIds={chatContactIds}
      manageableFincaIds={manageableFincaIds}
      onAvatarUpdated={handleAvatarUpdated}
    />
  );

  return (
    <>
      <AdminCRUDPage
        config={{
          ...crudConfig,
          columns,
          customActions,
          customToolbar,
          customHeader: <UsersBentoHeader items={items} />,
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
        onItemsChange={setItems}
        refetchOnReconnect={true}
        enhancedHover={true}
      />

      <QuickChatPanel contact={chatContact} onClose={() => setChatContact(null)} />
      <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
};

const AdminUsersPage = () => <AdminUsersPageWrapper />;

export default AdminUsersPage;
