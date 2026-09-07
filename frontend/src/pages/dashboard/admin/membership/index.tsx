import { useState, useEffect } from 'react';
import { membershipService, MembershipRequest } from '@/entities/user/api/membership.service';
import { useCallback } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { FaCheck, FaTimes, FaUserPlus, FaCalendarAlt, FaEnvelope, FaIdCard } from 'react-icons/fa';
import { ClimbingBoxLoader } from 'react-spinners';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MembershipRequestsPage = () => {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await membershipService.getPendingRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes pendientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: number, requestedRole: string) => {
    setActionLoading(requestId);
    try {
      await membershipService.approveRequest(requestId, { role: requestedRole });
      toast({
        title: 'Solicitud aprobada',
        description: 'El usuario ha sido incorporado a la finca exitosamente.',
        variant: 'default',
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 403 || status === 401) return;
      toast({
        title: 'Atención',
        description: error?.response?.data?.message || error?.message || 'No se pudo aprobar la solicitud.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      await membershipService.rejectRequest(requestId);
      toast({
        title: 'Solicitud rechazada',
        description: 'Se ha denegado el acceso al usuario.',
        variant: 'default',
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 403 || status === 401) return;
      toast({
        title: 'Atención',
        description: error?.response?.data?.message || error?.message || 'No se pudo rechazar la solicitud.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-success font-medium">Buscando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0">
            <FaUserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Solicitudes de Acceso
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona y valida los nuevos usuarios que desean unirse a tu finca.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 self-start sm:self-center py-1.5 px-3.5 rounded-full font-bold text-xs shadow-sm">
          {requests.length} {requests.length === 1 ? 'Pendiente' : 'Pendientes'}
        </Badge>
      </div>

      <Card className="border-border/70 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 bg-muted/30 border-b border-border/50">
          <CardTitle className="text-lg font-bold text-foreground">Bandeja de Entrada</CardTitle>
          <CardDescription>Valida la identidad de los solicitantes antes de aprobarlos.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUserPlus className="text-muted-foreground/60 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No hay solicitudes pendientes</h3>
              <p className="text-muted-foreground mt-1">Cuando alguien solicite unirse, aparecerá aquí.</p>
              <Button
                variant="outline"
                onClick={fetchRequests}
                className="mt-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                Actualizar bandeja
              </Button>
            </div>
          ) : (
            <>
              {/* Vista Móvil: Tarjetas independientes con espaciado amplio y botones táctiles */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-emerald-500/30 transition-all space-y-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-base">
                          {request.user?.fullname || 'Usuario'}
                        </h4>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FaIdCard className="text-muted-foreground/70 shrink-0" />
                            <span>{request.user?.identification || 'Sin documento'}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 break-anywhere">
                            <FaEnvelope className="text-muted-foreground/70 shrink-0" />
                            <span>{request.user?.email || 'Sin correo'}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-info/10 text-info border-blue-200/50 shrink-0">
                        {request.requested_role}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <FaCalendarAlt className="text-muted-foreground/70" />
                      <span>{format(new Date(request.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>

                    {request.message && (
                      <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground italic">
                        "{request.message}"
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id, request.requested_role)}
                        disabled={actionLoading === request.id}
                        className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm gap-2"
                      >
                        <FaCheck className="h-3.5 w-3.5" />
                        <span>Aprobar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 min-h-[44px] border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold rounded-xl gap-2"
                      >
                        <FaTimes className="h-3.5 w-3.5" />
                        <span>Rechazar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Escritorio: Tabla espaciosa con contenedor de desplazamiento limpio */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold py-3.5">Usuario</TableHead>
                      <TableHead className="font-bold py-3.5">Rol Solicitado</TableHead>
                      <TableHead className="font-bold py-3.5">Fecha</TableHead>
                      <TableHead className="font-bold py-3.5">Mensaje</TableHead>
                      <TableHead className="font-bold py-3.5 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{request.user?.fullname || 'Usuario'}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FaIdCard className="text-[11px]" /> {request.user?.identification}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FaEnvelope className="text-[11px]" /> {request.user?.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="bg-info/10 text-info border-blue-200/50">
                            {request.requested_role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FaCalendarAlt className="text-muted-foreground" />
                            {format(new Date(request.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 max-w-xs">
                          <p className="text-sm text-muted-foreground italic fit-clamp" title={request.message}>
                            {request.message || 'Sin mensaje adicional'}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id, request.requested_role)}
                              disabled={actionLoading === request.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 rounded-xl shadow-sm gap-1.5 disabled:opacity-50"
                              title="Aprobar"
                            >
                              <FaCheck className="h-3 w-3" />
                              <span className="text-xs font-semibold">Aprobar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoading === request.id}
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

export default MembershipRequestsPage;
