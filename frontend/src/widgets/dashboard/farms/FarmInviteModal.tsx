import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui/select';
import { UserSearchCombobox } from '@/shared/components/UserSearchCombobox';
import { IconSend, IconLoader2 } from '@/shared/ui/icons';
import { apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

interface FarmInviteModalProps {
  farmId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLES = [
  { value: 'Operario', label: 'Operario' },
  { value: 'Capataz', label: 'Capataz' },
  { value: 'Veterinario', label: 'Veterinario' },
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Instructor', label: 'Instructor' },
  { value: 'Aprendiz', label: 'Aprendiz' },
];

export function FarmInviteModal({
  farmId,
  isOpen,
  onClose,
  onSuccess
}: FarmInviteModalProps) {
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState('Operario');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendInvite = async () => {
    if (!selectedUser) {
      showToast('Seleccione un usuario', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/api/v1/invitations/create`, {
        finca_id: farmId,
        user_id: selectedUser.id,
        role,
        notes: message,
        method: 'link'
      });

      showToast(`Invitación enviada a ${selectedUser.full_name}`, 'success');
      if (onSuccess) onSuccess();
      onClose();
      // Reset
      setSelectedUser(null);
      setMessage('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al enviar invitación';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitar a la Finca</DialogTitle>
          <DialogDescription>
            Busca un usuario por su nombre o correo para enviarle una invitación.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Usuario</Label>
            <UserSearchCombobox onSelect={setSelectedUser} />
          </div>

          <div className="grid gap-2">
            <Label>Rol asignado</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Mensaje (opcional)</Label>
            <Textarea
              placeholder="Hola, te invito a gestionar esta finca conmigo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
            />
            <span className="text-[11px] text-right text-[var(--color-text-muted)]">
              {message.length}/280
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSendInvite} disabled={loading || !selectedUser}>
            {loading ? (
              <IconLoader2 className="animate-spin mr-2" size={16} />
            ) : (
              <IconSend className="mr-2" size={16} />
            )}
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
