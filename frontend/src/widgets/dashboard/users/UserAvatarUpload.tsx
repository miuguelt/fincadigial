import React from 'react';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import { Button } from '@/shared/ui/button';
import { IconCamera, IconTrash, IconCheck, IconX, IconUser } from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';
import { useAuth } from '@/features/auth/model/useAuth';

interface UserAvatarUploadProps {
  userId: number;
  currentAvatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUpdate?: (newUrl: string | null) => void;
  /** Cuando es false sólo se muestra la foto: sin overlay ni botones. */
  editable?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-32 h-32 text-3xl',
};

export function UserAvatarUpload({
  userId,
  currentAvatarUrl,
  firstName = '',
  lastName = '',
  size = 'lg',
  onUpdate,
  editable = true,
}: UserAvatarUploadProps) {
  const { user: currentUser, refreshUserData } = useAuth(); // Para invalidar cache global
  const initials = (firstName[0] || '') + (lastName[0] || '');
  const [deleting, setDeleting] = React.useState(false);
  // La URL confirmada por el backend manda sobre la prop: evita que la tarjeta
  // vuelva a la foto anterior mientras la lista no se ha refrescado.
  const [savedUrl, setSavedUrl] = React.useState<string | null | undefined>(currentAvatarUrl);

  React.useEffect(() => { setSavedUrl(currentAvatarUrl); }, [currentAvatarUrl]);

  // El backend sólo permite tocar el avatar propio o, si eres Administrador, el de cualquiera.
  const canEdit =
    editable &&
    (Number(currentUser?.id) === Number(userId) || currentUser?.role === 'Administrador');

  // Color determinístico para fondo de avatar
  const getBackgroundColor = (id: number) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
    return colors[id % colors.length];
  };

  const {
    files,
    uploading,
    progress,
    fileInputRef,
    handleFileChange,
    clearFiles,
    upload,
  } = useImageUpload({
    // baseURL del cliente ya es /api/v1: el path debe ser relativo a ella.
    endpoint: `/users/${userId}/avatar`,
    onSuccess: (data) => {
      const newUrl = data?.data?.avatar_url ?? data?.avatar_url ?? null;
      setSavedUrl(newUrl);
      if (onUpdate) onUpdate(newUrl);
      if (Number(currentUser?.id) === Number(userId) && refreshUserData) refreshUserData();
    },
  });

  const previewUrl = files[0]?.preview || savedUrl;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileChange(e.target.files);
    }
  };

  const handleDeleteAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      const { apiClient } = await import('@/shared/api/client');
      await apiClient.delete(`/users/${userId}/avatar`);
      setSavedUrl(null);
      if (onUpdate) onUpdate(null);
      if (Number(currentUser?.id) === Number(userId) && refreshUserData) refreshUserData();
    } catch (error) {
      console.error('Error deleting avatar', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div
        className={cn(
          "relative group rounded-full overflow-hidden border-4 border-[var(--color-surface-raised)] shadow-xl",
          sizeClasses[size],
          !previewUrl && getBackgroundColor(userId)
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white uppercase">
            {initials || <IconUser size={size === 'xl' ? 48 : 24} />}
          </div>
        )}

        {/* Overlay en Hover */}
        {canEdit && !uploading && (
          <button
            type="button"
            aria-label="Cambiar foto de perfil"
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <IconCamera size={size === 'sm' ? 14 : 24} className="text-white mb-1" />
            {size !== 'sm' && (
              <span className="text-[11px] font-bold text-white uppercase">Cambiar</span>
            )}
          </button>
        )}

        {/* Progreso de subida */}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-full px-4">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}

      {/* Botones de acción cuando hay una nueva imagen seleccionada */}
      {canEdit && files.length > 0 && !uploading && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full h-8 w-8 p-0"
            onClick={(e) => { e.stopPropagation(); clearFiles(); }}
          >
            <IconX size={14} />
          </Button>
          <Button
            size="sm"
            className="rounded-full h-8 px-3 gap-1"
            onClick={(e) => { e.stopPropagation(); upload(); }}
          >
            <IconCheck size={14} />
            Guardar
          </Button>
        </div>
      )}

      {/* Eliminar sólo en las vistas grandes: en las tarjetas el texto rompe el layout */}
      {canEdit && savedUrl && files.length === 0 && !uploading && (size === 'lg' || size === 'xl') && (
        <Button
          variant="ghost"
          size="sm"
          disabled={deleting}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors gap-1"
          onClick={handleDeleteAvatar}
        >
          <IconTrash size={12} />
          {deleting ? 'Eliminando...' : 'Eliminar foto'}
        </Button>
      )}
    </div>
  );
}
