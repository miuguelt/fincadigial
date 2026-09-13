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
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';

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
    <div className="min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in">
      <DataScreenHeader
        icon={<FaUserCheck className="h-5 w-5 text-white" />}
        title="Aprobaciones Pendientes"
        description="Revisa y aprueba los nuevos usuarios registrados en el sistema."
        actions={
          <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 py-1.5 px-3.5 rounded-full font-bold text-xs shadow-xs">
            {users.length} {users.length === 1 ? 'Pendiente' : 'Pendientes'}
          </Badge>
        }
      />

      {/* Control administrativo de verificación de nuevos usuarios */}
      <Card className="border-border/70 shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm sm:text-base">Verificación previa de nuevos usuarios</span>
              <Badge
                variant={requireVerification ? "default" : "secondary"}
                className={requireVerification ? "bg-amber-600 text-white font-semibold" : "bg-muted text-muted-foreground font-semibold"}
              >
                {requireVerification ? "Activada" : "Desactivada (Inicio Rápido)"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {requireVerification
                ? "Los nuevos usuarios registrados quedarán en estado 'Pendiente' hasta que un administrador los apruebe."
                : "Todo usuario que se registre queda activo de inmediato y tiene acceso a todas las funcionalidades."}
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <Switch
              checked={requireVerification}
              onCheckedChange={handleToggleVerification}
              disabled={loadingConfig || updatingConfig}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 bg-muted/30 border-b border-border/50">
          <CardTitle className="text-lg font-bold text-foreground">Bandeja de Aprobación</CardTitle>
          <CardDescription>Valida la identidad de los solicitantes antes de aprobarlos.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
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
            <>
              {/* Vista Móvil: Tarjetas independientes con botones táctiles */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-emerald-500/30 transition-all space-y-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-base">{user.fullname}</h4>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FaIdCard className="text-muted-foreground/70 shrink-0" />
                            <span>{user.identification || 'Sin documento'}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 break-anywhere">
                            <FaEnvelope className="text-muted-foreground/70 shrink-0" />
                            <span>{user.email || 'Sin correo'}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-info/10 text-info border-blue-200/50 shrink-0">
                        {user.role}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <FaCalendarAlt className="text-muted-foreground/70" />
                      <span>
                        {user.created_at
                          ? format(new Date(user.created_at), "d 'de' MMMM, yyyy", { locale: es })
                          : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                        className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm gap-2"
                      >
                        <FaCheck className="h-3.5 w-3.5" />
                        <span>Aprobar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(user.id)}
                        disabled={actionLoading === user.id}
                        className="flex-1 min-h-[44px] border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold rounded-xl gap-2"
                      >
                        <FaTimes className="h-3.5 w-3.5" />
                        <span>Rechazar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Escritorio: Tabla con contenedor de desplazamiento limpio */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold py-3.5">Usuario</TableHead>
                      <TableHead className="font-bold py-3.5">Rol</TableHead>
                      <TableHead className="font-bold py-3.5">Registro</TableHead>
                      <TableHead className="font-bold py-3.5 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-4">
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
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="bg-info/10 text-info border-blue-200/50">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FaCalendarAlt className="text-muted-foreground" />
                            {user.created_at
                              ? format(new Date(user.created_at), "d 'de' MMMM, yyyy", { locale: es })
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.id)}
                              disabled={actionLoading === user.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 rounded-xl shadow-sm gap-1.5 disabled:opacity-50"
                              title="Aprobar"
                            >
                              <FaCheck className="h-3 w-3" />
                              <span className="text-xs font-semibold">Aprobar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(user.id)}
                              disabled={actionLoading === user.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-3 rounded-xl disabled:opacity-50 gap-1.5"
                              title="Rechazar"
                            >
                              <FaTimes className="h-3 w-3" />
                              <span className="text-xs font-semibold">Rechazar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalPage;
