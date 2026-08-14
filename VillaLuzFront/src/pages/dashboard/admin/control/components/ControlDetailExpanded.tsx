import React, { useState, useEffect } from 'react';
import { controlService } from '@/entities/control/api/control.service';
import { milkService } from '@/entities/milk/api/milk.service';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { AnimalLink } from '@/entities/animal/ui';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

interface ControlDetailExpandedProps {
  item: ControlResponse;
  animalLabel: string;
}

export const ControlDetailExpanded: React.FC<ControlDetailExpandedProps> = ({ item, animalLabel }) => {
  const [controlHistory, setControlHistory] = useState<ControlResponse[]>([]);
  const [milkHistory, setMilkHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const checkupDate = (item as any)?.checkup_date ?? (item as any)?.control_date;
  const formattedDate = checkupDate ? new Date(checkupDate as string).toLocaleDateString('es-CO') : '-';
  const healthStatus = (item as any)?.health_status ?? (item as any)?.healt_status ?? '-';
  const description = (item as any)?.description ?? (item as any)?.observations;

  const getHealthBadgeClass = (status: string) => {
    switch (status) {
      case 'Excelente': case 'Bueno': case 'Sano': return getStatusBadgeClass('success');
      case 'Regular': return getStatusBadgeClass('warning');
      case 'Malo': case 'Enfermo': case 'Crítico': return getStatusBadgeClass('danger');
      case 'En tratamiento': return getStatusBadgeClass('info');
      default: return getStatusBadgeClass('neutral');
    }
  };

  useEffect(() => {
    const fetchHistories = async () => {
      setLoadingHistory(true);
      try {
        // Cargar controles del animal (usando getAll y filtrando localmente para máxima seguridad)
        const allControls = await controlService.getAll();
        const filteredControls = allControls
          .filter(c => c.animal_id === item.animal_id)
          .sort((a, b) => {
            const dateA = new Date((a as any).checkup_date || (a as any).control_date || 0);
            const dateB = new Date((b as any).checkup_date || (b as any).control_date || 0);
            return dateA.getTime() - dateB.getTime();
          });
        setControlHistory(filteredControls);

        // Cargar producción de leche del animal
        try {
          const milkData = await milkService.getByAnimal(item.animal_id);
          const rawMilk: any[] = Array.isArray(milkData) ? milkData : (milkData?.data ?? []);
          const sortedMilk = rawMilk.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMilkHistory(sortedMilk);
        } catch (err) {
          console.warn('Error fetching by animal directly, fallback to getAll', err);
          const allMilk = await milkService.getAll();
          const filteredMilk = allMilk
            .filter(m => m.animal_id === item.animal_id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMilkHistory(filteredMilk);
        }

      } catch (error) {
        console.error('Error loading history details:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (item.animal_id) {
      fetchHistories();
    }
  }, [item.animal_id]);

  // Formatear datos para el gráfico de control (peso y altura)
  const chartControlData = controlHistory.map(c => {
    const d = (c as any).checkup_date || (c as any).control_date;
    return {
      fecha: d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) : '',
      peso: c.weight ? Number(c.weight) : null,
      altura: c.height ? Number(c.height) : null,
    };
  });

  // Formatear datos para el gráfico de leche (litros)
  const chartMilkData = milkHistory.map(m => ({
    fecha: m.date ? new Date(m.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) : '',
    litros: m.liters ? Number(m.liters) : 0,
  }));

  return (
    <div className="flex flex-col gap-6 h-full max-h-[85vh] overflow-y-auto px-4 py-2">
      
      {/* Resumen del Control Actual */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/20 border p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🐄</div>
          <div>
            <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Detalle del Control</div>
            <h2 className="text-xl font-bold text-foreground">
              {item.animal_id ? <AnimalLink id={item.animal_id} label={animalLabel} /> : '-'}
            </h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={`text-sm px-3 py-1 ${getHealthBadgeClass(healthStatus)}`}>
            Salud: {healthStatus}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 font-semibold">
            📅 {formattedDate}
          </Badge>
        </div>
      </div>

      {/* Tabs para explorar historiales y gráficos */}
      <Tabs defaultValue="detalles" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6 bg-muted p-1 rounded-xl">
          <TabsTrigger value="detalles" className="text-sm py-2">ℹ️ Detalles</TabsTrigger>
          <TabsTrigger value="historial-fisico" className="text-sm py-2">⚖️ Peso y Talla</TabsTrigger>
          <TabsTrigger value="historial-leche" className="text-sm py-2">🥛 Historial Leche</TabsTrigger>
        </TabsList>

        {/* CONTENIDO 1: DETALLES ACTUALES */}
        <TabsContent value="detalles" className="mt-0 space-y-6">
          <div className={modalStyles.twoColGrid}>
            <div className="space-y-4">
              <SectionCard title="Información Básica">
                <div className="space-y-3">
                  <InfoField label="ID Registro" value={`#${item.id}`} />
                  <InfoField label="Fecha de Chequeo" value={formattedDate} valueSize="large" />
                  {description && (
                    <InfoField label="Descripción / Observaciones" value={description} />
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-4">
              <SectionCard title="Métricas del Chequeo">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Peso Actual" value={item.weight != null ? `${Number(item.weight).toFixed(1)} kg` : '-'} valueSize="xlarge" />
                  <InfoField label="Altura Actual" value={item.height != null ? `${Number(item.height).toFixed(1)} m` : '-'} valueSize="xlarge" />
                </div>
              </SectionCard>
              
              <SectionCard title="Información del Sistema">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Registrado el" value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO') : '-'} />
                  <InfoField label="Modificado el" value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-CO') : '-'} />
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* CONTENIDO 2: HISTORIAL FISICO (PESO Y ALTURA + GRAFICO) */}
        <TabsContent value="historial-fisico" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Evolución */}
            <div className="lg:col-span-2 bg-background border rounded-lg p-4 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-base font-bold text-foreground mb-4">📈 Evolución Física (Peso y Altura)</h3>
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="animate-pulse text-muted-foreground">Cargando gráfico...</span>
                </div>
              ) : chartControlData.length > 0 ? (
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartControlData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="fecha" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} unit="kg" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line yAxisId="right" type="monotone" dataKey="altura" name="Altura (m)" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Sin registros suficientes para graficar
                </div>
              )}
            </div>

            {/* Listado Histórico */}
            <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col max-h-[300px] overflow-hidden">
              <h3 className="text-base font-bold text-foreground mb-4">📋 Registro de Peso</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                ) : controlHistory.length > 0 ? (
                  controlHistory.slice().reverse().map((c: any, index) => (
                    <div key={c.id || index} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 border text-xs">
                      <div className="font-semibold text-muted-foreground">
                        {new Date(c.checkup_date || c.control_date).toLocaleDateString('es-CO')}
                      </div>
                      <div className="flex gap-3 text-right">
                        <span className="font-bold text-emerald-600">{c.weight ? `${Number(c.weight).toFixed(1)} kg` : '-'}</span>
                        <span className="text-blue-600">{c.height ? `${Number(c.height).toFixed(1)} m` : '-'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">Ningún control registrado</div>
                )}
              </div>
            </div>

          </div>
        </TabsContent>

        {/* CONTENIDO 3: HISTORIAL DE LECHE */}
        <TabsContent value="historial-leche" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico de Leche */}
            <div className="lg:col-span-2 bg-background border rounded-lg p-4 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-base font-bold text-foreground mb-4">📊 Evolución de Producción (Litros)</h3>
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="animate-pulse text-muted-foreground">Cargando gráfico...</span>
                </div>
              ) : chartMilkData.length > 0 ? (
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartMilkData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="fecha" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4f46e5" fontSize={12} tickLine={false} axisLine={false} unit=" L" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="litros" name="Litros" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Sin producción de leche registrada para este animal
                </div>
              )}
            </div>

            {/* Listado Histórico */}
            <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col max-h-[300px] overflow-hidden">
              <h3 className="text-base font-bold text-foreground mb-4">🥛 Registro de Ordeños</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                ) : milkHistory.length > 0 ? (
                  milkHistory.slice().reverse().map((m, index) => (
                    <div key={m.id || index} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 border text-xs">
                      <div>
                        <div className="font-semibold text-muted-foreground">
                          {new Date(m.date).toLocaleDateString('es-CO')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Sesión: {m.milking_session}</div>
                      </div>
                      <div className="font-bold text-indigo-600 text-sm">
                        {m.liters ? `${Number(m.liters).toFixed(1)} Litros` : '0 L'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">Sin historial de producción</div>
                )}
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>
      
    </div>
  );
};
