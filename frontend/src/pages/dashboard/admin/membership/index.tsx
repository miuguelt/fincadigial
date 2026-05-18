import { useState, useEffect } from 'react';
import { membershipService, MembershipRequest } from '@/entities/user/api/membership.service';
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
  const { toast } = useToast();

  const fetchRequests = async () => {
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
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: number, requestedRole: string) => {
    try {
      await membershipService.approveRequest(requestId, { role: requestedRole });
      toast({
        title: 'Solicitud aprobada',
        description: 'El usuario ha sido incorporado a la finca.',
        variant: 'default',
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo aprobar la solicitud.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await membershipService.rejectRequest(requestId);
      toast({
        title: 'Solicitud rechazada',
        description: 'Se ha denegado el acceso al usuario.',
        variant: 'default',
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la solicitud.',
        variant: 'destructive',
      });
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-green-600 font-medium">Buscando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <FaUserPlus className="text-green-600" />
            Solicitudes de Membresía
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona los nuevos usuarios que desean unirse a tu finca.
          </p>
        </div>
        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 self-start md:self-center py-1 px-3">
          {requests.length} Pendientes
        </Badge>
      </div>

      <Card className="border-green-100 shadow-sm">
        <CardHeader className="bg-green-50/50">
          <CardTitle className="text-lg text-green-800">Bandeja de Entrada</CardTitle>
          <CardDescription>Valida la identidad de los solicitantes antes de aprobarlos.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUserPlus className="text-gray-300 text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">No hay solicitudes pendientes</h3>
              <p className="text-gray-500 mt-1">Cuando alguien solicite unirse, aparecerá aquí.</p>
              <Button 
                variant="outline" 
                onClick={fetchRequests}
                className="mt-4 border-green-200 text-green-700 hover:bg-green-50"
              >
                Actualizar bandeja
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol Solicitado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className="group hover:bg-green-50/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{request.user?.fullname || 'Usuario'}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FaIdCard className="text-[10px]" /> {request.user?.identification}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FaEnvelope className="text-[10px]" /> {request.user?.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                        {request.requested_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FaCalendarAlt className="text-gray-400" />
                        {format(new Date(request.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-600 italic truncate" title={request.message}>
                        {request.message || 'Sin mensaje adicional'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id, request.requested_role)}
                          className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0 rounded-full shadow-sm"
                          title="Aprobar"
                        >
                          <FaCheck className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(request.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
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

export default MembershipRequestsPage;
