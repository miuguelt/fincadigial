import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ClimbingBoxLoader } from 'react-spinners';
import { openFloatingChat } from '@/features/chat/model/floatingChat';
import { ImageLightbox } from '@/shared/ui/common/ImageLightbox';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { Button } from '@/shared/ui/button';
import { FloatingScrollArea } from '@/shared/ui/FloatingScrollArea';
import { CRUDPagination } from '@/widgets/admin-crud/ui/CRUDPagination';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { GlobalUsersBentoHeader } from './components/GlobalUsersBentoHeader';
import { GlobalUserCard } from './components/GlobalUserCard';
import { GlobalUsersEmptyState } from './components/GlobalUsersEmptyState';
import { GlobalUsersTable } from './components/GlobalUsersTable';
import {
  GlobalUsersSearchInput,
  GlobalUsersBottomBar,
  type GlobalUsersViewMode,
} from './components/GlobalUsersToolbar';
import { UserDetailPanel } from './components/UserDetailPanel';
import { useGlobalUsers } from './hooks/useGlobalUsers';
import { useGlobalUsersFilters } from './hooks/useGlobalUsersFilters';
import type { UserWithProfile } from './types';

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const GlobalUsersPage = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { users, setUsers, loading, refresh } = useGlobalUsers();
  const {
    searchTerm,
    setSearchTerm,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    filteredUsers,
    hasActiveFilters,
    resetFilters,
  } = useGlobalUsersFilters(users);

  const [viewMode, setViewMode] = useGlobalViewMode('cards');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  // Estado de paginación
  const [pageSize, setPageSize] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);

  // Reiniciar a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  // Asegurar que la página no quede fuera de rango
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Usuarios paginados
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const applyAvatar = (userId: number, newAvatarUrl: string | null) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, avatar_url: newAvatarUrl || undefined } : u)));
    setSelectedUser((prev: any) =>
      prev && prev.id === userId ? { ...prev, avatar_url: newAvatarUrl || undefined } : prev
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
          Cargando directorio global de usuarios...
        </p>
      </div>
    );
  }

  return (
    <AppLayout
      className="px-3.5 sm:px-5 lg:px-7 xl:px-8 pt-3 sm:pt-4 max-w-full min-h-0 flex flex-col h-full pb-0"
      contentClassName="space-y-3 sm:space-y-4 flex flex-col flex-1 min-h-0"
      header={
        <PageHeader
          title="Usuarios de Todo el Sistema"
          description="Directorio maestro y control transversal de membresías en todas las fincas"
          icon={<ShieldCheck className="h-5 w-5 text-white" />}
          dense
          standardized
          className="mb-0 p-0"
          titleClassName="text-base sm:text-lg lg:text-xl"
          actions={
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <GlobalUsersSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="h-8 sm:h-9 px-3 text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground border-border/70 rounded-xl shadow-2xs shrink-0 cursor-pointer"
                title="Actualizar directorio global"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 text-emerald-600', loading && 'animate-spin')} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </div>
          }
          bottomBar={
            <GlobalUsersBottomBar
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              viewMode={viewMode as GlobalUsersViewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetFilters}
              filteredCount={filteredUsers.length}
              totalCount={users.length}
            />
          }
        />
      }
    >
      <div className="flex flex-col flex-1 min-h-0 mt-1 relative">
        <FloatingScrollArea
          containerClassName="flex-1 rounded-xl"
          horizontal={false}
          className="p-1 pb-20 md:pb-24"
        >
          {/* Métricas compactas de encabezado */}
          <GlobalUsersBentoHeader users={users} />

          {filteredUsers.length === 0 ? (
            <GlobalUsersEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters} />
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 [&>*]:min-w-0">
              {paginatedUsers.map((user) => (
                <GlobalUserCard key={user.id} user={user} onOpenDetail={(u) => setSelectedUser(u)} />
              ))}
            </div>
          ) : (
            <GlobalUsersTable
              users={paginatedUsers}
              totalUsers={users.length}
              onSelectUser={setSelectedUser}
            />
          )}
        </FloatingScrollArea>

        {/* Paginación flotante alineada al estándar de pantallas de datos */}
        {filteredUsers.length > 0 && (
          <CRUDPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            onPageChange={setCurrentPage}
            loading={loading}
            hasSelection={false}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            floating
          />
        )}
      </div>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent
          fullWidth
          className="h-[92dvh] max-h-[92dvh] min-h-0 max-w-6xl overflow-hidden bg-card p-3 shadow-2xl border-border/80 rounded-2xl sm:p-4"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Perfil Completo de {selectedUser?.fullname}</DialogTitle>
            <DialogDescription>
              Detalles completos, membresías, trazabilidad y actividad de {selectedUser?.fullname}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <UserDetailPanel
              item={selectedUser}
              currentUser={currentUser}
              navigate={navigate}
              onClose={() => setSelectedUser(null)}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
              onStartChat={(u) => openFloatingChat({ id: Number(u.id), fullname: u.fullname, role: u.role })}
              onAvatarUpdated={applyAvatar}
            />
          )}
        </DialogContent>
      </Dialog>

      <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </AppLayout>
  );
};

export default GlobalUsersPage;
