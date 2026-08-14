import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  ChevronRight,
  DatabaseZap,
  ShieldCheck,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import ThemeSelector from '@/widgets/dashboard/ThemeSelector';

interface SettingsDestination {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

const destinations: SettingsDestination[] = [
  {
    label: 'Mi perfil',
    description: 'Actualiza tus datos personales, contacto y fotografía.',
    path: '/profile',
    icon: UserRoundCog,
  },
  {
    label: 'Personal de la finca',
    description: 'Administra usuarios que pertenecen a la finca activa.',
    path: '/admin/users',
    icon: Users,
  },
  {
    label: 'Finca y permisos',
    description: 'Revisa membresías, roles y solicitudes de acceso.',
    path: '/admin/membership',
    icon: ShieldCheck,
  },
  {
    label: 'Alertas y notificaciones',
    description: 'Consulta avisos reales y marca como leídos los atendidos.',
    path: '/admin/alerts',
    icon: Bell,
  },
  {
    label: 'Registro de actividad',
    description: 'Audita las acciones recientes realizadas en la finca.',
    path: '/admin/activity-log',
    icon: Activity,
  },
  {
    label: 'Diagnóstico del sistema',
    description: 'Comprueba base de datos, caché, tareas y recursos del servidor.',
    path: '/admin/diagnostics',
    icon: DatabaseZap,
  },
];

const SettingsTab = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-xl font-bold text-foreground">Ajustes y administración</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Accesos directos a configuraciones existentes y datos reales del sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Apariencia</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona el tema que prefieras.</p>
          </div>
          <ThemeSelector />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {destinations.map((item) => (
          <Card key={item.path} className="h-full">
            <CardContent className="flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full justify-between"
                aria-label={`Abrir ${item.label}`}
                onClick={() => navigate(item.path)}
              >
                Abrir
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SettingsTab;
