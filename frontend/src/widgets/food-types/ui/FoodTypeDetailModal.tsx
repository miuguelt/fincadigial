import React, { useState } from 'react';
import {
  Wheat,
  Sprout,
  Clock,
  MapPin,
  Leaf,
  Scale,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { classifyFoodType } from '@/entities/food-type/model/forageClassification';
import type { FoodTypeResponse, FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { useNavigate } from 'react-router-dom';

interface FoodTypeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: (FoodTypeResponse & { [k: string]: any }) | null;
  fields?: FieldResponse[];
  onOpenAforo?: (item: any) => void;
}

export const FoodTypeDetailModal: React.FC<FoodTypeDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  fields = [],
  onOpenAforo,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'fields' | 'agronomy'>('profile');

  if (!item) return null;

  const name = item.food_type || item.name || 'Tipo de Alimento';
  const description = item.handlings || item.description || '';
  const gauges = item.gauges || '';
  const area = item.area !== undefined && item.area !== null ? Number(item.area) : null;
  const sowingDate = item.sowing_date ? new Date(item.sowing_date).toLocaleDateString('es-CO') : null;
  const harvestDate = item.harvest_date ? new Date(item.harvest_date).toLocaleDateString('es-CO') : null;

  const { category, profile } = classifyFoodType(name, description);
  const linkedFields = fields.filter((f) => Number(f.food_type_id) === Number(item.id));

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-black text-foreground">{name}</span>
          <Badge
            variant="outline"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border gap-1 ${category.badgeClass}`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </Badge>
        </div>
      }
      subtitle="Ficha Técnica Bromatológica y Zootécnica"
      size="xl"
    >
      <div className="space-y-5 py-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg text-xs font-bold gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              Nutrición y Parámetros
            </TabsTrigger>
            <TabsTrigger value="fields" className="rounded-lg text-xs font-bold gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Potreros Sembrados ({linkedFields.length})
            </TabsTrigger>
            <TabsTrigger value="agronomy" className="rounded-lg text-xs font-bold gap-1.5">
              <Sprout className="w-3.5 h-3.5" />
              Guía de Manejo
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Nutrición y Parámetros */}
          <TabsContent value="profile" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-card rounded-xl border border-border/50 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                  Proteína Cruda
                </span>
                <p className="text-base font-black text-foreground">{profile.estimatedProtein}</p>
                <span className="text-[10px] text-muted-foreground">Base materia seca</span>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/50 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5 text-amber-500" />
                  Materia Seca (MS)
                </span>
                <p className="text-base font-black text-foreground">{profile.dryMatter}</p>
                <span className="text-[10px] text-muted-foreground">Contenido típico</span>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/50 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-500" />
                  Descanso / Rebrote
                </span>
                <p className="text-base font-black text-foreground">
                  {profile.restDaysSuggested > 0 ? `${profile.restDaysSuggested} días` : 'N/A (Suministro)'}
                </p>
                <span className="text-[10px] text-muted-foreground">Rotación óptima</span>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/50 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Área Sembrada
                </span>
                <p className="text-base font-black text-foreground">
                  {area !== null && area > 0 ? `${area} ha` : 'No especificada'}
                </p>
                <span className="text-[10px] text-muted-foreground">Extensión total</span>
              </div>
            </div>

            {/* Fechas y Piso térmico */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/40 space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Adaptabilidad y Ciclo de Cultivo
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">Piso Térmico: </span>
                  <span className="font-bold text-foreground">{profile.thermalFloor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Fecha de Siembra: </span>
                  <span className="font-bold text-foreground">{sowingDate || 'No registrada'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Fecha de Cosecha: </span>
                  <span className="font-bold text-foreground">{harvestDate || 'Permanente / No aplica'}</span>
                </div>
              </div>
            </div>

            {/* Aforos y Mediciones */}
            {gauges && (
              <div className="p-4 bg-secondary/30 rounded-xl border border-border/40 space-y-1.5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  Historial de Aforo y Calibres
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{gauges}</p>
              </div>
            )}

            {/* Botón de acción rápida de Aforo */}
            {onOpenAforo && (
              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
                  onClick={() => {
                    onClose();
                    onOpenAforo(item);
                  }}
                >
                  <Scale className="w-4 h-4 text-emerald-500" />
                  Abrir Calculadora de Aforo para {name}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Potreros Sembrados */}
          <TabsContent value="fields" className="space-y-3 pt-3">
            {linkedFields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {linkedFields.map((field) => {
                  const animalCount = field.animal_count ?? 0;
                  const isOccupied = animalCount > 0 || String(field.state || '').toLowerCase().includes('ocupado');

                  return (
                    <div
                      key={field.id}
                      className="p-3.5 bg-card rounded-xl border border-border/50 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-foreground truncate">{field.name}</h5>
                          <span className="font-mono text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded">
                            ID {field.id}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {field.area ? `${field.area} ha` : 'Área no def.'} •{' '}
                          {isOccupied ? `🐮 ${animalCount} cabezas` : '🟢 Libre / En descanso'}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 shrink-0"
                        onClick={() => {
                          onClose();
                          navigate('/admin/fields');
                        }}
                      >
                        Ver Potrero
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border/60 space-y-2">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-foreground">Sin potreros asociados</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Este forraje aún no está asignado a ningún potrero. Puedes vincularlo editando un potrero en el
                  módulo de Potreros.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Guía de Manejo */}
          <TabsContent value="agronomy" className="space-y-3 pt-3">
            <div className="p-4 bg-card rounded-xl border border-border/50 shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                Manejos y Recomendaciones Agronómicas Registradas
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description || 'Sin notas agronómicas personalizadas para este recurso.'}
              </p>
            </div>

            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-2">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Uso Zootécnico Recomendado en Ganadería
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
                {profile.recommendedUse}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </GenericModal>
  );
};
export default FoodTypeDetailModal;