import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Bell, Calendar, CreditCard, Home, User } from 'lucide-react';
import { FincaHeroBanner } from '@/widgets/finca/hero';

const UserDashboard: React.FC = () => {
  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-success" />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-foreground">Mi Panel</h1>
              <p className="text-sm text-muted-foreground">Bienvenido a tu panel</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notificaciones
            </Button>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </Button>
          </div>
        </div>

        <FincaHeroBanner className="mb-8" />

        {/* Main Content */}
        <div className="py-0">
          {/* Welcome Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">¡Bienvenido de vuelta!</CardTitle>
              <CardDescription>
                Gestiona tus propiedades y mantente al día con las últimas actualizaciones.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Home className="h-5 w-5 mr-2 text-info" />
                  Mis Propiedades
                </CardTitle>
                <CardDescription>
                  Ver y gestionar tus propiedades registradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Propiedades</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="h-5 w-5 mr-2 text-success" />
                  Reservas
                </CardTitle>
                <CardDescription>
                  Administra tus reservas y calendario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Reservas</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                  Pagos
                </CardTitle>
                <CardDescription>
                  Revisa tus pagos y transacciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Pagos</Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>
                  Últimas acciones en tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nueva reserva confirmada</p>
                      <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-info rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Propiedad actualizada</p>
                      <p className="text-xs text-muted-foreground">Hace 1 día</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pago recibido</p>
                      <p className="text-xs text-muted-foreground">Hace 3 días</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
                <CardDescription>
                  Resumen de tu actividad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-info/5 rounded-lg">
                    <span className="text-sm font-medium">Propiedades Activas</span>
                    <span className="text-lg font-bold text-info">3</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                    <span className="text-sm font-medium">Reservas este mes</span>
                    <span className="text-lg font-bold text-success">8</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Ingresos totales</span>
                    <span className="text-lg font-bold text-purple-600">$2,340</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
