import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import {
  IconSprout,
  IconClipboardList,
  IconChevronRight,
  IconBook,
  IconShoppingCart,
} from '@/shared/ui/icons';
import { Droplets, CloudAlert, Headset } from 'lucide-react';

interface CampesinoTool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: string;
}

const tools: CampesinoTool[] = [
  {
    id: 'crop-plots',
    title: 'Parcelas y Cultivos',
    description: 'Gestiona tus parcelas, cultivos y fechas de siembra/cosecha.',
    icon: <IconSprout className="h-6 w-6" />,
    path: '/campesino/crop-plots',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    badge: 'Crítico',
  },
  {
    id: 'crop-activities',
    title: 'Bitácora de Labores',
    description: 'Registra siembra, riego, fertilización, cosecha y costos.',
    icon: <IconClipboardList className="h-6 w-6" />,
    path: '/campesino/crop-activities',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    badge: 'Crítico',
  },
  {
    id: 'water-sources',
    title: 'Fuentes de Agua',
    description: 'Administra fuentes de agua y mediciones de nivel/calidad.',
    icon: <Droplets className="h-6 w-6" />,
    path: '/campesino/water-sources',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  {
    id: 'climate-alerts',
    title: 'Alertas Climáticas',
    description: 'Consulta alertas de clima, heladas, sequías y recomendaciones.',
    icon: <CloudAlert className="h-6 w-6" />,
    path: '/campesino/climate-alerts',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    badge: 'Nuevo',
  },
  {
    id: 'market-offers',
    title: 'Mercado Campesino',
    description: 'Publica ofertas de venta, compra o intercambio de productos.',
    icon: <IconShoppingCart className="h-6 w-6" />,
    path: '/campesino/market-offers',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    id: 'technical-assistance',
    title: 'Asistencia Técnica',
    description: 'Solicita ayuda técnica o comunitaria para tu finca.',
    icon: <Headset className="h-6 w-6" />,
    path: '/campesino/technical-assistance',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'offline-learning',
    title: 'Aprendizaje Offline',
    description: 'Accede a materiales educativos sin conexión a internet.',
    icon: <IconBook className="h-6 w-6" />,
    path: '/learning',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
];

const CampesinoDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Módulo Campesino</h1>
          <p className="text-sm text-muted-foreground">Herramientas esenciales para la gestión agrícola y ganadera.</p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">
          v1.0
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-primary group"
            onClick={() => navigate(tool.path)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${tool.color}`}>
                  {tool.icon}
                </div>
                {tool.badge && (
                  <Badge variant={tool.badge === 'Crítico' ? 'destructive' : 'secondary'} className="text-xs">
                    {tool.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors">
                {tool.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tool.description}
              </p>
              <div className="mt-3 flex items-center text-xs text-primary font-medium">
                Abrir herramienta <IconChevronRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
        <h3 className="font-semibold text-foreground mb-2">💡 Consejo del día</h3>
        <p className="text-sm text-muted-foreground">
          Registra tus labores de cultivo diariamente para mantener un control preciso de costos y trazabilidad. 
          La bitácora de labores se sincroniza automáticamente con el módulo financiero.
        </p>
      </div>
    </div>
  );
};

export default CampesinoDashboard;
