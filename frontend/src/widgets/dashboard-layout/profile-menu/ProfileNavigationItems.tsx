import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBellRinging,
  IconBuildingCottage,
  IconCalendarEvent,
  IconMessageCircle,
} from '@/shared/ui/icons';
import { useAuth } from '@/features/auth/model/useAuth';
import { useUnreadMessages } from '@/features/chat/hooks/useUnreadMessages';
import { useRealtimeNotifications } from '@/shared/hooks/useRealtimeNotifications';
import { DropdownMenuItem, DropdownMenuLabel } from '@/shared/ui/dropdown-menu';
import { getRolePrefix } from '@/shared/utils/roleRoutes';

interface MainAccess {
  label: string;
  description: string;
  icon: ElementType;
  path: string;
  badge?: number;
}

function buildMainAccesses(rolePrefix: string, unreadAlerts: number, unreadMessages: number): MainAccess[] {
  return [
    {
      label: 'Mi finca',
      description: 'Resumen y trabajo de hoy',
      icon: IconBuildingCottage,
      path: `${rolePrefix}/dashboard`,
    },
    {
      label: 'Alertas',
      description: 'Novedades que requieren atención',
      icon: IconBellRinging,
      path: '/alerts',
      badge: unreadAlerts,
    },
    {
      label: 'Calendario',
      description: 'Tareas y eventos programados',
      icon: IconCalendarEvent,
      path: `${rolePrefix}/calendar`,
    },
    {
      label: 'Mensajes',
      description: 'Conversaciones con el equipo',
      icon: IconMessageCircle,
      path: '/chat',
      badge: unreadMessages,
    },
  ];
}

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;

  return (
    <span className="ml-auto flex min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-black text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Los cuatro destinos de consulta diaria viven en un único lugar estable:
 * el menú de la foto del usuario.
 */
export function ProfileNavigationItems() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const rolePrefix = getRolePrefix(user?.role);
  const { unreadCount: unreadMessages } = useUnreadMessages(60000);
  const { unreadCount: unreadAlerts } = useRealtimeNotifications();
  const accesses = buildMainAccesses(rolePrefix, unreadAlerts, unreadMessages);

  return (
    <>
      <DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        Accesos principales
      </DropdownMenuLabel>

      <div className="grid gap-1">
        {accesses.map(({ label, description, icon: Icon, path, badge }) => (
          <DropdownMenuItem
            key={path}
            onClick={() => navigate(path)}
            className="min-h-[52px] cursor-pointer gap-3 rounded-xl px-3 py-2.5 focus:bg-primary/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black leading-tight text-foreground">{label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                {description}
              </span>
            </span>
            <CountBadge count={badge} />
          </DropdownMenuItem>
        ))}
      </div>
    </>
  );
}
