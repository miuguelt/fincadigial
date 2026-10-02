import { useNavigate } from 'react-router-dom';
import { Boxes, Info, ArrowRight, Pill } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';

export function MedicationsHeaderBanner() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 mb-2">
      {/* Pestañas de Navegación de Sanidad */}
      <SanidadTabs />

      {/* Banner Explicativo de Catálogo vs Inventario */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.07] via-card to-emerald-500/[0.05] p-3.5 sm:p-4 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Pill className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-foreground">
                  Catálogo de Referencia (Vademécum de Medicamentos)
                </h3>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/15 text-primary">
                  <Info className="w-3 h-3" />
                  Guía de Formulación
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Esta lista reúne los posibles medicamentos aprobados para recetar y aplicar en la finca.
                Para consultar o ingresar las cantidades físicas que tienes en el botiquín, revisa el inventario.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => navigate('/admin/inventory?product_type=Medicamento')}
              className="h-8 sm:h-9 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Boxes className="w-4 h-4" />
              <span>Ver Stock en Inventario</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MedicationsHeaderBanner;
