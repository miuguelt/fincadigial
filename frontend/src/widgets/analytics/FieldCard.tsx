import React, { memo, useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface Field {
  id: number | string;
  name: string;
  ubication?: string;
  capacity: string | number;
  animal_count?: number;
  state?: string;
  area?: string;
  food_types?: {
    name?: string;
  };
}

interface FieldCardProps {
  field: Field;
  onViewDetails?: (field: Field) => void;
}

/**
 * Componente para mostrar información de un potrero
 * Incluye ocupación actual basada en animal_count del backend
 *
 * OPTIMIZADO: Memoizado para evitar re-renders y forced reflows
 */
const FieldCardComponent: React.FC<FieldCardProps> = ({
  field,
  onViewDetails,
}) => {
  // OPTIMIZACIÓN: Memoizar cálculos para evitar recalcularlos en cada render
  const capacity = useMemo(() => parseInt(String(field.capacity)) || 0, [field.capacity]);
  const occupied = useMemo(() => field.animal_count || 0, [field.animal_count]);
  const occupationRate = useMemo(
    () => capacity > 0 ? (occupied / capacity) * 100 : 0,
    [capacity, occupied]
  );


  // OPTIMIZACIÓN: Memoizar className del card
  const cardClassName = useMemo(
    () =>
      `bg-card rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-border group
       hover:scale-[1.015] dark:text-foreground flex flex-col h-full`,
    []
  );

  const available = capacity - occupied;

  const getHeaderColor = () => {
    if (occupationRate > 100) return 'bg-danger-500 text-white dark:bg-danger-600';
    if (occupationRate > 80)  return 'bg-warning-500 text-white dark:bg-warning-600';
    if (occupationRate > 50)  return 'bg-success-500 text-white dark:bg-success-600';
    return 'bg-info-500 text-white dark:bg-info-600';
  };

  const getProgressColor = () => {
    if (occupationRate > 100) return 'bg-danger-500';
    if (occupationRate > 80)  return 'bg-warning-500';
    if (occupationRate > 50)  return 'bg-success-500';
    return 'bg-info-500';
  };

  return (
    <div className={cardClassName}>
      {/* Header Estilo Modal */}
      <div className={`${getHeaderColor()} px-5 py-3 flex items-center justify-between`}>
        <div className="flex-1">
          <h3 className="text-lg font-bold fit-clamp">
            {field.name}
          </h3>
          {field.ubication && (
            <div className="flex items-center mt-0.5 text-xs text-white/90">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              <span className="fit-clamp">{field.ubication}</span>
            </div>
          )}
        </div>
        {field.state && (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm shadow-sm transition-all duration-200 group-hover:scale-110 ml-2 whitespace-nowrap`}
          >
            {field.state}
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">


        {/* Ocupación - Estilo Modal */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
            Ocupación del Potrero
          </span>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <span className="text-muted-foreground text-xs block mb-0.5">Actuales</span>
              <span className="text-xl font-bold text-foreground">{occupied}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground text-xs block mb-0.5">Capacidad</span>
              <span className="text-xl font-bold text-foreground">{capacity}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground text-xs block mb-0.5">Disponibles</span>
              <span className="text-xl font-bold text-success">{available}</span>
            </div>
          </div>

          <div className="w-full bg-secondary rounded-full h-4 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(occupationRate, 100)}%` }}
            />
            {occupationRate > 10 && (
              <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white drop-shadow-md">
                {occupationRate.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Alertas */}
        {occupationRate > 100 && (
          <div className="mb-4 p-3 bg-destructive/5 border border-rose-200 rounded-lg flex items-start gap-2">
            <span className="text-sm text-rose-800 dark:text-rose-200 font-medium leading-tight">
              ⚠️ Potrero sobrecargado ({(occupationRate - 100).toFixed(0)}% extra)
            </span>
          </div>
        )}

        {occupationRate > 80 && occupationRate <= 100 && (
          <div className="mb-4 p-3 bg-warning/5 border border-amber-200 rounded-lg flex items-start gap-2">
            <span className="text-sm text-warning dark:text-amber-100 font-medium leading-tight">
              ⚡ Cerca de su capacidad máxima
            </span>
          </div>
        )}

        {/* Información adicional - Pastel Cards */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {field.area && (
            <div className="bg-info/5 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
              <span className="text-xs font-medium text-blue-900 dark:text-blue-300 block mb-1">Área Total</span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-200">{field.area}</span>
            </div>
          )}
          {field.food_types?.name && (
            <div className="bg-success/5 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
              <span className="text-xs font-medium text-green-900 dark:text-green-300 block mb-1">Alimento</span>
              <span className="text-sm font-bold text-green-900 dark:text-green-200 leading-tight block">
                {field.food_types.name}
              </span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="mt-5 flex space-x-2">
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(field);
              }}
              className="flex-1 px-4 py-2 bg-info text-white text-sm font-medium rounded-lg
                       hover:bg-blue-600 transition-all duration-200 shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ver Detalles
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// OPTIMIZACIÓN: Memoizar componente con comparación personalizada
const FieldCard = memo(FieldCardComponent, (prevProps, nextProps) => {
  // Solo re-renderiza si cambian estos valores importantes
  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.field.animal_count === nextProps.field.animal_count &&
    prevProps.field.capacity === nextProps.field.capacity &&
    prevProps.field.state === nextProps.field.state
  );
});

FieldCard.displayName = 'FieldCard';

export default FieldCard;
