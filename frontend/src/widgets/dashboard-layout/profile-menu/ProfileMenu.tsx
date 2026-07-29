import React from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { ProfileFincaItems } from './ProfileFincaItems';
import { LogoutItem, ProfileLink, ProfileSummary, ThemeItem } from './ProfileMenuTop';
import { ProfileTrigger } from './ProfileTrigger';

/**
 * Menú de la foto de perfil: reúne todo lo que no es navegación (cuenta, tema,
 * cambio de finca y salir) para que el menú hamburguesa quede solo con la lista
 * de secciones.
 */
const ProfileMenu: React.FC = () => {
  const { user, logout } = useAuth() as any;
  const fincas: any[] = Array.isArray(user?.fincas) ? user.fincas : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ProfileTrigger avatarUrl={user?.avatar_url} fullname={user?.fullname} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-[1100] mt-2 w-64 rounded-2xl border border-border/50 bg-card/95 p-2 shadow-2xl backdrop-blur-xl"
      >
        <ProfileSummary fullname={user?.fullname} role={user?.role} fincaName={user?.finca_name} />
        <DropdownMenuSeparator />

        <ProfileLink />
        <ThemeItem />

        {fincas.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <ProfileFincaItems fincas={fincas} activeFincaId={user?.finca_id} />
          </>
        )}

        <DropdownMenuSeparator />
        <LogoutItem onLogout={logout} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
