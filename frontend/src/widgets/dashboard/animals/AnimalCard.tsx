import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { AnimalImageBanner } from './AnimalImageBanner';
import { Button } from '@/shared/ui/button';
import { Eye, Trash2, HelpCircle } from 'lucide-react';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { useState } from 'react';
import { IconCow, IconCalf } from '@/shared/icons/cattle';

interface AnimalCardProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onCardClick?: () => void;
  actions?: React.ReactNode;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
  hasAlerts?: boolean;
  onRemoveFromField?: () => void;
  hideFooterActions?: boolean;
}

export function AnimalCard({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onCardClick,
  actions,
  onFatherClick,
  onMotherClick,
  hasAlerts = false,
  onRemoveFromField,
  hideFooterActions = false
}: AnimalCardProps) {
  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const weight = animal.weight ? `${animal.weight} kg` : '-';
  const status = animal.status || '-';
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const initialImages = Array.isArray((animal as any)?.images)
    ? (animal as any).images
    : Array.isArray((animal as any)?.photos)
      ? (animal as any).photos
      : undefined;

  const isAdult = animal.is_adult === true;
  const AnimalIcon = isAdult ? IconCow : IconCalf;

  const statusColor = status === 'Vivo' || status === 'Sano'
    ? 'bg-emerald-500'
    : status === 'Enfermo' || status === 'Muerto'
      ? 'bg-red-500'
      : 'bg-blue-500';

  const genderBg = gender === 'Macho'
    ? 'bg-blue-50 text-blue-600 ring-blue-100'
    : gender === 'Hembra'
      ? 'bg-pink-50 text-pink-600 ring-pink-100'
      : 'bg-gray-50 text-gray-500 ring-gray-100';

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Banner de Imagen */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-gray-50">
        <AnimalImageBanner
          animalId={animal.id}
          height="100%"
          showControls={false}
          autoPlayInterval={0}
          hideWhenEmpty={false}
          objectFit="cover"
          deferLoad
          initialImages={initialImages}
        />

        {/* Placeholder icon cuando no hay imagen */}
        {!initialImages?.length && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50/80 to-gray-50/80">
            <AnimalIcon size={48} color="forest" />
          </div>
        )}

        {/* Overlay de gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

        {/* Badges superiores */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {hasAlerts && (
            <Badge variant="destructive" className="animate-pulse shadow-sm text-[10px] px-2 py-0.5 rounded-full">
              ALERTA
            </Badge>
          )}
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              <span className="text-[10px] font-semibold text-gray-700">{status}</span>
            </div>
          </div>
        </div>

        {/* Gender badge - esquina superior derecha */}
        <div className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full ${genderBg} ring-2 flex items-center justify-center shadow-sm`}>
          {gender === 'Macho' ? (
            <span className="text-xs font-bold">♂</span>
          ) : gender === 'Hembra' ? (
            <span className="text-xs font-bold">♀</span>
          ) : (
            <HelpCircle className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        {/* Header: Registro */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#111827] leading-tight truncate" title={animal.record || `#${animal.id}`}>
            {animal.record || animal.name || `Animal #${animal.id}`}
          </h3>
        </div>

        {/* Grid de Datos principales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Raza</p>
            <p className="text-xs font-semibold text-[#111827] truncate" title={breedLabel}>{breedLabel}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Peso</p>
            <p className="text-xs font-semibold text-[#111827]">{weight}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Edad</p>
            <p className="text-xs font-semibold text-[#111827]">{ageMonths} meses</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Nacimiento</p>
            <p className="text-xs font-semibold text-[#111827] truncate">{birthDate}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-100 w-full" />

        {/* Padres */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Padre</p>
            {onFatherClick && (animal.idFather || animal.father_id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFatherClick(animal.idFather || animal.father_id);
                }}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline truncate w-full text-left transition-colors"
              >
                {fatherLabel}
              </button>
            ) : (
              <p className="text-xs text-[#6B7280] font-medium truncate">{fatherLabel}</p>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] uppercase font-bold text-[#6B7280]/70 tracking-wider">Madre</p>
            {onMotherClick && (animal.idMother || animal.mother_id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMotherClick(animal.idMother || animal.mother_id);
                }}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline truncate w-full text-left transition-colors"
              >
                {motherLabel}
              </button>
            ) : (
              <p className="text-xs text-[#6B7280] font-medium truncate">{motherLabel}</p>
            )}
          </div>
        </div>

        {/* Acciones Footer */}
        {!hideFooterActions && (
          <div className="mt-auto pt-3 flex items-center justify-center gap-2">
            {actions ? (
              actions
            ) : (
              <div className="flex items-center gap-2 w-full justify-evenly">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                  onClick={(e) => { e.stopPropagation(); onCardClick?.(); }}
                  title="Ver Detalle"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {onRemoveFromField && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 w-9 p-0 rounded-full transition-all duration-200 border-gray-200 ${isConfirmingRemove
                      ? 'bg-red-50 border-red-200 text-red-600 shadow-lg shadow-red-100 animate-pulse scale-110'
                      : 'text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isConfirmingRemove) {
                        setIsConfirmingRemove(false);
                        onRemoveFromField();
                      } else {
                        setIsConfirmingRemove(true);
                        setTimeout(() => setIsConfirmingRemove(false), 3000);
                      }
                    }}
                    title={isConfirmingRemove ? "¡Click para confirmar!" : "Quitar del campo"}
                  >
                    {isConfirmingRemove ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <AnimalActionsMenu animal={animal} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
