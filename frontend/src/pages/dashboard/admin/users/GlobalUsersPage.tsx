import  { useState, useEffect } from 'react';
import { usersService } from '@/entities/user/api/user.service';
import { useCallback } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass, getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  User as UserIcon, 
  Search, 
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { ClimbingBoxLoader } from 'react-spinners';

const GlobalUsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchGlobalUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersService.getGlobalUsers();
      // response es ya la data (UserResponse[]) según la implementación de customRequest
      setUsers(Array.isArray(response) ? response : (response as any).data || []);
    } catch (error) {
      console.error('Error fetching global users:', error);
      toast({
        title: 'Error de Acceso',
        description: 'No tienes permisos para ver la vista global de usuarios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGlobalUsers();
  }, [fetchGlobalUsers]);

  const filteredUsers = users.filter(u => 
    u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(u.identification).includes(searchTerm)
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-success font-medium animate-pulse">Cargando base de datos global...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-success flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-success" />
            Usuarios de Todo el Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Área exclusiva del administrador maestro para diferenciar usuarios entre fincas.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="text-success border-success/30 bg-success/5 py-1.5 px-4 font-semibold shadow-sm">
            {users.length} Usuarios Totales
          </Badge>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={fetchGlobalUsers} 
            disabled={loading}
            className="border-success/30 text-success hover:bg-success/5"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Card className="border-green-100 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-50/80 to-white border-b border-green-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-success" />
                Listado Maestro de Usuarios
              </CardTitle>
              <CardDescription>Búsqueda transversal en todas las fincas del sistema.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Input
                placeholder="Buscar por nombre, email o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-success/30 focus-visible:ring-green-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Identidad y Contacto</TableHead>
                  <TableHead>Rol Global</TableHead>
                  <TableHead>Fincas Asociadas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Users className="h-12 w-12 mb-2 opacity-20" />
                        <p>No se encontraron usuarios con esos criterios</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-success/5/30 transition-all border-b border-border/50 last:border-0">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-success font-bold border border-success/30 shadow-sm">
                            {user.fullname?.charAt(0) || <UserIcon className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground group-hover:text-success transition-colors">{user.fullname}</span>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Mail className="h-3 w-3" /> {user.email}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Phone className="h-3 w-3" /> {user.phone || 'N/A'}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                                ID: {user.identification}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass('info') + ' rounded-full px-3'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="flex flex-wrap gap-2">
                          {user.fincas && user.fincas.length > 0 ? (
                            user.fincas.map((f: any) => (
                              <div 
                                key={f.id} 
                                className="group/finca relative flex items-center gap-1.5 bg-card border border-border/50 rounded-lg px-2 py-1 shadow-sm hover:border-success/40 transition-all"
                                title={`${f.name} - Rol: ${f.role}`}
                              >
                                <Building2 className="h-3 w-3 text-success" />
                                <div className="flex flex-col leading-tight">
                                  <span className="text-[10px] font-bold text-foreground/80">{f.name}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase tracking-tighter">{f.role}</span>
                                </div>
                                {f.is_active && (
                                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-success-500 rounded-full border border-white" title="Activa" />
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin fincas asignadas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAutoStatusClass(user.status ? 'Activo' : 'Inactivo') + ' rounded-full px-2 py-0 h-5 text-[10px]'}>
                          {user.status ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-success/10 hover:text-success"
                          aria-label={`Ver detalles de ${user.fullname}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-100 bg-info/5/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center text-info">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-info font-medium">Fincas Registradas</p>
              <h3 className="text-2xl font-bold text-blue-900">
                {Array.from(new Set(users.flatMap(u => u.fincas?.map((f: any) => f.id) || []))).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <UserRoundCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Usuarios Activos</p>
              <h3 className="text-2xl font-bold text-purple-900">
                {users.filter((user) => user.status).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-orange-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <UserRoundX className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Sin Finca Asignada</p>
              <h3 className="text-2xl font-bold text-orange-900">
                {users.filter((user) => !user.fincas?.length).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedUser.fullname}</DialogTitle>
                <DialogDescription>
                  Información global y membresías del usuario en el sistema.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <UserDetail label="Identificación" value={selectedUser.identification} />
                <UserDetail label="Rol global" value={selectedUser.role} />
                <UserDetail label="Correo" value={selectedUser.email} />
                <UserDetail label="Teléfono" value={selectedUser.phone || 'No registrado'} />
                <UserDetail label="Estado" value={selectedUser.status ? 'Activo' : 'Inactivo'} />
              </div>

              <section aria-labelledby="global-user-farms-heading" className="space-y-3">
                <h3 id="global-user-farms-heading" className="font-semibold text-foreground">
                  Fincas asociadas
                </h3>
                {selectedUser.fincas?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedUser.fincas.map((finca: any) => (
                      <div key={finca.id} className="rounded-lg border border-border p-3">
                        <p className="font-semibold text-foreground">{finca.name}</p>
                        <p className="text-sm text-muted-foreground">Rol: {finca.role}</p>
                        <Badge variant={finca.is_active ? 'default' : 'secondary'} className="mt-2">
                          {finca.is_active ? 'Finca activa' : 'Membresía secundaria'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Este usuario no tiene fincas asignadas.
                  </p>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserDetail = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-lg bg-muted/40 p-3">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 break-words font-medium text-foreground">{String(value ?? 'No registrado')}</p>
  </div>
);

export default GlobalUsersPage;
