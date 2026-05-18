import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { 
  Building2, 
  Search, 
  MapPin, 
  Loader2,
  ChevronRight,
  ArrowLeft,
  Users,
  School,
  Tractor
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { fincaService, Finca } from '@/entities/finca/api/finca.service';
import { membershipService } from '@/entities/user/api/membership.service';

interface FincaWithRequestStatus extends Finca {
  hasPendingRequest?: boolean;
  isMember?: boolean;
}

export default function FincasPublicasPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [fincas, setFincas] = useState<FincaWithRequestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'Educativa' | 'Tradicional'>('all');
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [requestingFincaId, setRequestingFincaId] = useState<number | null>(null);

  const loadFincas = useCallback(async (search?: string, type?: string, currentPage: number = 1) => {
    setLoading(true);
    try {
      const filters = {
        search: search || undefined,
        type: type && type !== 'all' ? type as 'Educativa' | 'Tradicional' : undefined,
        page: currentPage,
        limit: 20
      };

      const response = await fincaService.getPublicFincas(filters);
      
      if (response && response.data) {
        setFincas(response.data || []);
        setTotalItems(response.total || 0);
      } else {
        showToast('Error al cargar fincas', 'error');
      }
    } catch (error: any) {
      console.error('Error loading public fincas:', error);
      showToast('Error de conexión al cargar fincas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  const handleSearch = () => {
    setPage(1);
    loadFincas(searchQuery, selectedType, 1);
  };

  const handleTypeChange = (type: 'all' | 'Educativa' | 'Tradicional') => {
    setSelectedType(type);
    setPage(1);
    loadFincas(searchQuery, type, 1);
  };

  const handleRequestMembership = async (finca: FincaWithRequestStatus) => {
    if (finca.hasPendingRequest) {
      showToast('Ya tienes una solicitud pendiente para esta finca', 'info');
      return;
    }
    if (finca.isMember) {
      showToast('Ya eres miembro de esta finca', 'info');
      return;
    }

    setRequestingFincaId(finca.id);
    try {
      // Redirigir al registro de usuario con pre-selección de finca
      navigate('/register/user', {
        state: { 
          fincaId: finca.id,
          fincaName: finca.name,
          message: `Te estás registrando para unirte a: ${finca.name}`
        }
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al procesar solicitud';
      showToast(msg, 'error');
    } finally {
      setRequestingFincaId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'Educativa' 
      ? <School className="h-4 w-4" />
      : <Tractor className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'Educativa'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-amber-100 text-amber-700 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al login
          </Button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fincas Disponibles</h1>
              <p className="text-gray-600 text-sm">
                Encuentra una finca y solicita unirte a su equipo
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, departamento o municipio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                variant={selectedType === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange('all')}
                className={selectedType === 'all' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Todas
              </Button>
              <Button
                variant={selectedType === 'Educativa' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange('Educativa')}
                className={selectedType === 'Educativa' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <School className="h-4 w-4 mr-1" />
                Educativas
              </Button>
              <Button
                variant={selectedType === 'Tradicional' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange('Tradicional')}
                className={selectedType === 'Tradicional' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <Tractor className="h-4 w-4 mr-1" />
                Tradicionales
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Cargando...' : `${totalItems} finca${totalItems !== 1 ? 's' : ''} encontrada${totalItems !== 1 ? 's' : ''}`}
          </p>
          <Link 
            to="/register/user" 
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            ¿No encuentras tu finca? Regístrate aquí →
          </Link>
        </div>

        {/* Fincas List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
            <p className="text-gray-600">Cargando fincas disponibles...</p>
          </div>
        ) : fincas.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron fincas
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {searchQuery 
                  ? 'Intenta con otros términos de búsqueda' 
                  : 'Aún no hay fincas registradas en el sistema'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  loadFincas();
                }}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fincas.map((finca) => (
              <Card 
                key={finca.id} 
                className="shadow-md border-0 hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {finca.name}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={getTypeColor(finca.type || 'Tradicional')}
                        >
                          {getTypeIcon(finca.type || 'Tradicional')}
                          <span className="ml-1">{finca.type}</span>
                        </Badge>
                      </div>
                      
                      {(finca.department || finca.municipality) && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[finca.department, finca.municipality].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {finca.address && (
                        <p className="text-sm text-gray-500">{finca.address}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {finca.hasPendingRequest ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Solicitud pendiente
                        </Badge>
                      ) : finca.isMember ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Ya eres miembro
                        </Badge>
                      ) : null}
                      
                      <Button
                        onClick={() => handleRequestMembership(finca)}
                        disabled={requestingFincaId === finca.id || finca.hasPendingRequest || finca.isMember}
                        className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                        size="sm"
                      >
                        {requestingFincaId === finca.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-1" />
                            Unirme
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Alternative Path */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            ¿Eres propietario y quieres crear tu propia finca?
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/register/finca')}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Registrar mi finca
          </Button>
        </div>
      </div>
    </div>
  );
}
