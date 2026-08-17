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
import { FarmSearchCombobox } from '@/shared/components/FarmSearchCombobox';
import { IconSend, IconLoader2 } from '@/shared/ui/icons';
import { apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

interface JoinFarmRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JoinFarmRequestModal({
  isOpen,
  onClose,
  onSuccess
}: JoinFarmRequestModalProps) {
  const { showToast } = useToast();
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!selectedFarm) {
      showToast('Seleccione una finca', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/api/v1/invitations/request-join`, {
        finca_id: selectedFarm.id,
        message
      });

      showToast(`Solicitud enviada a ${selectedFarm.name}`, 'success');
      if (onSuccess) onSuccess();
      onClose();
      // Reset
      setSelectedFarm(null);
      setMessage('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al enviar solicitud';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Unión a Finca</DialogTitle>
          <DialogDescription>
            Busca la finca a la que deseas unirte y envía un mensaje de presentación al administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Finca</Label>
            <FarmSearchCombobox onSelect={setSelectedFarm} />
          </div>

          <div className="grid gap-2">
            <Label>Mensaje de presentación</Label>
            <Textarea
              placeholder="Hola, me gustaría unirme a tu finca para colaborar en..."
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
          <Button onClick={handleSendRequest} disabled={loading || !selectedFarm}>
            {loading ? (
              <IconLoader2 className="animate-spin mr-2" size={16} />
            ) : (
              <IconSend className="mr-2" size={16} />
            )}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
