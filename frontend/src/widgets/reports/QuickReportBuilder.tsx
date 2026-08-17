import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

const metrics = [
  { id: 'animals', label: 'Animales', desc: 'Cantidad por estado, sexo y raza', color: 'bg-info' },
  { id: 'health', label: 'Salud', desc: 'Vacunas, tratamientos y controles', color: 'bg-emerald-500' },
  { id: 'production', label: 'Producción', desc: 'Peso, leche y rendimiento', color: 'bg-warning' },
  { id: 'fields', label: 'Potreros', desc: 'Ocupación y rotación de lotes', color: 'bg-violet-500' },
  { id: 'inventory', label: 'Inventario', desc: 'Insumos y existencias', color: 'bg-sky-500' },
  { id: 'financial', label: 'Financiero', desc: 'Ingresos, costos y rentabilidad', color: 'bg-destructive' },
];

export function QuickReportBuilder() {
  const { goTo } = useRoleNavigation();

  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-sm border border-border/80 rounded-xl overflow-hidden mb-6">
        <div className="bg-muted/30 p-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Reportes Personalizados</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Crea reportes a la medida para analizar el rendimiento de tu finca
          </p>
        </div>

        <div className="p-5 bg-background/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
              >
                <span className={cn('w-2 h-10 rounded-full shrink-0 shadow-sm', m.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold mb-0.5 group-hover:text-primary transition-colors">{m.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 pt-0 bg-background/50">
          <Button onClick={() => goTo('/admin/analytics/reports')} className="gap-2 shadow-sm transition-all hover:shadow-md">
            <BarChart3 className="h-4 w-4" />
            Ir al constructor de reportes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default QuickReportBuilder;
