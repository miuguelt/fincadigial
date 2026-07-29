import React from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnreadMessages } from '@/features/chat/hooks/useUnreadMessages';
import { NotificationsPanel } from '@/shared/components/notifications';
import HeaderQuickActions from './HeaderQuickActions';

const ICON_BUTTON =
  'relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary';

/** Acciones de finca del encabezado: atajos, notificaciones, mercado y chat. */
const HeaderActions: React.FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(60000);

  return (
    <div className="flex items-center gap-0.5">
      <HeaderQuickActions />
      <NotificationsPanel />

      <button
        type="button"
        onClick={() => navigate('/campesino/market-offers')}
        className={`${ICON_BUTTON} hidden sm:flex`}
        title="Mercado"
        aria-label="Mercado campesino"
      >
        <ShoppingBag className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/chat')}
        className={ICON_BUTTON}
        title="Mensajes"
        aria-label="Mensajes"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default HeaderActions;
