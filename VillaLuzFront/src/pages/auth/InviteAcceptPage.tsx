import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { AuthContext } from '@/app/providers/AuthenticationContext';
import { invitationService, TokenValidation } from '@/features/invitations/api/invitation.service';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated || false;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [validating, setValidating] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validation, setValidation] = useState<TokenValidation | null>(null);

  useEffect(() => {
    if (!token) return;
    const validate = async () => {
      try {
        const response = await invitationService.validateToken(token);
        setValidation(response.data);
      } catch {
        setValidation({ valid: false, reason: 'Error de validación' });
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      await invitationService.acceptByToken(token);
      toast({
        title: '¡Bien!',
        description: 'Te has unido a la finca exitosamente.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo aceptar la invitación',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/auth/login', { state: { redirectTo: `/invite/${token}` } });
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validando invitación...</p>
        </div>
      </div>
    );
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border p-6 text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">Invitación no válida</h2>
          <p className="text-muted-foreground">
            {validation?.reason === 'expired'
              ? 'Esta invitación ha expirado. Solicita una nueva al administrador de la finca.'
              : 'Esta invitación no existe o ya fue utilizada.'}
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border p-6 space-y-6">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-success" />
          <h2 className="text-xl font-bold mt-4">¡Has sido invitado!</h2>
          <p className="text-muted-foreground mt-2">
            Te han invitado a unirte a <strong>{validation.finca_name}</strong> como{' '}
            <strong>{validation.role}</strong>.
          </p>
        </div>

        {validation.expires_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <AlertCircle className="h-4 w-4" />
            <span>Expira: {new Date(validation.expires_at).toLocaleDateString('es-CO')}</span>
          </div>
        )}

        {isAuthenticated ? (
          <Button onClick={handleAccept} disabled={processing} className="w-full">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Aceptar invitación'
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={handleLoginRedirect} className="w-full">
              Iniciar sesión para aceptar
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Debes iniciar sesión con la cuenta asociada a esta invitación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteAcceptPage;
