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
 * tinta oscura. Con umbral fijo, el ámbar y el naranja de la paleta se quedaban
 * en blanco a razón 2:1, ilegible en un rótulo de 9 px.
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
        'min-w-0 px-2.5 py-2',
        index % columns !== columns - 1 && 'border-r border-[var(--color-border)]',
        index >= columns && 'border-t border-[var(--color-border)]',
        interactive && 'cursor-pointer transition-colors hover:bg-[var(--color-surface-raised)]'
      )}
      onClick={(event) => {
        if (!metric.onClick) return;
        event.stopPropagation();
        metric.onClick();
      }}
    >
      <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
        {metric.icon}
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide">
          {metric.label}
        </span>
      </div>
      <p
        className="fit-clamp mt-0.5 text-[13px] font-bold leading-tight text-[var(--color-text)]"
        title={metric.unit ? `${metric.value} ${metric.unit}` : metric.value}
      >
        {metric.value}
        {metric.unit && (
          <span className="ml-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
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

  const status = animal.status || 'VIVO';
  const statusColor = {
    'VIVO': 'var(--color-success)',
    'MUERTO': 'var(--color-danger)',
    'VENDIDO': 'var(--color-info)',
  }[status as string] || 'var(--color-success)';

  const breed = breedLabel || animal.breed?.name || 'Desconocida';
  const breedColor = getBreedColor(breed);

  // El peso llega en kilos: mostrarlo con la unidad evita el "247.5k" anterior,
  // que se leía como 247 500.
  const weight = animal.weight !== undefined && animal.weight !== null
    ? weightFormatter.format(Number(animal.weight))
    : '—';
  const age = animal.age_in_months !== undefined && animal.age_in_months !== null
    ? String(animal.age_in_months)
    : '—';

  const father = fatherLabel || animal.father?.record || 'N/A';
  const mother = motherLabel || animal.mother?.record || 'N/A';

  // El listado devuelve el padre/madre unas veces anidado y otras como id
  // plano; sin este fallback el click sobre el progenitor no hacía nada.
  const fatherId = animal.father?.id ?? animal.idFather;
  const motherId = animal.mother?.id ?? animal.idMother;

  const sexSymbol = animal.sex === 'Hembra' ? '♀' : animal.sex === 'Macho' ? '♂' : null;

  const field = fieldName || animal.current_field_name || null;
  const showField = Boolean(field && field !== 'Sin potrero');
  const potreroColor = field ? getFieldColor(field) : 'transparent';

  const metrics: Metric[] = [
    {
      key: 'weight',
      icon: <IconScale size={11} className="shrink-0" />,
      label: 'Peso',
      value: weight,
      unit: weight === '—' ? undefined : 'kg',
    },
    {
      key: 'age',
      icon: <IconClock size={11} className="shrink-0" />,
      label: 'Edad',
      value: age,
      unit: age === '—' ? undefined : (age === '1' ? 'mes' : 'meses'),
    },
  ];

  if (!compact) {
    metrics.push(
      {
        key: 'father',
        icon: <IconGenderMale size={11} className="shrink-0 text-blue-500" />,
        label: 'Padre',
        value: father,
        onClick: onFatherClick && fatherId ? () => onFatherClick(fatherId) : undefined,
      },
      {
        key: 'mother',
        icon: <IconGenderFemale size={11} className="shrink-0 text-rose-500" />,
        label: 'Madre',
        value: mother,
        onClick: onMotherClick && motherId ? () => onMotherClick(motherId) : undefined,
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
    // Custom card handlers own the interaction when this card is embedded in
    // another clickable card (for example, the admin CRUD cards view).
    if (onCardClick) event.stopPropagation();
    handleCardClick();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20",
        embedded && "shadow-none border-none hover:translate-y-0",
        compact && "hover:shadow-md"
      )}
      onClick={handleCardClickEvent}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ficha de ${animal.record || `animal ${animal.id}`}`}
    >
      {/* Cabecera: foto o marca de agua de raza, siempre con la misma altura
          para que las tarjetas de una fila queden alineadas. */}
      <div className={cn(
        "relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-surface-raised)]",
        compact && "aspect-[5/2]"
      )}>
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

        {/* Franja inferior: estado a la izquierda, potrero a la derecha. Ambos
            chips viven sobre la imagen y ya no duplican bloque en el cuerpo. */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-white">
              {status}
            </span>
          </div>

          {showField && (
            <div
              className="flex min-w-0 items-center gap-1 rounded-full border px-2 py-1 shadow-sm"
              style={{ backgroundColor: potreroColor, borderColor: potreroColor, color: getChipInk(potreroColor) }}
              title={field ?? undefined}
            >
              <IconMapPin size={10} className="shrink-0" />
              <span className="fit-clamp text-[11px] font-bold uppercase tracking-tight">
                {field}
              </span>
            </div>
          )}
        </div>
      </div>

      <CardContent className={cn("flex flex-1 flex-col gap-2.5 p-3.5", compact && "gap-2 p-3")}>
        {/* Identidad */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="fit-clamp text-[13px] font-bold leading-tight tracking-tight text-[var(--color-text)]">
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
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: breedColor }} />
              <span
                className="fit-clamp text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: breedColor }}
              >
                {breed}
              </span>
            </div>
          </div>

          {alertCount > 0 && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-warning)] px-1.5 py-0.5 text-slate-950 shadow-sm"
              aria-label={`${alertCount} ${alertCount === 1 ? 'alerta pendiente' : 'alertas pendientes'}`}
              title={`${alertCount} ${alertCount === 1 ? 'alerta pendiente' : 'alertas pendientes'}`}
            >
              <IconAlertTriangle size={10} className="shrink-0" />
              <span className="text-[11px] font-black leading-none">{alertCount}</span>
            </div>
          )}

          {/* Menú de acciones legacy si es necesario */}
          {!hideFooterActions && (
            <div
              className="shrink-0"
              onClick={e => {
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

        {/* Panel de métricas: una sola caja en lugar de dos rejillas separadas
            por líneas, así el ancho disponible se reparte de forma pareja. */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
          {metrics.map((metric, index) => (
            <MetricCell key={metric.key} metric={metric} index={index} columns={2} />
          ))}
        </dl>

        {/* Acción principal visible: el resto de la tarjeta también es clicable. */}
        <div className="mt-auto pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full justify-center gap-2 text-[11px] font-bold"
            onClick={(event) => {
              event.stopPropagation();
              handleCardClick();
            }}
            aria-label={`Abrir ficha de ${animal.record || `animal ${animal.id}`}`}
          >
            <IconEye size={14} className="shrink-0" />
            <span className="fit-clamp">{compact ? 'Abrir ficha' : 'Ver ficha completa'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
