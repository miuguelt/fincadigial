import { UserDetailPanel } from './UserDetailPanel';
import type { UserWithProfile } from '../types';
import type { User } from '@/entities/user/model/types';
import type { NavigateFunction } from 'react-router-dom';

interface UserCustomDetailProps {
  item: UserWithProfile;
  currentUser: User | null;
  navigate: NavigateFunction;
  onPreviewImage: (url: string, title?: string) => void;
  onStartChat: (user: UserWithProfile) => void;
  chatContactIds: Set<number> | null;
  manageableFincaIds: Set<number>;
  onAvatarUpdated: (userId: number, avatarUrl: string | null) => void;
  resolveAvatar: (user: UserWithProfile) => string | null | undefined;
}

export function UserCustomDetail({ item, currentUser, navigate, onPreviewImage, onStartChat, chatContactIds, manageableFincaIds, onAvatarUpdated, resolveAvatar }: UserCustomDetailProps) {
  return <UserDetailPanel item={{ ...item, avatar_url: resolveAvatar(item) }} currentUser={currentUser} navigate={navigate} onPreviewImage={onPreviewImage} onStartChat={onStartChat} chatContactIds={chatContactIds} manageableFincaIds={manageableFincaIds} onAvatarUpdated={onAvatarUpdated} />;
}
