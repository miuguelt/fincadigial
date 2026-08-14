import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { invitationService, InvitationListItem } from '@/features/invitations/api/invitation.service';
import { Loader2, Check, X, Clock, Copy } from 'lucide-react';

interface PendingRequestsProps {
  onActionComplete?: () => void;
}

export const PendingRequests = ({ onActionComplete }: PendingRequestsProps) => {
  const [pending, setPending] = useState<{ sent: InvitationListItem[]; received: InvitationListItem[] }>({
    sent: [],
    received: [],
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchPending = useCallback(async () => {
    try {
      const response = await invitationService.getPending();
      setPending(response.data);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las invitaciones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleRespond = async (id: number, approve: boolean) => {
    setProcessing(id);
    try {
      await invitationService.respond(id, approve);
      toast({
        title: approve ? 'Invitación aceptada' : 'Invitación rechazada',
        description: approve ? 'Te has unido a la finca exitosamente.' : 'Has declinado la invitación.',
      });
      fetchPending();
      onActionComplete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo procesar',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (id: number) => {
    setProcessing(id);
    try {
      await invitationService.cancel(id);
      toast({ title: 'Invitación cancelada' });
      fetchPending();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const statusBadge = (status: string, isExpired: boolean) => {
    if (isExpired) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Expirada</span>;
    }
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {pending.received.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Invitaciones recibidas ({pending.received.length})
          </h3>
          <div className="space-y-2">
            {pending.received.map((inv) => (
              <div key={inv.id} className="p-4 bg-card rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.finca_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rol: {inv.requested_role} &middot; Expira: {inv.expires_at ? formatDate(inv.expires_at) : 'Nunca'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(inv.status, inv.is_expired)}
                  </div>
                </div>
                {inv.status === 'pending' && !inv.is_expired && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={processing === inv.id}
                      onClick={() => handleRespond(inv.id, true)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing === inv.id}
                      onClick={() => handleRespond(inv.id, false)}
                    >
                      <X className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.sent.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Invitaciones enviadas ({pending.sent.length})</h3>
          <div className="space-y-2">
            {pending.sent.map((inv) => (
              <div key={inv.id} className="p-4 bg-card rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.user_fullname}</p>
                    <p className="text-sm text-muted-foreground">
                      {inv.user_email} &middot; Rol: {inv.requested_role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(inv.status, inv.is_expired)}
                    <Button variant="ghost" size="sm" onClick={() => copyLink(inv.id.toString())}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {inv.status === 'pending' && !inv.is_expired && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === inv.id}
                    onClick={() => handleCancel(inv.id)}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.received.length === 0 && pending.sent.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay invitaciones pendientes</p>
        </div>
      )}
    </div>
  );
};
