import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { useAuth } from '@/features/auth/model/useAuth';
import { useChatContacts } from '@/features/chat/hooks/useChatContacts';
import type { QuickChatContact } from '@/features/chat/components/QuickChatPanel';
import type { LightboxImage } from '@/shared/ui/common/ImageLightbox';
import type { UserWithProfile } from '../types';
import type { User } from '@/entities/user/model/types';
import { getUserFincas } from '../utils/user.utils';
import { buildColumns } from '../config/columns';

const getManageableFincaIds = (user: User | null) => {
  const ids = new Set<number>();
  const active = Number(user?.finca_id ?? user?.active_finca_id ?? user?.current_finca_id);
  if (Number.isFinite(active) && active > 0) ids.add(active);
  getUserFincas((user ?? {}) as UserWithProfile).forEach((finca) => {
    const id = Number(finca.finca_id ?? finca.id);
    if (Number.isFinite(id) && id > 0 && finca.is_active !== false) ids.add(id);
  });
  return ids;
};

export function useAdminUsersPage() {
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [items, setItems] = useState<UserWithProfile[]>([]);
  const [chatContact, setChatContact] = useState<QuickChatContact | null>(null);
  const [previewImage, setPreviewImage] = useState<LightboxImage | null>(null);
  const [avatarOverrides, setAvatarOverrides] = useState<Record<number, string | null>>({});
  const { user: currentUser } = useAuth();
  const { contactIds: chatContactIds } = useChatContacts();
  const navigate = useNavigate();

  const resolveAvatar = useCallback((user: UserWithProfile) => {
    const override = avatarOverrides[Number(user.id)];
    return override !== undefined ? override : user.avatar_url;
  }, [avatarOverrides]);

  const handleAvatarUpdated = useCallback((userId: number, avatarUrl: string | null) => {
    setAvatarOverrides((previous) => ({ ...previous, [userId]: avatarUrl }));
  }, []);

  const openChatWith = useCallback((user: UserWithProfile) => {
    setChatContact({ id: Number(user.id), fullname: user.fullname || `Usuario ${user.id}`, role: user.role, avatarUrl: resolveAvatar(user) });
  }, [resolveAvatar]);

  const columns = useMemo(() => buildColumns(resolveAvatar), [resolveAvatar]);
  const manageableFincaIds = useMemo(() => getManageableFincaIds(currentUser), [currentUser]);

  return {
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
  };
}
