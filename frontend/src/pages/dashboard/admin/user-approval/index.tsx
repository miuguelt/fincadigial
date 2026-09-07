import { useState, useEffect } from 'react';
import { usersService } from '@/entities/user/api/user.service';
import { useCallback } from 'react';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { FaCheck, FaTimes, FaUserCheck, FaCalendarAlt, FaEnvelope, FaIdCard } from 'react-icons/fa';
import { ClimbingBoxLoader } from 'react-spinners';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/widgets/feedback/EmptyState';

const UserApprovalPage = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [requireVerification, setRequireVerification] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const resp = await usersService.getVerificationConfig();
      setRequireVerification(Boolean(resp?.require_user_verification));
    } catch (err) {
      console.error('Error fetching verification config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersService.getPendingApproval();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios pendientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfig();
    fetchPendingUsers();
  }, [fetchConfig, fetchPendingUsers]);

  const handleToggleVerification = async (checked: boolean) => {
    setUpdatingConfig(true);
    try {
      await usersService.updateVerificationConfig(checked);
      setRequireVerification(checked);
      toast({
        title: checked ? 'Verificación manual activada' : 'Auto-activación habilitada',
        description: checked
          ? 'Los nuevos usuarios registrados quedarán pendientes hasta que los apruebes.'
          : 'Los nuevos usuarios registrados quedarán activos automáticamente con acceso completo.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo actualizar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await usersService.updateApprovalStatus(userId, 'Approved');
      toast({
        title: 'Usuario aprobado',
        description: 'El usuario ahora puede iniciar sesión en el sistema.',
        variant: 'default',
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 403 || status === 401) return;
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'No se pudo aprobar el usuario.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    setActionLoading(userId);
    try {
      await usersService.updateApprovalStatus(userId, 'Rejected');
      toast({
        title: 'Usuario rechazado',
        description: 'Se ha denegado el acceso al usuario.',
        variant: 'default',
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 403 || status === 401) return;
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'No se pudo rechazar el usuario.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-success font-medium">Buscando usuarios pendientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-success flex items-center gap-2">
            <FaUserCheck className="text-success" />
            Aprobaciones Pendientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Revisa y aprueba los nuevos usuarios registrados en el sistema.
          </p>
        </div>
        <Badge variant="outline" className="text-success border-success/30 bg-success/5 self-start md:self-center py-1 px-3">
          {users.length} Pendientes
        </Badge>
      </div>

      {/* Control administrativo de verificación de nuevos usuarios */}
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Verificación previa de nuevos usuarios</span>
              <Badge
                variant={requireVerification ? "default" : "secondary"}
                className={requireVerification ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}
              >
                {requireVerification ? "Activada" : "Desactivada (Inicio Rápido)"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {requireVerification
                ? "Los nuevos usuarios registrados quedarán en estado 'Pendiente' hasta que un administrador los apruebe."
                : "Todo usuario que se registre queda activo de inmediato y tiene acceso a todas las funcionalidades."}
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <Switch
              checked={requireVerification}
              onCheckedChange={handleToggleVerification}
              disabled={loadingConfig || updatingConfig}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-100 shadow-sm">
        <CardHeader className="bg-success/5/50">
          <CardTitle className="text-lg text-success">Bandeja de Aprobación</CardTitle>
          <CardDescription>Valida la identidad de los solicitantes antes de aprobarlos.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState
              icon="IconClockCheck"
              title="Todo al día"
              description="No hay solicitudes pendientes por revisar."
              actionLabel="Actualizar bandeja"
              onAction={fetchPendingUsers}
              className="py-12 border-none bg-transparent"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-success/5/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{user.fullname}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FaIdCard className="text-[11px]" /> {user.identification}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FaEnvelope className="text-[11px]" /> {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-info/5 text-info border-blue-100">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FaCalendarAlt className="text-muted-foreground" />
                        {user.created_at
                          ? format(new Date(user.created_at), "d 'de' MMMM, yyyy", { locale: es })
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="bg-success hover:bg-green-700 h-8 w-8 p-0 rounded-full shadow-sm"
                          title="Aprobar"
                        >
                          <FaCheck className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(user.id)}
                          disabled={actionLoading === user.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/5 h-8 w-8 p-0 rounded-full"
                          title="Rechazar"
                        >
                          <FaTimes className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalPage;
