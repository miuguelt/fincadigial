import { QuickChatPanel } from '@/features/chat/components/QuickChatPanel';
import { usersService } from '@/entities/user/api/user.service';
import { ImageLightbox } from '@/shared/ui/common/ImageLightbox';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { UsersBentoHeader } from './components/UsersBentoHeader';
import { UserCard } from './components/UserCard';
import { UserCustomActions } from './components/UserCustomActions';
import { UserCustomDetail } from './components/UserCustomDetail';
import { UserPageToolbar } from './components/UserPageToolbar';
import { useAdminUsersPage } from './hooks/useAdminUsersPage';
import { crudConfig, initialFormData, mapResponseToForm, validateForm } from './config/crud.config';

function AdminUsersPageWrapper() {
  const page = useAdminUsersPage();
  const {
    viewMode,
    setViewMode,
    items,
    setItems,
    currentUser,
    chatContactIds,
    chatContact,
    setChatContact,
    previewImage,
    setPreviewImage,
    resolveAvatar,
    handleAvatarUpdated,
    openChatWith,
    columns,
    manageableFincaIds,
    navigate,
  } = page;

  return (
    <>
      <AdminCRUDPage
        config={{
          ...crudConfig,
          columns,
          customActions: (item) => <UserCustomActions item={item} currentUser={currentUser} contactIds={chatContactIds} onOpenChat={openChatWith} />,
          customToolbar: <UserPageToolbar viewMode={viewMode} onViewModeChange={setViewMode} onOpenChat={() => navigate('/chat')} />,
          customHeader: <UsersBentoHeader items={items} />,
          viewMode,
          renderCard: (item, openDetail) => <UserCard user={item} currentUser={currentUser} chatContactIds={chatContactIds} resolveAvatar={resolveAvatar} onAvatarUpdated={handleAvatarUpdated} onOpenChat={openChatWith} onOpenDetail={openDetail} />,
          cardGridClassName: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
        }}
        customDetailContent={(item) => <UserCustomDetail item={item} currentUser={currentUser} navigate={navigate} onPreviewImage={(url, title) => setPreviewImage({ url, title })} onStartChat={openChatWith} chatContactIds={chatContactIds} manageableFincaIds={manageableFincaIds} onAvatarUpdated={handleAvatarUpdated} resolveAvatar={resolveAvatar} />}
        service={usersService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        realtime
        onItemsChange={setItems}
        refetchOnReconnect
        enhancedHover
      />
      <QuickChatPanel contact={chatContact} onClose={() => setChatContact(null)} />
      <ImageLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}

const AdminUsersPage = () => <AdminUsersPageWrapper />;

export default AdminUsersPage;
