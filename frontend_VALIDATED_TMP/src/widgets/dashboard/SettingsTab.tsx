import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useT } from '@/shared/i18n';
import { 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Zap, 
  Clock, 
  ChevronRight,
  User as UserIcon,
  Mail,
  Lock
} from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { Badge } from '@/shared/ui/badge';

const SettingsTab: React.FC = () => {
  const t = useT();

  const settingsGroups = [
    {
      title: "Cuenta y Perfil",
      items: [
        { icon: UserIcon, label: "Información Personal", desc: "Nombre, avatar y datos básicos", action: "Editar" },
        { icon: Mail, label: "Correo y Contacto", desc: "miguel@villaluz.com", action: "Cambiar" },
        { icon: Lock, label: "Seguridad", desc: "Contraseña y 2FA activado", action: "Gestionar", badge: "Seguro" },
      ]
    },
    {
      title: "Preferencias del Sistema",
      items: [
        { icon: Bell, label: "Notificaciones", desc: "Alertas de salud y sistema", action: "Configurar" },
        { icon: Palette, label: "Apariencia", desc: "Modo oscuro y temas", action: "Cambiar" },
        { icon: Globe, label: "Idioma y Región", desc: "Español (Colombia)", action: "Ajustar" },
      ]
    },
    {
      title: "Integraciones",
      items: [
        { icon: Zap, label: "Dispositivos IoT", desc: "Collares y sensores", action: "Vincular", badge: "2 Activos" },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {settingsGroups.map((group) => (
            <div key={group.title} className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 px-2">{group.title}</h3>
              <Card className="border-none shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2rem] overflow-hidden">
                <CardContent className="p-2">
                  {group.items.map((item, idx) => (
                    <div 
                      key={item.label} 
                      className={cn(
                        "flex items-center justify-between p-4 hover:bg-primary/5 transition-all duration-300 group cursor-pointer",
                        idx !== group.items.length - 1 && "border-b border-border/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                            {item.badge && <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary border-none">{item.badge}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.action}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 px-2">Actividad Reciente</h3>
          <Card className="border-none shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2rem] h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black tracking-tight">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                {[
                  { time: "Ahora", title: "Cambio de tema", desc: "Se activó el modo oscuro", icon: Palette, color: "text-purple-500" },
                  { time: "10:30 AM", title: "Login exitoso", desc: "Desde Bogotá, CO", icon: Shield, color: "text-emerald-500" },
                  { time: "Ayer", title: "Update", desc: "Sistema v4.2.0", icon: Zap, color: "text-amber-500" },
                ].map((act, i) => (
                  <div key={i} className="relative pl-10 group">
                    <div className={cn(
                      "absolute left-0 top-0 h-10 w-10 rounded-2xl bg-card border-4 border-muted flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm",
                      act.color
                    )}>
                      <act.icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-foreground">{act.title}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{act.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-8 rounded-2xl border-dashed border-2 hover:bg-muted/50 border-border transition-all">
                Ver todo el historial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
