import { LogOut, Moon, Sun, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/app/providers/ThemeContext';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';

export const PROFILE_ITEM =
  'flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-semibold';

/** Cabecera del menú: quién eres y en qué finca estás trabajando. */
export function ProfileSummary({
  fullname,
  role,
  fincaName,
}: {
  fullname?: string;
  role?: string;
  fincaName?: string;
}) {
  return (
    <div className="px-3 py-2">
      <p className="fit-clamp text-sm font-black text-foreground">{fullname || 'Mi cuenta'}</p>
      <p className="fit-clamp text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {role}
      </p>
      {fincaName && <p className="mt-1 fit-clamp text-xs text-muted-foreground">{fincaName}</p>}
    </div>
  );
}

export function ProfileLink() {
  const navigate = useNavigate();
  return (
    <DropdownMenuItem onClick={() => navigate('/profile')} className={PROFILE_ITEM}>
      <UserCog className="h-4 w-4 text-primary" />
      Mi perfil
    </DropdownMenuItem>
  );
}

/** Cambio de tema sin cerrar el menú, para poder comparar claro y oscuro. */
export function ThemeItem() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        setTheme(isDark ? 'light' : 'dark');
      }}
      className={PROFILE_ITEM}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-primary" />}
      {isDark ? 'Modo claro' : 'Modo oscuro'}
    </DropdownMenuItem>
  );
}

export function LogoutItem({ onLogout }: { onLogout?: () => void }) {
  return (
    <DropdownMenuItem
      onClick={() => onLogout?.()}
      className={`${PROFILE_ITEM} text-destructive focus:bg-destructive focus:text-white`}
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </DropdownMenuItem>
  );
}
