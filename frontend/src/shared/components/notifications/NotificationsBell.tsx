import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { cn } from '@/shared/ui/cn';

interface NotificationsBellProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ onClick, className }) => {
  const { totalPending } = useNotifications();

  return (
    <button 
      className={cn("relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary", className)}
      onClick={onClick}
      title="Notificaciones"
    >
      <Bell size={20} />
      {totalPending > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center shadow-sm">
          {totalPending > 99 ? "99+" : totalPending}
        </span>
      )}
    </button>
  );
};
