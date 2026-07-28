import { useState } from 'react';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { 
  IconEye, 
  IconScale, 
  IconClock, 
  IconGenderMale, 
  IconGenderFemale, 
  IconMapPin, 
  IconPhotoOff,
} from '@/shared/ui/icons';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { AnimalImageBanner } from './AnimalImageBanner';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';
import { getBreedColor } from '@/shared/config/animalColors';
import { formatCompactNumber } from '@/shared/utils/dateUtils';

interface AnimalCardProps {
  animal: AnimalResponse & { [k: string]: any };
  onNavigate?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  // Props legacy para compatibilidad
  breedLabel?: string;
  fatherLabel?: string;
  motherLabel?: string;
  onFatherClick?: (id: number) => void;
  onMotherClick?: (id: number) => void;
  onCardClick?: () => void;
  fieldName?: string | null;
  alertCount?: number;
  currentUserId?: number;
  hideFooterActions?: boolean;
  embedded?: boolean;
  actions?: React.ReactNode;
}

/**
 * Paleta de colores para potreros (determinística)
 */
const FIELD_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
  '#ef4444', '#f43f5e', '#f97316', '#06b6d4'
];

const getFieldColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FIELD_PALETTE[Math.abs(hash) % FIELD_PALETTE.length];
};

export function AnimalCard({
  animal,
  onNavigate,
  onSelect,
  isSelected,
  breedLabel,
  fatherLabel,
  motherLabel,
  onFatherClick,
  onMotherClick,
  onCardClick,
  fieldName,
  alertCount = 0,
  currentUserId,
  hideFooterActions,
  embedded,
  actions,
}: AnimalCardProps) {
  const navigate = useNavigate();
  const [hasImages, setHasImages] = useState(false);

  const status = animal.status || 'VIVO';
  const statusColor = {
    'VIVO': 'var(--color-success)',
    'MUERTO': 'var(--color-danger)',
    'VENDIDO': 'var(--color-info)',
  }[status as string] || 'var(--color-success)';

  const breed = breedLabel || animal.breed?.name || 'Desconocida';
  const breedColor = getBreedColor(breed);

  const weight = animal.weight ? `${formatCompactNumber(Number(animal.weight))}k` : '—k';
  const age = animal.age_in_months !== undefined ? `${animal.age_in_months}m` : '—m';
  
  const father = fatherLabel || animal.father?.record || 'N/A';
  const mother = motherLabel || animal.mother?.record || 'N/A';

  // El listado devuelve el padre/madre unas veces anidado y otras como id
  // plano; sin este fallback el click sobre el progenitor no hacía nada.
  const fatherId = animal.father?.id ?? animal.idFather;
  const motherId = animal.mother?.id ?? animal.idMother;

  const sexSymbol = animal.sex === 'Hembra' ? '♀' : animal.sex === 'Macho' ? '♂' : null;

  const field = fieldName || animal.current_field_name || null;
  const potreroColor = field ? getFieldColor(field) : 'transparent';

  const handleCardClick = () => {
    if (onCardClick) {
        onCardClick();
        return;
    }
    if (onNavigate) {
      onNavigate(String(animal.id));
    } else {
      navigate(`/admin/animals/${animal.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-xl",
        isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20",
        embedded && "shadow-none border-none hover:translate-y-0"
      )}
      onClick={handleCardClick}
    >
      {/* Header: Imagen y Badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-raised)]">
        <AnimalImageBanner
          animalId={animal.id!}
          height="100%"
          showControls={false}
          objectFit="cover"
          onImagesChange={(imgs) => setHasImages(imgs.length > 0)}
          initialImages={(animal as any).images}
        />
        
        {!hasImages && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
            <IconPhotoOff size={32} strokeWidth={1.2} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Sin imágenes</span>
          </div>
        )}

        {/* Chip Estado (Top-Left) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-[9px] font-bold text-white uppercase tracking-widest">{status}</span>
        </div>

        {/* Botón Detalle (Top-Right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="w-7 h-7 rounded-lg shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            <IconEye size={14} />
          </Button>
        </div>

        {/* Badge Potrero y Alertas (Bottom) */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          {field && field !== 'Sin potrero' && (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-lg max-w-[70%] transition-transform group-hover:scale-105"
              style={{ 
                backgroundColor: `${potreroColor}20`, 
                borderColor: `${potreroColor}40`,
                backdropFilter: 'blur(8px)'
              }}
            >
              <IconMapPin size={10} style={{ color: potreroColor }} />
              <span className="text-[10px] font-bold uppercase tracking-tight truncate" style={{ color: potreroColor }}>
                {field}
              </span>
            </div>
          )}
          
          {alertCount > 0 && (
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--color-warning)] text-white shadow-lg animate-pulse">
              <span className="text-[10px] font-black">{alertCount}!</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        {/* Identidad */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-tight truncate tracking-tight text-[var(--color-text)]">
              {animal.record || `#${animal.id}`}
              {sexSymbol && (
                <span
                  aria-label={animal.sex}
                  className={cn(
                    "ml-1 font-black",
                    animal.sex === 'Hembra' ? "text-pink-500" : "text-blue-500",
                  )}
                >
                  {sexSymbol}
                </span>
              )}
            </h3>
            {/* Menú de acciones legacy si es necesario */}
            {!hideFooterActions && (
                <div onClick={e => {
                    e.stopPropagation();
                    if (onSelect) onSelect(String(animal.id));
                }}>
                   {actions || (
                       <AnimalActionsMenu 
                        animal={animal} 
                        currentUserId={currentUserId}
                       />
                   )}
                </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: breedColor }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: breedColor }}>
              {breed}
            </span>
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)] opacity-50" />

        {/* Grid Peso y Edad */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <IconScale size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Peso</span>
            </div>
            <p className="text-xs font-bold text-[var(--color-text)]">{weight}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <IconClock size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Edad</span>
            </div>
            <p className="text-xs font-bold text-[var(--color-text)]">{age}</p>
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)] opacity-50" />

        {/* Grid Padres */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className={cn("flex flex-col gap-0.5 overflow-hidden", onFatherClick && "cursor-pointer hover:opacity-70")}
            onClick={(e) => {
                if (onFatherClick && fatherId) {
                    e.stopPropagation();
                    onFatherClick(fatherId);
                }
            }}
          >
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <IconGenderMale size={12} className="text-blue-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Padre</span>
            </div>
            <p className="text-[10px] font-medium text-[var(--color-text)] truncate">{father}</p>
          </div>
          <div 
            className={cn("flex flex-col gap-0.5 overflow-hidden", onMotherClick && "cursor-pointer hover:opacity-70")}
            onClick={(e) => {
                if (onMotherClick && motherId) {
                    e.stopPropagation();
                    onMotherClick(motherId);
                }
            }}
          >
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <IconGenderFemale size={12} className="text-rose-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Madre</span>
            </div>
            <p className="text-[10px] font-medium text-[var(--color-text)] truncate">{mother}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
