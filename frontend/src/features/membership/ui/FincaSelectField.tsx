import type { Finca } from '@/entities/finca/api/finca.service';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Building2, Loader2 } from 'lucide-react';

interface FincaSelectFieldProps {
  fincas: Finca[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  disabled: boolean;
  hiddenCount: number;
  hasSearch: boolean;
}

const fincaSubtitle = (finca: Finca): string => {
  const place = [finca.municipality, finca.department].filter(Boolean).join(', ');
  if (place) return ` (${place})`;
  return finca.location ? ` (${finca.location})` : '';
};

const placeholderFor = (loading: boolean, isEmpty: boolean): string => {
  if (loading) return 'Cargando fincas...';
  return isEmpty ? 'Sin fincas disponibles' : 'Selecciona una finca';
};

export const FincaSelectField = ({
  fincas,
  value,
  onChange,
  loading,
  disabled,
  hiddenCount,
  hasSearch,
}: FincaSelectFieldProps) => {
  const isEmpty = fincas.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="finca-select" className="text-sm font-semibold flex items-center gap-2">
        <Building2 className="h-4 w-4 text-success" aria-hidden /> Finca destino
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || isEmpty}>
        <SelectTrigger id="finca-select" className="bg-card">
          <SelectValue placeholder={placeholderFor(loading, isEmpty)} />
        </SelectTrigger>
        <SelectContent>
          {fincas.map((finca) => (
            <SelectItem key={finca.id} value={String(finca.id)}>
              {finca.name}
              {fincaSubtitle(finca)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Consultando fincas públicas...
          </span>
        ) : (
          <>
            <Badge variant="outline" className="text-[10px]">
              {fincas.length} disponibles
            </Badge>
            {hiddenCount > 0 && (
              <span>
                Se ocultaron {hiddenCount} finca(s) donde ya eres miembro o tienes una solicitud
                pendiente.
              </span>
            )}
          </>
        )}
      </div>

      {!loading && isEmpty && (
        <p className="text-xs text-muted-foreground">
          {hasSearch
            ? 'Ninguna finca coincide con la búsqueda.'
            : 'Ya perteneces a todas las fincas publicadas.'}
        </p>
      )}
    </div>
  );
};
