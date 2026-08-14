import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { FileSpreadsheet, FileText, ShieldCheck, Activity, Heart, DollarSign, Milk, Download, Loader2, Receipt } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn';
import { Combobox } from '@/shared/ui/combobox';
import { useAnimals } from '@/entities/animal/model/useAnimals';

interface ExportItem {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  formats: { ext: string; icon: React.ElementType; label: string }[];
  icon: React.ElementType;
  color: string;
  bg: string;
}

const exportItems: ExportItem[] = [
  { id: 'animals', title: 'Animales', description: 'Listado completo del ganado con datos biométricos', endpoint: '/exports/animals.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: FileText, color: 'text-info', bg: 'bg-info/5 dark:bg-blue-950/30' },
  { id: 'vaccinations', title: 'Vacunaciones', description: 'Registro histórico de vacunas aplicadas', endpoint: '/exports/vaccinations.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'inventory', title: 'Inventario', description: 'Insumos, medicamentos y existencias', endpoint: '/exports/inventory.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: Activity, color: 'text-warning', bg: 'bg-warning/5 dark:bg-amber-950/30' },
  { id: 'reproduction', title: 'Reproducción', description: 'Ciclos reproductivos, montas y gestaciones', endpoint: '/exports/reproduction.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { id: 'milk', title: 'Producción de Leche', description: 'Registro diario de producción láctea', endpoint: '/exports/milk_production.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: Milk, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { id: 'financials', title: 'Transacciones Financieras', description: 'Ingresos, egresos y costos operativos', endpoint: '/exports/financials.xlsx', formats: [{ ext: 'xlsx', icon: FileSpreadsheet, label: 'Excel' }], icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { id: 'financial-report', title: 'Reporte Financiero', description: 'Estado financiero completo de la finca (PDF)', endpoint: '/exports/financial-report.pdf', formats: [{ ext: 'pdf', icon: FileText, label: 'PDF' }], icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { id: 'health-pdf', title: 'Reporte Sanitario', description: 'Historial clínico completo del ganado (PDF)', endpoint: '/exports/bulk-health-report.pdf', formats: [{ ext: 'pdf', icon: FileText, label: 'PDF' }], icon: ShieldCheck, color: 'text-destructive', bg: 'bg-destructive/5 dark:bg-rose-950/30' },
];

async function downloadBlob(endpoint: string, filename: string, params?: Record<string, string>) {
  const response = await apiClient.get(endpoint, { responseType: 'blob', params } as any);
  const blob = (response as any).data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function ExportCenterTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');

  // Cargar lista de animales para el select con buscador
  const { animals, loading: animalsLoading } = useAnimals();
  const animalOptions = useMemo(() =>
    (animals || []).map((a) => ({
      value: String(a.id),
      label: `${a.record || `#${a.id}`}${
        (a as any).breed?.name ? ` — ${(a as any).breed.name}` : ''
      }`,
    })),
    [animals]
  );

  const handleExport = async (item: ExportItem) => {
    setLoading(item.id);
    try {
      const date = new Date().toISOString().split('T')[0];
      const params = item.id === 'health-pdf' ? { animal_ids: 'all' } : undefined;
      await downloadBlob(item.endpoint, `${item.id}_${date}.${item.formats[0].ext}`, params);
      showToast(`${item.title} exportado exitosamente`, 'success');
    } catch (error) {
      console.error(`Error exporting ${item.id}:`, error);
      showToast(`Error al exportar ${item.title}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleExportAnimalHealth = async () => {
    if (!selectedAnimalId) {
      showToast('Selecciona un animal', 'error');
      return;
    }
    setLoading('health-individual');
    try {
      const selectedAnimal = animals.find(a => String(a.id) === selectedAnimalId);
      const record = selectedAnimal?.record || selectedAnimalId;
      const date = new Date().toISOString().split('T')[0];
      await downloadBlob(
        `/exports/animal/${selectedAnimalId}/health-report.pdf`,
        `ficha_animal_${record}_${date}.pdf`
      );
      showToast(`Ficha PDF del animal ${record} generada exitosamente`, 'success');
    } catch (error) {
      console.error('Error exporting individual health report:', error);
      showToast('Error al generar la ficha del animal', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Descarga los datos de tu finca en formato Excel o PDF.
        </p>
      </div>

      <Card className="bg-card shadow-sm border border-border/80 rounded-xl overflow-hidden mb-8">
        <CardHeader className="bg-muted/30 p-5 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="bg-destructive/10 p-2 rounded-lg">
              <Heart className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-lg">Reporte Sanitario Individual</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Descarga el historial clínico de un animal específico
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 bg-background/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Combobox
                options={animalOptions}
                value={selectedAnimalId}
                onValueChange={setSelectedAnimalId}
                placeholder="Buscar animal por registro o raza..."
                searchPlaceholder="Escribe el registro o raza..."
                emptyMessage="No se encontró el animal"
                loading={animalsLoading}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 h-10 shadow-sm hover:shadow-md transition-shadow"
              disabled={loading === 'health-individual' || !selectedAnimalId}
              onClick={handleExportAnimalHealth}
            >
              {loading === 'health-individual' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              Descargar PDF
            </Button>
          </div>
          {selectedAnimalId && (
            <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded-lg border border-border/50 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
              Animal seleccionado: <span className="font-semibold text-foreground">
                {animalOptions.find(o => o.value === selectedAnimalId)?.label}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportItems.map((item) => {
          const Icon = item.icon;
          const isLoading = loading === item.id;
          return (
            <Card key={item.id} className="group flex flex-col bg-card shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 rounded-xl overflow-hidden">
              <CardHeader className="p-5 pb-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-black/5 dark:border-white/5', item.bg)}>
                  <Icon className={cn('h-5 w-5', item.color)} />
                </div>
                <CardTitle className="text-base tracking-tight mb-1">{item.title}</CardTitle>
                <CardDescription className="min-h-[40px] text-xs leading-relaxed">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 mt-auto">
                {item.formats.map((fmt) => {
                  const FmtIcon = fmt.icon;
                  return (
                    <Button
                      key={fmt.ext}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 h-9 text-xs bg-background hover:bg-muted border-border/80 shadow-sm transition-colors mt-2"
                      disabled={isLoading}
                      onClick={() => handleExport(item)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <FmtIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      Descargar {fmt.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ExportCenterTab;
