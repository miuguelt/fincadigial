import { useCallback } from 'react';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import {
  IconEye,
  IconScale,
  IconClock,
  IconGenderMale,
  IconGenderFemale,
  IconMapPin,
  IconCow,
  IconAlertTriangle,
} from '@/shared/ui/icons';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { AnimalImageBanner } from './AnimalImageBanner';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';
import { getBreedColor } from '@/shared/config/animalColors';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

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
  compact?: boolean;
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

const INK_DARK = '#020617';
const INK_LIGHT = '#ffffff';
/** Luminancia relativa de `#020617`, la tinta oscura de los chips. */
const INK_DARK_LUMINANCE = 0.0055;

/**
 * Elige la tinta del chip comparando el contraste real contra blanco y contra
 * tinta oscura.
 */
const getChipInk = (hex: string) => {
  const value = hex.replace('#', '');
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance =
    0.2126 * channel(parseInt(value.slice(0, 2), 16) / 255) +
    0.7152 * channel(parseInt(value.slice(2, 4), 16) / 255) +
    0.0722 * channel(parseInt(value.slice(4, 6), 16) / 255);
  const againstLight = 1.05 / (luminance + 0.05);
  const againstDark = (luminance + 0.05) / (INK_DARK_LUMINANCE + 0.05);
  return againstDark >= againstLight ? INK_DARK : INK_LIGHT;
};

const weightFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

interface Metric {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Unidad en tipografía secundaria; se omite en los progenitores. */
  unit?: string;
  onClick?: () => void;
  accentClass?: string;
}

/**
 * Celda del panel de métricas. Las etiquetas nunca se parten: el ancho lo
 * absorbe el valor, que encoge con `fit-clamp` antes de perder caracteres.
 */
