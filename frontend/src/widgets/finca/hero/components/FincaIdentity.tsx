import type { ReactNode } from 'react';
import { BadgeCheck, Home, MapPin, Navigation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FincaLocation } from '@/entities/weather';
import type { FincaHeroProfile } from '../FincaHeroBanner.types';
import { firstDefined } from '../utils/firstDefined';

interface Props {
  name: string;
  profile: FincaHeroProfile | null;
  location: FincaLocation | null;
}

interface Chip {
  key: string;
  icon: LucideIcon;
  text: string;
}

function ChipTag({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2.5 py-1 text-xs font-semibold text-foreground/80">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

/** La ubicación puede venir del clima o de la ficha; se prefiere la del clima. */
function buildChips(profile: Partial<FincaHeroProfile>, coords: string | null): Chip[] {
  const chips: Chip[] = [];
  if (profile.type) chips.push({ key: 'type', icon: Home, text: profile.type });
  if (profile.address) chips.push({ key: 'address', icon: MapPin, text: profile.address });
  if (profile.ica_registration) {
    chips.push({ key: 'ica', icon: BadgeCheck, text: `ICA ${profile.ica_registration}` });
  }
  if (coords) chips.push({ key: 'coords', icon: Navigation, text: coords });
  return chips;
}

function formatCoords(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null;
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Qué decir bajo el nombre de la finca.
 *
 * Decir "Ubicación sin registrar" mientras justo debajo se muestra una chapa
 * con las coordenadas se contradice: la finca sí está ubicada, lo que falta es
 * el municipio. Se nombra exactamente lo que falta.
 */
function locationLine(place: string, hasCoords: boolean): string {
  if (place) return place;
  return hasCoords ? 'Ubicada por GPS · falta registrar el municipio' : 'Ubicación sin registrar';
}

/** Identidad de la finca: cómo se llama, dónde queda y con qué registro opera. */
export function FincaIdentity({ name, profile, location }: Props) {
  const ficha: Partial<FincaHeroProfile> = profile ?? {};
  const geo: Partial<FincaLocation> = location ?? {};
  const place = [
    firstDefined(geo.municipality, ficha.municipality),
    firstDefined(geo.department, ficha.department),
  ]
    .filter(Boolean)
    .join(', ');
  const coords = formatCoords(
    firstDefined(geo.latitude, ficha.latitude),
    firstDefined(geo.longitude, ficha.longitude),
  );

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Home className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="fit-clamp text-xl font-black leading-tight text-foreground sm:text-2xl">
            {name}
          </h2>
          <p className="fit-clamp text-sm text-muted-foreground">
            {locationLine(place, coords !== null)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {buildChips(ficha, coords).map((chip) => (
          <ChipTag key={chip.key} icon={chip.icon}>
            {chip.text}
          </ChipTag>
        ))}
      </div>
    </div>
  );
}
