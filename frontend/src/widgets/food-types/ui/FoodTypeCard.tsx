import React from 'react';
import {
  Clock,
  Eye,
  Edit2,
  Trash2,
  MapPin,
  Scale,
  Leaf,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import {
  classifyFoodType,
} from '@/entities/food-type/model/forageClassification';
import type { FoodTypeResponse, FieldResponse } from '@/shared/api/generated/swaggerTypes';

interface FoodTypeCardProps {
  item: FoodTypeResponse & { [k: string]: any };
  fields?: FieldResponse[];
  onOpenDetail?: (item: any) => void;
  onOpenEdit?: (item: any) => void;
  onOpenDelete?: (item: any) => void;
  onOpenAforo?: (item: any) => void;
}

export const FoodTypeCard: React.FC<FoodTypeCardProps> = ({
  item,
  fields = [],
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  onOpenAforo,
}) => {
  const name = item.food_type || item.name || 'Sin nombre';
  const description = item.handlings || item.description || '';
  const gauges = item.gauges || '';
  const area = item.area !== undefined && item.area !== null ? Number(item.area) : null;

  const { category, profile } = classifyFoodType(name, description);

  // Potreros asociados
  const linkedFields = fields.filter((f) => Number(f.food_type_id) === Number(item.id));
  const hasLinkedFields = linkedFields.length > 0;

  // Días de rebrote / descanso
  const restDays = profile.restDaysSuggested;
  const isForageOrPasture = category.id === 'pasture' || category.id === 'cut_grass' || category.id === 'legume_silvopastoral';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border transition-all duration-300 flex flex-col justify-between hover:shadow-lg bg-card/80 dark:bg-card/40 backdrop-blur-md rounded-2xl border-border/60 hover:border-emerald-500/40 border-l-4',
        category.borderClass
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-3.5 flex-1">
        {/* Top bar: Category Badge + Quick Actions */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-lg border gap-1 shadow-xs', category.badgeClass)}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </Badge>

          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            {onOpenDetail && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(item);
                }}
                title="Ver Ficha Técnica Zootécnica"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {onOpenEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit(item);
                }}
                title="Editar Alimento"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onOpenDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDelete(item);
                }}
                title="Eliminar Alimento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3
            className="text-base sm:text-lg font-black text-foreground tracking-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors cursor-pointer"
            onClick={() => onOpenDetail?.(item)}
            title={name}
          >
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {description || 'Sin recomendaciones o manejo registrado.'}
          </p>
        </div>

        {/* Nutritional & Zootechnical Badges */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-background/60 dark:bg-background/40 border border-border/40 space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-500" />
              Proteína Estimada
            </span>
            <p className="text-xs font-black text-foreground">{profile.estimatedProtein}</p>
          </div>

          <div className="p-2 rounded-xl bg-background/60 dark:bg-background/40 border border-border/40 space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              {category.id === 'mineral_supplement' || category.id === 'concentrate' ? 'Materia Seca' : 'Rebrote Sugerido'}
            </span>
            <p className="text-xs font-black text-foreground">
              {restDays > 0 ? `${restDays} días descanso` : profile.dryMatter}
            </p>
          </div>
        </div>

        {/* Gauges / Aforo snippet if exists */}
        {gauges && (
          <div className="text-[11px] bg-secondary/40 rounded-xl p-2 text-muted-foreground border border-border/30 line-clamp-1">
            <span className="font-bold text-foreground">Aforo / Calibre: </span>
            {gauges}
          </div>
        )}
      </CardContent>

      {/* Footer info: Area + Linked Potreros */}
      <CardFooter className="p-4 pt-0 sm:p-5 sm:pt-0 flex items-center justify-between gap-2 border-t border-border/40 mt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {area !== null && area > 0 ? (
            <span className="text-xs font-extrabold text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40">
              🌾 {area} ha
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">Área libre</span>
          )}

          {hasLinkedFields ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
              title={`Potreros: ${linkedFields.map((f) => f.name).join(', ')}`}
            >
              <MapPin className="w-3 h-3" />
              {linkedFields.length} {linkedFields.length === 1 ? 'potrero' : 'potreros'}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">Sin potreros</span>
          )}
        </div>

        {isForageOrPasture && onOpenAforo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2 rounded-lg gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAforo(item);
            }}
            title="Calcular aforo para este pasto"
          >
            <Scale className="w-3 h-3" />
            Aforo
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
export default FoodTypeCard;