function MetricCell({ metric, index, columns }: { metric: Metric; index: number; columns: number }) {
  const interactive = Boolean(metric.onClick);
  return (
    <div
      className={cn(
        'min-w-0 p-2 sm:p-2.5 transition-colors',
        index % columns !== columns - 1 && 'border-r border-slate-200/80 dark:border-slate-800/80',
        index >= columns && 'border-t border-slate-200/80 dark:border-slate-800/80',
        interactive
          ? 'cursor-pointer hover:bg-primary/10 group/cell'
          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
      )}
      onClick={(event) => {
        if (!metric.onClick) return;
        event.stopPropagation();
        metric.onClick();
      }}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className={cn('shrink-0', metric.accentClass)}>
          {metric.icon}
        </span>
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">
          {metric.label}
        </span>
      </div>
      <p
        className={cn(
          'fit-clamp mt-0.5 text-xs sm:text-[13px] font-black leading-tight text-foreground',
          interactive && 'group-hover/cell:text-primary transition-colors'
        )}
        title={metric.unit ? `${metric.value} ${metric.unit}` : metric.value}
      >
        {metric.value}
        {metric.unit && (
          <span className="ml-0.5 text-[11px] font-bold text-muted-foreground">
            {metric.unit}
          </span>
        )}
      </p>
    </div>
  );
}

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
  compact,
  actions,
}: AnimalCardProps) {
  const { goTo } = useRoleNavigation();
  const handleImagesChange = useCallback((_images: unknown[]) => {
    // do nothing
  }, []);

  const rawStatus = String(animal.status || 'VIVO').toUpperCase();
  const isDead = rawStatus === 'MUERTO' || rawStatus === 'FALLECIDO';
  const isSold = rawStatus === 'VENDIDO';
  const isAlive = !isDead && !isSold;

  const status = isDead ? 'MUERTO' : isSold ? 'VENDIDO' : 'VIVO';
  const statusColor = isDead ? '#ef4444' : isSold ? '#3b82f6' : '#10b981';

  const breed = breedLabel || animal.breed?.name || 'Desconocida';
  const breedColor = getBreedColor(breed);

  // El peso llega en kilos: mostrarlo con la unidad evita el "247.5k" anterior.
  const weight = animal.weight !== undefined && animal.weight !== null
    ? weightFormatter.format(Number(animal.weight))
    : '—';
  const age = animal.age_in_months !== undefined && animal.age_in_months !== null
    ? String(animal.age_in_months)
    : '—';

  const father = fatherLabel || animal.father?.record || 'N/A';
  const mother = motherLabel || animal.mother?.record || 'N/A';

  const fatherId = animal.father?.id ?? animal.idFather;
  const motherId = animal.mother?.id ?? animal.idMother;

  const sexStr = String(animal.sex || '').trim().toLowerCase();
  const isFemale = sexStr === 'hembra' || sexStr === 'f' || sexStr === 'female';
  const isMale = sexStr === 'macho' || sexStr === 'm' || sexStr === 'male';

  const field = fieldName || animal.current_field_name || null;
  const showField = Boolean(field && field !== 'Sin potrero');
  const potreroColor = field ? getFieldColor(field) : 'transparent';

  const metrics: Metric[] = [
    {
      key: 'weight',
      icon: <IconScale size={13} className="shrink-0" />,
      label: 'Peso',
      value: weight,
      unit: weight === '—' ? undefined : 'kg',
      accentClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'age',
      icon: <IconClock size={13} className="shrink-0" />,
      label: 'Edad',
      value: age,
      unit: age === '—' ? undefined : (age === '1' ? 'mes' : 'meses'),
      accentClass: 'text-amber-600 dark:text-amber-400',
    },
  ];

  if (!compact) {
    metrics.push(
      {
        key: 'father',
        icon: <IconGenderMale size={13} className="shrink-0" />,
        label: 'Padre',
        value: father,
        onClick: onFatherClick && fatherId ? () => onFatherClick(fatherId) : undefined,
        accentClass: 'text-blue-600 dark:text-blue-400',
      },
      {
        key: 'mother',
        icon: <IconGenderFemale size={13} className="shrink-0" />,
        label: 'Madre',
        value: mother,
        onClick: onMotherClick && motherId ? () => onMotherClick(motherId) : undefined,
        accentClass: 'text-rose-600 dark:text-rose-400',
      },
    );
  }

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
      return;
    }
    if (onNavigate) {
      onNavigate(String(animal.id));
    } else {
      goTo(`/admin/animals/${animal.id}`);
    }
  };

  const handleCardClickEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onCardClick) event.stopPropagation();
    handleCardClick();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  // Cinta de acento superior según alertas / estado
  const topAccentGradient = alertCount > 0
    ? 'from-amber-500 via-orange-500 to-amber-400'
    : isAlive
      ? 'from-emerald-500 via-teal-400 to-emerald-600'
      : isDead
        ? 'from-rose-500 via-red-500 to-rose-600'
        : 'from-blue-500 via-indigo-500 to-sky-400';

  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer bg-card',
        'border-slate-200/90 dark:border-slate-800/90 hover:border-emerald-500/70 dark:hover:border-emerald-400/70',
        'hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isSelected && 'ring-2 ring-primary shadow-lg shadow-primary/25 border-primary',
        embedded && 'border-none shadow-none hover:translate-y-0',
        compact && 'hover:shadow-md'
      )}
      onClick={handleCardClickEvent}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ficha de ${animal.record || `animal ${animal.id}`}`}
    >
      {/* Cinta superior decorativa de acento de estado */}
      <div className={cn('h-1 w-full shrink-0 bg-gradient-to-r', topAccentGradient)} />

      {/* Cabecera: foto o marca de agua de raza */}
      <div
        className={cn(
          'relative aspect-[16/9] w-full overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80 bg-[var(--color-surface-raised)]',
          compact && 'aspect-[5/2]'
        )}
      >
        <AnimalImageBanner
          animalId={animal.id!}
          height="100%"
          showControls={false}
          objectFit="cover"
          onImagesChange={handleImagesChange}
          initialImages={(animal as any).images}
          deferLoad
          deferRootMargin="100px"
          emptyState={
            <div className="relative h-full w-full overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${breedColor}33 0%, rgba(15,23,42,0.92) 62%, rgba(2,6,23,0.96) 100%)`,
                }}
              />
              <IconCow
                size={96}
                className="absolute -bottom-4 -right-3 text-white/10"
              />
              <span className="sr-only">Este animal aún no tiene imágenes</span>
            </div>
          }
        />

        {/* Franja inferior sobre la foto: estado y potrero */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          {/* Badge de Estado con glow */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/85 px-2.5 py-1 backdrop-blur-md shadow-md">
            <span
              className="h-2 w-2 rounded-full ring-2 ring-white/30"
              style={{
                backgroundColor: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span className="whitespace-nowrap text-[11px] font-black uppercase tracking-wider text-white">
              {status}
            </span>
          </div>

          {/* Badge de Potrero */}
          {showField && (
            <div
              className="flex min-w-0 items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 shadow-md backdrop-blur-md"
              style={{
                backgroundColor: potreroColor,
                borderColor: potreroColor,
                color: getChipInk(potreroColor),
              }}
              title={field ?? undefined}
            >
              <IconMapPin size={11} className="shrink-0" />
              <span className="fit-clamp text-[11px] font-black uppercase tracking-tight">
                {field}
              </span>
            </div>
          )}
        </div>
      </div>

      <CardContent className={cn('flex flex-1 flex-col gap-3 p-3.5 sm:p-4', compact && 'gap-2 p-3')}>
        {/* Identidad */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="fit-clamp text-sm sm:text-base font-black leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
                {animal.record || `#${animal.id}`}
              </h3>

              {/* Badge de Sexo con color nítido */}
              {isFemale && (
                <span
                  aria-label={animal.sex}
                  className="inline-flex items-center gap-0.5 rounded-full border border-rose-300/80 bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-700 shadow-2xs dark:border-rose-800/80 dark:bg-rose-950/70 dark:text-rose-300"
                >
                  <span>♀</span>
                  <span className="text-[11px] uppercase">Hembra</span>
                </span>
              )}
              {isMale && (
                <span
                  aria-label={animal.sex}
                  className="inline-flex items-center gap-0.5 rounded-full border border-blue-300/80 bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700 shadow-2xs dark:border-blue-800/80 dark:bg-blue-950/70 dark:text-blue-300"
                >
                  <span>♂</span>
                  <span className="text-[11px] uppercase">Macho</span>
                </span>
              )}
            </div>

            {/* Badge de Raza con micro-cápsula de color */}
            <div
              className="mt-1.5 flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider w-fit"
              style={{
                backgroundColor: `${breedColor}15`,
                borderColor: `${breedColor}40`,
                color: breedColor,
              }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: breedColor }} />
              <span className="fit-clamp">{breed}</span>
            </div>
          </div>

          {/* Badge de alertas pendientes */}
          {alertCount > 0 && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-black text-slate-950 shadow-sm ring-2 ring-amber-500/20 animate-pulse"
              aria-label={`${alertCount} ${alertCount === 1 ? 'alerta pendiente' : 'alertas pendientes'}`}
              title={`${alertCount} ${alertCount === 1 ? 'alerta pendiente' : 'alertas pendientes'}`}
            >
              <IconAlertTriangle size={12} className="shrink-0 text-slate-950" />
              <span>{alertCount}</span>
            </div>
          )}

          {/* Menú de acciones secundarias */}
          {!hideFooterActions && (
            <div
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(String(animal.id));
              }}
            >
              {actions || (
                <AnimalActionsMenu
                  animal={animal}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          )}
        </div>

        {/* Panel de métricas: Caja Bento 2x2 con bordes definidos */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border-2 border-slate-200/90 bg-slate-50/80 shadow-2xs dark:border-slate-800/90 dark:bg-slate-900/50">
          {metrics.map((metric, index) => (
            <MetricCell key={metric.key} metric={metric} index={index} columns={2} />
          ))}
        </dl>

        {/* Botón de acción principal */}
        <div className="mt-auto pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="group/btn h-9 w-full justify-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 text-xs font-bold text-primary shadow-2xs transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            onClick={(event) => {
              event.stopPropagation();
              handleCardClick();
            }}
            aria-label={`Abrir ficha de ${animal.record || `animal ${animal.id}`}`}
          >
            <IconEye size={15} className="shrink-0 transition-transform group-hover/btn:scale-110" />
            <span className="fit-clamp">{compact ? 'Abrir ficha' : 'Ver ficha completa'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

