import React from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { ProfileFincaItems } from './ProfileFincaItems';
import { ProfileNavigationItems } from './ProfileNavigationItems';
import { LogoutItem, ProfileLink, ProfileSummary, ThemeItem } from './ProfileMenuTop';
import { ProfileTrigger } from './ProfileTrigger';

interface ProfileViewModel {
  fullname?: string;
  role?: string;
  fincaName?: string;
  avatarUrl?: string | null;
  activeFincaId?: number | null;
  fincas: any[];
}

function getProfileViewModel(user: any): ProfileViewModel {
  return {
    fullname: user?.fullname,
    role: user?.role,
    fincaName: user?.finca_name,
    avatarUrl: user?.avatar_url,
    activeFincaId: user?.finca_id,
    fincas: Array.isArray(user?.fincas) ? user.fincas : [],
  };
}

/**
 * Centro personal: reúne los accesos de consulta diaria, la cuenta, el cambio
 * de finca y la salida. El menú lateral queda dedicado a módulos de trabajo.
 */
const ProfileMenu: React.FC = () => {
  const { user, logout } = useAuth() as any;
  const profile = getProfileViewModel(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ProfileTrigger avatarUrl={profile.avatarUrl} fullname={profile.fullname} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[1100] max-h-[calc(100vh-5rem)] w-[min(21rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-2xl"
      >
        <ProfileSummary fullname={profile.fullname} role={profile.role} fincaName={profile.fincaName} />
        <DropdownMenuSeparator />

        {profile.activeFincaId && (
          <>
            <ProfileNavigationItems />
            <DropdownMenuSeparator />
          </>
        )}

        <ProfileLink />
        <ThemeItem />

        {profile.fincas.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <ProfileFincaItems fincas={profile.fincas} activeFincaId={profile.activeFincaId} />
          </>
        )}

        <DropdownMenuSeparator />
        <LogoutItem onLogout={logout} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
