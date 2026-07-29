import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  avatarUrl?: string | null;
  fullname?: string;
}

/**
 * Foto de perfil del encabezado. Es `forwardRef` porque Radix la usa como
 * disparador del menú (`asChild`) y necesita la referencia al botón real.
 */
export const ProfileTrigger = React.forwardRef<HTMLButtonElement, Props>(
  ({ avatarUrl, fullname, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-primary to-primary-light font-bold text-white shadow-md transition hover:scale-105"
      aria-label="Abrir menú de perfil"
      title="Mi cuenta"
      {...props}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={fullname || 'Perfil'} className="h-full w-full object-cover" />
      ) : fullname?.[0] ? (
        <span className="text-sm uppercase">{fullname[0]}</span>
      ) : (
        <UserIcon className="h-5 w-5" />
      )}
    </button>
  ),
);

ProfileTrigger.displayName = 'ProfileTrigger';
