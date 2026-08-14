import { MessagesSquare } from 'lucide-react';
import { UserActionsMenu } from '@/widgets/dashboard/UserActionsMenu';
import { getChatAvailability } from '../utils/user.utils';
import type { UserWithProfile } from '../types';
import type { User } from '@/entities/user/model/types';

interface UserCustomActionsProps {
  item: UserWithProfile;
  currentUser: User | null;
  contactIds: Set<number> | null;
  onOpenChat: (user: UserWithProfile) => void;
}

export function UserCustomActions({ item, currentUser, contactIds, onOpenChat }: UserCustomActionsProps) {
  const chat = getChatAvailability(item, currentUser, contactIds);
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={!chat.enabled} title={chat.reason} aria-label={chat.reason} onClick={(event) => { event.stopPropagation(); if (chat.enabled) onOpenChat(item); }} className="icon-btn p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted-foreground">
        <MessagesSquare className="h-4 w-4" />
      </button>
      <UserActionsMenu user={item} />
    </div>
  );
}
