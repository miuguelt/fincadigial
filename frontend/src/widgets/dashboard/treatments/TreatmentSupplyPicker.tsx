import React, { useMemo } from 'react';
import { CheckCircle2, Pill, Search, Syringe, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export type TreatmentSupplyKind = 'vaccine' | 'medication';

interface SupplyOption {
  value: number;
  label: string;
}

interface TreatmentSupplyPickerProps {
  kind: TreatmentSupplyKind;
  options: SupplyOption[];
  search: string;
  onSearchChange: (value: string) => void;
  selected: number[];
  onSelectedChange: (values: number[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

const copy = {
  vaccine: {
    singular: 'vacuna',
    plural: 'vacunas',
    title: 'Añadir vacuna al tratamiento',
    label: 'Vacuna',
    search: 'Buscar vacuna por nombre…',
    select: 'Seleccionar vacunas',
    empty: 'No hay vacunas que coincidan con la búsqueda.',
    hint: 'Puedes seleccionar varias con Ctrl o con una pulsación prolongada.',
  },
  medication: {
    singular: 'medicamento',
    plural: 'medicamentos',
    title: 'Añadir medicamento al tratamiento',
    label: 'Medicamento',
    search: 'Buscar medicamento por nombre…',
    select: 'Seleccionar medicamentos',
    empty: 'No hay medicamentos que coincidan con la búsqueda.',
    hint: 'Puedes seleccionar varios con Ctrl o con una pulsación prolongada.',
  },
} as const;

export const TreatmentSupplyPicker: React.FC<TreatmentSupplyPickerProps> = ({
  kind,
  options,
  search,
  onSearchChange,
  selected,
  onSelectedChange,
  onSubmit,
  onCancel,
  saving,
  error,
}) => {
  const labels = copy[kind];
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CO');
    return options.filter((option) => option.label.toLocaleLowerCase('es-CO').includes(query));
  }, [options, search]);

  const Icon = kind === 'vaccine' ? Syringe : Pill;
  const accentClasses = kind === 'vaccine'
    ? {
        container: 'border-cyan-200 bg-cyan-50/40 dark:border-cyan-800/70 dark:bg-cyan-950/20',
        icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300',
        focus: 'focus:border-cyan-500 focus:ring-cyan-500/20',
        button: 'border-cyan-600 bg-cyan-600 hover:border-cyan-700 hover:bg-cyan-700',
        badge: 'text-cyan-800 dark:text-cyan-200',
      }
    : {
        container: 'border-purple-200 bg-purple-50/40 dark:border-purple-800/70 dark:bg-purple-950/20',
        icon: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
        focus: 'focus:border-purple-500 focus:ring-purple-500/20',
        button: 'border-purple-600 bg-purple-600 hover:border-purple-700 hover:bg-purple-700',
        badge: 'text-purple-800 dark:text-purple-200',
      };

  const selectedLabel = selected.length === 1
    ? `1 ${labels.singular} seleccionado`
    : `${selected.length} ${labels.plural} seleccionados`;

  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 rounded-xl border p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${accentClasses.container}`}
      aria-label={labels.title}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentClasses.icon}`} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground">{labels.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Busca y selecciona uno o varios registros del catálogo.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar formulario"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${kind}-supply-search`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {labels.label}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={`${kind}-supply-search`}
            type="search"
            className={`h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 ${accentClasses.focus}`}
            placeholder={labels.search}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <select
          aria-label={labels.select}
          aria-describedby={`${kind}-supply-help`}
          className={`min-h-[8rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 ${accentClasses.focus}`}
          multiple
          size={Math.min(Math.max(filteredOptions.length, 3), 6)}
          value={selected.map(String)}
          onChange={(event) => onSelectedChange(Array.from(event.target.selectedOptions).map((option) => Number(option.value)))}
          required
        >
          {filteredOptions.length === 0 ? (
            <option value="" disabled>{labels.empty}</option>
          ) : (
            filteredOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))
          )}
        </select>
        <div id={`${kind}-supply-help`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{labels.hint}</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${accentClasses.badge}`} aria-live="polite">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedLabel}
          </span>
        </div>
      </div>

      {error && <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700" role="alert">{error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="md" loading={saving} className={accentClasses.button}>
          Guardar selección
        </Button>
      </div>
    </form>
  );
};

export default TreatmentSupplyPicker;
