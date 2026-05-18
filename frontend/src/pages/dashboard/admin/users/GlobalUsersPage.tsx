import React, { useState, useEffect } from 'react';
import { usersService } from '@/entities/user/api/user.service';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass, getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { Button } from '@/shared/ui/button';
import { 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  User as UserIcon, 
  Search, 
  ShieldCheck,
  MapPin,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { ClimbingBoxLoader } from 'react-spinners';

const GlobalUsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchGlobalUsers = async () => {
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
  };

  useEffect(() => {
    fetchGlobalUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(u.identification).includes(searchTerm)
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ClimbingBoxLoader color="#10B981" />
        <p className="text-green-600 font-medium animate-pulse">Cargando base de datos global...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            Administración Global de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">
            Visualiza todos los usuarios del sistema y sus relaciones con múltiples fincas.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 py-1.5 px-4 font-semibold shadow-sm">
            {users.length} Usuarios Totales
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchGlobalUsers} 
            disabled={loading}
            className="border-green-200 text-green-700 hover:bg-green-50"
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
                <Users className="h-5 w-5 text-green-600" />
                Listado Maestro de Usuarios
              </CardTitle>
              <CardDescription>Búsqueda transversal en todas las fincas del sistema.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Input
                placeholder="Buscar por nombre, email o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-green-200 focus-visible:ring-green-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
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
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Users className="h-12 w-12 mb-2 opacity-20" />
                        <p>No se encontraron usuarios con esos criterios</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-green-50/30 transition-all border-b border-gray-100 last:border-0">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700 font-bold border border-green-200 shadow-sm">
                            {user.fullname?.charAt(0) || <UserIcon className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 group-hover:text-green-800 transition-colors">{user.fullname}</span>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                <Mail className="h-3 w-3" /> {user.email}
                              </span>
                              <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                <Phone className="h-3 w-3" /> {user.phone || 'N/A'}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
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
                                className="group/finca relative flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1 shadow-sm hover:border-green-300 transition-all"
                                title={`${f.name} - Rol: ${f.role}`}
                              >
                                <Building2 className="h-3 w-3 text-green-600" />
                                <div className="flex flex-col leading-tight">
                                  <span className="text-[10px] font-bold text-gray-700">{f.name}</span>
                                  <span className="text-[8px] text-gray-400 uppercase tracking-tighter">{f.role}</span>
                                </div>
                                {f.is_active && (
                                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-success-500 rounded-full border border-white" title="Activa" />
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin fincas asignadas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAutoStatusClass(user.status ? 'Activo' : 'Inactivo') + ' rounded-full px-2 py-0 h-5 text-[10px]'}>
                          {user.status ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-green-100 hover:text-green-700" title="Ver Detalles">
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
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Fincas Registradas</p>
              <h3 className="text-2xl font-bold text-blue-900">
                {Array.from(new Set(users.flatMap(u => u.fincas?.map((f: any) => f.id) || []))).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Ubicaciones Activas</p>
              <h3 className="text-2xl font-bold text-purple-900">
                Colombia
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-orange-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Nivel de Acceso</p>
              <h3 className="text-2xl font-bold text-orange-900 uppercase text-xs">
                Administrador Maestro
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GlobalUsersPage;
