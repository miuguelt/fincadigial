import { useState } from 'react';
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
import { QuickChatPanel } from '@/features/chat/components/QuickChatPanel';
import { ImageLightbox } from '@/shared/ui/common/ImageLightbox';
import { GlobalUsersBentoHeader } from './components/GlobalUsersBentoHeader';
import { GlobalUserCard } from './components/GlobalUserCard';
import { GlobalUsersEmptyState } from './components/GlobalUsersEmptyState';
import { GlobalUsersTable } from './components/GlobalUsersTable';
import { GlobalUsersToolbar, type GlobalUsersViewMode } from './components/GlobalUsersToolbar';
import { UserDetailPanel } from './components/UserDetailPanel';
import { useGlobalUsers } from './hooks/useGlobalUsers';
import { useGlobalUsersFilters } from './hooks/useGlobalUsersFilters';
import type { UserWithProfile } from './types';

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

  const [viewMode, setViewMode] = useState<GlobalUsersViewMode>('cards');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [chatContact, setChatContact] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in pb-16 w-full">
      <GlobalUsersBentoHeader users={users} loading={loading} onRefresh={refresh} />

      <GlobalUsersToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {filteredUsers.length === 0 ? (
        <GlobalUsersEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters} />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-4 sm:gap-6 [&>*]:min-w-0">
          {filteredUsers.map((user) => (
            <GlobalUserCard key={user.id} user={user} onOpenDetail={(u) => setSelectedUser(u)} />
          ))}
        </div>
      ) : (
        <GlobalUsersTable
          users={filteredUsers}
          totalUsers={users.length}
          onSelectUser={setSelectedUser}
        />
      )}

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent
          fullWidth
          className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-card border-border/80 shadow-2xl rounded-2xl"
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
              onStartChat={(u) => setChatContact(u)}
              onAvatarUpdated={applyAvatar}
            />
          )}
        </DialogContent>
      </Dialog>

      <QuickChatPanel contact={chatContact} onClose={() => setChatContact(null)} />
      <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

export default GlobalUsersPage;
